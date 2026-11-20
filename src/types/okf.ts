/**
 * The records the Host and browser halves exchange, and the routes they agree on.
 *
 * Every route is an exact Fetch route below Connection's `/api` channel, so
 * Connection's Host/Origin fence and browser-cookie check run before a handler
 * does. The browser fetches the document-relative form (no leading slash).
 */

/** Where a library entry came from. */
export type BundleOrigin =
  | {
    readonly kind: 'git'
    /** The remote as the user gave it (never carries a credential). */
    readonly url: string
    /** `github`, `azure-devops` or `git` (any other host). */
    readonly provider: GitProvider
    /** Branch or tag that was fetched; absent means the remote's default branch. */
    readonly ref?: string
    /** Bundle directory inside the repository, `''` for the repository root. */
    readonly path: string
    /** Commit the checkout is at. */
    readonly commit?: string
  }
  | {
    readonly kind: 'local'
  }

/** Recognized git hosts. */
export type GitProvider = 'github' | 'azure-devops' | 'git'

/** One bundle the library knows about. */
export interface LibraryEntry {
  /** Stable id: lowercase letters, digits and dashes. */
  readonly id: string
  /** Display name. */
  readonly name: string
  /** Absolute path of the bundle root (the folder holding index.md / SCHEMA.md). */
  readonly root: string
  /** Where it came from. */
  readonly origin: BundleOrigin
  /** ISO time the bundle was added. */
  readonly addedAt: string
  /** ISO time of the last successful fetch or update (git entries). */
  readonly fetchedAt?: string
  /**
   * Present on an editable entry: the absolute folder a DSH Workspace opens on.
   * For a git entry it is the library's own checkout (`repos/<id>`); for a
   * local entry, its git top level or the bundle root. The agent may edit the
   * bundle only from a session whose workspace contains the bundle root,
   * because DSH's sandbox confines writes to the session workspace.
   */
  readonly workspace?: string
  /** Set on an entry the Team Wiki page made for a maintenance workspace. */
  readonly team?: { readonly maintainId: string, readonly wiki: string, readonly project?: string }
}

/** One page of a bundle as the catalog lists it. */
export interface PageSummary {
  /** Bundle-relative path with forward slashes, no leading slash (`concepts/foo.md`). */
  readonly path: string
  readonly type?: string
  readonly title: string
  readonly description?: string
  readonly status?: string
  readonly lifecycle?: string
  readonly updated?: string
  readonly tags: readonly string[]
  /** True for index.md and log.md, which OKF reserves. */
  readonly reserved: boolean
}

/** Whole-bundle facts for the preview header. */
export interface BundleSummary {
  readonly entry: LibraryEntry
  /** `okf_version` from the root index.md, when declared. */
  readonly okfVersion?: string
  /** Every markdown page, sorted by path. */
  readonly pages: readonly PageSummary[]
  /** Count of pages per `type`. */
  readonly types: Readonly<Record<string, number>>
  /** Count of pages per `lifecycle` (or `status` when there is no lifecycle). */
  readonly states: Readonly<Record<string, number>>
  /** Non-reserved pages without a `type`, which OKF requires. */
  readonly untyped: readonly string[]
  /** True when the listing stopped at the page cap. */
  readonly truncated: boolean
}

/** One page's content. */
export interface PageContent {
  readonly path: string
  readonly meta: Readonly<Record<string, unknown>>
  readonly body: string
}

/** The bundle chosen for one chat session. */
export interface SessionSelection {
  readonly sessionId: string
  readonly bundleId: string
  /** ISO time it was chosen. */
  readonly selectedAt: string
}

/** A request to fetch a bundle from a git remote. */
export interface FetchRequest {
  /** HTTPS or SSH remote. GitHub, Azure DevOps (dev.azure.com, *.visualstudio.com, ssh.dev.azure.com) and plain git hosts. */
  readonly url: string
  /** Branch or tag. Default: the remote's default branch. */
  readonly ref?: string
  /** Bundle directory inside the repository. Default: found automatically. */
  readonly path?: string
  /** Library id. Default: derived from the repository (and path). */
  readonly id?: string
  /** Display name. Default: derived from the repository. */
  readonly name?: string
}

/** A request to add a bundle already on disk. */
export interface AddLocalRequest {
  /** Absolute path of a bundle root, or of a folder holding exactly one bundle. */
  readonly path: string
  readonly id?: string
  readonly name?: string
}

/** What the edit-workspace route answers. */
export interface EditWorkspaceAnswer {
  /** The entry, now editable. */
  readonly entry: LibraryEntry
  /** The folder to open as a DSH Workspace. */
  readonly workspace: string
  /** False when the entry was already editable. */
  readonly created: boolean
}

/** The error body every failing route answers with. */
export interface ApiError {
  readonly error: { readonly code: string, readonly message: string }
}

/** Route prefix shared by both halves. */
export const API_BASE = '/api/okf'

/** Every exact route the Host registers. */
export const ROUTES = {
  /** GET: `{ entries, libraryDir }`. */
  library: `${API_BASE}/library`,
  /** POST `FetchRequest`: clone a remote into the library. */
  fetch: `${API_BASE}/fetch`,
  /** POST `{ id }`: pull the latest commit of a git entry. */
  update: `${API_BASE}/update`,
  /** POST `AddLocalRequest`: register a bundle already on disk. */
  addLocal: `${API_BASE}/add-local`,
  /** POST `{ id }`: make a bundle editable in place, in a workspace of its own. */
  editWorkspace: `${API_BASE}/edit-workspace`,
  /** POST `{ id, deleteFiles? }`: forget an entry. */
  remove: `${API_BASE}/remove`,
  /** GET `?id=`: the bundle summary. */
  bundle: `${API_BASE}/bundle`,
  /** GET `?id=&path=`: one page. */
  page: `${API_BASE}/page`,
  /** GET `?sessionId=`: the selection, or null. POST `{ sessionId, bundleId|null }`: set or clear it. */
  session: `${API_BASE}/session`,
  team: `${API_BASE}/team`,
  teamConnect: `${API_BASE}/team/connect`,
  teamRefresh: `${API_BASE}/team/refresh`,
  teamWiki: `${API_BASE}/team/wiki`,
  teamPulls: `${API_BASE}/team/pulls`,
  teamCreate: `${API_BASE}/team/create`,
  teamMaintain: `${API_BASE}/team/maintain`,
  teamPublish: `${API_BASE}/team/publish`,
  teamSetup: `${API_BASE}/team/setup`,
  teamInitialize: `${API_BASE}/team/initialize`,
  teamChanges: `${API_BASE}/team/changes`,
  teamOpenPr: `${API_BASE}/team/open-pr`,
  teamAttach: `${API_BASE}/team/attach`,
} as const

/**
 * The document-relative form of a route, which is what the browser fetches.
 * @param route - an absolute route from {@link ROUTES}.
 * @returns the route without its leading slash.
 */
export function relative(route: string): string {
  return route.replace(/^\//, '')
}

// ── Team Wiki ────────────────────────────────────────────────────────────────

/**
 * The team wiki repository: one git repository whose wiki folder (default
 * `okf`) holds the project wikis, each a folder with its own SCHEMA.md.
 */
export interface TeamConfig {
  readonly url: string
  readonly provider: GitProvider
  /** Base branch; undefined follows the remote's default branch. */
  readonly ref?: string
  /** Where to look for project wikis when the hub has no AGENTS.md registry; '' is the repository root. */
  readonly root: string
  /** Display name, e.g. `github.com/acme/team-wiki`. */
  readonly name: string
  readonly connectedAt: string
}

/** Review counts of one project wiki. */
export interface WikiStats {
  readonly pages: number
  readonly reviewed: number
  readonly unreviewed: number
  /** `needs_review`, or `stale_after` in the past. */
  readonly overdue: number
}

/** One project wiki in the team repository. */
export interface ProjectWiki {
  /** Repository-relative folder, e.g. `okf/payments`. Also its id. */
  readonly folder: string
  readonly name: string
  /** Listed in the hub's AGENTS.md registry (else found by its SCHEMA.md). */
  readonly registered: boolean
  /** From the registry: the project's code repository, summary and owner. */
  readonly repo?: string
  readonly summary?: string
  readonly owner?: string
  /** Registered, but its bundle folder is not on the base branch. */
  readonly missing?: boolean
  /** `published/Projects/<name>/` on the base branch, and when it last changed. */
  readonly published?: { readonly path: string, readonly updated?: string }
  readonly stats: WikiStats
  /** The open maintenance workspace for it, if any. */
  readonly maintainId?: string
}

/** A page of a project wiki, with its review state. */
export interface WikiPage {
  /** Bundle-relative path. */
  readonly path: string
  readonly title: string
  readonly type?: string
  readonly lifecycle?: string
  readonly review: 'reviewed' | 'unreviewed'
  readonly reviewer?: string
  readonly reviewedAt?: string
  readonly generatedBy?: string
  readonly generatedAt?: string
  readonly staleAfter?: string
  readonly overdue: boolean
}

/** A maintenance workspace: its own clone of the team repository on a wiki branch. */
export interface MaintainRecord {
  readonly id: string
  readonly wiki: string
  readonly wikiName: string
  readonly branch: string
  /** Host folder of the clone; registered as the DSH Workspace. */
  readonly workspace: string
  /** The library entry the session selects. */
  readonly entryId: string
  readonly createdAt: string
  /** Made by New project wiki. */
  readonly isNew?: boolean
  readonly pr?: { readonly number: number, readonly url: string }
  /** Its pull request merged or closed; Maintain makes a fresh workspace. */
  readonly closed?: 'merged' | 'closed'
}

/** What the Team Wiki page shows. */
export interface TeamStatus {
  readonly team?: TeamConfig
  readonly commit?: string
  readonly refreshedAt?: string
  readonly baseBranch?: string
  /** The repository has no commits yet: offer Set up the hub. */
  readonly empty?: boolean
  readonly wikis: readonly ProjectWiki[]
  readonly maintains: readonly MaintainRecord[]
  /** Whether a token for the remote is set (pull requests need one). */
  readonly hasToken: boolean
}

/** One project wiki in detail. */
export interface WikiDetail {
  readonly wiki: ProjectWiki
  readonly pages: readonly WikiPage[]
}

/** How an open pull request stands. */
export interface PullView {
  readonly number: number
  readonly title: string
  readonly url: string
  readonly author: string
  readonly draft: boolean
  readonly branch: string
  readonly updatedAt: string
  readonly labels: readonly string[]
  /** Project wiki folders it touches. */
  readonly wikis: readonly string[]
  readonly checks: 'success' | 'failure' | 'pending' | 'none' | 'unknown'
  /** Only unreviewed pages, new captures, index.md and log.md; recomputed from git here. */
  readonly eligible: boolean
  readonly reasons: readonly string[]
  readonly files: number
  /** The maintenance workspace that opened it, if it was opened here. */
  readonly maintainId?: string
}

/** The pull request list. */
export interface PullsAnswer {
  readonly pulls: readonly PullView[]
  readonly at: string
  /** Why the list is empty or partial, e.g. not a GitHub remote. */
  readonly note?: string
  /**
   * A workspace's pull request merged or closed (and on a merge `main/` moved
   * to the new base commit): the team status is out of date.
   */
  readonly statusChanged?: true
}

/** A changed file in a maintenance workspace. */
export interface ChangedPage {
  readonly path: string
  readonly status: 'added' | 'modified' | 'deleted'
  readonly review?: 'reviewed' | 'unreviewed'
}

/** What a maintenance workspace holds that the base branch does not. */
export interface ChangesAnswer {
  readonly record: MaintainRecord
  readonly files: readonly ChangedPage[]
  readonly uncommitted: number
  /** A title and summary built from the changed pages, for the dialog to prefill. */
  readonly suggested?: { readonly title: string, readonly summary: string }
}

/** The answer of Maintain and New project wiki: open this workspace with this entry. */
export interface MaintainAnswer {
  readonly record: MaintainRecord
  readonly entry: LibraryEntry
  readonly workspace: string
  readonly created: boolean
  /** Initialize from code: where the code is checked out, and the task to prefill in the session. */
  readonly initialize?: { readonly code: string, readonly repo: string, readonly commit: string, readonly prompt: string }
  readonly initializeError?: string
  /** New project wiki opens its first pull request right away; this says how that went. */
  readonly pr?: OpenPrAnswer
  readonly prError?: string
}

/** What Publish did. */
export interface PublishAnswer {
  readonly record: MaintainRecord
  /** A maintenance workspace was made for it. */
  readonly created: boolean
  /** The project's published folder, e.g. `published/Projects/Payments`. */
  readonly dir: string
  /** Pages written, the landing page and folder pages included. */
  readonly pages: number
  readonly skipped: readonly { readonly path: string, readonly reason: string }[]
  /** The published pages already match the bundle. */
  readonly unchanged?: boolean
  readonly pr?: OpenPrAnswer
  readonly prError?: string
}

/** What Open pull request did. */
export interface OpenPrAnswer {
  readonly branch: string
  readonly commit: string
  readonly files: readonly string[]
  readonly eligible: boolean
  readonly reasons: readonly string[]
  readonly pushed: boolean
  readonly pr?: { readonly number: number, readonly url: string, readonly reused: boolean }
  readonly stamped: readonly string[]
  readonly notes: readonly string[]
}
