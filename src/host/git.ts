/**
 * Run `git` to bring a remote OKF bundle into a local folder.
 *
 * Authentication is git's own: whatever credential helper the user already
 * set up (Git Credential Manager on Windows covers GitHub and Azure DevOps),
 * or SSH keys. A token can also come from an environment variable; it is
 * handed to git as an `http.extraHeader` through `GIT_CONFIG_*` variables, so
 * it never appears in the process arguments, the remote URL, `.git/config`,
 * or the library file.
 *
 * Git never prompts: `GIT_TERMINAL_PROMPT=0` and a null askpass turn a missing
 * credential into an error the browser can show, instead of a hung process.
 */
import { execFile } from 'node:child_process'
import type { GitProvider } from '../types/okf.ts'

/** What {@link parseRemote} learns from a remote URL. */
export interface RemoteInfo {
  readonly provider: GitProvider
  /** The repository name, for a default id. */
  readonly repo: string
  /** Owner (GitHub) or organization (Azure DevOps), when known. */
  readonly owner?: string
  /** Azure DevOps project, when known. */
  readonly project?: string
  /** Whether git talks HTTP(S) to this remote (a token header applies only then). */
  readonly http: boolean
}

/** A git failure with the part of stderr worth showing. */
export class GitError extends Error {
  /** A short code the browser maps to a hint. */
  readonly code: 'auth' | 'not-found' | 'ref' | 'timeout' | 'missing-git' | 'failed'

  /**
   * @param code - the failure class.
   * @param message - what git said, credential-free.
   */
  constructor(code: GitError['code'], message: string) {
    super(message)
    this.name = 'GitError'
    this.code = code
  }
}

/**
 * Recognize a remote. Accepts HTTPS and SSH forms of GitHub and Azure DevOps
 * (`dev.azure.com/{org}/{project}/_git/{repo}`, `{org}.visualstudio.com/...`,
 * `git@ssh.dev.azure.com:v3/{org}/{project}/{repo}`), and any other git URL.
 * @param url - the remote as the user typed it.
 * @returns what was recognized.
 * @throws {Error} when the text is not a git remote, or carries a credential.
 */
export function parseRemote(url: string): RemoteInfo {
  const text = url.trim()
  if (text === '' || /\s/.test(text)) throw new Error('The repository URL is empty or contains spaces.')
  if (text.startsWith('-')) throw new Error('The repository URL cannot start with "-".')

  const scp = /^([\w.-]+)@([\w.-]+):(.+)$/.exec(text)
  if (scp !== null && !text.includes('://')) {
    const host = (scp[2] ?? '').toLowerCase()
    const parts = (scp[3] ?? '').replace(/\.git$/, '').split('/').filter(Boolean)
    if (host === 'ssh.dev.azure.com' || host.endsWith('vs-ssh.visualstudio.com')) {
      const tail = parts[0] === 'v3' ? parts.slice(1) : parts
      return azure(tail[0], tail[1], tail[2], false)
    }
    return { provider: host === 'github.com' ? 'github' : 'git', repo: parts.at(-1) ?? 'repo', ...parts.length > 1 ? { owner: parts[0] ?? '' } : {}, http: false }
  }

  let parsed: URL
  try {
    parsed = new URL(text)
  } catch {
    throw new Error('Not a repository URL. Use https://… or git@host:path.')
  }
  if (!['https:', 'http:', 'ssh:', 'git:', 'file:'].includes(parsed.protocol)) {
    throw new Error(`Unsupported protocol ${parsed.protocol}`)
  }
  if (parsed.password !== '') {
    throw new Error('Remove the credential from the URL. Use a git credential helper or the token environment variable instead.')
  }
  const http = parsed.protocol === 'https:' || parsed.protocol === 'http:'
  const host = parsed.hostname.toLowerCase()
  const parts = decodeURIComponent(parsed.pathname).replace(/\.git$/, '').split('/').filter(Boolean)
  if (host === 'dev.azure.com') {
    const git = parts.indexOf('_git')
    return git > 0 ? azure(parts[0], parts[git - 1], parts[git + 1], http) : azure(parts[0], parts[1], parts[2], http)
  }
  if (host.endsWith('.visualstudio.com')) {
    const org = host.split('.')[0]
    const git = parts.indexOf('_git')
    if (host.startsWith('vs-ssh.')) return azure(parts[1], parts[2], parts[3], http)
    return azure(org, git > 0 ? parts[git - 1] : parts[0], git >= 0 ? parts[git + 1] : parts[1], http)
  }
  if (host === 'ssh.dev.azure.com') {
    const tail = parts[0] === 'v3' ? parts.slice(1) : parts
    return azure(tail[0], tail[1], tail[2], http)
  }
  return {
    provider: host === 'github.com' ? 'github' : 'git',
    repo: parts.at(-1) ?? 'repo',
    ...parts.length > 1 ? { owner: parts[0] ?? '' } : {},
    http,
  }
}

/**
 * Build an Azure DevOps remote record.
 * @param org - organization.
 * @param project - project.
 * @param repo - repository; Azure DevOps names the default repo after the project.
 * @param http - whether the remote is HTTP(S).
 * @returns the record.
 */
function azure(org: string | undefined, project: string | undefined, repo: string | undefined, http: boolean): RemoteInfo {
  if (org === undefined || project === undefined) throw new Error('An Azure DevOps URL needs an organization, a project and a repository.')
  return { provider: 'azure-devops', owner: org, project, repo: repo ?? project, http }
}

/** How to run git. */
export interface GitOptions {
  /** Working directory. */
  readonly cwd?: string
  /** Token for an HTTP(S) remote; sent as a header, never stored. */
  readonly token?: string
  /** Provider of the remote, which decides the header scheme. */
  readonly provider?: GitProvider
  /** Deadline in milliseconds. */
  readonly timeoutMs?: number
  /** The git executable. */
  readonly gitPath?: string
}

/**
 * The environment git runs with: never prompt, and carry the token header
 * (if any) through `GIT_CONFIG_*` so it stays out of argv and config files.
 * @param options - token and provider.
 * @returns the environment.
 */
export function gitEnv(options: GitOptions): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    GIT_TERMINAL_PROMPT: '0',
    GIT_ASKPASS: '',
    SSH_ASKPASS: '',
    GCM_INTERACTIVE: 'never',
    GIT_SSH_COMMAND: process.env.GIT_SSH_COMMAND ?? 'ssh -o BatchMode=yes',
  }
  if (options.token !== undefined && options.token !== '') {
    // GitHub takes a bearer token; Azure DevOps takes a PAT as Basic with an empty user.
    const header = options.provider === 'github'
      ? `Authorization: Bearer ${options.token}`
      : `Authorization: Basic ${Buffer.from(`:${options.token}`).toString('base64')}`
    const index = Number(env.GIT_CONFIG_COUNT ?? '0') || 0
    env.GIT_CONFIG_COUNT = String(index + 1)
    env[`GIT_CONFIG_KEY_${String(index)}`] = 'http.extraHeader'
    env[`GIT_CONFIG_VALUE_${String(index)}`] = header
  }
  return env
}

/**
 * Remove anything that looks like a credential from git output.
 * @param text - stderr or stdout.
 * @param token - the token in use, if any.
 * @returns the text, safe to show.
 */
export function redact(text: string, token?: string): string {
  let out = text.replace(/(https?:\/\/)[^@\s/]+@/g, '$1***@').replace(/(Authorization:\s*\w+\s+)\S+/gi, '$1***')
  if (token !== undefined && token !== '') out = out.split(token).join('***')
  return out
}

/**
 * Sort a git failure into a class the browser can explain.
 * @param stderr - what git printed.
 * @returns the class.
 */
function classify(stderr: string): GitError['code'] {
  if (/authentication failed|could not read username|terminal prompts disabled|permission denied \(publickey\)|403|401|access denied|not authorized/i.test(stderr)) return 'auth'
  if (/remote branch .* not found|couldn't find remote ref|invalid refspec|did not match any/i.test(stderr)) return 'ref'
  if (/repository .* not found|does not appear to be a git repository|not found|TF401019/i.test(stderr)) return 'not-found'
  return 'failed'
}

/**
 * Run one git command.
 * @param args - arguments after `git`.
 * @param options - cwd, token, deadline.
 * @returns stdout, trimmed.
 * @throws {GitError} on a non-zero exit, a timeout, or no git on PATH.
 */
export function runGit(args: readonly string[], options: GitOptions = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(options.gitPath ?? 'git', [...args], {
      cwd: options.cwd,
      env: gitEnv(options),
      timeout: options.timeoutMs ?? 300_000,
      maxBuffer: 16 * 1024 * 1024,
      windowsHide: true,
    }, (error, stdout, stderr) => {
      if (error === null) {
        resolve(stdout.trim())
        return
      }
      const err = error as NodeJS.ErrnoException & { killed?: boolean }
      if (err.code === 'ENOENT') {
        reject(new GitError('missing-git', 'git was not found on PATH. Install Git, or set gitPath on the plugin row.'))
        return
      }
      const said = redact(String(stderr || err.message), options.token).trim()
      if (err.killed === true) {
        reject(new GitError('timeout', `git ${args[0] ?? ''} took too long and was stopped.`))
        return
      }
      reject(new GitError(classify(said), said.split(/\r?\n/).slice(-6).join('\n')))
    })
  })
}

/**
 * Shallow, blobless clone with nothing checked out yet. File contents arrive
 * only for what is later read or checked out, so finding the bundle in a large
 * repository costs one tree listing.
 * @param url - the remote.
 * @param ref - branch or tag; undefined takes the remote's default branch.
 * @param dir - target folder; must not exist yet.
 * @param options - token and deadline.
 * @returns the commit fetched.
 */
export async function cloneNoCheckout(url: string, ref: string | undefined, dir: string, options: GitOptions = {}): Promise<string> {
  const args = ['clone', '--depth', '1', '--single-branch', '--no-tags', '--filter=blob:none', '--no-checkout']
  if (ref !== undefined) args.push('--branch', ref)
  args.push('--', url, dir)
  await runGit(args, options)
  return runGit(['rev-parse', 'HEAD'], { ...options, cwd: dir })
}

/**
 * The top folder of the git working tree holding `dir`.
 * @param dir - any folder.
 * @param options - git settings.
 * @returns the absolute top level, or undefined when `dir` is not in a working tree.
 */
export async function topLevel(dir: string, options: GitOptions = {}): Promise<string | undefined> {
  try {
    const out = await runGit(['rev-parse', '--show-toplevel'], { ...options, cwd: dir })
    return out === '' ? undefined : out
  } catch {
    return undefined
  }
}

/**
 * List every file path in the fetched commit.
 * @param dir - the clone.
 * @param options - token and deadline.
 * @returns repository-relative paths with forward slashes.
 */
export async function listFiles(dir: string, options: GitOptions = {}): Promise<string[]> {
  const out = await runGit(['ls-tree', '-r', '--name-only', '-z', 'HEAD'], { ...options, cwd: dir })
  return out.split('\0').filter(Boolean)
}

/**
 * Read one file of the fetched commit without checking it out.
 * @param dir - the clone.
 * @param path - repository-relative path.
 * @param options - token and deadline.
 * @returns the file text.
 */
export function showFile(dir: string, path: string, options: GitOptions = {}): Promise<string> {
  return runGit(['show', `HEAD:${path}`], { ...options, cwd: dir })
}

/**
 * Check out only one folder of the fetched commit, or all of it.
 * @param dir - the clone.
 * @param path - repository subfolder, `''` for the whole repository.
 * @param options - token and deadline.
 */
export async function checkoutPath(dir: string, path: string, options: GitOptions = {}): Promise<void> {
  const local = { ...options, cwd: dir }
  if (path !== '') await runGit(['sparse-checkout', 'set', '--no-cone', `/${path}/`], local)
  await runGit(['checkout', '--quiet'], local)
}

/**
 * Turn the library's shallow mirror into a normal clone, so the user can
 * branch, rebase and push from it. Commits and trees arrive now; file contents
 * stay on demand (the clone's blob filter is kept).
 * @param dir - the clone.
 * @param options - token and deadline.
 */
export async function unshallow(dir: string, options: GitOptions = {}): Promise<void> {
  const local = { ...options, cwd: dir }
  if (await runGit(['rev-parse', '--is-shallow-repository'], local) === 'true') await runGit(['fetch', '--unshallow', '--no-tags', 'origin'], local)
}

/**
 * Describe work in a checkout that a reset or a delete would lose.
 * @param dir - the clone.
 * @param options - git settings.
 * @returns e.g. "uncommitted changes and commits not pushed", or undefined when there is none.
 */
export async function unsavedWork(dir: string, options: GitOptions = {}): Promise<string | undefined> {
  const local = { ...options, cwd: dir }
  const found: string[] = []
  if (await runGit(['status', '--porcelain'], local) !== '') found.push('uncommitted changes')
  if (await runGit(['log', '--branches', '--not', '--remotes', '--oneline'], local) !== '') found.push('commits not pushed')
  return found.length === 0 ? undefined : found.join(' and ')
}

/**
 * Bring an edited clone to the remote's latest commit without ever discarding
 * work: a fast-forward only, refused while anything is uncommitted.
 * @param dir - the clone.
 * @param options - token and deadline.
 * @returns the commit before and after.
 * @throws {GitError} `failed` when there are uncommitted changes, or the branch has commits the remote does not.
 */
export async function fastForward(dir: string, options: GitOptions = {}): Promise<{ before: string, after: string }> {
  const local = { ...options, cwd: dir }
  const before = await runGit(['rev-parse', 'HEAD'], local)
  if (await runGit(['status', '--porcelain'], local) !== '') throw new GitError('failed', 'This bundle has uncommitted changes. Commit or discard them in its workspace, then update.')
  await runGit(['fetch', '--no-tags', 'origin'], local)
  try {
    await runGit(['merge', '--ff-only', 'FETCH_HEAD'], local)
  } catch {
    throw new GitError('failed', 'This bundle has commits the remote does not have. Push or rebase them in its workspace, then update.')
  }
  const after = await runGit(['rev-parse', 'HEAD'], local)
  return { before, after }
}

/**
 * Bring an existing shallow clone to the remote's latest commit of its branch.
 * Local edits are refused rather than overwritten.
 * @param dir - the clone.
 * @param options - token and deadline.
 * @param force - discard local edits.
 * @returns the commit before and after.
 * @throws {GitError} `failed` when the checkout has local changes and `force` is off.
 */
export async function pull(dir: string, options: GitOptions = {}, force = false): Promise<{ before: string, after: string }> {
  const local = { ...options, cwd: dir }
  const before = await runGit(['rev-parse', 'HEAD'], local)
  if (!force) {
    const dirty = await runGit(['status', '--porcelain', '--untracked-files=no'], local)
    if (dirty !== '') throw new GitError('failed', 'The local copy has edits. Commit or discard them, or update with force to overwrite.')
  }
  await runGit(['fetch', '--depth', '1', '--no-tags', 'origin'], local)
  await runGit(['reset', '--hard', 'FETCH_HEAD'], local)
  const after = await runGit(['rev-parse', 'HEAD'], local)
  return { before, after }
}
