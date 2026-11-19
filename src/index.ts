/**
 * Host half of the OKF bundle plugin.
 *
 * - Routes (exact Fetch routes on Connection's `/api` channel, so its Host/Origin
 *   fence and browser-cookie check run first): list the library, fetch a bundle
 *   from a git or Azure DevOps remote, update it, add a local folder, remove an
 *   entry, read a bundle's catalog and pages, and get/set the bundle of a session.
 * - A system-prompt context that tells the model which bundle its session uses,
 *   where its folder is, and what its catalog holds. The model reads the pages
 *   with the Harness's own file tools; this plugin registers none.
 *
 * `connection` is the only hard dependency. `systemPrompt` is reached through
 * `ctx.inject`, so the library and preview keep working even if a Harness build
 * does not expose it to an out-of-tree plugin.
 *
 * Routes use `connection.fetch.register`, not `connection.rpc.handle`: under
 * the Harness's strict injection `rpc.handle` throws for an out-of-tree plugin
 * (see dsh-claude-usage's README).
 *
 * @module @local/dsh-okf
 */
import { homedir } from 'node:os'
import { join } from 'node:path'
import { readPage, summarize } from './host/bundle.ts'
import { GitError } from './host/git.ts'
import { IndexCache, sessionContext } from './host/knowledge.ts'
import { LibraryError, openLibrary } from './host/library.ts'
import type { Library } from './host/library.ts'
import type { HostContext } from './types/contract.ts'
import { ROUTES } from './types/okf.ts'
import type { AddLocalRequest, FetchRequest } from './types/okf.ts'

/** The Host service this half cannot work without. */
export const inject = ['connection']

/** Optional row config: `config:` under the row in `cordis.patch.yml`. */
export interface Config {
  /** Where fetched bundles and library.json live. Default `<DSH home>/okf`. */
  readonly libraryDir?: string
  /** The git executable. Default `git` on PATH. */
  readonly gitPath?: string
  /** Deadline for one git command, in milliseconds. Default 300000. */
  readonly gitTimeoutMs?: number
  /** Characters of the bundle's index.md sent with each turn. Default 8000; 0 sends none. */
  readonly indexChars?: number
  /** Tell the model about the session's bundle. Default true. */
  readonly promptContext?: boolean
}

/**
 * The DSH home folder, as `@deepseek-ai/dsh-home-paths` resolves it without
 * config: `$DSH_HOME` (blank means unset), else `~/.dsh`.
 * @returns the folder.
 */
export function dshHome(): string {
  const env = process.env.DSH_HOME?.trim()
  return env === undefined || env === '' ? join(homedir(), '.dsh') : env
}

/** Headers every answer carries. */
const JSON_HEADERS = { 'content-type': 'application/json', 'cache-control': 'no-store' }

/**
 * A JSON answer.
 * @param value - the body.
 * @param status - the HTTP status.
 * @returns the response.
 */
function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: JSON_HEADERS })
}

/**
 * Turn any failure into an error answer.
 * @param error - what was thrown.
 * @returns 4xx for a request the library refused or git rejected, 500 otherwise.
 */
function failure(error: unknown): Response {
  if (error instanceof LibraryError) {
    return json({ error: { code: error.code, message: error.message, ...error.detail === undefined ? {} : { detail: error.detail } } }, error.status)
  }
  if (error instanceof GitError) return json({ error: { code: `git-${error.code}`, message: error.message } }, 502)
  const code = (error as NodeJS.ErrnoException).code
  if (code === 'ENOENT') return json({ error: { code: 'not-found', message: 'No such page or folder.' } }, 404)
  const message = error instanceof Error ? error.message : String(error)
  return json({ error: { code: 'failed', message } }, 500)
}

/**
 * Read a POST body as a JSON object.
 * @param request - the request.
 * @returns the object.
 * @throws {LibraryError} when the body is not a JSON object.
 */
async function body(request: Request): Promise<Record<string, unknown>> {
  let value: unknown
  try {
    value = await request.json()
  } catch {
    throw new LibraryError('bad-request', 'The request body must be JSON.')
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new LibraryError('bad-request', 'The request body must be a JSON object.')
  return value as Record<string, unknown>
}

/**
 * Read an optional string field.
 * @param record - the body.
 * @param key - the field.
 * @returns the string, or undefined when absent or blank.
 * @throws {LibraryError} when present but not a string.
 */
function optional(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key]
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string') throw new LibraryError('bad-request', `"${key}" must be a string.`)
  return value
}

/**
 * Read a required string field.
 * @param record - the body or query.
 * @param key - the field.
 * @returns the string.
 * @throws {LibraryError} when missing.
 */
function required(record: Record<string, unknown>, key: string): string {
  const value = optional(record, key)
  if (value === undefined || value.trim() === '') throw new LibraryError('bad-request', `"${key}" is required.`)
  return value
}

/** A route handler over a parsed request. */
type Handler = (request: Request, library: Library) => Promise<Response>

/**
 * Wrap a handler with the method check and the error mapping.
 * @param methods - allowed methods.
 * @param handler - the handler.
 * @returns a Fetch handler bound to the library.
 */
function route(methods: readonly string[], handler: Handler): (request: Request, library: Library) => Promise<Response> {
  return async (request, library) => {
    if (!methods.includes(request.method)) return new Response(null, { status: 405, headers: { allow: methods.join(', ') } })
    try {
      return await handler(request, library)
    } catch (error) {
      return failure(error)
    }
  }
}

/** Every handler, keyed by route path. Exported for the smoke test. */
export const handlers: Readonly<Record<string, { methods: readonly ('GET' | 'POST')[], handle: (request: Request, library: Library) => Promise<Response> }>> = {
  [ROUTES.library]: {
    methods: ['GET'],
    handle: route(['GET'], async (_request, library) => {
      await library.refresh()
      return json({ entries: await library.list(), libraryDir: library.dir })
    }),
  },
  [ROUTES.fetch]: {
    methods: ['POST'],
    handle: route(['POST'], async (request, library) => {
      const record = await body(request)
      const wanted: FetchRequest = {
        url: required(record, 'url'),
        ...optionalFields(record, ['ref', 'path', 'id', 'name']),
      }
      return json({ entry: await library.fetch(wanted) })
    }),
  },
  [ROUTES.update]: {
    methods: ['POST'],
    handle: route(['POST'], async (request, library) => {
      const record = await body(request)
      return json(await library.update(required(record, 'id'), record.force === true))
    }),
  },
  [ROUTES.addLocal]: {
    methods: ['POST'],
    handle: route(['POST'], async (request, library) => {
      const record = await body(request)
      const wanted: AddLocalRequest = { path: required(record, 'path'), ...optionalFields(record, ['id', 'name']) }
      return json({ entry: await library.addLocal(wanted) })
    }),
  },
  [ROUTES.editWorkspace]: {
    methods: ['POST'],
    handle: route(['POST'], async (request, library) => {
      const record = await body(request)
      return json(await library.editWorkspace(required(record, 'id')))
    }),
  },
  [ROUTES.remove]: {
    methods: ['POST'],
    handle: route(['POST'], async (request, library) => {
      const record = await body(request)
      await library.remove(required(record, 'id'), record.deleteFiles === true)
      return json({ ok: true })
    }),
  },
  [ROUTES.bundle]: {
    methods: ['GET'],
    handle: route(['GET'], async (request, library) => {
      const query = Object.fromEntries(new URL(request.url).searchParams)
      return json(await summarize(await library.get(required(query, 'id'))))
    }),
  },
  [ROUTES.page]: {
    methods: ['GET'],
    handle: route(['GET'], async (request, library) => {
      const query = Object.fromEntries(new URL(request.url).searchParams)
      const entry = await library.get(required(query, 'id'))
      try {
        return json(await readPage(entry, required(query, 'path')))
      } catch (error) {
        if (error instanceof Error && error.message.startsWith('Not a markdown page')) throw new LibraryError('bad-path', error.message)
        throw error
      }
    }),
  },
  [ROUTES.session]: {
    methods: ['GET', 'POST'],
    handle: route(['GET', 'POST'], async (request, library) => {
      if (request.method === 'GET') {
        const query = Object.fromEntries(new URL(request.url).searchParams)
        return json(await library.getSession(required(query, 'sessionId')))
      }
      const record = await body(request)
      const bundleId = record.bundleId
      if (bundleId !== null && typeof bundleId !== 'string') throw new LibraryError('bad-request', '"bundleId" must be a string or null.')
      return json(await library.setSession(required(record, 'sessionId'), bundleId))
    }),
  },
}

/**
 * Copy the optional string fields that are present.
 * @param record - the body.
 * @param keys - the fields.
 * @returns an object holding only the present fields.
 */
function optionalFields(record: Record<string, unknown>, keys: readonly string[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const key of keys) {
    const value = optional(record, key)
    if (value !== undefined) out[key] = value
  }
  return out
}

/**
 * Read a positive number from config.
 * @param value - the configured value.
 * @param fallback - the default.
 * @param name - the key, for the error.
 * @returns the number.
 * @throws {Error} when set to something that is not a non-negative finite number.
 */
function count(value: unknown, fallback: number, name: string): number {
  if (value === undefined || value === null) return fallback
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error(`@local/dsh-okf: config.${name} must be a non-negative number`)
  return Math.floor(value)
}

/**
 * Register the routes and the prompt context.
 * @param ctx - the Host context.
 * @param config - the row config.
 */
export function apply(ctx: HostContext, config: Config | null | undefined = {}): void {
  const settings = config ?? {}
  const library = openLibrary({
    dir: settings.libraryDir ?? join(dshHome(), 'okf'),
    ...settings.gitPath === undefined ? {} : { gitPath: settings.gitPath },
    gitTimeoutMs: count(settings.gitTimeoutMs, 300_000, 'gitTimeoutMs'),
  })
  const knowledge = {
    indexChars: count(settings.indexChars, 8000, 'indexChars'),
  }

  for (const [path, handler] of Object.entries(handlers)) {
    ctx.connection.fetch.register({
      path,
      methods: handler.methods,
      requestBody: 'buffered',
      fetch: request => handler.handle(request, library),
    })
  }

  const cache = new IndexCache(library)
  const refreshCache = (): void => {
    cache.refresh().catch((error: unknown) => { console.warn('[okf] index cache refresh failed:', error) })
  }
  library.onChange(refreshCache)
  library.refresh().then(refreshCache, (error: unknown) => { console.warn('[okf] library read failed:', error) })

  if (settings.promptContext !== false) {
    ctx.inject(['systemPrompt'], (scope) => {
      scope.systemPrompt.context(sessionContext(library, cache, knowledge))
    })
  }
}

// Re-exported for scripts/smoke.mjs, which tests the built artifact only.
export { parseRemote, redact } from './host/git.ts'
