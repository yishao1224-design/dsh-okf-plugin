/**
 * Vendored contract faces for the DeepSeek Harness plugin surface this bundle uses.
 *
 * Like the other `dsh_plugins` bundles, this package is independent of the DSH
 * source tree: nothing at runtime, development, or type-check time reaches into
 * that checkout. These shapes were read from DSH source 0.2.1-alpha.1:
 *
 * - `packages/client/connection/src` — `connection.fetch.register` (exact Fetch routes).
 * - `packages/core/system-prompt/src/index.ts` — `systemPrompt.context(PromptContext)`.
 * - `packages/core/agent/src/runtime-types.ts` — `Agent` (`id`, `session.header`).
 * - `packages/client/ui-conversation/src/client/contract/slots.ts` — `conversation.session.header.utilities`.
 * - `packages/client/ui-layout/src/client/index.ts` — `main` (keyed), `shell.overlay`, `layout.selectPanel`.
 * - `packages/client/ui-sidebar/src/client/contract/slots.ts` — `sidebar.panellist`.
 * - `packages/api/workspace-controller/src/client/service.ts` — `workspaces` (`create`, `list`).
 * - `packages/client/ui-workspace/src/client/navigation.ts` — `uiWorkspace` (`connectWorkspace`, `openSession`).
 *
 * When a DSH upgrade moves one of these shapes, update only this file.
 */

// ── Host ─────────────────────────────────────────────────────────────────────

/** One exact, transport-independent Fetch route owned by a Host feature. */
export interface ConnectionFetchRoute {
  /** Absolute path below `/api`; query parameters stay available on the request URL. */
  readonly path: string
  readonly methods: readonly ('GET' | 'HEAD' | 'POST')[]
  /** How the node:http bridge presents the request body; `buffered` is capped by Connection. */
  readonly requestBody: 'buffered' | 'streaming'
  /** Handle one request after Connection has applied its Host/Origin fence and cookie check. */
  readonly fetch: (request: Request) => Promise<Response>
}

/** The Host's Connection service, reduced to route registration. */
export interface HostConnection {
  readonly fetch: {
    register(route: ConnectionFetchRoute): () => Promise<void>
  }
}

/** The part of a session header this bundle reads. */
export interface SessionHeader {
  readonly id: string
  readonly cwd?: string
  /** Set on subagent sessions: the session that spawned it. */
  readonly parentSession?: string
}

/** The part of a running agent this bundle reads. Its id is the session id. */
export interface Agent {
  readonly id: string
  readonly session: { readonly header: SessionHeader }
}

/** What the agent loop passes to a prompt context's text callback. */
export interface AssembleContext {
  readonly agent?: Agent
  readonly signal?: AbortSignal
}

/** A per-turn block that travels after retained history; empty text contributes nothing. */
export interface PromptContext {
  readonly name: string
  /** Numeric order; out-of-tree code cannot use the in-tree name tables. In-tree contexts use 110-120. */
  readonly order: number
  readonly text: string | ((context: AssembleContext) => string)
}

/** The system-prompt service, reduced to contexts. */
export interface SystemPromptService {
  context(context: PromptContext): () => void
}

/** The Host half's context. `connection` is required; the rest arrive through `inject`. */
export interface HostContext {
  readonly connection: HostConnection
  /**
   * Run `callback` once every named service exists, with a context that can
   * reach them; it is disposed when one goes away.
   */
  inject(deps: readonly string[], callback: (scope: HostScope) => void): unknown
}

/** A context that reached the optional services. */
export interface HostScope {
  readonly systemPrompt: SystemPromptService
}

// ── Browser ──────────────────────────────────────────────────────────────────

/** Slot keys this bundle contributes to. */
export interface SlotMap {
  /** The main column; keyed panels are shown by `layout.selectPanel(key)`. */
  'main': { kind: 'keyed', scope: 'root' }
  /** Global panel entries in the sidebar; each list `id` addresses the matching `main` key. The sidebar owns the button and its label. */
  'sidebar.panellist': { kind: 'list', scope: 'root' }
  /** Frame-wide floating layer: absolute over every column, click-through. */
  'shell.overlay': { kind: 'list', scope: 'root' }
  /** Compact controls at the right of a session's header. Not rendered while the session is blank. */
  'conversation.session.header.utilities': { kind: 'list', scope: 'session' }
  /** Compact controls before the composer's submit action; rendered in blank sessions too. */
  'conversation.input.right': { kind: 'list', scope: 'session' }
}

/** Any declared slot key. */
export type SlotKey = keyof SlotMap & string

/** A translate seat over `K` keys, with optional `{name}` template params. */
export type Translate<K extends string = string> = (key: K, params?: Record<string, unknown>) => string

/** A slot component. */
export interface SlotComponent {
  (props: any): unknown
}

/** The subset of `register` options this bundle passes. */
export interface RegisterOptions<Injected extends object = Record<string, unknown>> {
  name: SlotKey
  id?: string
  /** Keyed slots (`main`): the panel key. */
  key?: string
  order?: number
  locale?: string
  /** Label the owner reads (`sidebar.panellist`). */
  label?: () => string
  /** For a session slot the factory receives the session id. */
  inject?: (sessionId?: string) => Injected
}

/** Props the sidebar hands a `sidebar.panellist` occupant. */
export interface PanelIconProps {
  /** Requested glyph edge in pixels. */
  readonly size: number
  readonly selected?: boolean
}

/** The `layout` client service, reduced to panel selection. */
export interface LayoutService {
  /** Show a `main` panel by key; null returns to the Conversation. */
  selectPanel(panelId: string | null): void
}

/** One registered DSH Workspace, as the `workspaces` service reports it. */
export interface WorkspaceView {
  readonly workspaceId: string
  /** Canonical Host folder path. */
  readonly path: string
  readonly title: string
}

/** The `workspaces` client service, reduced to what this bundle calls. */
export interface WorkspacesService {
  /** Register an existing folder as a Workspace; idempotent for a known folder. */
  create(input: { path: string }): Promise<WorkspaceView>
  /** Host-authoritative Workspace rows. */
  readonly list: {
    getSnapshot(): { readonly items: readonly WorkspaceView[] }
    subscribe(listener: () => void): () => void
  }
}

/** The `uiWorkspace` client service, reduced to what this bundle calls. */
export interface UiWorkspaceService {
  /** Resolve the reusable or newly created blank Session of a Workspace. */
  connectWorkspace(workspaceId: string): Promise<string>
  /** Select a Session and show its Conversation. */
  openSession(target: string): void
  /**
   * Open a Workspace's blank Session with text prefilled in its composer (the
   * user presses send). Absent on older Harness builds.
   */
  startSession?(workspaceId?: string, options?: { readonly prompt?: string, readonly clearPreviousDraft?: boolean }): void
}

/** A context that reached the optional browser services. */
export interface ClientScope {
  readonly workspaces: WorkspacesService
  readonly uiWorkspace: UiWorkspaceService
  readonly layout: LayoutService
  effect(callback: () => (() => void) | void, label?: string): () => void
}

/** The web shell's runtime context for this bundle's client half. */
export interface ClientContext {
  effect(callback: () => (() => void) | void, label?: string): () => void
  /**
   * Run `callback` once every named service exists, with a context that can
   * reach them; it is disposed when one goes away or this plugin unloads.
   */
  inject(deps: readonly string[], callback: (scope: ClientScope) => void): unknown
  slots: {
    inject(name: SlotKey, contribute: () => (() => void) | void): () => void
    register<Injected extends object>(options: RegisterOptions<Injected>, component: SlotComponent): () => void
  }
  locale: {
    register(namespace: string, dictionaries: Readonly<Record<string, Readonly<Record<string, string>>>>): () => void
    getLocale(): { active: string }
    /** A translate seat for one namespace. */
    bind(namespace: string): Translate
  }
}
