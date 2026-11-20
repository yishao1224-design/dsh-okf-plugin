/**
 * The Team Wiki: one hub repository holding every project's OKF bundle, with
 * the projects listed in its AGENTS.md registry (see registry.ts), a shared
 * `scripts/okf.py` and `skills/kb-*`, and `published/Projects/<project>/`
 * (pages kb-publish renders for people, synced to the Azure DevOps wiki after
 * merge). Without a registry, every folder holding a SCHEMA.md under the wiki
 * root (default: the repository root) is a project.
 *
 *     <libraryDir>/team/
 *       team.json          the connected repository + maintenance workspaces
 *       main/              a clone of the base branch, read for the page (never edited)
 *       work/<id>/         one clone per maintenance workspace, on its own wiki/… branch
 *
 * The page lists the project wikis with their review counts (read from
 * `main/`), the open pull requests that touch each one (GitHub REST for the
 * list and checks; git itself for the files and the auto-merge verdict, the
 * same {@link judge} CI runs), and starts two kinds of work:
 *
 * - **Maintain** clones the repository into `work/<id>` on a new branch and
 *   registers the project wiki there as a library entry with `workspace` set,
 *   so the session the browser opens in that DSH Workspace may edit it.
 * - **New project wiki** does the same, then scaffolds the folder with
 *   `okf.py init` and opens the setup as the first pull request.
 *
 * **Open pull request** runs the repository's own toolchain (`links`, `index`,
 * `lint`, `log`) over the workspace, resets any reviewed page that was edited
 * without resetting its stamp, commits only the project wiki's folder, pushes
 * the branch and opens or updates the pull request, labelled for auto-merge
 * when the change only touches unreviewed pages.
 *
 * Tokens come from the same variables as the library (`DSH_OKF_GITHUB_TOKEN`,
 * `DSH_OKF_AZURE_TOKEN`, `DSH_OKF_GIT_TOKEN`) and travel as a git
 * `http.extraHeader` through `GIT_CONFIG_*`, never argv, URL or config.
 */
import { randomBytes } from 'node:crypto'
import { copyFile, cp, mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { judge } from './eligibility.ts'
import type { ChangedFile } from './eligibility.ts'
import { parsePage, text as metaText } from './frontmatter.ts'
import { parseRemote } from './git.ts'
import { addRegistryRow, parseRegistry } from './registry.ts'
import { suggestPr } from './summary.ts'
import type { SummaryFile } from './summary.ts'
import { adoName, publishedDir, publishedProject, renderBundle, webUrl } from './publish.ts'
import type { BundleFile } from './publish.ts'
import { GitHub, parseGitHubRemote } from './github.ts'
import { canonical, cleanRepoPath, LibraryError, TOKEN_ENV } from './library.ts'
import type { Library } from './library.ts'
import { describeReview, joinPage, reviewState, setKeys, splitPage, stampAgentEdit, today } from './review.ts'
import { run, RunError } from './run.ts'
import type {
  ChangedPage, ChangesAnswer, GitProvider, LibraryEntry, MaintainAnswer, MaintainRecord, OpenPrAnswer, ProjectWiki, PublishAnswer,
  PullsAnswer, PullView, TeamConfig, TeamStatus, WikiDetail, WikiPage, WikiStats,
} from '../types/okf.ts'

/** Team Wiki settings from the plugin row. */
export interface TeamOptions {
  /** `<libraryDir>/team`. */
  readonly dir: string
  readonly library: Library
  readonly git: string
  readonly python: string
  /** The toolchain script, relative to the repository. */
  readonly okfScript: string
  /**
   * What Set up the hub writes: a folder copied as is, plus single files
   * (repository path → source file), e.g. the CI checker and the workflows.
   */
  readonly hubTemplate?: { readonly dir: string, readonly files: Readonly<Record<string, string>> }
  readonly githubHost: string
  readonly githubApi: string
  /** Label set on eligible pull requests; `''` sets none. */
  readonly autoMergeLabel: string
  /** `generated.by` written when a reviewed page is reset. */
  readonly agentActor: string
  /** `Name <email>` used when the repository has no committer identity. */
  readonly commitAuthor: string
  readonly timeoutMs: number
  /** Environment to read tokens from (a seam for tests). */
  readonly env?: NodeJS.ProcessEnv
  /** A repository to connect when none is yet (row config `team:`). */
  readonly preset?: { readonly url: string, readonly ref?: string, readonly root?: string }
}

/** The state file. */
interface TeamFile {
  v: 1
  team?: TeamConfig
  base?: string
  commit?: string
  refreshedAt?: string
  /** The repository has no commits yet (Set up the hub fills it). */
  empty?: boolean
  maintains: MaintainRecord[]
}

/** The Team Wiki service the routes call. */
export interface Team {
  status(): Promise<TeamStatus>
  connect(request: { url: string, ref?: string, root?: string }): Promise<TeamStatus>
  refresh(): Promise<TeamStatus>
  wiki(folder: string): Promise<WikiDetail>
  pulls(force?: boolean): Promise<PullsAnswer>
  create(request: CreateRequest): Promise<MaintainAnswer>
  maintain(folder: string): Promise<MaintainAnswer>
  changes(id: string): Promise<ChangesAnswer>
  openPr(id: string, request: { title?: string, summary?: string }): Promise<OpenPrAnswer>
  /** Fill an empty repository with the hub skeleton and push it as the base branch's first commit. */
  setupHub(): Promise<TeamStatus>
  /** kb-publish: render the bundle into published/Projects/ and open its pull request. */
  publish(folder: string): Promise<PublishAnswer>
  /** Check out the project's code read-only in its workspace and write the read-through task. */
  initialize(folder: string): Promise<MaintainAnswer>
  /**
   * A read-only library entry for a project wiki on the base branch (the
   * `main/` checkout), so any session can attach it from the OKF chip.
   */
  attach(folder: string): Promise<LibraryEntry>
}

/** A project as the registry (or a folder scan) names it. */
interface ProjectInfo {
  readonly folder: string
  readonly name: string
  readonly registered: boolean
  readonly repo?: string
  readonly summary?: string
  readonly owner?: string
}

/** What New project wiki takes. */
export interface CreateRequest {
  readonly name: string
  readonly folder?: string
  readonly template?: string
  /** The project's code repository, for the registry row. */
  readonly repo?: string
  readonly owner?: string
  readonly summary?: string
  /** Also check out the code repository and hand the session the read-through task. */
  readonly initialize?: boolean
}

export { publishedDir } from './publish.ts'

/** Folders inside a bundle that are never project wikis of their own. */
const BUNDLE_PARTS = new Set(['concepts', 'entities', 'comparisons', 'queries', 'archive', 'sources'])
/** Top-level folders okf.py never treats as bundles. */
const NON_BUNDLE_DIRS = new Set(['.git', '.github', '.claude', '.agents', '.cursor', 'node_modules', 'scripts', 'skills', 'dist', '__pycache__'])
/** How long a pull request list is served from memory. */
const PULLS_TTL_MS = 60_000
/** Pages read per wiki, at most. */
const PAGE_CAP = 5000

/**
 * Whether a path is a file.
 * @param path - the path.
 * @returns true for an existing file.
 */
async function isFile(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile()
  } catch {
    return false
  }
}

/**
 * Whether a path exists.
 * @param path - the path.
 * @returns true when something is there.
 */
async function exists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

/**
 * A folder name for a project wiki.
 * @param value - a name or folder.
 * @returns lowercase ASCII letters, digits and dashes.
 */
export function wikiSlug(value: string): string {
  return value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
}

/**
 * `payments-ops` → `Payments Ops`.
 * @param value - a folder or repository name.
 * @returns a display name.
 */
function humanize(value: string): string {
  return value.split(/[-_\s]+/).filter(Boolean).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

/**
 * A short display name for a remote.
 * @param url - the remote.
 * @returns e.g. `github.com/acme/team-wiki`.
 */
export function remoteName(url: string): string {
  const text = url.trim().replace(/\.git$/, '')
  const scp = /^[\w.-]+@([\w.-]+):(.+)$/.exec(text)
  if (scp !== null && !text.includes('://')) return `${scp[1] ?? ''}/${scp[2] ?? ''}`
  try {
    const parsed = new URL(text)
    return parsed.protocol === 'file:' ? parsed.pathname : `${parsed.hostname}${parsed.pathname}`
  } catch {
    return text
  }
}

/** A compact local timestamp for ids and branches: `20261119-0932`. */
function stamp(): string {
  const now = new Date()
  const pad = (value: number): string => String(value).padStart(2, '0')
  return `${String(now.getFullYear())}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`
}

/**
 * Parse `git diff --name-status -z` output.
 * @param output - the raw output.
 * @returns paths with their change.
 */
function parseNameStatus(output: string): { path: string, status: ChangedFile['status'] }[] {
  const parts = output.split('\0')
  const out: { path: string, status: ChangedFile['status'] }[] = []
  for (let index = 0; index + 1 < parts.length; index += 2) {
    const code = parts[index] ?? ''
    const path = parts[index + 1] ?? ''
    if (path === '') continue
    out.push({ path, status: code.startsWith('A') ? 'added' : code.startsWith('D') ? 'deleted' : 'modified' })
  }
  return out
}

/**
 * Parse `git status --porcelain=v1 -z` output.
 * @param output - the raw output.
 * @returns paths with their two status letters.
 */
function parseStatus(output: string): { path: string, code: string }[] {
  const out: { path: string, code: string }[] = []
  const parts = output.split('\0')
  for (let index = 0; index < parts.length; index += 1) {
    const entry = parts[index] ?? ''
    if (entry.length < 4) continue
    const code = entry.slice(0, 2)
    out.push({ path: entry.slice(3), code })
    if (code.includes('R') || code.includes('C')) index += 1
  }
  return out
}

/**
 * Whether a bundle-relative page path is a wiki page the counts include.
 * @param rel - the path.
 * @returns false for index.md, log.md, captures and archived pages.
 */
function countsAsPage(rel: string): boolean {
  if (!rel.endsWith('.md')) return false
  if (rel === 'index.md' || rel === 'log.md') return false
  return !rel.startsWith('sources/') && !rel.startsWith('archive/')
}

/**
 * Read every page of a project wiki with its review state.
 * @param dir - the wiki folder on disk.
 * @returns the pages, sorted by path.
 */
export async function readWikiPages(dir: string): Promise<WikiPage[]> {
  const pages: WikiPage[] = []
  const now = today()
  const walk = async (folder: string, rel: string): Promise<void> => {
    let entries
    try {
      entries = await readdir(folder, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (pages.length >= PAGE_CAP) return
      if (entry.name.startsWith('.')) continue
      const path = rel === '' ? entry.name : `${rel}/${entry.name}`
      const full = join(folder, entry.name)
      if (entry.isDirectory()) {
        if (rel === '' && (entry.name === 'sources' || entry.name === 'archive')) continue
        // A nested project wiki is listed on its own.
        if (rel === '' && !BUNDLE_PARTS.has(entry.name) && await isFile(join(full, 'SCHEMA.md'))) continue
        await walk(full, path)
        continue
      }
      if (!countsAsPage(path)) continue
      let source: string
      try {
        source = await readFile(full, 'utf8')
      } catch {
        continue
      }
      const meta = parsePage(source).meta
      const review = reviewState(source)
      const staleAfter = metaText(meta, 'stale_after')
      const overdue = review.lifecycle === 'needs_review' || (staleAfter !== undefined && staleAfter.slice(0, 10) < now)
      const type = metaText(meta, 'type')
      pages.push({
        path,
        title: metaText(meta, 'title') ?? path,
        ...type === undefined ? {} : { type },
        ...review.lifecycle === undefined ? {} : { lifecycle: review.lifecycle },
        review: review.state,
        ...review.reviewer === undefined ? {} : { reviewer: review.reviewer },
        ...review.reviewedAt === undefined ? {} : { reviewedAt: review.reviewedAt },
        ...review.generatedBy === undefined ? {} : { generatedBy: review.generatedBy },
        ...review.generatedAt === undefined ? {} : { generatedAt: review.generatedAt },
        ...staleAfter === undefined ? {} : { staleAfter },
        overdue,
      })
    }
  }
  await walk(dir, '')
  return pages.sort((a, b) => a.path.localeCompare(b.path))
}

/**
 * Count a wiki's pages by review state.
 * @param pages - its pages.
 * @returns the counts.
 */
export function statsOf(pages: readonly WikiPage[]): WikiStats {
  return {
    pages: pages.length,
    reviewed: pages.filter(page => page.review === 'reviewed').length,
    unreviewed: pages.filter(page => page.review === 'unreviewed').length,
    overdue: pages.filter(page => page.overdue).length,
  }
}

/**
 * Find the project wikis in a checkout: the wiki folder itself when it holds a
 * SCHEMA.md, and each folder directly under it that does. With an empty root,
 * every top-level folder holding a SCHEMA.md (okf.py's own detection rule).
 * @param repo - the checkout.
 * @param root - the wiki folder, repository-relative.
 * @returns repository-relative folders, sorted.
 */
export async function discoverWikis(repo: string, root: string): Promise<string[]> {
  const base = root === '' ? repo : join(repo, root)
  const found: string[] = []
  if (root !== '' && await isFile(join(base, 'SCHEMA.md'))) found.push(root)
  let entries
  try {
    entries = await readdir(base, { withFileTypes: true })
  } catch {
    return found
  }
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue
    if (BUNDLE_PARTS.has(entry.name) || (root === '' && NON_BUNDLE_DIRS.has(entry.name))) continue
    if (await isFile(join(base, entry.name, 'SCHEMA.md'))) found.push(root === '' ? entry.name : `${root}/${entry.name}`)
  }
  return found.sort()
}

/**
 * The display name of a project wiki: SCHEMA.md's `wiki_name` extension key,
 * else its folder name, else (for a wiki at the repository's wiki root) the
 * repository name.
 * @param repo - the checkout.
 * @param folder - the wiki folder.
 * @param repoName - the repository name.
 * @returns the name.
 */
async function wikiName(repo: string, folder: string, repoName: string): Promise<string> {
  try {
    const named = metaText(parsePage(await readFile(join(repo, folder, 'SCHEMA.md'), 'utf8')).meta, 'wiki_name')
    if (named !== undefined && named.trim() !== '') return named.trim()
  } catch { /* fall through */ }
  const last = folder.split('/').at(-1) ?? folder
  return humanize(last === 'okf' || last === '' ? repoName : last)
}

/**
 * Open the Team Wiki service.
 * @param options - folders, toolchain and GitHub settings.
 * @returns the service.
 */
export function openTeam(options: TeamOptions): Team {
  const file = join(options.dir, 'team.json')
  const mainDir = join(options.dir, 'main')
  const workDir = join(options.dir, 'work')
  const env = options.env ?? process.env
  let queue: Promise<unknown> = Promise.resolve()
  let pullsCache: { at: number, answer: PullsAnswer } | undefined
  const statsCache = new Map<string, { commit: string, wiki: ProjectWiki, pages: WikiPage[] }>()

  /** Run one change after every change before it. */
  const serial = <T>(work: () => Promise<T>): Promise<T> => {
    const next = queue.then(work, work)
    queue = next.catch(() => undefined)
    return next
  }

  const load = async (): Promise<TeamFile> => {
    try {
      const parsed = JSON.parse(await readFile(file, 'utf8')) as Partial<TeamFile>
      if (parsed.v === 1) return { ...parsed, v: 1, maintains: Array.isArray(parsed.maintains) ? parsed.maintains : [] }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error
    }
    return { v: 1, maintains: [] }
  }

  const save = async (data: TeamFile): Promise<void> => {
    await mkdir(options.dir, { recursive: true })
    const temp = `${file}.${randomBytes(4).toString('hex')}.tmp`
    await writeFile(temp, `${JSON.stringify(data, null, 2)}\n`)
    for (let attempt = 0; ; attempt += 1) {
      try {
        await rename(temp, file)
        return
      } catch (error) {
        if (attempt >= 4 || !['EPERM', 'EBUSY', 'EACCES'].includes(String((error as NodeJS.ErrnoException).code))) throw error
        await new Promise((done) => { setTimeout(done, 40) })
      }
    }
  }

  const tokenFor = (provider: GitProvider): string | undefined => TOKEN_ENV[provider].map(name => env[name]?.trim()).find(value => value !== undefined && value !== '')

  const git = (cwd: string, args: string[], token?: string): Promise<string> => run(options.git, args, { cwd, timeoutMs: options.timeoutMs, ...token === undefined ? {} : { token } })

  const needTeam = (data: TeamFile): TeamConfig => {
    if (data.team === undefined) throw new LibraryError('no-team', 'Connect the team wiki repository first.', 409)
    return data.team
  }

  const baseOf = (data: TeamFile): string => data.team?.ref ?? data.base ?? 'main'

  const repoName = (team: TeamConfig): string => remoteName(team.url).split('/').at(-1) ?? 'wiki'

  /**
   * The projects in a checkout: the hub's AGENTS.md registry when it has one,
   * else every folder holding a SCHEMA.md under the wiki root.
   */
  const projectsIn = async (repo: string, team: TeamConfig): Promise<ProjectInfo[]> => {
    const registry = parseRegistry(await readFile(join(repo, 'AGENTS.md'), 'utf8').catch(() => ''))
    if (registry !== undefined && registry.entries.length > 0) {
      return registry.entries.map(entry => ({
        folder: entry.bundle,
        name: entry.project,
        registered: true,
        ...entry.repo === undefined ? {} : { repo: entry.repo },
        ...entry.summary === undefined ? {} : { summary: entry.summary },
        ...entry.owner === undefined ? {} : { owner: entry.owner },
      }))
    }
    const folders = await discoverWikis(repo, team.root)
    return Promise.all(folders.map(async folder => ({ folder, name: await wikiName(repo, folder, repoName(team)), registered: false })))
  }

  /** When a project's published pages last changed on the base branch. */
  const publishedOf = async (name: string): Promise<ProjectWiki['published']> => {
    const path = publishedDir(name)
    if (!(await exists(join(mainDir, ...path.split('/')))) && !(await isFile(join(mainDir, ...`${path}.md`.split('/'))))) return undefined
    const updated = await git(mainDir, ['log', '-1', '--format=%cs', '--', path, `${path}.md`]).catch(() => '')
    return { path, ...updated === '' ? {} : { updated } }
  }

  /** Every project wiki on the base branch, with counts (cached per commit). */
  const listWikis = async (data: TeamFile): Promise<{ wiki: ProjectWiki, pages: WikiPage[] }[]> => {
    if (data.team === undefined || !(await exists(mainDir))) return []
    const team = data.team
    const commit = data.commit ?? ''
    const projects = await projectsIn(mainDir, team)
    const out: { wiki: ProjectWiki, pages: WikiPage[] }[] = []
    for (const project of projects) {
      const folder = project.folder
      const open = data.maintains.find(record => record.wiki === folder && record.closed === undefined)
      const cached = statsCache.get(folder)
      if (cached !== undefined && cached.commit === commit && commit !== '') {
        out.push({ wiki: { ...cached.wiki, ...open === undefined ? {} : { maintainId: open.id } }, pages: cached.pages })
        continue
      }
      const missing = !(await exists(join(mainDir, ...folder.split('/'))))
      const pages = missing ? [] : await readWikiPages(join(mainDir, ...folder.split('/')))
      const published = await publishedOf(project.name)
      const base: ProjectWiki = { ...project, stats: statsOf(pages), ...missing ? { missing: true } : {}, ...published === undefined ? {} : { published } }
      statsCache.set(folder, { commit, wiki: base, pages })
      out.push({ wiki: { ...base, ...open === undefined ? {} : { maintainId: open.id } }, pages })
    }
    return out
  }

  const status = async (): Promise<TeamStatus> => {
    let data = await load()
    if (data.team === undefined && options.preset !== undefined) {
      try {
        return await connect(options.preset)
      } catch (error) {
        console.warn('[okf] team wiki preset could not be connected:', error)
        data = await load()
      }
    }
    const wikis = (await listWikis(data)).map(item => item.wiki)
    // Records whose workspace a person deleted by hand are not offered again.
    const maintains = data.maintains.filter(record => record.closed === undefined)
    return {
      ...data.team === undefined ? {} : { team: data.team, baseBranch: baseOf(data) },
      ...data.commit === undefined ? {} : { commit: data.commit },
      ...data.empty === true ? { empty: true } : {},
      ...data.refreshedAt === undefined ? {} : { refreshedAt: data.refreshedAt },
      wikis,
      maintains,
      hasToken: data.team === undefined ? false : tokenFor(data.team.provider) !== undefined,
    }
  }

  /** Bring `main/` to the remote's base branch. */
  const syncMain = async (data: TeamFile): Promise<void> => {
    const team = needTeam(data)
    const token = tokenFor(team.provider)
    const base = baseOf(data)
    try {
      await git(mainDir, ['fetch', '--quiet', '--prune', 'origin', `+refs/heads/${base}:refs/remotes/origin/${base}`], token)
    } catch (error) {
      // An empty repository has no branch to fetch yet.
      const heads = await git(mainDir, ['ls-remote', '--heads', 'origin'], token).catch(() => undefined)
      if (heads !== '') throw error
      Object.assign(data, { empty: true, commit: undefined, refreshedAt: new Date().toISOString() })
      return
    }
    await git(mainDir, ['checkout', '--quiet', '--force', '--detach', `origin/${base}`])
    data.commit = await git(mainDir, ['rev-parse', 'HEAD'])
    data.refreshedAt = new Date().toISOString()
    delete data.empty
  }

  const connect = (request: { url: string, ref?: string, root?: string }): Promise<TeamStatus> => serial(async () => {
    const remote = (() => {
      try {
        return parseRemote(request.url)
      } catch (error) {
        throw new LibraryError('bad-url', (error as Error).message)
      }
    })()
    const ref = request.ref?.trim() || undefined
    if (ref !== undefined && (ref.startsWith('-') || /\s|\.\./.test(ref))) throw new LibraryError('bad-ref', 'That is not a branch name.')
    const root = cleanRepoPath(request.root ?? '') ?? ''
    // A GitHub Enterprise host is GitHub too: its pull requests and token are GitHub's.
    const provider: GitProvider = parseGitHubRemote(request.url, options.githubHost) !== undefined ? 'github' : remote.provider
    const token = tokenFor(provider)
    await mkdir(options.dir, { recursive: true })
    const temp = join(options.dir, `main.${randomBytes(3).toString('hex')}.tmp`)
    const clone = (branch: string | undefined): Promise<string> => git(options.dir, ['clone', '--quiet', '--filter=blob:none', ...branch === undefined ? [] : ['--branch', branch], '--', request.url.trim(), temp], token)
    try {
      await clone(ref)
    } catch (error) {
      await rm(temp, { recursive: true, force: true })
      if (ref === undefined) throw error
      // `--branch` fails on an empty repository; a plain clone tells the two apart.
      const empty = await clone(undefined).then(async () => git(temp, ['rev-parse', '--verify', '--quiet', 'HEAD']).then(() => false, () => true), () => false)
      if (!empty) {
        await rm(temp, { recursive: true, force: true })
        throw error
      }
    }
    await rm(mainDir, { recursive: true, force: true })
    await rename(temp, mainDir)
    const data = await load()
    // A new, empty repository clones fine but has no commit and no branch yet.
    const empty = await git(mainDir, ['rev-parse', '--verify', '--quiet', 'HEAD']).then(() => false, () => true)
    const base = ref ?? (empty
      ? 'main'
      : await git(mainDir, ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD']).then(value => value.replace(/^origin\//, ''), () => undefined)
        ?? await git(mainDir, ['rev-parse', '--abbrev-ref', 'HEAD']))
    // Workspaces of another repository are not this hub's: they leave the list (their folders stay on disk).
    if (data.team !== undefined && data.team.url !== request.url.trim()) {
      for (const record of data.maintains) if (record.closed === undefined) Object.assign(record, { closed: 'closed' })
    }
    data.team = { url: request.url.trim(), provider, ...ref === undefined ? {} : { ref }, root, name: remoteName(request.url), connectedAt: new Date().toISOString() }
    data.base = base
    if (empty) {
      data.empty = true
      delete data.commit
    } else {
      delete data.empty
      await git(mainDir, ['checkout', '--quiet', '--detach'])
      data.commit = await git(mainDir, ['rev-parse', 'HEAD'])
    }
    data.refreshedAt = new Date().toISOString()
    statsCache.clear()
    pullsCache = undefined
    await save(data)
    return status()
  })

  const refresh = (): Promise<TeamStatus> => serial(async () => {
    const data = await load()
    await syncMain(data)
    pullsCache = undefined
    await save(data)
    return status()
  })

  const wiki = async (folder: string): Promise<WikiDetail> => {
    const data = await load()
    const found = (await listWikis(data)).find(item => item.wiki.folder === folder)
    if (found === undefined) throw new LibraryError('unknown-wiki', `There is no project wiki at ${folder} on the base branch.`, 404)
    return { wiki: found.wiki, pages: found.pages }
  }

  /** Which project wiki a repository path belongs to, if any. */
  const wikiOfPath = (path: string, projects: readonly ProjectInfo[], added: readonly string[]): string | undefined => {
    // Pages kb-publish rendered for a project belong to that project.
    const published = publishedProject(path)
    if (published !== undefined) {
      return projects.find(project => adoName(project.name) === published || wikiSlug(project.name) === wikiSlug(published))?.folder
    }
    // A wiki the pull request adds is not on the base branch yet: its new SCHEMA.md marks it.
    const known = [...projects.map(project => project.folder), ...added]
    return known.sort((a, b) => b.length - a.length).find(folder => folder === '' || path.startsWith(`${folder}/`))
  }

  /** Files of a commit range, with the text before and after. */
  const changedFiles = async (repo: string, from: string, to: string | undefined, token: string | undefined): Promise<ChangedFile[]> => {
    const listing = parseNameStatus(await git(repo, ['diff', '--name-status', '--no-renames', '-z', from, ...to === undefined ? [] : [to]], token))
    const files: ChangedFile[] = []
    for (const change of listing) {
      const before = change.status === 'added' ? undefined : await git(repo, ['show', `${from}:${change.path}`], token).catch(() => undefined)
      const after = change.status === 'deleted'
        ? undefined
        : to === undefined
          ? await readFile(join(repo, change.path), 'utf8').catch(() => undefined)
          : await git(repo, ['show', `${to}:${change.path}`], token).catch(() => undefined)
      files.push({ path: change.path, status: change.status, ...before === undefined ? {} : { before }, ...after === undefined ? {} : { after } })
    }
    return files
  }

  const pulls = (force = false): Promise<PullsAnswer> => {
    if (!force && pullsCache !== undefined && Date.now() - pullsCache.at < PULLS_TTL_MS) return Promise.resolve(pullsCache.answer)
    return serial(async () => {
      const data = await load()
      const team = needTeam(data)
      const at = new Date().toISOString()
      const target = team.provider === 'github' ? parseGitHubRemote(team.url, options.githubHost) : undefined
      if (target === undefined) {
        return { pulls: [], at, note: team.provider === 'azure-devops' ? 'azure' : 'not-github' }
      }
      const token = tokenFor(team.provider)
      const github = new GitHub(options.githubApi, token, target)
      const base = baseOf(data)
      const open = (await github.openPulls()).filter(pull => pull.baseRef === base)
      const projects = await projectsIn(mainDir, team)
      let note: string | undefined
      try {
        await git(mainDir, ['fetch', '--quiet', 'origin', `+refs/heads/${base}:refs/remotes/origin/${base}`, ...open.map(pull => `+refs/pull/${String(pull.number)}/head:refs/okf-pr/${String(pull.number)}`)], token)
      } catch (error) {
        note = `fetch-failed: ${(error as Error).message}`
      }
      const views: PullView[] = []
      for (const pull of open) {
        const ref = `refs/okf-pr/${String(pull.number)}`
        let files: ChangedFile[] = []
        let judged = false
        try {
          const mergeBase = await git(mainDir, ['merge-base', `origin/${base}`, ref])
          files = await changedFiles(mainDir, mergeBase, ref, token)
          judged = true
        } catch { /* listed without a verdict */ }
        const added = files.filter(file => file.status === 'added' && file.path.endsWith('/SCHEMA.md')).map(file => file.path.slice(0, -'/SCHEMA.md'.length))
        const wikis = [...new Set(files.map(file => wikiOfPath(file.path, projects, added)).filter((folder): folder is string => folder !== undefined))]
        const record = data.maintains.find(candidate => candidate.branch === pull.headRef)
        if (judged && wikis.length === 0 && record === undefined) continue
        let eligible = false
        let reasons: string[]
        if (!judged) {
          reasons = ['its changes could not be read']
        } else if (wikis.length > 1) {
          reasons = [`touches ${String(wikis.length)} project wikis: ${wikis.join(', ')}`]
        } else {
          const verdict = judge(wikis[0] ?? team.root, files)
          eligible = verdict.eligible
          reasons = verdict.reasons
        }
        const checks = await github.checks(pull.headSha).catch(() => 'unknown' as const)
        views.push({
          number: pull.number,
          title: pull.title,
          url: pull.url,
          author: pull.author,
          draft: pull.draft,
          branch: pull.headRef,
          updatedAt: pull.updatedAt,
          labels: pull.labels,
          wikis,
          checks,
          eligible,
          reasons,
          files: files.length,
          ...record === undefined ? {} : { maintainId: record.id },
        })
      }
      // A maintenance workspace whose pull request merged or closed is done.
      let changed = false
      let merged = false
      for (const record of data.maintains) {
        if (record.pr === undefined || record.closed !== undefined || open.some(pull => pull.number === record.pr?.number)) continue
        const state = await github.pullState(record.pr.number).catch(() => 'open' as const)
        if (state === 'open') continue
        Object.assign(record, { closed: state })
        changed = true
        if (state === 'merged') merged = true
      }
      // A merged pull request moved the base branch: bring main/ up to it so
      // the wiki list shows what merged without a manual refresh.
      let mainMoved = false
      if (merged) {
        const before = data.commit
        try {
          await syncMain(data)
          mainMoved = data.commit !== before
        } catch (error) {
          console.warn('[okf] could not update the base branch after a merge:', error)
        }
      }
      if (changed) await save(data)
      const answer: PullsAnswer = { pulls: views, at, ...note === undefined ? {} : { note }, ...changed || mainMoved ? { statusChanged: true } : {} }
      // Later cached reads have nothing new to report.
      pullsCache = { at: Date.now(), answer: { pulls: views, at, ...note === undefined ? {} : { note } } }
      return answer
    })
  }

  /** The library entry that lets a session in the workspace edit the wiki. */
  const entryFor = (record: MaintainRecord): LibraryEntry => ({
    id: record.entryId,
    name: `${record.wikiName} · maintain`,
    root: join(record.workspace, ...record.wiki.split('/')),
    origin: { kind: 'local' },
    addedAt: record.createdAt,
    workspace: record.workspace,
    team: { maintainId: record.id, wiki: record.wiki, project: record.wikiName },
  })

  /**
   * Check out a project's code repository read-only at `.code/<folder>/` in its
   * maintenance workspace (git-ignored there), and write the session's
   * read-through task.
   */
  const checkoutCode = async (record: MaintainRecord): Promise<NonNullable<MaintainAnswer['initialize']>> => {
    const registry = parseRegistry(await readFile(join(record.workspace, 'AGENTS.md'), 'utf8').catch(() => ''))
    const entry = registry?.entries.find(item => item.bundle === record.wiki)
    const url = entry?.repo
    if (url === undefined || !/^(https?:\/\/|[\w.-]+@[\w.-]+:|ssh:\/\/)/.test(url)) {
      throw new LibraryError('no-repo', `${record.wikiName} has no code repository URL in the AGENTS.md registry. Add it to the Repo column first.`, 409)
    }
    let remote: ReturnType<typeof parseRemote>
    try {
      remote = parseRemote(url)
    } catch (error) {
      throw new LibraryError('bad-url', (error as Error).message)
    }
    const provider: GitProvider = parseGitHubRemote(url, options.githubHost) !== undefined ? 'github' : remote.provider
    const seg = wikiSlug(record.wiki.split('/').at(-1) ?? record.wiki) || 'code'
    const rel = `.code/${seg}`
    const target = join(record.workspace, '.code', seg)
    // Never part of a wiki pull request.
    const exclude = join(record.workspace, '.git', 'info', 'exclude')
    const excluded = await readFile(exclude, 'utf8').catch(() => '')
    if (!/^\/?\.code\/?$/m.test(excluded)) {
      await mkdir(join(exclude, '..'), { recursive: true })
      await writeFile(exclude, `${excluded.replace(/\s*$/, '')}${excluded.trim() === '' ? '' : '\n'}/.code/\n`)
    }
    await rm(target, { recursive: true, force: true })
    await mkdir(join(target, '..'), { recursive: true })
    await git(join(target, '..'), ['clone', '--quiet', '--depth', '1', '--single-branch', '--', url, seg], tokenFor(provider))
    const commit = await git(target, ['rev-parse', 'HEAD'])
    const date = today()
    const folder = record.wiki
    const resource = /^https?:\/\//.test(url) ? `${webUrl(url)}/blob/${commit}/<path>` : `${url} at ${commit}, <path>`
    const prompt = [
      `Initialize the ${record.wikiName} project wiki (the OKF bundle \`${folder}/\`) from the project's code.`,
      '',
      `The code is checked out read-only at \`${rel}/\` (${url} at ${commit.slice(0, 10)}). Read it through before writing:`,
      '1. Survey: the directory tree, README and docs, build and dependency files, entry points, configuration, CI, and tests.',
      '2. Then read the main modules in full, following the code from the entry points.',
      '',
      `Write these pages in \`${folder}/\`, following its SCHEMA.md, all as unreviewed drafts (status: draft, lifecycle: draft, generated: { by: ${options.agentActor}, at: ${date} }):`,
      '- an overview: what the project is for, who uses it, its main flows;',
      '- the architecture: the components, how they talk to each other, where data lives;',
      '- one page per main module or service: its job, key files, interfaces and dependencies;',
      '- the data model and the important entities;',
      '- how to build, run, test and deploy it, with the exact commands;',
      '- conventions, pitfalls and open questions you noticed.',
      '',
      `Back every claim with the code: capture the few key files (README, main configuration, schemas) as dated files under \`${folder}/sources/\`, and list what a page relies on in its \`sources\` (resource: ${resource}). Summarize; do not copy code wholesale.`,
      `Link the pages to each other and from index.md, then run \`python scripts/okf.py links --bundle ${folder}\`, \`index\` and \`lint\`, and fix what lint reports.`,
      `Never edit anything under \`.code/\`. When you are done, give me a short summary of what you wrote and what you were unsure about; I will press Open pull request.`,
    ].join('\n')
    return { code: rel, repo: url, commit, prompt }
  }

  const initialize = async (folder: string): Promise<MaintainAnswer> => {
    const opened = await maintain(folder).catch(async (error: unknown) => {
      // A project still in its setup pull request is not on the base branch: use its open workspace.
      const data = await load()
      const record = data.maintains.find(item => item.wiki === folder && item.closed === undefined)
      if (record === undefined) throw error
      return { record, entry: await options.library.put(entryFor(record)), workspace: record.workspace, created: false }
    })
    const init = await serial(() => checkoutCode(opened.record))
    return { ...opened, initialize: init }
  }

  /** Clone the repository into a fresh maintenance workspace on a new branch. */
  const newWorkspace = async (data: TeamFile, folder: string, name: string, isNew: boolean): Promise<MaintainRecord> => {
    const team = needTeam(data)
    const token = tokenFor(team.provider)
    const base = baseOf(data)
    const seg = wikiSlug(folder.split('/').at(-1) ?? folder) || 'wiki'
    const suffix = randomBytes(2).toString('hex')
    const id = `${seg}-${stamp()}-${suffix}`
    const branch = isNew ? `wiki/new-${seg}-${suffix}` : `wiki/${seg}-${stamp().replace('-', '')}-${suffix}`
    await mkdir(workDir, { recursive: true })
    const target = join(workDir, id)
    try {
      await git(workDir, ['clone', '--quiet', '--filter=blob:none', '--branch', base, '--', team.url, target], token)
      await git(target, ['switch', '--quiet', '-c', branch])
    } catch (error) {
      await rm(target, { recursive: true, force: true })
      throw error
    }
    const record: MaintainRecord = {
      id,
      wiki: folder,
      wikiName: name,
      branch,
      workspace: canonical(target),
      entryId: `team-${id}`,
      createdAt: new Date().toISOString(),
      ...isNew ? { isNew: true } : {},
    }
    data.maintains.push(record)
    return record
  }

  const maintain = (folder: string): Promise<MaintainAnswer> => serial(async () => {
    const data = await load()
    const team = needTeam(data)
    const open = data.maintains.find(record => record.wiki === folder && record.closed === undefined)
    if (open !== undefined && await exists(join(open.workspace, '.git'))) {
      const entry = await options.library.put(entryFor(open))
      return { record: open, entry, workspace: open.workspace, created: false }
    }
    if (open !== undefined) Object.assign(open, { closed: 'closed' })
    const project = (await projectsIn(mainDir, team)).find(candidate => candidate.folder === folder)
    if (project === undefined || !(await exists(join(mainDir, ...folder.split('/'))))) throw new LibraryError('unknown-wiki', `There is no project wiki at ${folder} on the base branch. Refresh, or create it.`, 404)
    const record = await newWorkspace(data, folder, project.name, false)
    await save(data)
    const entry = await options.library.put(entryFor(record))
    return { record, entry, workspace: record.workspace, created: true }
  })

  const create = async (request: CreateRequest): Promise<MaintainAnswer> => {
    const answer = await serial(async () => {
      const data = await load()
      const team = needTeam(data)
      const name = request.name.trim()
      if (name === '' || name.length > 80) throw new LibraryError('bad-name', 'Give the project wiki a name (at most 80 characters).')
      const seg = wikiSlug(request.folder?.trim() || name)
      if (seg === '') throw new LibraryError('bad-folder', 'The folder name needs at least one letter or digit.')
      const folder = team.root === '' ? seg : `${team.root}/${seg}`
      const projects = await projectsIn(mainDir, team)
      if (await exists(join(mainDir, folder)) || projects.some(project => project.folder === folder)) throw new LibraryError('exists', `${folder} already exists in the team repository.`, 409)
      if (projects.some(project => project.name.toLowerCase() === name.toLowerCase())) throw new LibraryError('exists', `The registry already has a project named ${name}.`, 409)
      if (data.maintains.some(record => record.wiki === folder && record.closed === undefined)) throw new LibraryError('exists', `A workspace for ${folder} is already open. Use Maintain on it.`, 409)
      const template = request.template ?? 'default'
      let schemaFrom: string | undefined
      if (template.startsWith('copy:')) {
        schemaFrom = template.slice('copy:'.length)
        if (!projects.some(project => project.folder === schemaFrom) || !(await isFile(join(mainDir, schemaFrom, 'SCHEMA.md')))) throw new LibraryError('unknown-wiki', `There is no project wiki at ${schemaFrom} to copy SCHEMA.md from.`, 404)
      }
      const record = await newWorkspace(data, folder, name, true)
      await save(data)
      await scaffold(record.workspace, folder, name, schemaFrom === undefined ? undefined : join(mainDir, schemaFrom, 'SCHEMA.md'))
      // Register the project in the hub's AGENTS.md (created when missing).
      const agents = join(record.workspace, 'AGENTS.md')
      const before = await readFile(agents, 'utf8').catch(() => '')
      const clean = (value: string | undefined): string | undefined => (value === undefined || value.trim() === '' ? undefined : value.trim().slice(0, 300))
      const repo = clean(request.repo)
      const owner = clean(request.owner)
      const summary = clean(request.summary)
      // The first registry lists the bundles the repository already has, or they would drop out of the list.
      let source = before
      if (parseRegistry(before) === undefined) {
        for (const project of projects) source = addRegistryRow(source, { project: project.name, bundle: project.folder })
      }
      await writeFile(agents, addRegistryRow(source, { project: name, bundle: folder, ...repo === undefined ? {} : { repo }, ...owner === undefined ? {} : { owner }, ...summary === undefined ? {} : { summary } }))
      const entry = await options.library.put(entryFor(record))
      return { record, entry, workspace: record.workspace, created: true }
    })
    let init: Pick<MaintainAnswer, 'initialize' | 'initializeError'> = {}
    if (request.initialize === true) {
      init = await serial(() => checkoutCode(answer.record)).then(value => ({ initialize: value }), (error: unknown) => ({ initializeError: (error as Error).message }))
    }
    try {
      const pr = await openPr(answer.record.id, { title: `Add the ${answer.record.wikiName} project wiki`, summary: `Sets up a new project wiki at \`${answer.record.wiki}\`.` })
      const fresh = (await load()).maintains.find(record => record.id === answer.record.id) ?? answer.record
      return { ...answer, ...init, record: fresh, pr }
    } catch (error) {
      return { ...answer, ...init, prError: (error as Error).message }
    }
  }

  /** Lay out a new project wiki in a workspace. */
  const scaffold = async (repo: string, folder: string, name: string, schemaFrom: string | undefined): Promise<void> => {
    const target = join(repo, ...folder.split('/'))
    await mkdir(target, { recursive: true })
    if (schemaFrom !== undefined) await copyFile(schemaFrom, join(target, 'SCHEMA.md'))
    const script = join(repo, options.okfScript)
    if (await isFile(script)) {
      await run(options.python, [script, 'init', '--bundle', folder], { cwd: repo, timeoutMs: options.timeoutMs })
      // init also re-syncs the repository's skill copies; a wiki pull request carries only its folder.
      await git(repo, ['checkout', '--quiet', '--', '.', `:(exclude)${folder}`]).catch(() => undefined)
      await git(repo, ['clean', '-fdq', '--', '.', `:(exclude)${folder}`]).catch(() => undefined)
    } else {
      const date = today()
      if (!(await isFile(join(target, 'SCHEMA.md')))) {
        await writeFile(join(target, 'SCHEMA.md'), [
          '---', 'type: Reference', `title: ${name} — Schema & Conventions`, `description: Conventions for the ${name} project wiki.`,
          'status: draft', 'lifecycle: draft', `created: ${date}`, `updated: ${date}`, '---', '',
          `# ${name} — Schema & Conventions`, '',
          'Every page is OKF v0.2 markdown with YAML frontmatter: `type`, `title`, `description`, `status`, `lifecycle`, `updated`.',
          'Pages an agent writes are unreviewed drafts. A person marks a page reviewed by adding `verified: [{ by: human:<id>, at: <date> }]` and setting `lifecycle: active`.',
          '',
        ].join('\n'))
      }
      await writeFile(join(target, 'log.md'), `# Log\n\n## ${date}\n\n- **Creation**: set up the ${name} project wiki.\n`)
    }
    const schemaPath = join(target, 'SCHEMA.md')
    const schema = splitPage(await readFile(schemaPath, 'utf8'))
    if (schema !== undefined) {
      const values: Record<string, string[]> = { wiki_name: [`wiki_name: ${JSON.stringify(name)}`], updated: [`updated: ${today()}`] }
      await writeFile(schemaPath, joinPage({ ...schema, block: setKeys(schema.block, values) }))
    }
    if (await isFile(script)) {
      await run(options.python, [script, 'index', '--bundle', folder], { cwd: repo, timeoutMs: options.timeoutMs })
    } else if (!(await isFile(join(target, 'index.md')))) {
      await writeFile(join(target, 'index.md'), `---\nokf_version: "0.2"\n---\n\n# ${name}\n\n* [Schema & Conventions](SCHEMA.md)\n`)
    }
  }

  const findRecord = (data: TeamFile, id: string): MaintainRecord => {
    const record = data.maintains.find(candidate => candidate.id === id)
    if (record === undefined) throw new LibraryError('unknown-workspace', `No maintenance workspace "${id}".`, 404)
    return record
  }

  const changes = async (id: string): Promise<ChangesAnswer> => {
    const data = await load()
    const record = findRecord(data, id)
    const base = `origin/${baseOf(data)}`
    const mergeBase = await git(record.workspace, ['merge-base', 'HEAD', base])
    const tracked = parseNameStatus(await git(record.workspace, ['diff', '--name-status', '--no-renames', '-z', mergeBase]))
    const untracked = (await git(record.workspace, ['ls-files', '--others', '--exclude-standard', '-z'])).split('\0').filter(Boolean)
    const files: ChangedPage[] = []
    for (const change of [...tracked, ...untracked.map(path => ({ path, status: 'added' as const }))]) {
      let review: ChangedPage['review']
      if (change.status !== 'deleted' && change.path.endsWith('.md')) {
        review = await readFile(join(record.workspace, change.path), 'utf8').then(source => reviewState(source).state, () => undefined)
      }
      files.push({ path: change.path, status: change.status, ...review === undefined ? {} : { review } })
    }
    const uncommitted = parseStatus(await git(record.workspace, ['status', '--porcelain=v1', '-z', '--untracked-files=all'])).length
    const suggested = await suggestFor(record, files, mergeBase)
    return { record, files: files.sort((a, b) => a.path.localeCompare(b.path)), uncommitted, suggested }
  }

  /** The dialog's prefilled title and summary: pages by title and description, captures, published pages. */
  const suggestFor = async (record: MaintainRecord, files: readonly { path: string, status: 'added' | 'modified' | 'deleted' }[], mergeBase: string | undefined): Promise<{ title: string, summary: string }> => {
    const prefix = `${record.wiki}/`
    const own: SummaryFile[] = []
    for (const file of files) {
      if (!file.path.startsWith(prefix)) continue
      const rel = file.path.slice(prefix.length)
      let meta: Record<string, unknown> = {}
      if (rel.endsWith('.md')) {
        const source = file.status === 'deleted'
          ? (mergeBase === undefined ? undefined : await git(record.workspace, ['show', `${mergeBase}:${file.path}`]).catch(() => undefined))
          : await readFile(join(record.workspace, file.path), 'utf8').catch(() => undefined)
        if (source !== undefined) meta = parsePage(source).meta
      }
      const title = metaText(meta as never, 'title')
      const description = metaText(meta as never, 'description')
      own.push({ path: rel, status: file.status, ...title === undefined ? {} : { title }, ...description === undefined ? {} : { description } })
    }
    const pub = publishedDir(record.wikiName)
    const published = files.filter(file => file.path === `${pub}.md` || file.path.startsWith(`${pub}/`)).length
    return suggestPr(record.wikiName, own, { ...record.isNew === true ? { isNew: true } : {}, published })
  }

  const openPr = (id: string, request: { title?: string, summary?: string }): Promise<OpenPrAnswer> => serial(async () => {
    const data = await load()
    const team = needTeam(data)
    const record = findRecord(data, id)
    if (record.closed !== undefined) throw new LibraryError('closed', 'This workspace\'s pull request already merged or closed. Use Maintain to start a fresh one.', 409)
    const repo = record.workspace
    const token = tokenFor(team.provider)
    const base = baseOf(data)
    const prefix = `${record.wiki}/`
    // What a wiki pull request may carry: the bundle, the project's published pages, and (for a new project) its registry row.
    const scope = [record.wiki, publishedDir(record.wikiName), `${publishedDir(record.wikiName)}.md`, ...record.isNew === true ? ['AGENTS.md'] : []]
    const inScope = (path: string): boolean => scope.some(item => path === item || path.startsWith(`${item}/`))
    const notes: string[] = []
    let title = request.title?.trim() ?? ''
    let summary = request.summary?.trim() ?? ''

    await git(repo, ['fetch', '--quiet', 'origin', `+refs/heads/${base}:refs/remotes/origin/${base}`], token).catch(() => { notes.push(`Could not fetch origin/${base}; compared against the local copy.`) })
    const mergeBase = await git(repo, ['merge-base', 'HEAD', `origin/${base}`]).catch(() => undefined)

    // 0 · A reviewed page edited without resetting its stamp becomes an unreviewed draft.
    const stamped: string[] = []
    if (mergeBase !== undefined) {
      const pending = await changedFiles(repo, mergeBase, undefined, token)
      for (const file of pending) {
        if (!file.path.startsWith(prefix) || file.status !== 'modified' || file.before === undefined || file.after === undefined) continue
        if (!countsAsPage(file.path.slice(prefix.length)) || file.before === file.after) continue
        const before = reviewState(file.before)
        const after = reviewState(file.after)
        if (before.state !== 'reviewed' || after.state !== 'reviewed') continue
        if (after.reviewer !== before.reviewer || after.reviewedAt !== before.reviewedAt) continue
        await writeFile(join(repo, file.path), stampAgentEdit(file.after, options.agentActor, today()))
        stamped.push(file.path.slice(prefix.length))
      }
    }

    // 1 · The repository's own toolchain.
    const changed = parseStatus(await git(repo, ['status', '--porcelain=v1', '-z', '--untracked-files=all']))
    const inside = changed.filter(change => change.path.startsWith(prefix))
    const outside = changed.filter(change => !inScope(change.path))
    if (outside.length > 0) notes.push(`Left out (outside ${scope.join(', ')}): ${outside.map(change => change.path).slice(0, 20).join(', ')}`)
    const script = join(repo, options.okfScript)
    const hasScript = await isFile(script)
    const okf = (...args: string[]): Promise<string> => run(options.python, [script, ...args, '--bundle', record.wiki], { cwd: repo, timeoutMs: options.timeoutMs })
    let lint = ''
    if (hasScript && inside.length > 0) {
      await okf('links')
      await okf('index')
      try {
        lint = await okf('lint')
      } catch (error) {
        if (error instanceof RunError) {
          throw new LibraryError('lint-failed', `okf.py lint failed, so nothing was committed or pushed. Ask the session to fix these, then try again:\n${[error.stdout, error.message].filter(Boolean).join('\n').slice(0, 6000)}`, 422)
        }
        throw error
      }
      for (const change of inside) {
        const rel = change.path.slice(prefix.length)
        if (rel === 'index.md' || rel === 'log.md' || !rel.endsWith('.md')) continue
        const deleted = change.code.includes('D')
        const added = change.code.includes('?') || change.code.includes('A')
        const verb = rel.startsWith('sources/') ? 'Ingestion' : deleted ? 'Removal' : added ? 'Creation' : 'Update'
        let pageTitle = rel
        if (!deleted) {
          pageTitle = await readFile(join(repo, change.path), 'utf8').then(source => metaText(parsePage(source).meta, 'title') ?? rel, () => rel)
        }
        await okf('log', `**${verb}**: [${pageTitle.replace(/[[\]]/g, '')}](/${rel}) — ${title || record.wikiName}`)
      }
    } else if (!hasScript) {
      notes.push(`${options.okfScript} is not in the repository, so links, index, lint and log were skipped and the pull request needs a person.`)
    }

    // 2 · Commit only the project wiki's folder.
    const present: string[] = []
    for (const item of scope) {
      const tracked = await git(repo, ['ls-files', '--', item]).catch(() => '')
      if (tracked !== '' || await exists(join(repo, ...item.split('/')))) present.push(item)
    }
    await git(repo, ['add', '-A', '--', ...present])
    // Nothing typed in the dialog: describe the branch's changes from the pages themselves.
    if (summary === '' || (title === '' && record.pr === undefined)) {
      const listing = mergeBase === undefined ? [] : parseNameStatus(await git(repo, ['diff', '--cached', '--name-status', '--no-renames', '-z', mergeBase]))
      const suggested = await suggestFor(record, listing, mergeBase)
      if (summary === '') summary = suggested.summary
      if (title === '' && record.pr === undefined) title = suggested.title
    }
    const staged = await git(repo, ['diff', '--cached', '--name-only'])
    if (staged !== '') {
      const email = await git(repo, ['config', 'user.email']).catch(() => '')
      const identity = email === '' ? (/^(.*?)\s*<([^>]+)>$/.exec(options.commitAuthor) ?? []) : []
      const who = identity.length === 3 ? ['-c', `user.name=${identity[1] ?? ''}`, '-c', `user.email=${identity[2] ?? ''}`] : []
      await git(repo, [...who, 'commit', '--quiet', '-m', `${title || `Update the ${record.wikiName} wiki`}\n\n${summary}\n\nWiki-Workspace: ${record.id}`])
    }
    const ahead = mergeBase === undefined ? '1' : await git(repo, ['rev-list', '--count', `${mergeBase}..HEAD`]).catch(() => '0')
    if (ahead === '0') throw new LibraryError('nothing-changed', `Nothing in ${record.wiki} (or its published pages) has changed yet. Ask the session to write or edit pages first.`, 409)
    const commit = await git(repo, ['rev-parse', 'HEAD'])

    // 3 · Judge the whole branch against the base, as CI will.
    const files = mergeBase === undefined ? [] : await changedFiles(repo, mergeBase, 'HEAD', token)

    const verdict = judge(record.wiki, files)
    const reasons = [...verdict.reasons]
    if (!hasScript) reasons.push('lint did not run')
    if (mergeBase === undefined) reasons.push(`no common history with origin/${base}`)
    const eligible = reasons.length === 0

    // 4 · Push and open the pull request.
    let pr: OpenPrAnswer['pr']
    await git(repo, ['push', '--quiet', '-u', 'origin', `HEAD:refs/heads/${record.branch}`], token)
    const target = team.provider === 'github' ? parseGitHubRemote(team.url, options.githubHost) : undefined
    if (target === undefined) {
      notes.push(`The branch ${record.branch} is pushed. Pull requests are opened automatically on GitHub only; open this one in your Git host.`)
    } else if (token === undefined) {
      notes.push(`The branch ${record.branch} is pushed, but DSH_OKF_GITHUB_TOKEN is not set, so the pull request was not opened. Set it and press Open pull request again.`)
    } else {
      const github = new GitHub(options.githubApi, token, target)
      const body = prBody(summary, verdict.pages.map(page => ({
        path: page.path,
        status: page.status,
        before: page.before === undefined ? 'new' : describeReview(page.before),
        after: page.after === undefined ? 'deleted' : describeReview(page.after),
      })), eligible, reasons, lint, [...stamped.map(path => `Reset to an unreviewed draft because it was edited: ${path}`), ...notes], record.id)
      const opened = await github.openOrUpdate({ title, body, head: record.branch, base })
      pr = opened
      if (options.autoMergeLabel !== '') {
        await github.setLabel(opened.number, options.autoMergeLabel, eligible).catch((error: unknown) => {
          notes.push(`Could not ${eligible ? 'add' : 'remove'} the ${options.autoMergeLabel} label: ${(error as Error).message}`)
        })
      }
      Object.assign(record, { pr: { number: opened.number, url: opened.url } })
      await save(data)
    }
    pullsCache = undefined
    return { branch: record.branch, commit, files: files.map(file => file.path), eligible, reasons, pushed: true, ...pr === undefined ? {} : { pr }, stamped, notes }
  })

  const attach = async (folder: string): Promise<LibraryEntry> => {
    const detail = await wiki(folder)
    const data = await load()
    needTeam(data)
    return options.library.put({
      id: `team-${wikiSlug(folder) || 'wiki'}`,
      name: detail.wiki.name,
      root: join(canonical(mainDir), ...folder.split('/')),
      origin: { kind: 'local' },
      addedAt: data.team?.connectedAt ?? new Date().toISOString(),
      fetchedAt: data.refreshedAt ?? new Date().toISOString(),
      // No workspace: sessions only read it; changes go through Maintain.
    })
  }

  const setupHub = (): Promise<TeamStatus> => serial(async () => {
    const data = await load()
    const team = needTeam(data)
    const token = tokenFor(team.provider)
    const base = baseOf(data)
    if (options.hubTemplate === undefined) throw new LibraryError('no-template', 'This build has no hub template.', 500)
    // Only ever the first commit: a repository with any branch is left alone.
    const heads = await git(mainDir, ['ls-remote', '--heads', 'origin'], token)
    if (heads !== '') {
      await syncMain(data)
      await save(data)
      throw new LibraryError('not-empty', 'The repository is not empty any more, so it was not set up. Refresh to see what it holds.', 409)
    }
    const temp = join(options.dir, `setup.${randomBytes(3).toString('hex')}.tmp`)
    try {
      await mkdir(temp, { recursive: true })
      await git(temp, ['init', '--quiet'])
      await git(temp, ['checkout', '--quiet', '-b', base])
      await cp(options.hubTemplate.dir, temp, { recursive: true })
      for (const [path, source] of Object.entries(options.hubTemplate.files)) {
        const target = join(temp, ...path.split('/'))
        await mkdir(join(target, '..'), { recursive: true })
        await copyFile(source, target)
      }
      await git(temp, ['add', '-A'])
      const email = await git(temp, ['config', 'user.email']).catch(() => '')
      const identity = email === '' ? (/^(.*?)\s*<([^>]+)>$/.exec(options.commitAuthor) ?? []) : []
      const who = identity.length === 3 ? ['-c', `user.name=${identity[1] ?? ''}`, '-c', `user.email=${identity[2] ?? ''}`] : []
      await git(temp, [...who, 'commit', '--quiet', '-m', 'Set up the team wiki hub\n\nAGENTS.md with an empty project registry, scripts/okf.py, published/Projects/,\nand the auto-merge checker and workflows under .github/wiki/.'])
      await git(temp, ['push', '--quiet', team.url, `HEAD:refs/heads/${base}`], token)
    } finally {
      await rm(temp, { recursive: true, force: true })
    }
    await syncMain(data)
    statsCache.clear()
    pullsCache = undefined
    await save(data)
    return status()
  })

  /**
   * kb-publish: render the project's bundle (as it is in its maintenance
   * workspace, made when there is none) into published/Projects/, then open or
   * update the workspace's pull request. A published change always needs a person.
   */
  const publish = async (folder: string): Promise<PublishAnswer> => {
    const prepared = await serial(async () => {
      const data = await load()
      const team = needTeam(data)
      const project = (await projectsIn(mainDir, team)).find(candidate => candidate.folder === folder)
      if (project === undefined) throw new LibraryError('unknown-wiki', `There is no project wiki at ${folder}. Refresh, or create it.`, 404)
      let record = data.maintains.find(item => item.wiki === folder && item.closed === undefined)
      let created = false
      if (record === undefined || !(await exists(join(record.workspace, '.git')))) {
        if (record !== undefined) Object.assign(record, { closed: 'closed' })
        if (!(await exists(join(mainDir, ...folder.split('/'))))) throw new LibraryError('unknown-wiki', `${folder} is registered but not in the repository yet.`, 404)
        record = await newWorkspace(data, folder, project.name, false)
        await save(data)
        created = true
      }
      const bundle = join(record.workspace, ...folder.split('/'))
      const files: BundleFile[] = []
      const walk = async (dir: string, rel: string): Promise<void> => {
        for (const entry of await readdir(dir, { withFileTypes: true })) {
          if (entry.name.startsWith('.')) continue
          const path = rel === '' ? entry.name : `${rel}/${entry.name}`
          if (entry.isDirectory()) await walk(join(dir, entry.name), path)
          else if (entry.isFile()) files.push({ path, source: entry.name.endsWith('.md') ? await readFile(join(dir, entry.name), 'utf8') : '' })
        }
      }
      await walk(bundle, '')
      const rendered = renderBundle(files, {
        name: project.name,
        folder,
        hubWeb: webUrl(team.url),
        branch: baseOf(data),
        ...project.summary === undefined ? {} : { summary: project.summary },
        ...project.owner === undefined ? {} : { owner: project.owner },
        ...project.repo === undefined ? {} : { repo: project.repo },
      })
      // The project's published pages are regenerated as a whole: a page that is gone from the bundle goes from the wiki too.
      await rm(join(record.workspace, ...rendered.dir.split('/')), { recursive: true, force: true })
      await rm(join(record.workspace, ...rendered.landing.split('/')), { force: true })
      for (const page of rendered.pages) {
        const target = join(record.workspace, ...page.path.split('/'))
        await mkdir(join(target, '..'), { recursive: true })
        await writeFile(target, page.content)
      }
      await options.library.put(entryFor(record))
      const pending = await git(record.workspace, ['status', '--porcelain', '--untracked-files=all', '--', rendered.dir, rendered.landing])
      return { record, created, dir: rendered.dir, pages: rendered.pages.length, skipped: rendered.skipped, ...pending === '' ? { unchanged: true } : {} }
    })
    const { record } = prepared
    if (prepared.unchanged === true) return prepared
    try {
      const pr = await openPr(record.id, {
        ...record.pr === undefined ? { title: `Publish ${record.wikiName} to the wiki` } : {},
        summary: `Renders \`${record.wiki}/\` into \`${prepared.dir}/\` for the Azure DevOps wiki. A person reviews published pages before they are synced.`,
      })
      const fresh = (await load()).maintains.find(item => item.id === record.id) ?? record
      return { ...prepared, record: fresh, pr }
    } catch (error) {
      if (error instanceof LibraryError && error.code === 'nothing-changed') return { ...prepared, unchanged: true }
      return { ...prepared, prError: (error as Error).message }
    }
  }

  return { status, connect, refresh, wiki, pulls, create, maintain, changes, openPr, attach, publish, setupHub, initialize }
}

/**
 * The pull request description.
 * @param summary - what changed, in a sentence.
 * @param pages - each changed page with its review state before and after.
 * @param eligible - the auto-merge verdict.
 * @param reasons - why it needs a person.
 * @param lint - okf.py lint output.
 * @param notes - anything the run noticed.
 * @param workspace - the maintenance workspace id.
 * @returns markdown.
 */
export function prBody(summary: string, pages: readonly { path: string, status: string, before: string, after: string }[], eligible: boolean, reasons: readonly string[], lint: string, notes: readonly string[], workspace: string): string {
  return [
    summary,
    '',
    '### Pages',
    '',
    '| Page | Change | Before | After |',
    '|---|---|---|---|',
    ...pages.length === 0 ? ['| (none) | | | |'] : pages.map(page => `| \`${page.path}\` | ${page.status} | ${page.before} | ${page.after} |`),
    '',
    '### Auto-merge',
    '',
    eligible
      ? 'Eligible: lint passed and every page touched was unreviewed. CI re-checks this before merging.'
      : `Needs a person:\n${reasons.map(reason => `- ${reason}`).join('\n')}`,
    '',
    'Pages written by the agent are unreviewed drafts. To mark a page reviewed, a person adds `verified: [{ by: human:<you>, at: <date> }]`, sets `lifecycle: active` / `status: stable` and a `stale_after` date.',
    ...lint === '' ? [] : ['', '<details><summary>okf.py lint</summary>', '', '```', lint.slice(0, 4000), '```', '</details>'],
    ...notes.length === 0 ? [] : ['', ...notes.map(note => `> ${note}`)],
    '',
    `<!-- dsh-okf team-wiki workspace=${workspace} eligible=${String(eligible)} -->`,
  ].join('\n')
}
