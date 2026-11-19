/**
 * The local bundle library: one folder on disk, one JSON file describing it.
 *
 *     <libraryDir>/
 *       library.json        entries + per-session selections
 *       repos/<id>/         one shallow, sparse git checkout per fetched bundle
 *
 * Bundles added from a local path stay where they are; the library only
 * records the path.
 *
 * A bundle made editable (`editWorkspace`) is edited where it is: a git
 * entry's own checkout becomes a normal clone and a DSH Workspace. From then on
 * Update only fast-forwards it, and Remove deletes it only when nothing would
 * be lost. Every change to `library.json` goes through one queue and
 * is written whole (temp file, then rename), so two requests never interleave
 * and a reader never sees half a file.
 */
import { randomBytes } from 'node:crypto'
import { realpathSync } from 'node:fs'
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { basename, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { findBundleRoots, findLocalBundleRoots, isBundleRoot } from './bundle.ts'
import { checkoutPath, cloneNoCheckout, fastForward, GitError, listFiles, parseRemote, pull, showFile, topLevel, unsavedWork, unshallow } from './git.ts'
import type { GitOptions } from './git.ts'
import type { AddLocalRequest, EditWorkspaceAnswer, FetchRequest, GitProvider, LibraryEntry, SessionSelection } from '../types/okf.ts'

/** A failure the routes turn into a 4xx with a code. */
export class LibraryError extends Error {
  readonly code: string
  readonly status: number
  /** Extra data for the browser, e.g. candidate bundle paths. */
  readonly detail?: unknown

  /**
   * @param code - short machine code.
   * @param message - what to show.
   * @param status - HTTP status.
   * @param detail - extra data.
   */
  constructor(code: string, message: string, status = 400, detail?: unknown) {
    super(message)
    this.name = 'LibraryError'
    this.code = code
    this.status = status
    if (detail !== undefined) this.detail = detail
  }
}

/** The file's shape. */
interface LibraryFile {
  v: 1
  entries: LibraryEntry[]
  sessions: Record<string, { bundleId: string, selectedAt: string }>
}

/** Library settings from the plugin row. */
export interface LibraryOptions {
  /** Where bundles and library.json live. */
  readonly dir: string
  /** The git executable. */
  readonly gitPath?: string
  /** Deadline for one git command. */
  readonly gitTimeoutMs?: number
  /** Environment to read tokens from (a seam for tests). */
  readonly env?: NodeJS.ProcessEnv
}

/** Environment variables a token is read from, most specific first. */
export const TOKEN_ENV: Readonly<Record<GitProvider, readonly string[]>> = {
  'azure-devops': ['DSH_OKF_AZURE_TOKEN', 'DSH_OKF_GIT_TOKEN'],
  github: ['DSH_OKF_GITHUB_TOKEN', 'DSH_OKF_GIT_TOKEN'],
  git: ['DSH_OKF_GIT_TOKEN'],
}

/**
 * Turn any text into a library id.
 * @param value - a name, repository or path.
 * @returns lowercase letters, digits and dashes, at most 64 characters.
 */
export function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64) || 'bundle'
}

/**
 * Normalize a repository subfolder.
 * @param path - as typed.
 * @returns forward slashes, no leading or trailing slash.
 * @throws {LibraryError} when it climbs out of the repository.
 */
export function cleanRepoPath(path: string | undefined): string | undefined {
  if (path === undefined) return undefined
  const clean = path.trim().replace(/\\/g, '/').replace(/^\.?\/+|\/+$/g, '')
  if (clean.split('/').some(part => part === '..' || part === '.git')) throw new LibraryError('bad-path', 'The bundle path must stay inside the repository.')
  return clean === '.' ? '' : clean
}

/**
 * Whether `child` is `parent` or lies inside it. Windows paths compare
 * case-insensitively, as the file system does.
 * @param parent - a folder.
 * @param child - a path.
 * @returns true when inside or equal.
 */
export function contains(parent: string, child: string): boolean {
  const fold = (path: string): string => (process.platform === 'win32' ? resolve(path).toLowerCase() : resolve(path))
  const rel = relative(fold(parent), fold(child))
  return rel === '' || (rel.split(sep)[0] !== '..' && !isAbsolute(rel))
}

/**
 * The path the file system itself reports: symlinks resolved and, on Windows,
 * 8.3 short names expanded, so it compares equal to what git and DSH report.
 * @param path - an existing path.
 * @returns the canonical path, or the resolved spelling when it cannot be read.
 */
export function canonical(path: string): string {
  try {
    return realpathSync.native(path)
  } catch {
    return resolve(path)
  }
}

/** The library. */
export interface Library {
  readonly dir: string
  list(): Promise<LibraryEntry[]>
  get(id: string): Promise<LibraryEntry>
  fetch(request: FetchRequest): Promise<LibraryEntry>
  update(id: string, force?: boolean): Promise<{ entry: LibraryEntry, changed: boolean }>
  addLocal(request: AddLocalRequest): Promise<LibraryEntry>
  remove(id: string, deleteFiles?: boolean): Promise<void>
  /**
   * Make a bundle editable in place. A git entry's checkout becomes a normal
   * (unshallowed) clone and its workspace; a local entry's workspace is its git
   * top level, else the bundle root. Idempotent.
   */
  editWorkspace(id: string): Promise<EditWorkspaceAnswer>
  getSession(sessionId: string): Promise<SessionSelection | null>
  setSession(sessionId: string, bundleId: string | null): Promise<SessionSelection | null>
  /** Read library.json into the in-memory copy {@link snapshot} serves. */
  refresh(): Promise<void>
  /**
   * The last library.json this process read or wrote, synchronously. The prompt
   * context needs it from a synchronous callback on every turn.
   */
  snapshot(): LibrarySnapshot
  /** Call `listener` after every change this process makes. @returns the unsubscribe function. */
  onChange(listener: () => void): () => void
}

/** A synchronous view of the library file. */
export interface LibrarySnapshot {
  readonly entries: readonly LibraryEntry[]
  readonly sessions: Readonly<Record<string, { readonly bundleId: string, readonly selectedAt: string }>>
}

/**
 * Open (and lazily create) the library.
 * @param options - folder and git settings.
 * @returns the library.
 */
export function openLibrary(options: LibraryOptions): Library {
  const dir = resolve(options.dir)
  const file = join(dir, 'library.json')
  const repos = join(dir, 'repos')
  const env = options.env ?? process.env
  let queue: Promise<unknown> = Promise.resolve()
  let cache: LibraryFile = { v: 1, entries: [], sessions: {} }
  const listeners = new Set<() => void>()

  /** Run one change after every change before it. */
  const serial = <T>(work: () => Promise<T>): Promise<T> => {
    const next = queue.then(work, work)
    queue = next.catch(() => undefined)
    return next
  }

  const load = async (): Promise<LibraryFile> => {
    try {
      const parsed = JSON.parse(await readFile(file, 'utf8')) as Partial<LibraryFile>
      if (parsed.v === 1 && Array.isArray(parsed.entries)) {
        cache = { v: 1, entries: parsed.entries, sessions: parsed.sessions ?? {} }
        return structuredClone(cache)
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error
    }
    cache = { v: 1, entries: [], sessions: {} }
    return structuredClone(cache)
  }

  const save = async (data: LibraryFile): Promise<void> => {
    await mkdir(dir, { recursive: true })
    const temp = `${file}.${randomBytes(4).toString('hex')}.tmp`
    await writeFile(temp, `${JSON.stringify(data, null, 2)}\n`)
    for (let attempt = 0; ; attempt += 1) {
      try {
        await rename(temp, file)
        cache = structuredClone(data)
        for (const listener of [...listeners]) {
          try { listener() } catch { /* one listener must not break a save */ }
        }
        return
      } catch (error) {
        // Windows refuses a rename over a file another process has open, briefly.
        if (attempt >= 4 || !['EPERM', 'EBUSY', 'EACCES'].includes(String((error as NodeJS.ErrnoException).code))) throw error
        await new Promise((done) => { setTimeout(done, 40) })
      }
    }
  }

  const find = (data: LibraryFile, id: string): LibraryEntry => {
    const entry = data.entries.find(candidate => candidate.id === id)
    if (entry === undefined) throw new LibraryError('unknown-bundle', `No bundle with id "${id}" in the library.`, 404)
    return entry
  }

  const gitOptions = (provider: GitProvider): GitOptions => {
    const token = TOKEN_ENV[provider].map(name => env[name]).find(value => value !== undefined && value !== '')
    return {
      provider,
      ...token === undefined ? {} : { token },
      ...options.gitPath === undefined ? {} : { gitPath: options.gitPath },
      ...options.gitTimeoutMs === undefined ? {} : { timeoutMs: options.gitTimeoutMs },
    }
  }

  const uniqueId = (data: LibraryFile, wanted: string | undefined, fallback: string): string => {
    const id = slug(wanted ?? fallback)
    if (data.entries.some(entry => entry.id === id)) {
      throw new LibraryError('exists', `The library already has a bundle "${id}". Update it, remove it, or choose another id.`, 409, { id })
    }
    return id
  }

  return {
    dir,

    list: async () => (await load()).entries,

    get: async id => find(await load(), id),

    fetch: request => serial(async () => {
      let remote
      try {
        remote = parseRemote(request.url)
      } catch (error) {
        throw new LibraryError('bad-url', (error as Error).message)
      }
      const wantedPath = cleanRepoPath(request.path)
      const ref = request.ref?.trim() || undefined
      if (ref !== undefined && (ref.startsWith('-') || /\s|\.\./.test(ref))) throw new LibraryError('bad-ref', 'Not a valid branch or tag name.')
      const data = await load()
      const fallbackId = wantedPath === undefined || wantedPath === '' ? remote.repo : `${remote.repo}-${wantedPath.split('/').pop() ?? ''}`
      const id = uniqueId(data, request.id, fallbackId)
      const git = gitOptions(remote.provider)
      await mkdir(repos, { recursive: true })
      const target = join(repos, id)
      const temp = join(repos, `.tmp-${id}-${randomBytes(4).toString('hex')}`)
      try {
        const commit = await cloneNoCheckout(request.url.trim(), ref, temp, git)
        const files = await listFiles(temp, git)
        let path = wantedPath
        if (path === undefined) {
          const roots = await findBundleRoots(files, file => showFile(temp, file, git))
          if (roots.length === 0) throw new LibraryError('no-bundle', 'No OKF bundle in this repository: no folder holds a SCHEMA.md or an index.md with okf_version. Give the bundle path.', 422)
          if (roots.length > 1) throw new LibraryError('many-bundles', `This repository holds ${String(roots.length)} bundles. Choose one path.`, 422, { candidates: roots })
          path = roots[0] ?? ''
        } else if (!files.some(file => path === '' || file.startsWith(`${path}/`))) {
          throw new LibraryError('bad-path', `The repository has no folder "${path}".`, 422)
        }
        await checkoutPath(temp, path, git)
        const leftover = await stat(join(target, '.git')).then(() => true, () => false)
        const lost = leftover ? await unsavedWork(target, git).catch(() => undefined) : undefined
        if (lost !== undefined) throw new LibraryError('unsaved-work', `${target} is left over from a removed bundle and has ${lost}. Move or discard that work, or choose another id.`, 409, { path: target })
        await rm(target, { recursive: true, force: true })
        await rename(temp, target)
        const root = path === '' ? target : join(target, ...path.split('/'))
        const now = new Date().toISOString()
        const entry: LibraryEntry = {
          id,
          name: request.name?.trim() || (path === '' ? remote.repo : `${remote.repo}/${path}`),
          root,
          origin: { kind: 'git', url: request.url.trim(), provider: remote.provider, ...ref === undefined ? {} : { ref }, path, commit },
          addedAt: now,
          fetchedAt: now,
        }
        const fresh = await load()
        fresh.entries.push(entry)
        await save(fresh)
        return entry
      } catch (error) {
        await rm(temp, { recursive: true, force: true }).catch(() => undefined)
        throw error
      }
    }),

    update: (id, force = false) => serial(async () => {
      const data = await load()
      const entry = find(data, id)
      if (entry.origin.kind !== 'git') throw new LibraryError('not-git', 'This bundle was added from a local folder; there is nothing to update from.')
      const checkout = join(repos, id)
      if (entry.workspace !== undefined && force) throw new LibraryError('editing', 'This bundle is being edited, so Update never discards changes. Discard them with git in its workspace if that is what you want.', 409)
      const git = gitOptions(entry.origin.provider)
      const { before, after } = entry.workspace === undefined ? await pull(checkout, git, force) : await fastForward(checkout, git)
      const updated: LibraryEntry = { ...entry, origin: { ...entry.origin, commit: after }, fetchedAt: new Date().toISOString() }
      data.entries = data.entries.map(candidate => (candidate.id === id ? updated : candidate))
      await save(data)
      return { entry: updated, changed: before !== after }
    }),

    addLocal: request => serial(async () => {
      const wanted = resolve(request.path.trim())
      let info
      try {
        info = await stat(wanted)
      } catch {
        throw new LibraryError('bad-path', `No folder at ${wanted}.`, 422)
      }
      if (!info.isDirectory()) throw new LibraryError('bad-path', `${wanted} is not a folder.`, 422)
      let root = wanted
      if (!await isBundleRoot(wanted)) {
        const roots = await findLocalBundleRoots(wanted)
        if (roots.length === 0) throw new LibraryError('no-bundle', 'No OKF bundle in this folder: nothing holds a SCHEMA.md or an index.md with okf_version.', 422)
        if (roots.length > 1) throw new LibraryError('many-bundles', `This folder holds ${String(roots.length)} bundles. Choose one.`, 422, { candidates: roots })
        root = roots[0] ?? wanted
      }
      const data = await load()
      const existing = data.entries.find(entry => resolve(entry.root) === root)
      if (existing !== undefined) throw new LibraryError('exists', `That folder is already in the library as "${existing.id}".`, 409, { id: existing.id })
      const id = uniqueId(data, request.id, basename(root) === 'okf' ? `${basename(resolve(root, '..'))}-okf` : basename(root))
      const entry: LibraryEntry = { id, name: request.name?.trim() || `${basename(resolve(root, '..'))}/${basename(root)}`, root, origin: { kind: 'local' }, addedAt: new Date().toISOString() }
      data.entries.push(entry)
      await save(data)
      return entry
    }),

    remove: (id, deleteFiles = false) => serial(async () => {
      const data = await load()
      const entry = find(data, id)
      if (deleteFiles && entry.origin.kind === 'git') {
        const lost = await unsavedWork(join(repos, id), gitOptions(entry.origin.provider)).catch(() => undefined)
        if (lost !== undefined) throw new LibraryError('unsaved-work', `This bundle has ${lost}. Push or discard them first, or remove it without deleting its files.`, 409)
      }
      data.entries = data.entries.filter(candidate => candidate.id !== id)
      for (const [session, selection] of Object.entries(data.sessions)) {
        if (selection.bundleId === id) delete data.sessions[session]
      }
      await save(data)
      // Only a checkout the library made itself is ever deleted; a local folder is the user's.
      if (deleteFiles && entry.origin.kind === 'git') {
        const checkout = join(repos, id)
        if (checkout.startsWith(repos + sep)) await rm(checkout, { recursive: true, force: true })
      }
    }),

    editWorkspace: id => serial(async () => {
      const data = await load()
      const source = find(data, id)
      if (source.workspace !== undefined) return { entry: source, workspace: source.workspace, created: false }
      let workspace: string
      if (source.origin.kind === 'git') {
        // The library's own checkout becomes the workspace: a normal clone the
        // user can commit, branch and push from, with the bundle checked out sparsely.
        const checkout = join(repos, source.id)
        await unshallow(checkout, gitOptions(source.origin.provider))
        workspace = canonical(checkout)
      } else {
        // The git top level when there is one, so committing (which writes .git)
        // stays inside the sandbox's writable root.
        const top = await topLevel(source.root, gitOptions('git'))
        const root = canonical(source.root)
        workspace = top !== undefined && contains(canonical(top), root) ? canonical(top) : root
      }
      const fresh = await load()
      const current = find(fresh, id)
      const updated: LibraryEntry = { ...current, workspace }
      fresh.entries = fresh.entries.map(entry => (entry.id === id ? updated : entry))
      await save(fresh)
      return { entry: updated, workspace, created: true }
    }),

    getSession: async (sessionId) => {
      const selection = (await load()).sessions[sessionId]
      return selection === undefined ? null : { sessionId, ...selection }
    },

    refresh: async () => { await load() },

    snapshot: () => cache,

    onChange(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },

    setSession: (sessionId, bundleId) => serial(async () => {
      if (sessionId.trim() === '' || sessionId.length > 200) throw new LibraryError('bad-session', 'A session id is required.')
      const data = await load()
      if (bundleId === null) {
        delete data.sessions[sessionId]
        await save(data)
        return null
      }
      find(data, bundleId)
      const selection = { bundleId, selectedAt: new Date().toISOString() }
      data.sessions[sessionId] = selection
      await save(data)
      return { sessionId, ...selection }
    }),
  }
}

export { GitError }
