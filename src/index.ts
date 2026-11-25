/**
 * Host half of the OKF bundle plugin.
 *
 * - Routes (exact Fetch routes on Connection's `/api` channel, so its Host/Origin
 *   fence and browser-cookie check run first): list the library, fetch a bundle
 *   from a git or Azure DevOps remote, update it, add a local folder, remove an
 *   entry, read a bundle's catalog and pages, and get/set the bundle of a session.
 * - Team Wiki routes (`/api/okf/team/*`, see `host/team.ts`): the team wiki
 *   repository's project wikis with review counts, their open pull requests and
 *   auto-merge verdicts, New project wiki, Maintain (a clone on a wiki branch
 *   that becomes a DSH Workspace), and Open pull request.
 * - A system-prompt context that tells the model which bundle its session uses,
 *   where its folder is, and what its catalog holds. The model reads the pages
 *   with the Harness's own file tools.
 * - knowledgeAgent's kb-* skills (`skills/`, see `host/skills.ts`) as a DSH
 *   skill provider, reached through `ctx.inject(['skills'])`, so `/kb-setup`
 *   and the others work without copying them anywhere.
 * - Two model tools, `wiki_sync_from_code` and `wiki_open_pr` (see
 *   `host/tools.ts`), so an automation task can run Sync from code and Open
 *   pull request without the page. Reached through `ctx.inject(['tools'])`.
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
import { fileURLToPath } from 'node:url'
import { findLocalBundleRoots, isBundleRoot, readPage, resolveFile, summarize } from './host/bundle.ts'
import { GitError } from './host/git.ts'
import { IndexCache, sessionContext } from './host/knowledge.ts'
import { GitHubError } from './host/github.ts'
import { LibraryError, openLibrary } from './host/library.ts'
import type { Library } from './host/library.ts'
import { pickFolder } from './host/picker.ts'
import { openFile } from './host/opener.ts'
import { bundledSkills, skillProvider } from './host/skills.ts'
import { RunError } from './host/run.ts'
import { findSkill, isEmptyFolder } from './host/starter.ts'
import { openTeam } from './host/team.ts'
import { wikiTools } from './host/tools.ts'
import type { Team } from './host/team.ts'
import type { HostContext } from './types/contract.ts'
import { ROUTES } from './types/okf.ts'
import type { AddLocalRequest, FetchRequest, PickFolderAnswer } from './types/okf.ts'

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
  /**
   * The skill that sets up a new knowledge base in an empty local folder,
   * when DSH has it in `<DSH home>/skills`, `~/.agents/skills` or `skillDirs`:
   * the new session's composer is then prefilled with `/<setupSkill>`.
   * Default `kb-setup` (knowledgeAgent's); `''` always uses the plugin's own setup.
   */
  readonly setupSkill?: string
  /** More folders to look for `setupSkill` in (DSH's `customSkillDirs`), searched before the user folders. */
  readonly skillDirs?: readonly string[]
  /**
   * Offer the plugin's own copies of knowledgeAgent's kb-* skills (kb-setup,
   * kb-ingest, kb-query, kb-review, kb-curate, kb-lint) to DSH, at the bundled
   * rank so a same-named skill in a skill folder wins. Default true.
   */
  readonly skills?: boolean
  /** Give the model the Team Wiki tools `wiki_sync_from_code` and `wiki_open_pr`. Default true. */
  readonly tools?: boolean
  /** Team Wiki settings. */
  readonly team?: TeamConfigRow
}

/** `config.team` on the row. */
export interface TeamConfigRow {
  /** Connect this repository when none is connected yet. */
  readonly url?: string
  /** Its base branch. Default: the remote's default branch. */
  readonly ref?: string
  /** Where to look for project wikis when the hub has no AGENTS.md registry. Default: the repository root. */
  readonly root?: string
  /** The Python executable that runs okf.py. Default `python` on Windows, else `python3`. */
  readonly python?: string
  /** The toolchain, relative to the repository. Default `scripts/okf.py`. */
  readonly okfScript?: string
  /** GitHub host name; set it for GitHub Enterprise Server, e.g. `github.acme.com`. Default `github.com`. */
  readonly githubHost?: string
  /** GitHub REST base URL. Default `https://api.github.com`, or `https://<githubHost>/api/v3` for an Enterprise host. */
  readonly githubApi?: string
  /** Azure DevOps REST root, without the organization. Default `https://dev.azure.com`. */
  readonly azureApi?: string
  /** Label set on pull requests eligible for auto-merge; `''` sets none. Default `wiki-auto-merge`. */
  readonly autoMergeLabel?: string
  /** `generated.by` written when a reviewed page is reset. Default `dsh/agent`. */
  readonly agentActor?: string
  /** Committer used when git has no identity configured. Default `DSH Wiki <dsh-wiki@users.noreply.github.com>`. */
  readonly commitAuthor?: string
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

/**
 * The shared agent home DSH scans for skills: `$DSH_AGENTS_HOME`, else `~/.agents`.
 * @returns the folder.
 */
export function agentsHome(): string {
  const env = process.env.DSH_AGENTS_HOME?.trim()
  return env === undefined || env === '' ? join(homedir(), '.agents') : env
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
  if (error instanceof RunError) return json({ error: { code: 'command-failed', message: [error.message, error.stdout].filter(Boolean).join('\n').slice(0, 6000) } }, 502)
  if (error instanceof GitHubError) return json({ error: { code: `github-${String(error.status)}`, message: `GitHub: ${error.message}` } }, 502)
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

/** What the routes act on. */
export interface Services {
  readonly library: Library
  readonly team: Team
}

/** A route handler over a parsed request. */
type Handler = (request: Request, services: Services) => Promise<Response>

/**
 * Wrap a handler with the method check and the error mapping.
 * @param methods - allowed methods.
 * @param handler - the handler.
 * @returns a Fetch handler bound to the library.
 */
function route(methods: readonly string[], handler: Handler): (request: Request, services: Services) => Promise<Response> {
  return async (request, services) => {
    if (!methods.includes(request.method)) return new Response(null, { status: 405, headers: { allow: methods.join(', ') } })
    try {
      return await handler(request, services)
    } catch (error) {
      return failure(error)
    }
  }
}

/** Every handler, keyed by route path. Exported for the smoke test. */
export const handlers: Readonly<Record<string, { methods: readonly ('GET' | 'POST')[], handle: (request: Request, services: Services) => Promise<Response> }>> = {
  [ROUTES.library]: {
    methods: ['GET'],
    handle: route(['GET'], async (_request, { library }) => {
      await library.refresh()
      return json({ entries: await library.list(), libraryDir: library.dir })
    }),
  },
  [ROUTES.fetch]: {
    methods: ['POST'],
    handle: route(['POST'], async (request, { library }) => {
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
    handle: route(['POST'], async (request, { library }) => {
      const record = await body(request)
      return json(await library.update(required(record, 'id'), record.force === true))
    }),
  },
  [ROUTES.addLocal]: {
    methods: ['POST'],
    handle: route(['POST'], async (request, { library }) => {
      const record = await body(request)
      const wanted: AddLocalRequest = { path: required(record, 'path'), ...optionalFields(record, ['id', 'name']), ...record.initialize === true ? { initialize: true } : {} }
      return json(await library.addLocal(wanted))
    }),
  },
  [ROUTES.pickFolder]: {
    methods: ['POST'],
    handle: route(['POST'], async (request) => {
      const record = await body(request)
      const start = optional(record, 'start')
      const path = await pickFolder({ title: 'Choose the folder of an OKF bundle, or an empty folder for a new one', ...start === undefined ? {} : { start } })
      if (path === null) return json({ path: null } satisfies PickFolderAnswer)
      return json({ path, kind: await folderKind(path) } satisfies PickFolderAnswer)
    }),
  },
  [ROUTES.openFile]: {
    methods: ['POST'],
    handle: route(['POST'], async (request, { library }) => {
      const record = await body(request)
      const entry = await library.get(required(record, 'id'))
      let file: string
      try {
        file = resolveFile(entry.root, required(record, 'path'))
      } catch (error) {
        throw new LibraryError('bad-path', (error as Error).message)
      }
      await openFile(file)
      return json({ ok: true })
    }),
  },
  [ROUTES.editWorkspace]: {
    methods: ['POST'],
    handle: route(['POST'], async (request, { library }) => {
      const record = await body(request)
      return json(await library.editWorkspace(required(record, 'id')))
    }),
  },
  [ROUTES.remove]: {
    methods: ['POST'],
    handle: route(['POST'], async (request, { library }) => {
      const record = await body(request)
      await library.remove(required(record, 'id'), record.deleteFiles === true)
      return json({ ok: true })
    }),
  },
  [ROUTES.bundle]: {
    methods: ['GET'],
    handle: route(['GET'], async (request, { library }) => {
      const query = Object.fromEntries(new URL(request.url).searchParams)
      return json(await summarize(await library.get(required(query, 'id'))))
    }),
  },
  [ROUTES.page]: {
    methods: ['GET'],
    handle: route(['GET'], async (request, { library }) => {
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
    handle: route(['GET', 'POST'], async (request, { library }) => {
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
  [ROUTES.team]: {
    methods: ['GET'],
    handle: route(['GET'], async (_request, { team }) => json(await team.status())),
  },
  [ROUTES.teamConnect]: {
    methods: ['POST'],
    handle: route(['POST'], async (request, { team }) => {
      const record = await body(request)
      return json(await team.connect({ url: required(record, 'url'), ...optionalFields(record, ['ref', 'root']) }))
    }),
  },
  [ROUTES.teamRefresh]: {
    methods: ['POST'],
    handle: route(['POST'], async (_request, { team }) => json(await team.refresh())),
  },
  [ROUTES.teamWiki]: {
    methods: ['GET'],
    handle: route(['GET'], async (request, { team }) => {
      const query = Object.fromEntries(new URL(request.url).searchParams)
      return json(await team.wiki(required(query, 'folder')))
    }),
  },
  [ROUTES.teamPulls]: {
    methods: ['GET'],
    handle: route(['GET'], async (request, { team }) => json(await team.pulls(new URL(request.url).searchParams.get('refresh') === '1'))),
  },
  [ROUTES.teamCreate]: {
    methods: ['POST'],
    handle: route(['POST'], async (request, { team }) => {
      const record = await body(request)
      return json(await team.create({ name: required(record, 'name'), ...optionalFields(record, ['folder', 'template', 'repo', 'owner', 'summary']), ...record.initialize === true ? { initialize: true } : {} }))
    }),
  },
  [ROUTES.teamMaintain]: {
    methods: ['POST'],
    handle: route(['POST'], async (request, { team }) => {
      const record = await body(request)
      return json(await team.maintain(required(record, 'folder')))
    }),
  },
  [ROUTES.teamReview]: {
    methods: ['POST'],
    handle: route(['POST'], async (request, { team }) => {
      const record = await body(request)
      const paths = Array.isArray(record.paths) ? record.paths.filter((path): path is string => typeof path === 'string') : []
      return json(await team.review(required(record, 'folder'), paths))
    }),
  },
  [ROUTES.teamSync]: {
    methods: ['POST'],
    handle: route(['POST'], async (request, { team }) => {
      const record = await body(request)
      return json(await team.sync(required(record, 'folder')))
    }),
  },
  [ROUTES.teamInitialize]: {
    methods: ['POST'],
    handle: route(['POST'], async (request, { team }) => {
      const record = await body(request)
      return json(await team.initialize(required(record, 'folder')))
    }),
  },
  [ROUTES.teamSetup]: {
    methods: ['POST'],
    handle: route(['POST'], async (_request, { team }) => json(await team.setupHub())),
  },
  [ROUTES.teamPublish]: {
    methods: ['POST'],
    handle: route(['POST'], async (request, { team }) => {
      const record = await body(request)
      return json(await team.publish(required(record, 'folder')))
    }),
  },
  [ROUTES.teamChanges]: {
    methods: ['GET'],
    handle: route(['GET'], async (request, { team }) => {
      const query = Object.fromEntries(new URL(request.url).searchParams)
      return json(await team.changes(required(query, 'id')))
    }),
  },
  [ROUTES.teamOpenPr]: {
    methods: ['POST'],
    handle: route(['POST'], async (request, { team }) => {
      const record = await body(request)
      return json(await team.openPr(required(record, 'id'), optionalFields(record, ['title', 'summary'])))
    }),
  },
  [ROUTES.teamAttach]: {
    methods: ['POST'],
    handle: route(['POST'], async (request, { team }) => {
      const record = await body(request)
      return json({ entry: await team.attach(required(record, 'folder')) })
    }),
  },
}

/**
 * What a chosen folder holds, so the form can say what Add will do.
 * @param path - an absolute folder.
 * @returns bundle, empty, or other.
 */
async function folderKind(path: string): Promise<NonNullable<PickFolderAnswer['kind']>> {
  try {
    if (await isBundleRoot(path) || (await findLocalBundleRoots(path)).length > 0) return 'bundle'
    return await isEmptyFolder(path) ? 'empty' : 'other'
  } catch {
    return 'other'
  }
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
  // The kb-* skills beside the built module, once DSH's skill registry has taken them.
  const skillsRoot = fileURLToPath(new URL('../skills/', import.meta.url))
  let skillsServed = false
  // DSH's filesystem skill provider order after the project roots (a new folder has none).
  const skillRoots = [...settings.skillDirs ?? [], join(dshHome(), 'skills'), join(agentsHome(), 'skills')]
  const bundledSkill = async (name: string): Promise<string | undefined> => {
    if (!skillsServed) return undefined
    return (await bundledSkills(skillsRoot)).find(skill => skill.name === name && skill.invocation.userInvocable)?.file
  }
  const library = openLibrary({
    dir: settings.libraryDir ?? join(dshHome(), 'okf'),
    ...settings.gitPath === undefined ? {} : { gitPath: settings.gitPath },
    gitTimeoutMs: count(settings.gitTimeoutMs, 300_000, 'gitTimeoutMs'),
    python: settings.team?.python ?? (process.platform === 'win32' ? 'python' : 'python3'),
    // An empty local folder gets the same toolchain Set up the hub writes.
    okfScript: fileURLToPath(new URL('../templates/hub/scripts/okf.py', import.meta.url)),
    setupSkill: settings.setupSkill ?? 'kb-setup',
    skillRoots,
    bundledSkill,
  })
  const knowledge = {
    indexChars: count(settings.indexChars, 8000, 'indexChars'),
    agentActor: settings.team?.agentActor ?? 'dsh/agent',
  }
  const teamRow = settings.team ?? {}
  // The setup skill DSH can run now: a copy in a skill folder, else the one this plugin serves.
  const setupSkill = settings.setupSkill ?? 'kb-setup'
  const resolveSetupSkill = async (): Promise<string | undefined> => {
    if (setupSkill === '') return undefined
    const found = await findSkill(setupSkill, skillRoots) ?? await bundledSkill(setupSkill)
    return found === undefined ? undefined : setupSkill
  }
  const team = openTeam({
    setupSkill: resolveSetupSkill,
    dir: join(library.dir, 'team'),
    library,
    git: settings.gitPath ?? 'git',
    python: teamRow.python ?? (process.platform === 'win32' ? 'python' : 'python3'),
    okfScript: teamRow.okfScript ?? 'scripts/okf.py',
    // lib/index.js runs from the installed package: the template and the checker ship beside it.
    hubTemplate: {
      dir: fileURLToPath(new URL('../templates/hub/', import.meta.url)),
      files: {
        '.github/wiki/check-pr.js': fileURLToPath(new URL('./check-pr.js', import.meta.url)),
        '.github/wiki/workflows/wiki-auto-merge.yml': fileURLToPath(new URL('../examples/wiki-auto-merge.yml', import.meta.url)),
        '.github/wiki/workflows/wiki-auto-complete-ado.yml': fileURLToPath(new URL('../examples/wiki-auto-complete-ado.yml', import.meta.url)),
        '.github/wiki/workflows/wiki-publish-to-ado.yml': fileURLToPath(new URL('../examples/wiki-publish-to-ado.yml', import.meta.url)),
      },
    },
    githubHost: teamRow.githubHost ?? 'github.com',
    // GitHub Enterprise Server serves its REST API under /api/v3 on its own host.
    githubApi: teamRow.githubApi ?? ((teamRow.githubHost ?? 'github.com') === 'github.com' ? 'https://api.github.com' : `https://${teamRow.githubHost ?? ''}/api/v3`),
    ...teamRow.azureApi === undefined ? {} : { azureApi: teamRow.azureApi },
    autoMergeLabel: teamRow.autoMergeLabel ?? 'wiki-auto-merge',
    agentActor: teamRow.agentActor ?? 'dsh/agent',
    commitAuthor: teamRow.commitAuthor ?? 'DSH Wiki <dsh-wiki@users.noreply.github.com>',
    timeoutMs: count(settings.gitTimeoutMs, 300_000, 'gitTimeoutMs'),
    ...teamRow.url === undefined || teamRow.url.trim() === ''
      ? {}
      : { preset: { url: teamRow.url, ...teamRow.ref === undefined ? {} : { ref: teamRow.ref }, ...teamRow.root === undefined ? {} : { root: teamRow.root } } },
  })
  const services: Services = { library, team }

  for (const [path, handler] of Object.entries(handlers)) {
    ctx.connection.fetch.register({
      path,
      methods: handler.methods,
      requestBody: 'buffered',
      fetch: request => handler.handle(request, services),
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

  if (settings.skills !== false) {
    // Optional, like systemPrompt: without DSH's skill registry the setup falls back to the skill folders.
    ctx.inject(['skills'], (scope) => {
      try {
        scope.skills.registerProvider(skillProvider(skillsRoot))
        skillsServed = true
      } catch (error) {
        console.warn('[okf] could not offer the kb-* skills to DSH:', error)
      }
    })
  }

  if (settings.tools !== false) {
    ctx.inject(['tools'], (scope) => {
      for (const tool of wikiTools(team)) scope.tools.register(tool)
    })
  }
}

// Re-exported for scripts/smoke.mjs, which tests the built artifact only.
export { parseRemote, redact } from './host/git.ts'
export { judge } from './host/eligibility.ts'
export { reviewState, stampAgentEdit } from './host/review.ts'
export { discoverWikis, openTeam, readWikiPages } from './host/team.ts'
export { openLibrary } from './host/library.ts'
