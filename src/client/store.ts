/**
 * The browser half's one store: the library list, each session's selected
 * bundle, and which dialog view is open. No React here; components read it
 * through `useSyncExternalStore`.
 *
 * Every request is a same-origin, document-relative fetch of a Host route, so
 * the session cookie rides along and Connection's fence applies.
 */
import { relative, ROUTES } from '../types/okf.ts'
import type {
  BundleSummary, ChangesAnswer, EditWorkspaceAnswer, FetchRequest, LibraryEntry, MaintainAnswer, OpenPrAnswer, PageContent,
  PullsAnswer, SessionSelection, TeamStatus, WikiDetail,
} from '../types/okf.ts'
import type { LayoutService, UiWorkspaceService, WorkspacesService } from '../types/contract.ts'

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
  /** Present when the shell exposes it; used to leave the Team Wiki page for the opened session. */
  readonly layout?: LayoutService
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

/** A value loaded from the Host. */
export interface Loaded<V> {
  readonly status: 'idle' | 'loading' | 'ready' | 'failed'
  readonly data?: V
  readonly error?: string
}

/** The Team Wiki page's state. */
export interface TeamState {
  readonly status: Loaded<TeamStatus>
  readonly pulls: Loaded<PullsAnswer>
  readonly wikis: Readonly<Record<string, Loaded<WikiDetail>>>
  readonly changes: Readonly<Record<string, Loaded<ChangesAnswer>>>
  /** The Open pull request dialog, for one maintenance workspace. */
  readonly prDialog?: { readonly maintainId: string }
  /** A message the page shows once, e.g. after New project wiki. */
  readonly notice?: { readonly kind: 'ok' | 'error', readonly text: string }
}

/** Everything the components read. */
export interface OkfState {
  readonly library: LibraryState
  readonly selections: Readonly<Record<string, SelectionState>>
  readonly dialog: DialogState
  readonly team: TeamState
}

/** What opening a maintenance workspace did. */
export interface OpenOutcome {
  readonly answer: MaintainAnswer
  readonly opened: boolean
  readonly reason?: string
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
  /** Load the Team Wiki status (connected repository, project wikis). */
  loadTeam(): Promise<void>
  connectTeam(request: { url: string, ref?: string, root?: string }): Promise<void>
  refreshTeam(): Promise<void>
  loadWiki(folder: string): Promise<void>
  loadPulls(force?: boolean): Promise<void>
  /** Create a project wiki, then open a session in its new workspace. */
  createWiki(request: { name: string, folder?: string, template?: string, repo?: string, owner?: string, summary?: string }): Promise<OpenOutcome>
  /** Open (or make) the project wiki's maintenance workspace and a session there. */
  maintainWiki(folder: string): Promise<OpenOutcome>
  loadChanges(maintainId: string): Promise<void>
  openPr(maintainId: string, request: { title?: string, summary?: string }): Promise<OpenPrAnswer>
  openPrDialog(maintainId: string | undefined): void
  /** Add the project wiki (base branch, read-only) to the library and preview it in the OKF dialog. */
  previewWiki(folder: string): Promise<void>
  setNotice(notice: TeamState['notice'] | undefined): void
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
  let state: OkfState = {
    library: { status: 'loading', entries: [] },
    selections: {},
    dialog: { open: false },
    team: { status: { status: 'idle' }, pulls: { status: 'idle' }, wikis: {}, changes: {} },
  }
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

  const setTeam = (next: Partial<TeamState>): void => { set({ team: { ...state.team, ...next } }) }
  const failed = <V>(before: Loaded<V>, error: unknown): Loaded<V> => ({ ...before, status: 'failed', error: (error as Error).message })

  const loadTeam = async (): Promise<void> => {
    setTeam({ status: { ...state.team.status, status: 'loading' } })
    try {
      setTeam({ status: { status: 'ready', data: await call<TeamStatus>(fetcher, ROUTES.team, { timeoutMs: GIT_TIMEOUT_MS }) } })
    } catch (error) {
      setTeam({ status: failed(state.team.status, error) })
    }
  }

  const loadPulls = async (force = false): Promise<void> => {
    setTeam({ pulls: { ...state.team.pulls, status: 'loading' } })
    try {
      const data = await call<PullsAnswer>(fetcher, ROUTES.teamPulls, { ...force ? { query: { refresh: '1' } } : {}, timeoutMs: GIT_TIMEOUT_MS })
      setTeam({ pulls: { status: 'ready', data } })
    } catch (error) {
      setTeam({ pulls: failed(state.team.pulls, error) })
    }
  }

  /** Register the workspace, open a session there with the entry attached, and show it. */
  const openWorkspace = async (entry: LibraryEntry, path: string): Promise<{ opened: boolean, reason?: string }> => {
    const services = navigation()
    if (services === undefined) return { opened: false, reason: 'unavailable' }
    try {
      const workspace = await services.workspaces.create({ path })
      await waitForWorkspace(services.workspaces, workspace.workspaceId)
      const sessionId = await services.uiWorkspace.connectWorkspace(workspace.workspaceId)
      await select(sessionId, entry.id)
      services.layout?.selectPanel(null)
      services.uiWorkspace.openSession(sessionId)
      return { opened: true }
    } catch (error) {
      return { opened: false, reason: (error as Error).message }
    }
  }

  const afterMaintain = async (answer: MaintainAnswer): Promise<OpenOutcome> => {
    await Promise.all([refreshLibrary(), loadTeam()])
    const outcome = await openWorkspace(answer.entry, answer.workspace)
    return { answer, ...outcome }
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
    loadTeam,
    async connectTeam(request) {
      const data = await call<TeamStatus>(fetcher, ROUTES.teamConnect, { method: 'POST', body: request, timeoutMs: GIT_TIMEOUT_MS })
      setTeam({ status: { status: 'ready', data }, wikis: {}, pulls: { status: 'idle' } })
      void loadPulls()
    },
    async refreshTeam() {
      setTeam({ status: { ...state.team.status, status: 'loading' } })
      try {
        const data = await call<TeamStatus>(fetcher, ROUTES.teamRefresh, { method: 'POST', body: {}, timeoutMs: GIT_TIMEOUT_MS })
        setTeam({ status: { status: 'ready', data }, wikis: {} })
      } catch (error) {
        setTeam({ status: failed(state.team.status, error) })
      }
      await loadPulls(true)
    },
    async loadWiki(folder) {
      const before = state.team.wikis[folder] ?? { status: 'idle' }
      setTeam({ wikis: { ...state.team.wikis, [folder]: { ...before, status: 'loading' } } })
      try {
        const data = await call<WikiDetail>(fetcher, ROUTES.teamWiki, { query: { folder } })
        setTeam({ wikis: { ...state.team.wikis, [folder]: { status: 'ready', data } } })
      } catch (error) {
        setTeam({ wikis: { ...state.team.wikis, [folder]: failed(before, error) } })
      }
    },
    loadPulls,
    async createWiki(request) {
      const answer = await call<MaintainAnswer>(fetcher, ROUTES.teamCreate, { method: 'POST', body: request, timeoutMs: GIT_TIMEOUT_MS * 2 })
      return afterMaintain(answer)
    },
    async maintainWiki(folder) {
      const answer = await call<MaintainAnswer>(fetcher, ROUTES.teamMaintain, { method: 'POST', body: { folder }, timeoutMs: GIT_TIMEOUT_MS })
      return afterMaintain(answer)
    },
    async loadChanges(maintainId) {
      const before = state.team.changes[maintainId] ?? { status: 'idle' }
      setTeam({ changes: { ...state.team.changes, [maintainId]: { ...before, status: 'loading' } } })
      try {
        const data = await call<ChangesAnswer>(fetcher, ROUTES.teamChanges, { query: { id: maintainId }, timeoutMs: GIT_TIMEOUT_MS })
        setTeam({ changes: { ...state.team.changes, [maintainId]: { status: 'ready', data } } })
      } catch (error) {
        setTeam({ changes: { ...state.team.changes, [maintainId]: failed(before, error) } })
      }
    },
    async openPr(maintainId, request) {
      const answer = await call<OpenPrAnswer>(fetcher, ROUTES.teamOpenPr, { method: 'POST', body: { id: maintainId, ...request }, timeoutMs: GIT_TIMEOUT_MS * 2 })
      void loadTeam()
      void loadPulls(true)
      return answer
    },
    async previewWiki(folder) {
      const answer = await call<{ entry: LibraryEntry }>(fetcher, ROUTES.teamAttach, { method: 'POST', body: { folder } })
      await refreshLibrary()
      set({ dialog: { open: true, bundleId: answer.entry.id } })
    },
    openPrDialog(maintainId) {
      const { prDialog: _drop, ...rest } = state.team
      set({ team: { ...rest, ...maintainId === undefined ? {} : { prDialog: { maintainId } } } })
    },
    setNotice(notice) {
      const { notice: _drop, ...rest } = state.team
      set({ team: { ...rest, ...notice === undefined ? {} : { notice } } })
    },
    dispose() {
      disposed = true
      listeners.clear()
    },
  }
}
