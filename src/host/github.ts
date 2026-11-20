/**
 * The few GitHub REST calls the Team Wiki page needs, over Node's `fetch`:
 * open or update a pull request, label it, and list open ones with their checks.
 */

/** Where a GitHub repository is. */
export interface GitHubRepo {
  readonly owner: string
  readonly repo: string
}

/** A pull request as this bundle reports it. */
export interface PullRequest {
  readonly number: number
  readonly url: string
  readonly reused: boolean
}

/**
 * Recognize a GitHub remote.
 * @param url - the `origin` URL.
 * @param host - the GitHub host name (github.com, or a GitHub Enterprise host).
 * @returns owner and repo, or undefined when the remote is not on that host.
 */
export function parseGitHubRemote(url: string, host: string): GitHubRepo | undefined {
  const escaped = host.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = new RegExp(`^(?:https?://(?:[^@/]+@)?${escaped}/|git@${escaped}:|ssh://git@${escaped}/)([^/]+)/([^/]+?)(?:\\.git)?/?$`, 'i').exec(url.trim())
  if (match === null) return undefined
  return { owner: match[1] ?? '', repo: match[2] ?? '' }
}

/** A failed GitHub call. */
export class GitHubError extends Error {
  readonly status: number

  /**
   * @param status - HTTP status.
   * @param message - GitHub's message.
   */
  constructor(status: number, message: string) {
    super(message)
    this.name = 'GitHubError'
    this.status = status
  }
}

/** An open pull request, as the Team Wiki page lists it. */
export interface PullSummary {
  readonly number: number
  readonly title: string
  readonly url: string
  readonly author: string
  readonly draft: boolean
  readonly headRef: string
  readonly headSha: string
  readonly baseRef: string
  readonly updatedAt: string
  readonly labels: string[]
}

/** The combined state of a commit's check runs. */
export type ChecksState = 'success' | 'failure' | 'pending' | 'none'

/** A minimal GitHub client bound to one repository and token. */
export class GitHub {
  private readonly api: string
  private readonly token: string | undefined
  private readonly target: GitHubRepo

  /**
   * @param api - the REST base URL, e.g. https://api.github.com.
   * @param token - a token that may push and open pull requests; undefined reads a public repository anonymously.
   * @param target - the repository.
   */
  constructor(api: string, token: string | undefined, target: GitHubRepo) {
    this.api = api.replace(/\/$/, '')
    this.token = token
    this.target = target
  }

  /**
   * One call.
   * @param method - HTTP method.
   * @param path - path under /repos/{owner}/{repo}.
   * @param body - JSON body.
   * @param signal - cancellation.
   * @returns the parsed answer.
   */
  async call(method: string, path: string, body: unknown, signal: AbortSignal | undefined, outsideRepo = false): Promise<unknown> {
    const url = outsideRepo ? `${this.api}${path}` : `${this.api}/repos/${encodeURIComponent(this.target.owner)}/${encodeURIComponent(this.target.repo)}${path}`
    const response = await fetch(url, {
      method,
      headers: {
        accept: 'application/vnd.github+json',
        ...this.token === undefined ? {} : { authorization: `Bearer ${this.token}` },
        'x-github-api-version': '2022-11-28',
        'user-agent': 'dsh-okf',
        ...body === undefined ? {} : { 'content-type': 'application/json' },
      },
      ...body === undefined ? {} : { body: JSON.stringify(body) },
      ...signal === undefined ? {} : { signal },
    })
    const text = await response.text()
    const value: unknown = text === '' ? null : JSON.parse(text)
    if (!response.ok) {
      const message = typeof value === 'object' && value !== null && 'message' in value ? String((value as { message: unknown }).message) : response.statusText
      const errors = typeof value === 'object' && value !== null && 'errors' in value ? ` ${JSON.stringify((value as { errors: unknown }).errors)}` : ''
      throw new GitHubError(response.status, `${message}${errors}`)
    }
    return value
  }

  /**
   * The login of the token's user.
   * @param signal - cancellation.
   * @returns the login.
   */
  async login(signal?: AbortSignal): Promise<string> {
    const row = await this.call('GET', '/user', undefined, signal, true) as { login?: string }
    if (typeof row.login !== 'string' || row.login === '') throw new GitHubError(500, 'GitHub did not say who the token belongs to.')
    return row.login
  }

  /**
   * Open a pull request, or return the open one for the same branch.
   * @param input - title, body, head branch and base branch.
   * @param signal - cancellation.
   * @returns the pull request.
   */
  async openOrUpdate(input: { title: string, body: string, head: string, base: string }, signal?: AbortSignal): Promise<PullRequest> {
    const existing = await this.call('GET', `/pulls?state=open&head=${encodeURIComponent(`${this.target.owner}:${input.head}`)}`, undefined, signal) as { number: number, html_url: string }[]
    const open = existing[0]
    if (open !== undefined) {
      // An empty title keeps the one the pull request has.
      await this.call('PATCH', `/pulls/${String(open.number)}`, { ...input.title === '' ? {} : { title: input.title }, body: input.body }, signal)
      return { number: open.number, url: open.html_url, reused: true }
    }
    const created = await this.call('POST', '/pulls', { ...input, title: input.title || input.head }, signal) as { number: number, html_url: string }
    return { number: created.number, url: created.html_url, reused: false }
  }

  /**
   * Add or remove a label.
   * @param number - the pull request.
   * @param label - the label.
   * @param present - add when true, remove when false.
   * @param signal - cancellation.
   */
  async setLabel(number: number, label: string, present: boolean, signal?: AbortSignal): Promise<void> {
    if (present) {
      await this.call('POST', `/issues/${String(number)}/labels`, { labels: [label] }, signal)
      return
    }
    try {
      await this.call('DELETE', `/issues/${String(number)}/labels/${encodeURIComponent(label)}`, undefined, signal)
    } catch (error) {
      if (!(error instanceof GitHubError && error.status === 404)) throw error
    }
  }

  /**
   * Open pull requests, newest first (one page of up to 100).
   * @param signal - cancellation.
   * @returns the pull requests.
   */
  async openPulls(signal?: AbortSignal): Promise<PullSummary[]> {
    const rows = await this.call('GET', '/pulls?state=open&per_page=100&sort=updated&direction=desc', undefined, signal) as {
      number: number, title: string, html_url: string, draft?: boolean, updated_at: string,
      user?: { login?: string }, head: { ref: string, sha: string }, base: { ref: string }, labels?: { name?: string }[]
    }[]
    return rows.map(row => ({
      number: row.number,
      title: row.title,
      url: row.html_url,
      author: row.user?.login ?? '',
      draft: row.draft === true,
      headRef: row.head.ref,
      headSha: row.head.sha,
      baseRef: row.base.ref,
      updatedAt: row.updated_at,
      labels: (row.labels ?? []).map(label => label.name ?? '').filter(name => name !== ''),
    }))
  }

  /**
   * Whether a pull request is still open, merged or closed.
   * @param number - the pull request.
   * @param signal - cancellation.
   * @returns the state.
   */
  async pullState(number: number, signal?: AbortSignal): Promise<'open' | 'merged' | 'closed'> {
    const row = await this.call('GET', `/pulls/${String(number)}`, undefined, signal) as { state: string, merged?: boolean }
    if (row.state === 'open') return 'open'
    return row.merged === true ? 'merged' : 'closed'
  }

  /**
   * The combined state of a commit's check runs.
   * @param sha - the commit.
   * @param signal - cancellation.
   * @returns success when every run passed or was skipped, failure when one failed, pending while any runs.
   */
  async checks(sha: string, signal?: AbortSignal): Promise<ChecksState> {
    const answer = await this.call('GET', `/commits/${encodeURIComponent(sha)}/check-runs?per_page=100`, undefined, signal) as { check_runs?: { status: string, conclusion: string | null }[] }
    const runs = answer.check_runs ?? []
    if (runs.length === 0) return 'none'
    if (runs.some(run => run.status === 'completed' && ['failure', 'timed_out', 'cancelled', 'action_required', 'startup_failure'].includes(run.conclusion ?? ''))) return 'failure'
    if (runs.some(run => run.status !== 'completed')) return 'pending'
    return 'success'
  }
}
