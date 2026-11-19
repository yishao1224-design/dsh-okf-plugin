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
} as const

/**
 * The document-relative form of a route, which is what the browser fetches.
 * @param route - an absolute route from {@link ROUTES}.
 * @returns the route without its leading slash.
 */
export function relative(route: string): string {
  return route.replace(/^\//, '')
}
