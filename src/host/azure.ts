/**
 * The Azure DevOps REST calls the Team Wiki page needs when the hub lives in
 * Azure Repos, mirroring {@link GitHub}: open or update a pull request, label
 * it, list active ones with their statuses, read whether one completed, and
 * turn auto-complete on for a change that only touches unreviewed pages.
 *
 * Auth is a personal access token (Code: Read & Write) sent as Basic with an
 * empty user, the same as git uses it.
 */

import { GitHubError } from './github.ts'
import type { ChecksState, PullRequest, PullSummary } from './github.ts'

/** Where an Azure Repos repository is. */
export interface AzureRepo {
  readonly org: string
  readonly project: string
  readonly repo: string
}

/** Azure DevOps keeps a pull request description under this many characters. */
const DESCRIPTION_MAX = 4000

/** The id that clears `autoCompleteSetBy`. */
const NOBODY = '00000000-0000-0000-0000-000000000000'

/** A pull request row as the REST API answers it. */
interface AzurePull {
  pullRequestId: number
  title: string
  status: string
  isDraft?: boolean
  creationDate?: string
  closedDate?: string
  sourceRefName: string
  targetRefName: string
  createdBy?: { displayName?: string, uniqueName?: string }
  lastMergeSourceCommit?: { commitId?: string }
  labels?: { name?: string, active?: boolean }[]
}

/**
 * Drop `refs/heads/`.
 * @param ref - a full ref name.
 * @returns the branch.
 */
function branchOf(ref: string): string {
  return ref.replace(/^refs\/heads\//, '')
}

/** A minimal Azure DevOps client bound to one repository and token. */
export class AzureDevOps {
  private readonly api: string
  private readonly token: string | undefined
  private readonly target: AzureRepo
  private readonly web: string
  private me: { id: string, account: string } | undefined

  /**
   * @param api - the organization-less REST root, e.g. https://dev.azure.com.
   * @param token - a PAT that may push and open pull requests.
   * @param target - the repository.
   * @param web - the repository's web address, for pull request links.
   */
  constructor(api: string, token: string | undefined, target: AzureRepo, web: string) {
    this.api = api.replace(/\/$/, '')
    this.token = token
    this.target = target
    this.web = web.replace(/\/$/, '')
  }

  /**
   * One call.
   * @param method - HTTP method.
   * @param path - path under the repository's `_apis/git/repositories/{repo}`, or an absolute API path when `outsideRepo`.
   * @param body - JSON body.
   * @param signal - cancellation.
   * @param outsideRepo - `path` starts at the organization (`/_apis/connectionData`).
   * @returns the parsed answer.
   */
  async call(method: string, path: string, body: unknown, signal: AbortSignal | undefined, outsideRepo = false): Promise<unknown> {
    const org = encodeURIComponent(this.target.org)
    const base = outsideRepo
      ? `${this.api}/${org}${path}`
      : `${this.api}/${org}/${encodeURIComponent(this.target.project)}/_apis/git/repositories/${encodeURIComponent(this.target.repo)}${path}`
    const url = `${base}${base.includes('?') ? '&' : '?'}api-version=7.1`
    const response = await fetch(url, {
      method,
      headers: {
        accept: 'application/json',
        ...this.token === undefined ? {} : { authorization: `Basic ${Buffer.from(`:${this.token}`).toString('base64')}` },
        'user-agent': 'dsh-okf',
        ...body === undefined ? {} : { 'content-type': 'application/json' },
      },
      ...body === undefined ? {} : { body: JSON.stringify(body) },
      ...signal === undefined ? {} : { signal },
      // A missing or expired PAT answers with a sign-in page redirect, not 401.
      redirect: 'manual',
    })
    const text = await response.text()
    if (response.status >= 300 && response.status < 400) throw new GitHubError(401, 'Azure DevOps asked to sign in: check DSH_OKF_AZURE_TOKEN (a PAT with Code: Read & Write).')
    let value: unknown = null
    try {
      value = text === '' ? null : JSON.parse(text)
    } catch {
      if (!response.ok) throw new GitHubError(response.status, `${response.status} ${response.statusText}`)
      throw new GitHubError(502, 'Azure DevOps did not answer with JSON.')
    }
    if (!response.ok) {
      const message = typeof value === 'object' && value !== null && 'message' in value ? String((value as { message: unknown }).message) : response.statusText
      throw new GitHubError(response.status, message)
    }
    return value
  }

  /** The token's user: its id (for auto-complete) and account name. */
  private async self(signal?: AbortSignal): Promise<{ id: string, account: string }> {
    if (this.me !== undefined) return this.me
    const answer = await this.call('GET', '/_apis/connectionData', undefined, signal, true) as {
      authenticatedUser?: { id?: string, providerDisplayName?: string, properties?: { Account?: { $value?: string } } }
    }
    const user = answer.authenticatedUser
    const account = user?.properties?.Account?.$value ?? user?.providerDisplayName ?? ''
    if (user?.id === undefined || account === '') throw new GitHubError(500, 'Azure DevOps did not say who the token belongs to.')
    this.me = { id: user.id, account }
    return this.me
  }

  /**
   * The token's user, as a reviewer id (its account, usually the email).
   * @param signal - cancellation.
   * @returns the account.
   */
  async login(signal?: AbortSignal): Promise<string> {
    return (await this.self(signal)).account
  }

  /**
   * The web link of a pull request.
   * @param id - the pull request.
   * @returns the URL.
   */
  private link(id: number): string {
    return `${this.web}/pullrequest/${String(id)}`
  }

  /**
   * Open a pull request, or update the active one for the same branch.
   * @param input - title, body, head branch and base branch.
   * @param signal - cancellation.
   * @returns the pull request.
   */
  async openOrUpdate(input: { title: string, body: string, head: string, base: string }, signal?: AbortSignal): Promise<PullRequest> {
    const description = input.body.length <= DESCRIPTION_MAX ? input.body : `${input.body.slice(0, DESCRIPTION_MAX - 60)}\n\n… (cut to Azure DevOps' 4000-character limit)`
    const query = `?searchCriteria.status=active&searchCriteria.sourceRefName=${encodeURIComponent(`refs/heads/${input.head}`)}&searchCriteria.targetRefName=${encodeURIComponent(`refs/heads/${input.base}`)}`
    const existing = (await this.call('GET', `/pullrequests${query}`, undefined, signal) as { value?: AzurePull[] }).value ?? []
    const open = existing[0]
    if (open !== undefined) {
      // An empty title keeps the one the pull request has.
      await this.call('PATCH', `/pullrequests/${String(open.pullRequestId)}`, { ...input.title === '' ? {} : { title: input.title }, description }, signal)
      return { number: open.pullRequestId, url: this.link(open.pullRequestId), reused: true }
    }
    const created = await this.call('POST', '/pullrequests', {
      sourceRefName: `refs/heads/${input.head}`,
      targetRefName: `refs/heads/${input.base}`,
      title: input.title || input.head,
      description,
    }, signal) as AzurePull
    return { number: created.pullRequestId, url: this.link(created.pullRequestId), reused: false }
  }

  /**
   * Add or remove a label (Azure DevOps calls them tags in the UI).
   * @param number - the pull request.
   * @param label - the label.
   * @param present - add when true, remove when false.
   * @param signal - cancellation.
   */
  async setLabel(number: number, label: string, present: boolean, signal?: AbortSignal): Promise<void> {
    if (present) {
      await this.call('POST', `/pullrequests/${String(number)}/labels`, { name: label }, signal)
      return
    }
    try {
      await this.call('DELETE', `/pullrequests/${String(number)}/labels/${encodeURIComponent(label)}`, undefined, signal)
    } catch (error) {
      if (!(error instanceof GitHubError && error.status === 404)) throw error
    }
  }

  /**
   * Turn auto-complete on (squash, delete the branch) or off. It completes the
   * pull request once the branch policies (required reviewers, a build
   * validation running the checker) pass.
   * @param number - the pull request.
   * @param on - on or off.
   * @param signal - cancellation.
   */
  async setAutoMerge(number: number, on: boolean, signal?: AbortSignal): Promise<void> {
    const me = on ? await this.self(signal) : undefined
    await this.call('PATCH', `/pullrequests/${String(number)}`, on
      ? { autoCompleteSetBy: { id: me?.id }, completionOptions: { mergeStrategy: 'squash', deleteSourceBranch: true, transitionWorkItems: false } }
      : { autoCompleteSetBy: { id: NOBODY } }, signal)
  }

  /**
   * Active pull requests, newest first (one page of up to 100).
   * @param signal - cancellation.
   * @returns the pull requests.
   */
  async openPulls(signal?: AbortSignal): Promise<PullSummary[]> {
    const rows = (await this.call('GET', '/pullrequests?searchCriteria.status=active&$top=100', undefined, signal) as { value?: AzurePull[] }).value ?? []
    return rows.map(row => ({
      number: row.pullRequestId,
      title: row.title,
      url: this.link(row.pullRequestId),
      author: row.createdBy?.uniqueName ?? row.createdBy?.displayName ?? '',
      draft: row.isDraft === true,
      headRef: branchOf(row.sourceRefName),
      headSha: row.lastMergeSourceCommit?.commitId ?? '',
      baseRef: branchOf(row.targetRefName),
      updatedAt: row.creationDate ?? '',
      labels: (row.labels ?? []).filter(label => label.active !== false).map(label => label.name ?? '').filter(name => name !== ''),
    }))
  }

  /**
   * Whether a pull request is still active, completed (merged) or abandoned.
   * @param number - the pull request.
   * @param signal - cancellation.
   * @returns the state.
   */
  async pullState(number: number, signal?: AbortSignal): Promise<'open' | 'merged' | 'closed'> {
    const row = await this.call('GET', `/pullrequests/${String(number)}`, undefined, signal) as AzurePull
    if (row.status === 'completed') return 'merged'
    if (row.status === 'abandoned') return 'closed'
    return 'open'
  }

  /**
   * The combined state of a pull request's statuses (what build validations
   * and other services post).
   * @param pull - the pull request.
   * @param pull.number - its id.
   * @param signal - cancellation.
   * @returns success when all succeeded, failure when one failed, pending while any runs.
   */
  async checks(pull: { number: number }, signal?: AbortSignal): Promise<ChecksState> {
    const rows = (await this.call('GET', `/pullrequests/${String(pull.number)}/statuses`, undefined, signal) as { value?: { state?: string, context?: { name?: string, genre?: string } }[] }).value ?? []
    // Several iterations post the same context: the last word on each counts.
    const latest = new Map<string, string>()
    for (const row of rows) latest.set(`${row.context?.genre ?? ''}/${row.context?.name ?? ''}`, row.state ?? '')
    const states = [...latest.values()].filter(state => state !== 'notApplicable')
    if (states.length === 0) return 'none'
    if (states.some(state => state === 'failed' || state === 'error')) return 'failure'
    if (states.some(state => state !== 'succeeded')) return 'pending'
    return 'success'
  }
}
