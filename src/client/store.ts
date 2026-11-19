/**
 * The browser half's one store: the library list, each session's selected
 * bundle, and which dialog view is open. No React here; components read it
 * through `useSyncExternalStore`.
 *
 * Every request is a same-origin, document-relative fetch of a Host route, so
 * the session cookie rides along and Connection's fence applies.
 */
import { relative, ROUTES } from '../types/okf.ts'
import type { BundleSummary, EditWorkspaceAnswer, FetchRequest, LibraryEntry, PageContent, SessionSelection } from '../types/okf.ts'
import type { UiWorkspaceService, WorkspacesService } from '../types/contract.ts'

/** Deadline for an ordinary call. */
export const REQUEST_TIMEOUT_MS = 15_000
/** Deadline for a clone or update, which can take a while on a big repository. */
export const GIT_TIMEOUT_MS = 330_000

/** An error answer from the Host, or a transport failure. */
export class ApiFailure extends Error {
  readonly code: string
  readonly status: number
  readonly detail?: unknown

  /**
   * @param code - machine code (`offline` for a transport failure).
   * @param message - what to show.
   * @param status - HTTP status, 0 when there was no answer.
   * @param detail - extra data, e.g. candidate paths.
   */
  constructor(code: string, message: string, status: number, detail?: unknown) {
    super(message)
    this.name = 'ApiFailure'
    this.code = code
    this.status = status
    if (detail !== undefined) this.detail = detail
  }
}

/** The `fetch` the store calls; the page's global `fetch` in the shell. */
export type Fetcher = (input: string, init: RequestInit) => Promise<Response>

/**
 * Call one route.
 * @param fetcher - the fetch to use.
 * @param route - an absolute route from ROUTES.
 * @param options - method, query, body, deadline.
 * @returns the parsed JSON body.
 * @throws {ApiFailure} for an error answer, a non-JSON answer, or no answer.
 */
export async function call<T>(fetcher: Fetcher, route: string, options: { method?: 'GET' | 'POST', query?: Record<string, string>, body?: unknown, timeoutMs?: number } = {}): Promise<T> {
  const query = options.query === undefined ? '' : `?${new URLSearchParams(options.query).toString()}`
  let response: Response
  try {
    response = await fetcher(`${relative(route)}${query}`, {
      method: options.method ?? 'GET',
      cache: 'no-store',
      credentials: 'same-origin',
      signal: AbortSignal.timeout(options.timeoutMs ?? REQUEST_TIMEOUT_MS),
      ...options.body === undefined ? {} : { body: JSON.stringify(options.body), headers: { 'content-type': 'application/json' } },
    })
  } catch (error) {
    const timeout = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')
    throw new ApiFailure(timeout ? 'timeout' : 'offline', timeout ? 'The DSH Host did not answer in time.' : 'The DSH Host does not answer.', 0)
  }
  let parsed: unknown
  try {
    parsed = await response.json()
  } catch {
    // The static fallback answers unregistered routes with the app's HTML: the Host half is not loaded.
    throw new ApiFailure('offline', 'The OKF Host half is not answering. Restart dsh web after installing the plugin.', response.status)
  }
  if (!response.ok) {
    const error = (parsed as { error?: { code?: string, message?: string, detail?: unknown } } | null)?.error
    throw new ApiFailure(error?.code ?? 'failed', error?.message ?? `HTTP ${String(response.status)}`, response.status, error?.detail)
  }
  return parsed as T
}

/** How long to wait for a just-created Workspace to appear in the list snapshot. */
export const WORKSPACE_WAIT_MS = 10_000

/** DSH's Workspace services, when this shell build exposes them. */
export interface WorkspaceNavigation {
  readonly workspaces: WorkspacesService
  readonly uiWorkspace: UiWorkspaceService
}

/** What Edit as workspace did. */
export interface EditWorkspaceOutcome {
  /** The editable entry. */
  readonly entry: LibraryEntry
  /** The folder of the workspace. */
  readonly workspace: string
  /** True when DSH opened a session there; false when the user must add the folder as a workspace. */
  readonly opened: boolean
  /** Why it could not open the workspace, when it could not. */
  readonly reason?: string
}

/**
 * Wait until the Workspace list snapshot holds an id: `create` answers before
 * the list feed delivers the new row, and `connectWorkspace` reads the list.
 * @param workspaces - the service.
 * @param workspaceId - the id to wait for.
 * @param timeoutMs - how long to wait.
 * @returns when the row is there.
 * @throws {Error} when it does not appear in time.
 */
export function waitForWorkspace(workspaces: WorkspacesService, workspaceId: string, timeoutMs = WORKSPACE_WAIT_MS): Promise<void> {
  const present = (): boolean => workspaces.list.getSnapshot().items.some(item => item.workspaceId === workspaceId)
  if (present()) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { stop(); reject(new Error('The new workspace did not appear in DSH in time.')) }, timeoutMs)
    const stop = workspaces.list.subscribe(() => {
      if (!present()) return
      clearTimeout(timer)
      stop()
      resolve()
    })
  })
}

/** The library list's state. */
export interface LibraryState {
  readonly status: 'loading' | 'ready' | 'offline'
  readonly entries: readonly LibraryEntry[]
  readonly libraryDir?: string
  readonly error?: string
}

/** One session's selection state. */
export interface SelectionState {
  readonly loaded: boolean
  readonly bundleId: string | null
  readonly error?: string
}

/** The dialog's state. */
export interface DialogState {
  readonly open: boolean
  /** The session the dialog was opened from; selection controls show only with one. */
  readonly sessionId?: string
  /** The bundle being previewed. */
  readonly bundleId?: string
  /** The page being read, bundle-relative. */
  readonly pagePath?: string
}

/** Everything the components read. */
export interface OkfState {
  readonly library: LibraryState
  readonly selections: Readonly<Record<string, SelectionState>>
  readonly dialog: DialogState
}

/** The store face. */
export interface OkfStore {
  getSnapshot(): OkfState
  subscribe(listener: () => void): () => void
  refreshLibrary(): Promise<void>
  loadSelection(sessionId: string): Promise<void>
  select(sessionId: string, bundleId: string | null): Promise<void>
  openDialog(options?: { sessionId?: string, bundleId?: string }): void
  closeDialog(): void
  preview(bundleId: string | undefined): void
  openPage(pagePath: string | undefined): void
  fetchBundle(request: FetchRequest): Promise<LibraryEntry>
  addLocal(path: string, id?: string): Promise<LibraryEntry>
  update(id: string, force?: boolean): Promise<{ entry: LibraryEntry, changed: boolean }>
  remove(id: string, deleteFiles: boolean): Promise<void>
  /**
   * Make a bundle editable in place, then open a session in its folder with the
   * bundle attached. Opening needs DSH's Workspace services; without them the
   * outcome carries the folder for the user to add by hand.
   */
  editAsWorkspace(id: string): Promise<EditWorkspaceOutcome>
  summary(id: string): Promise<BundleSummary>
  page(id: string, path: string): Promise<PageContent>
  dispose(): void
}

/**
 * Create the store.
 * @param fetcher - the fetch to use; defaults to the page's global one.
 * @param navigation - DSH's Workspace services when reachable; read at call time, since they can arrive after the store.
 * @returns the store; the caller must dispose it.
 */
export function createOkfStore(fetcher: Fetcher = (input, init) => globalThis.fetch(input, init), navigation: () => WorkspaceNavigation | undefined = () => undefined): OkfStore {
  const listeners = new Set<() => void>()
  let state: OkfState = { library: { status: 'loading', entries: [] }, selections: {}, dialog: { open: false } }
  let disposed = false
  let libraryInflight: Promise<void> | undefined
  const selectionInflight = new Map<string, Promise<void>>()

  const set = (next: Partial<OkfState>): void => {
    if (disposed) return
    state = { ...state, ...next }
    for (const listener of [...listeners]) listener()
  }
  const setSelection = (sessionId: string, selection: SelectionState): void => {
    set({ selections: { ...state.selections, [sessionId]: selection } })
  }

  const refreshLibrary = (): Promise<void> => {
    libraryInflight ??= (async () => {
      try {
        const answer = await call<{ entries: LibraryEntry[], libraryDir: string }>(fetcher, ROUTES.library)
        set({ library: { status: 'ready', entries: answer.entries, libraryDir: answer.libraryDir } })
      } catch (error) {
        set({ library: { ...state.library, status: 'offline', error: (error as Error).message } })
      }
    })().finally(() => { libraryInflight = undefined })
    return libraryInflight
  }

  const loadSelection = (sessionId: string): Promise<void> => {
    let inflight = selectionInflight.get(sessionId)
    if (inflight === undefined) {
      inflight = (async () => {
        try {
          const answer = await call<SessionSelection | null>(fetcher, ROUTES.session, { query: { sessionId } })
          setSelection(sessionId, { loaded: true, bundleId: answer?.bundleId ?? null })
        } catch (error) {
          setSelection(sessionId, { loaded: true, bundleId: state.selections[sessionId]?.bundleId ?? null, error: (error as Error).message })
        }
      })().finally(() => { selectionInflight.delete(sessionId) })
      selectionInflight.set(sessionId, inflight)
    }
    return inflight
  }

  /** Drop selections that point at a removed bundle. */
  const forget = (id: string): void => {
    const selections: Record<string, SelectionState> = {}
    for (const [session, selection] of Object.entries(state.selections)) {
      selections[session] = selection.bundleId === id ? { loaded: true, bundleId: null } : selection
    }
    set({ selections, dialog: state.dialog.bundleId === id ? { open: state.dialog.open, ...state.dialog.sessionId === undefined ? {} : { sessionId: state.dialog.sessionId } } : state.dialog })
  }

  const select = async (sessionId: string, bundleId: string | null): Promise<void> => {
    const before = state.selections[sessionId]
    setSelection(sessionId, { loaded: true, bundleId })
    try {
      await call(fetcher, ROUTES.session, { method: 'POST', body: { sessionId, bundleId } })
    } catch (error) {
      setSelection(sessionId, { loaded: true, bundleId: before?.bundleId ?? null, error: (error as Error).message })
      throw error
    }
  }

  void refreshLibrary()

  return {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    refreshLibrary,
    loadSelection,
    select,
    openDialog(options = {}) {
      const bundleId = options.bundleId
        ?? (options.sessionId === undefined ? undefined : state.selections[options.sessionId]?.bundleId ?? undefined)
        ?? state.library.entries[0]?.id
      set({ dialog: { open: true, ...options.sessionId === undefined ? {} : { sessionId: options.sessionId }, ...bundleId === undefined ? {} : { bundleId } } })
      void refreshLibrary()
    },
    closeDialog() {
      set({ dialog: { open: false } })
    },
    preview(bundleId) {
      const { pagePath: _drop, bundleId: _old, ...rest } = state.dialog
      set({ dialog: { ...rest, ...bundleId === undefined ? {} : { bundleId } } })
    },
    openPage(pagePath) {
      const { pagePath: _drop, ...rest } = state.dialog
      set({ dialog: { ...rest, ...pagePath === undefined ? {} : { pagePath } } })
    },
    async fetchBundle(request) {
      const answer = await call<{ entry: LibraryEntry }>(fetcher, ROUTES.fetch, { method: 'POST', body: request, timeoutMs: GIT_TIMEOUT_MS })
      await refreshLibrary()
      return answer.entry
    },
    async addLocal(path, id) {
      const answer = await call<{ entry: LibraryEntry }>(fetcher, ROUTES.addLocal, { method: 'POST', body: { path, ...id === undefined ? {} : { id } } })
      await refreshLibrary()
      return answer.entry
    },
    async update(id, force = false) {
      const answer = await call<{ entry: LibraryEntry, changed: boolean }>(fetcher, ROUTES.update, { method: 'POST', body: { id, force }, timeoutMs: GIT_TIMEOUT_MS })
      await refreshLibrary()
      return answer
    },
    async remove(id, deleteFiles) {
      await call(fetcher, ROUTES.remove, { method: 'POST', body: { id, deleteFiles } })
      forget(id)
      await refreshLibrary()
    },
    async editAsWorkspace(id) {
      const answer = await call<EditWorkspaceAnswer>(fetcher, ROUTES.editWorkspace, { method: 'POST', body: { id }, timeoutMs: GIT_TIMEOUT_MS })
      await refreshLibrary()
      const services = navigation()
      if (services === undefined) {
        return { entry: answer.entry, workspace: answer.workspace, opened: false, reason: 'unavailable' }
      }
      try {
        const workspace = await services.workspaces.create({ path: answer.workspace })
        await waitForWorkspace(services.workspaces, workspace.workspaceId)
        const sessionId = await services.uiWorkspace.connectWorkspace(workspace.workspaceId)
        await select(sessionId, answer.entry.id)
        services.uiWorkspace.openSession(sessionId)
        set({ dialog: { open: false } })
        return { entry: answer.entry, workspace: answer.workspace, opened: true }
      } catch (error) {
        return { entry: answer.entry, workspace: answer.workspace, opened: false, reason: (error as Error).message }
      }
    },
    summary: id => call<BundleSummary>(fetcher, ROUTES.bundle, { query: { id } }),
    page: (id, path) => call<PageContent>(fetcher, ROUTES.page, { query: { id, path } }),
    dispose() {
      disposed = true
      listeners.clear()
    },
  }
}
