/**
 * The Team Wiki page: a sidebar entry (`sidebar.panellist`) that shows a
 * `main` panel listing the team wiki repository's project wikis, their review
 * counts and open pull requests, with New project wiki and Maintain (each opens
 * a session in its own maintenance workspace). The All bundles tab is the
 * plugin's existing library.
 *
 * Two helpers ride along in a maintenance session: a header button that opens
 * the Open pull request dialog, and that dialog itself (in `shell.overlay`).
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { PanelIconProps, Translate } from '../types/contract.ts'
import type { LibraryEntry, MaintainRecord, OpenPrAnswer, ProjectWiki, PullView, ReviewAnswer, TeamStatus, WikiPage } from '../types/okf.ts'
import { BookIcon, Button, useOkf } from './components.tsx'
import type { OkfInjected } from './components.tsx'
import type { OkfKey } from './locales.ts'
import type { OkfState, OkfStore, OpenOutcome } from './store.ts'
import { st, sx } from './styles.ts'
import { webUrl } from '../shared/gitweb.ts'

/** How often an open workspace pull request is checked for a merge. */
const PR_POLL_MS = 3 * 60_000

type T = Translate<OkfKey>

/**
 * The sidebar glyph.
 * @param props - the size the sidebar asks for.
 * @returns the icon.
 */
export function TeamWikiIcon({ size }: PanelIconProps): ReactNode {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2.5 3.5h4a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 0-1.5-1.5h-4zM13.5 3.5h-4A1.5 1.5 0 0 0 8 5v8a1.5 1.5 0 0 1 1.5-1.5h4z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  )
}

/** Props of {@link TeamWikiPage}. */
export type TeamWikiPageProps = OkfInjected & { readonly t: T }

/**
 * The page.
 * @param props - store and translate seat.
 * @returns the page.
 */
export function TeamWikiPage({ store, t }: TeamWikiPageProps): ReactNode {
  const state = useOkf(store)
  const team = state.team
  const [tab, setTab] = useState<'wikis' | 'bundles'>('wikis')
  const [creating, setCreating] = useState(false)
  const [changingRepo, setChangingRepo] = useState(false)
  useEffect(() => {
    if (team.status.status === 'idle') void store.loadTeam()
  }, [store, team.status.status])
  const data = team.status.data
  useEffect(() => {
    if (data?.team !== undefined && team.pulls.status === 'idle') void store.loadPulls()
  }, [store, data?.team, team.pulls.status])
  // While a workspace's pull request is open, notice when it merges: on coming
  // back to the window (e.g. from merging on GitHub) and every few minutes.
  const waiting = data?.maintains.some(record => record.pr !== undefined) === true
  useEffect(() => {
    if (!waiting) return
    const check = (): void => { if (store.getSnapshot().team.pulls.status !== 'loading') void store.loadPulls() }
    const onFocus = (): void => { check() }
    window.addEventListener('focus', onFocus)
    const timer = window.setInterval(check, PR_POLL_MS)
    return () => {
      window.removeEventListener('focus', onFocus)
      window.clearInterval(timer)
    }
  }, [store, waiting])

  if (data === undefined) {
    return (
      <div style={st('twPage')}>
        <PageHeader t={t} />
        {team.status.status === 'failed'
          ? <div style={st('twForm')}><div style={st('error')}>{team.status.error}</div><div><Button onClick={() => { void store.loadTeam() }}>{t('action.retry')}</Button></div></div>
          : <div style={st('empty')}>{t('team.loading')}</div>}
      </div>
    )
  }
  if (data.team === undefined || changingRepo) {
    return (
      <div style={st('twPage')}>
        <PageHeader t={t} />
        <ConnectForm store={store} t={t} current={data.team} onDone={() => { setChangingRepo(false) }} onCancel={data.team === undefined ? undefined : () => { setChangingRepo(false) }} />
      </div>
    )
  }
  const busy = team.status.status === 'loading'
  return (
    <div style={st('twPage')}>
      <PageHeader t={t} repo={data.team.name} branch={data.baseBranch}>
        <Button disabled={busy} title={data.refreshedAt === undefined ? undefined : t('team.refreshedAt', { at: new Date(data.refreshedAt).toLocaleString() })} onClick={() => { void store.refreshTeam() }}>{busy ? t('team.refreshing') : t('team.refresh')}</Button>
        <Button onClick={() => { setChangingRepo(true) }}>{t('team.changeRepo')}</Button>
        {data.empty !== true && <Button variant="primary" onClick={() => { setCreating(true) }}>{t('team.new')}</Button>}
      </PageHeader>
      <div style={st('twTabs')} role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'wikis'} style={sx('twTab', tab === 'wikis' && 'twTabActive')} onClick={() => { setTab('wikis') }}>{t('team.tabWikis')}</button>
        <button type="button" role="tab" aria-selected={tab === 'bundles'} style={sx('twTab', tab === 'bundles' && 'twTabActive')} onClick={() => { setTab('bundles') }}>{t('team.tabBundles')}</button>
      </div>
      {team.notice !== undefined && (
        <div style={{ ...st('twNotice'), ...team.notice.kind === 'error' ? st('error') : { border: '0.5px solid var(--dsw-alias-state-success-primary)' } }}>
          <span style={{ flex: 1, whiteSpace: 'pre-wrap' }}>{team.notice.text}</span>
          <Button onClick={() => { store.setNotice(undefined) }} ariaLabel={t('dialog.close')}>×</Button>
        </div>
      )}
      {!data.hasToken && data.team.provider === 'github' && <div style={{ ...st('note'), margin: '8px 22px 0' }}>{t('team.noToken')}</div>}
      {!data.hasToken && data.team.provider === 'azure-devops' && <div style={{ ...st('note'), margin: '8px 22px 0' }}>{t('team.noTokenAzure')}</div>}
      {tab === 'wikis'
        ? <WikisTab store={store} state={state} data={data} t={t} onCreate={() => { setCreating(true) }} />
        : <BundlesTab store={store} entries={state.library.entries} t={t} />}
      {creating && <NewWikiDialog store={store} data={data} t={t} onClose={() => { setCreating(false) }} />}
    </div>
  )
}

/**
 * The page header.
 * @param props - repository name, base branch, header actions.
 * @returns the header.
 */
function PageHeader({ t, repo, branch, children }: { readonly t: T, readonly repo?: string | undefined, readonly branch?: string | undefined, readonly children?: ReactNode }): ReactNode {
  return (
    <div style={st('twHeader')}>
      <h1 style={st('twTitle')}>{t('team.title')}</h1>
      {repo !== undefined && <span style={st('twRepo')} title={repo}>· {repo}{branch === undefined ? '' : ` (${branch})`}</span>}
      <span style={st('twSpacer')} />
      {children}
    </div>
  )
}

/**
 * Connect (or change) the team wiki repository.
 * @param props - store, the current repository, callbacks.
 * @returns the form.
 */
function ConnectForm({ store, t, current, onDone, onCancel }: { readonly store: OkfStore, readonly t: T, readonly current: TeamStatus['team'], readonly onDone: () => void, readonly onCancel: (() => void) | undefined }): ReactNode {
  const [url, setUrl] = useState(current?.url ?? '')
  const [ref, setRef] = useState(current?.ref ?? '')
  const [root, setRoot] = useState(current?.root ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const submit = (): void => {
    setBusy(true)
    setError(undefined)
    store.connectTeam({ url: url.trim(), ...ref.trim() === '' ? {} : { ref: ref.trim() }, root: root.trim() }).then(() => {
      setBusy(false)
      onDone()
    }, (failure: unknown) => {
      setBusy(false)
      setError((failure as Error).message)
    })
  }
  return (
    <form style={st('twForm')} onSubmit={(event) => { event.preventDefault(); submit() }}>
      <h2 style={{ ...st('twDetailName'), fontSize: 16 }}>{t('team.connectTitle')}</h2>
      <p style={st('note')}>{t('team.connectHint')}</p>
      <label style={st('label')} htmlFor="okf-team-url">{t('add.url')}</label>
      <input id="okf-team-url" style={st('input')} value={url} placeholder="https://github.com/acme/team-wiki" onChange={(event) => { setUrl(event.target.value) }} />
      <label style={st('label')} htmlFor="okf-team-ref">{t('team.branch')}</label>
      <input id="okf-team-ref" style={st('input')} value={ref} placeholder="main" onChange={(event) => { setRef(event.target.value) }} />
      <label style={st('label')} htmlFor="okf-team-root">{t('team.root')}</label>
      <input id="okf-team-root" style={st('input')} value={root} placeholder={t('team.rootPlaceholder')} onChange={(event) => { setRoot(event.target.value) }} />
      <p style={st('note')}>{t('add.auth')}</p>
      {error !== undefined && <div style={st('error')}>{error}</div>}
      <div style={{ ...st('row'), marginTop: 10 }}>
        <Button type="submit" variant="primary" disabled={busy || url.trim() === ''}>{busy ? t('team.connecting') : t('team.connect')}</Button>
        {onCancel !== undefined && <Button onClick={onCancel}>{t('add.cancel')}</Button>}
      </div>
    </form>
  )
}

/**
 * Open pull requests that touch a project wiki.
 * @param pulls - all listed pull requests.
 * @param folder - the wiki.
 * @returns its pull requests.
 */
function pullsOf(pulls: readonly PullView[] | undefined, folder: string): PullView[] {
  return (pulls ?? []).filter(pull => pull.wikis.includes(folder))
}

/**
 * The Project wikis tab: list on the left, the selected wiki on the right.
 * @param props - store, state, status.
 * @returns the tab.
 */
function WikisTab({ store, state, data, t, onCreate }: { readonly store: OkfStore, readonly state: OkfState, readonly data: TeamStatus, readonly t: T, readonly onCreate: () => void }): ReactNode {
  const [selected, setSelected] = useState<string | undefined>(undefined)
  const pulls = state.team.pulls.data?.pulls
  // A wiki being created is not on the base branch yet; its workspace still shows.
  const pending = data.maintains.filter(record => record.isNew === true && !data.wikis.some(wiki => wiki.folder === record.wiki))
  // Until the user picks one, show the wiki with work in flight.
  const current = data.wikis.find(wiki => wiki.folder === selected)
    ?? data.wikis.find(wiki => wiki.maintainId !== undefined || pullsOf(pulls, wiki.folder).length > 0)
    ?? data.wikis[0]
  if (data.empty === true) return <EmptyHub store={store} data={data} t={t} />
  if (data.wikis.length === 0 && pending.length === 0) {
    return (
      <div style={st('empty')}>
        <p>{t('team.noWikis', { root: data.team?.root || '/' })}</p>
        <Button variant="primary" onClick={onCreate}>{t('team.new')}</Button>
      </div>
    )
  }
  return (
    <div style={st('twBody')}>
      <div style={st('twList')}>
        {data.wikis.map((wiki) => {
          const open = pullsOf(pulls, wiki.folder).length
          return (
            <button key={wiki.folder} type="button" style={sx('twCard', current?.folder === wiki.folder && 'twCardActive')} onClick={() => { setSelected(wiki.folder) }}>
              <div style={st('twCardName')}>
                <span>{wiki.name}</span>
                {wiki.maintainId !== undefined && <span style={sx('badge', 'badgeBrand')}>{t('team.beingMaintained')}</span>}
                {wiki.code?.behind === true && <span style={sx('badge', 'badgeWarn')} title={codeTitle(wiki, t)}>{t('team.codeUpdated')}</span>}
              </div>
              <div style={st('twMono')}>{wiki.folder}/{wiki.owner === undefined ? '' : ` · ${wiki.owner}`}</div>
              {wiki.summary !== undefined && <div style={{ ...st('twMeta'), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={wiki.summary}>{wiki.summary}</div>}
              <div style={st('twMeta')}>
                {wiki.missing === true ? t('team.missing') : t('team.cardMeta', { pages: wiki.stats.pages, unreviewed: wiki.stats.unreviewed })}
                {open > 0 && ` · ${t('team.cardPrs', { count: open })}`}
              </div>
            </button>
          )
        })}
        {pending.map(record => <PendingCard key={record.id} store={store} record={record} t={t} />)}
      </div>
      <div style={st('twDetail')}>
        {current === undefined
          ? <div style={st('empty')}>{t('team.pickWiki')}</div>
          : <WikiDetailPane key={current.folder} store={store} state={state} data={data} wiki={current} t={t} />}
      </div>
    </div>
  )
}

/**
 * A new project wiki not on the base branch yet: its workspace, and its
 * pull request once opened (else the Open pull request button).
 * @param props - store, the workspace record.
 * @returns the card.
 */
function PendingCard({ store, record, t }: { readonly store: OkfStore, readonly record: MaintainRecord, readonly t: T }): ReactNode {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const open = (): void => {
    setBusy(true)
    setError(undefined)
    store.maintainWiki(record.wiki).then((outcome) => {
      setBusy(false)
      if (!outcome.opened) setError(manualText(outcome, t))
    }, (failure: unknown) => {
      setBusy(false)
      setError((failure as Error).message)
    })
  }
  return (
    <div style={{ ...st('twCard'), cursor: 'default' }}>
      <div style={st('twCardName')}><span>{record.wikiName}</span><span style={sx('badge', 'badgeWarn')}>{t('team.pendingWiki')}</span></div>
      <div style={st('twMono')}>{record.wiki}</div>
      <div style={st('twMeta')}>{record.pr === undefined ? t('team.pendingNoPr') : <a style={st('twLink')} href={record.pr.url} target="_blank" rel="noreferrer">{t('team.prNumber', { number: record.pr.number })}</a>}</div>
      <div style={{ ...st('row'), marginTop: 6 }}>
        {record.pr === undefined && <Button variant="primary" style={{ minHeight: 24 }} title={t('team.pendingOpenPrHint')} onClick={() => { store.openPrDialog(record.id) }}>{t('team.openPr')}</Button>}
        <Button style={{ minHeight: 24 }} disabled={busy} title={t('team.maintainHint')} onClick={open}>{busy ? t('team.opening') : t('team.maintainOpen')}</Button>
      </div>
      {error !== undefined && <div style={{ ...st('error'), marginTop: 6 }}>{error}</div>}
    </div>
  )
}

/**
 * One project wiki: actions, counts, and its pull requests and pages.
 * @param props - store, state, the wiki.
 * @returns the pane.
 */
function WikiDetailPane({ store, state, data, wiki, t }: { readonly store: OkfStore, readonly state: OkfState, readonly data: TeamStatus, readonly wiki: ProjectWiki, readonly t: T }): ReactNode {
  const [tab, setTab] = useState<'pulls' | 'pages' | 'review'>('pulls')
  const [busy, setBusy] = useState<'maintain' | 'preview' | 'publish' | 'sync' | undefined>(undefined)
  const [error, setError] = useState<string | undefined>(undefined)
  const detail = state.team.wikis[wiki.folder]
  useEffect(() => {
    if (detail === undefined || detail.status === 'idle') void store.loadWiki(wiki.folder)
  }, [store, wiki.folder, detail])
  const pulls = pullsOf(state.team.pulls.data?.pulls, wiki.folder)
  const record = data.maintains.find(candidate => candidate.id === wiki.maintainId)
  const maintain = (): void => {
    setBusy('maintain')
    setError(undefined)
    store.maintainWiki(wiki.folder).then((outcome) => {
      setBusy(undefined)
      if (!outcome.opened) setError(manualText(outcome, t))
    }, (failure: unknown) => {
      setBusy(undefined)
      setError((failure as Error).message)
    })
  }
  const syncCode = (): void => {
    setBusy('sync')
    setError(undefined)
    store.syncWiki(wiki.folder).then((outcome) => {
      setBusy(undefined)
      if ('upToDate' in outcome) {
        store.setNotice({ kind: 'ok', text: t('team.syncUpToDate', { commit: outcome.commit.slice(0, 10) }) })
        return
      }
      if (!outcome.opened) setError(manualText(outcome, t))
      const sync = outcome.answer.sync
      const lead = sync === undefined ? ''
        : sync.upToDate === true ? t('team.syncUpToDate', { commit: sync.to.slice(0, 10) })
          : sync.fallback === true ? t('team.syncFallback')
            : t('team.syncFound', { files: sync.files, pages: sync.pages, from: (sync.from ?? '').slice(0, 10), to: sync.to.slice(0, 10) })
      const notice = initText(outcome, t)
      store.setNotice({ kind: notice?.kind ?? 'ok', text: [lead, notice?.text].filter(part => part !== undefined && part !== '').join('\n') })
    }, (failure: unknown) => {
      setBusy(undefined)
      setError((failure as Error).message)
    })
  }
  const publish = (): void => {
    setBusy('publish')
    setError(undefined)
    store.publishWiki(wiki.folder).then((answer) => {
      setBusy(undefined)
      const skipped = answer.skipped.length === 0 ? '' : ` ${t('team.publishSkipped', { count: answer.skipped.length })}`
      if (answer.prError !== undefined) {
        store.setNotice({ kind: 'error', text: `${t('team.publishFailed', { pages: answer.pages, dir: answer.dir })}\n${answer.prError}` })
      } else if (answer.unchanged === true) {
        store.setNotice({ kind: 'ok', text: t('team.publishUnchanged', { dir: answer.dir }) })
      } else if (answer.pr?.pr !== undefined) {
        store.setNotice({ kind: 'ok', text: `${t('team.publishDone', { pages: answer.pages, dir: answer.dir, number: answer.pr.pr.number })}${skipped}` })
      } else {
        store.setNotice({ kind: 'ok', text: `${t('team.publishPushed', { pages: answer.pages, dir: answer.dir, branch: answer.record.branch })}${skipped}${answer.pr?.notes.length ? `\n${answer.pr.notes.join('\n')}` : ''}` })
      }
    }, (failure: unknown) => {
      setBusy(undefined)
      setError((failure as Error).message)
    })
  }
  const preview = (): void => {
    setBusy('preview')
    setError(undefined)
    store.previewWiki(wiki.folder).then(() => { setBusy(undefined) }, (failure: unknown) => {
      setBusy(undefined)
      setError((failure as Error).message)
    })
  }
  const pages = detail?.data?.pages ?? []
  const needsReview = pages.filter(page => page.review === 'unreviewed' || page.overdue)
  return (
    <div>
      <div style={st('twDetailHead')}>
        <div style={{ flex: '1 1 240px', minWidth: 0 }}>
          <h2 style={st('twDetailName')}>{wiki.name}</h2>
          <div style={st('twMono')}>{wiki.folder}/</div>
          {wiki.summary !== undefined && <div style={{ ...st('twMeta'), marginTop: 4 }}>{wiki.summary}</div>}
          <div style={{ ...st('note'), marginTop: 4 }}>
            {wiki.owner !== undefined && <span>{t('team.owner', { owner: wiki.owner })} · </span>}
            {wiki.repo !== undefined && (/^https?:\/\//.test(wiki.repo)
              ? <><a style={st('twLink')} href={wiki.repo} target="_blank" rel="noreferrer">{t('team.codeRepo')}</a> · </>
              : <span>{wiki.repo} · </span>)}
            {wiki.published === undefined
              ? <span>{t('team.notPublished')}</span>
              : <span title={wiki.published.path}>{wiki.published.updated === undefined ? t('team.published') : t('team.publishedAt', { at: wiki.published.updated })}</span>}
            {!wiki.registered && <span> · {t('team.notRegistered')}</span>}
          </div>
          {record !== undefined && (
            <div style={{ ...st('note'), marginTop: 4 }}>
              {t('team.maintaining', { branch: record.branch })}
              {record.pr !== undefined && <> · <a style={st('twLink')} href={record.pr.url} target="_blank" rel="noreferrer">{t('team.prNumber', { number: record.pr.number })}</a></>}
            </div>
          )}
        </div>
        <div style={st('row')}>
          <Button variant="primary" disabled={busy !== undefined || wiki.missing === true} title={t('team.maintainHint')} onClick={maintain}>
            {busy === 'maintain' ? t('team.opening') : record === undefined ? t('team.maintain') : t('team.maintainOpen')}
          </Button>
          <Button disabled={busy !== undefined || wiki.missing === true || wiki.repo === undefined} title={wiki.repo === undefined ? t('team.initNoRepo') : codeTitle(wiki, t)} onClick={syncCode}>{busy === 'sync' ? t('team.syncing') : t('team.sync')}</Button>
          <Button disabled={busy !== undefined || wiki.missing === true} title={t('team.publishHint')} onClick={publish}>{busy === 'publish' ? t('team.publishing') : t('team.publish')}</Button>
          <Button disabled={busy !== undefined || wiki.missing === true} title={t('team.previewHint')} onClick={preview}>{busy === 'preview' ? t('preview.loading') : t('team.preview')}</Button>
        </div>
      </div>
      {error !== undefined && <div style={{ ...st('error'), marginBottom: 12 }}>{error}</div>}
      <div style={st('twStats')}>
        <Stat label={t('team.statPages')} value={wiki.stats.pages} />
        <Stat label={t('team.statReviewed')} value={wiki.stats.reviewed} />
        <Stat label={t('team.statUnreviewed')} value={wiki.stats.unreviewed} />
        <Stat label={t('team.statOverdue')} value={wiki.stats.overdue} />
      </div>
      <div style={{ ...st('twTabs'), padding: 0, marginBottom: 6 }} role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'pulls'} style={sx('twTab', tab === 'pulls' && 'twTabActive')} onClick={() => { setTab('pulls') }}>{t('team.tabPulls', { count: pulls.length })}</button>
        <button type="button" role="tab" aria-selected={tab === 'pages'} style={sx('twTab', tab === 'pages' && 'twTabActive')} onClick={() => { setTab('pages') }}>{t('team.tabPages', { count: pages.length })}</button>
        <button type="button" role="tab" aria-selected={tab === 'review'} style={sx('twTab', tab === 'review' && 'twTabActive')} onClick={() => { setTab('review') }}>{t('team.tabReview', { count: needsReview.length })}</button>
      </div>
      {tab === 'pulls' && <PullList store={store} state={state} pulls={pulls} folder={wiki.folder} t={t} />}
      {tab !== 'pulls' && detail?.status === 'failed' && <div style={st('error')}>{detail.error}</div>}
      {tab !== 'pulls' && detail?.data === undefined && detail?.status !== 'failed' && <div style={st('empty')}>{t('preview.loading')}</div>}
      {tab === 'pages' && detail?.data !== undefined && <PageList pages={pages} t={t} empty={t('team.noPages')} />}
      {tab === 'review' && detail?.data !== undefined && <PageList pages={needsReview} t={t} empty={t('team.noReview')} onMark={paths => store.reviewPages(wiki.folder, paths).then((answer) => { store.setNotice(reviewNotice(answer, t)) })} />}
      {data.team !== undefined && <Pointer hub={data.team.url} wiki={wiki} t={t} />}
    </div>
  )
}

/**
 * A connected repository with no commits: offer to lay out the hub.
 * @param props - store, status, translator.
 * @returns the panel.
 */
function EmptyHub({ store, data, t }: { readonly store: OkfStore, readonly data: TeamStatus, readonly t: T }): ReactNode {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const setup = (): void => {
    setBusy(true)
    setError(undefined)
    store.setupHub().then(() => { setBusy(false) }, (failure: unknown) => {
      setBusy(false)
      setError((failure as Error).message)
    })
  }
  return (
    <div style={{ maxWidth: 640, margin: '32px auto', padding: '0 24px' }}>
      <h2 style={st('twDetailName')}>{t('team.emptyTitle')}</h2>
      <p style={st('note')}>{t('team.emptyText', { name: data.team?.name ?? '', branch: data.baseBranch ?? 'main' })}</p>
      <pre style={{ ...st('mdPre'), whiteSpace: 'pre-wrap' }}>{[
        'AGENTS.md                     rules for agents + empty project registry',
        'README.md',
        'scripts/okf.py                shared OKF toolchain',
        'published/Projects/           pages for the Azure DevOps wiki (generated)',
        '.github/wiki/check-pr.js      auto-merge checker',
        '.github/wiki/workflows/*.yml  auto-merge and ADO sync (move to .github/workflows to enable)',
      ].join('\n')}</pre>
      {error !== undefined && <div style={{ ...st('error'), marginBottom: 10, whiteSpace: 'pre-wrap' }}>{error}</div>}
      <Button variant="primary" disabled={busy} onClick={setup}>{busy ? t('team.settingUp') : t('team.setUp')}</Button>
    </div>
  )
}


/**
 * The lines a project's code repository puts in its own AGENTS.md so agents
 * there find its bundle in the hub.
 * @param hub - the hub's remote.
 * @param wiki - the project.
 * @returns markdown.
 */
export function pointerText(hub: string, wiki: Pick<ProjectWiki, 'name' | 'folder'>): string {
  const url = webUrl(hub)
  return [
    '## Team wiki',
    '',
    `Knowledge about this project lives in the team wiki hub ${url}, in the OKF bundle \`${wiki.folder}/\` (registered in its AGENTS.md as "${wiki.name}").`,
    '',
    `- Before answering questions about this project's architecture, access or conventions, read \`${wiki.folder}/index.md\` in the hub and the pages it lists.`,
    '- To add or correct knowledge, run kb-ingest against the hub; it opens a pull request there. Do not copy wiki pages into this repository.',
    '',
  ].join('\n')
}

/**
 * The AGENTS.md pointer for the project's code repository, with Copy.
 * @param props - hub remote and project.
 * @returns the section.
 */
function Pointer({ hub, wiki, t }: { readonly hub: string, readonly wiki: ProjectWiki, readonly t: T }): ReactNode {
  const [copied, setCopied] = useState(false)
  const text = pointerText(hub, wiki)
  const copy = (): void => {
    void navigator.clipboard?.writeText(text).then(() => { setCopied(true) }, () => { setCopied(false) })
  }
  return (
    <details style={{ marginTop: 18 }}>
      <summary style={{ cursor: 'pointer', fontWeight: 500 }}>{t('team.pointerTitle')}</summary>
      <p style={st('note')}>{t('team.pointerHint')}</p>
      <pre style={{ ...st('mdPre'), whiteSpace: 'pre-wrap', marginTop: 6 }}>{text}</pre>
      <Button onClick={copy}>{copied ? t('team.copied') : t('team.copy')}</Button>
    </details>
  )
}

/**
 * Explain an outcome that did not open a session.
 * @param outcome - what happened.
 * @param t - translate seat.
 * @returns the text.
 */
/**
 * What to tell the user after Mark reviewed.
 * @param answer - the host's answer.
 * @param t - translate.
 * @returns the notice.
 */
export function reviewNotice(answer: ReviewAnswer, t: T): { kind: 'ok' | 'error', text: string } {
  const count = answer.marked.length
  const lead = answer.prError !== undefined
    ? t('team.reviewFailed', { count, who: answer.reviewer, reason: answer.prError })
    : answer.pr?.pr !== undefined
      ? t('team.reviewDone', { count, who: answer.reviewer, number: answer.pr.pr.number })
      : t('team.reviewPushed', { count, who: answer.reviewer, branch: answer.record.branch })
  const skipped = answer.skipped.length === 0 ? '' : `\n${t('team.reviewSkipped', { list: answer.skipped.join(', ') })}`
  return { kind: answer.prError === undefined && count > 0 ? 'ok' : 'error', text: `${lead}${skipped}` }
}

/**
 * Where a project's code stands against its wiki, for a tooltip.
 * @param wiki - the project wiki.
 * @param t - translate.
 * @returns the text.
 */
function codeTitle(wiki: ProjectWiki, t: T): string {
  const code = wiki.code
  const parts = [t('team.syncHint')]
  if (code?.recorded !== undefined) parts.push(t('team.codeRecorded', { commit: code.recorded.slice(0, 10) }))
  else parts.push(t('team.codeNotRecorded'))
  if (code?.head !== undefined) parts.push(t('team.codeHead', { commit: code.head.slice(0, 10), at: new Date(code.checkedAt ?? '').toLocaleString() }))
  if (code?.error !== undefined) parts.push(t('team.codeCheckFailed', { reason: code.error }))
  return parts.join('\n')
}

/**
 * What to tell the user after Initialize from code.
 * @param outcome - the open outcome.
 * @param t - translator.
 * @returns the notice, or undefined when nothing was initialized.
 */
function initText(outcome: OpenOutcome, t: T): { kind: 'ok' | 'error', text: string } | undefined {
  const answer = outcome.answer
  if (answer.initializeError !== undefined) return { kind: 'error', text: t('team.initFailed', { reason: answer.initializeError }) }
  // New project wiki with kb-setup: one prompt carries the setup (and the read-through, when asked for).
  if (answer.setup !== undefined) {
    if (outcome.prefilled === true) return { kind: 'ok', text: t('team.setupPrefilled', { skill: answer.setup.skill }) }
    void navigator.clipboard?.writeText(answer.setup.prompt).catch(() => undefined)
    return { kind: 'ok', text: `${t('team.initCopied', { code: answer.initialize?.code ?? '.code' })}\n\n${answer.setup.prompt}` }
  }
  if (answer.initialize === undefined) return undefined
  if (outcome.prefilled === true) return { kind: 'ok', text: t('team.initPrefilled', { code: answer.initialize.code }) }
  void navigator.clipboard?.writeText(answer.initialize.prompt).catch(() => undefined)
  return { kind: 'ok', text: `${t('team.initCopied', { code: answer.initialize.code })}\n\n${answer.initialize.prompt}` }
}

function manualText(outcome: OpenOutcome, t: T): string {
  const base = t('edit.manual', { path: outcome.answer.workspace, name: outcome.answer.entry.name })
  return outcome.reason === undefined || outcome.reason === 'unavailable' ? base : `${base}\n${t('edit.manualReason', { reason: outcome.reason })}`
}

/**
 * One count tile.
 * @param props - label and value.
 * @returns the tile.
 */
function Stat({ label, value }: { readonly label: string, readonly value: number }): ReactNode {
  return (
    <div style={st('twStat')}>
      <div style={st('twStatValue')}>{value}</div>
      <div style={st('twStatLabel')}>{label}</div>
    </div>
  )
}

/**
 * The pull requests of a wiki.
 * @param props - store, state, the list.
 * @returns the list.
 */
function PullList({ store, state, pulls, folder, t }: { readonly store: OkfStore, readonly state: OkfState, readonly pulls: readonly PullView[], readonly folder: string, readonly t: T }): ReactNode {
  const answer = state.team.pulls
  const [opening, setOpening] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const note = answer.data?.note
  const openSession = (): void => {
    setOpening(true)
    setError(undefined)
    store.maintainWiki(folder).then((outcome) => {
      setOpening(false)
      if (!outcome.opened) setError(manualText(outcome, t))
    }, (failure: unknown) => {
      setOpening(false)
      setError((failure as Error).message)
    })
  }
  return (
    <div>
      <div style={{ ...st('row'), justifyContent: 'space-between', margin: '6px 0' }}>
        <span style={st('muted')}>{answer.data === undefined ? '' : t('team.pullsAt', { at: new Date(answer.data.at).toLocaleTimeString() })}</span>
        <Button disabled={answer.status === 'loading'} onClick={() => { void store.loadPulls(true) }}>{answer.status === 'loading' ? t('team.refreshing') : t('team.refreshPulls')}</Button>
      </div>
      {answer.status === 'failed' && <div style={st('error')}>{answer.error}</div>}
      {note === 'not-github' && <div style={st('note')}>{t('team.pullsNotGithub')}</div>}
      {note?.startsWith('fetch-failed') === true && <div style={st('note')}>{t('team.pullsFetchFailed')}</div>}
      {error !== undefined && <div style={st('error')}>{error}</div>}
      {answer.data !== undefined && pulls.length === 0 && note === undefined && <div style={st('empty')}>{t('team.noPulls')}</div>}
      {pulls.map(pull => (
        <div key={pull.number} style={st('twRow')}>
          <div style={st('twRowMain')}>
            <div style={st('twRowTitle')}>
              <span>{pull.title}</span>
              <span style={st('muted')}>#{pull.number}</span>
              <PullBadge pull={pull} t={t} />
              {pull.draft && <span style={st('badge')}>{t('team.draft')}</span>}
            </div>
            <div style={st('twMeta')}>{t('team.pullMeta', { author: pull.author || '?', branch: pull.branch, files: pull.files, at: new Date(pull.updatedAt).toLocaleString() })}</div>
            {!pull.eligible && pull.reasons.length > 0 && (
              <ul style={st('twReasons')}>{pull.reasons.slice(0, 6).map(reason => <li key={reason}>{reason}</li>)}</ul>
            )}
          </div>
          <div style={st('row')}>
            {pull.maintainId !== undefined && <Button disabled={opening} onClick={openSession}>{opening ? t('team.opening') : t('team.openSession')}</Button>}
            <a style={{ ...st('button'), textDecoration: 'none' }} href={pull.url} target="_blank" rel="noreferrer">{t('team.reviewOnHost')}</a>
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * The verdict badge of a pull request.
 * @param props - the pull request.
 * @returns the badge.
 */
function PullBadge({ pull, t }: { readonly pull: PullView, readonly t: T }): ReactNode {
  if (pull.checks === 'failure') return <span style={sx('badge', 'badgeError')}>{t('team.checksFailed')}</span>
  if (!pull.eligible) return <span style={sx('badge', 'badgeWarn')}>{t('team.needsHuman')}</span>
  if (pull.checks === 'pending') return <span style={sx('badge', 'badgeOk')}>{t('team.eligibleRunning')}</span>
  return <span style={sx('badge', 'badgeOk')}>{t('team.eligible')}</span>
}

/**
 * Pages with their review state.
 * @param props - the pages.
 * @returns the list.
 */
function PageList({ pages, t, empty, onMark }: { readonly pages: readonly WikiPage[], readonly t: T, readonly empty: string, readonly onMark?: (paths: readonly string[]) => Promise<void> }): ReactNode {
  const [filter, setFilter] = useState('')
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set())
  const [busy, setBusy] = useState<string | undefined>(undefined)
  const [error, setError] = useState<string | undefined>(undefined)
  const shown = useMemo(() => {
    const needle = filter.trim().toLowerCase()
    return needle === '' ? pages : pages.filter(page => `${page.title} ${page.path}`.toLowerCase().includes(needle))
  }, [pages, filter])
  if (pages.length === 0) return <div style={st('empty')}>{empty}</div>
  const mark = (paths: readonly string[], key: string): void => {
    if (onMark === undefined || paths.length === 0) return
    setBusy(key)
    setError(undefined)
    onMark(paths).then(() => {
      setBusy(undefined)
      setPicked(new Set())
    }, (failure: unknown) => {
      setBusy(undefined)
      setError((failure as Error).message)
    })
  }
  const toggle = (path: string): void => {
    setPicked((before) => {
      const next = new Set(before)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }
  const allShown = shown.length > 0 && shown.every(page => picked.has(page.path))
  return (
    <div>
      <input style={{ ...st('input'), margin: '6px 0' }} value={filter} placeholder={t('team.filterPages')} onChange={(event) => { setFilter(event.target.value) }} />
      {onMark !== undefined && (
        <div style={{ ...st('row'), margin: '2px 0 6px' }}>
          <label style={{ ...st('row'), gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={allShown} onChange={() => { setPicked(allShown ? new Set() : new Set(shown.map(page => page.path))) }} />
            <span style={st('note')}>{t('team.selectAll')}</span>
          </label>
          <Button variant="primary" disabled={busy !== undefined || picked.size === 0} title={t('team.markHint')} onClick={() => { mark([...picked], 'batch') }}>{busy === 'batch' ? t('team.marking') : t('team.markSelected', { count: picked.size })}</Button>
        </div>
      )}
      {error !== undefined && <div style={{ ...st('error'), marginBottom: 6 }}>{error}</div>}
      {shown.map(page => (
        <div key={page.path} style={st('twRow')}>
          {onMark !== undefined && <input type="checkbox" style={{ marginRight: 8 }} checked={picked.has(page.path)} onChange={() => { toggle(page.path) }} aria-label={page.title} />}
          <div style={st('twRowMain')}>
            <div style={st('twRowTitle')}>
              <span>{page.title}</span>
              {page.review === 'reviewed'
                ? <span style={sx('badge', 'badgeOk')}>{t('team.reviewedBy', { who: page.reviewer ?? '?', at: page.reviewedAt ?? '?' })}</span>
                : <span style={sx('badge', 'badgeWarn')}>{page.generatedBy === undefined ? t('team.unreviewed') : t('team.unreviewedBy', { who: page.generatedBy, at: page.generatedAt ?? '?' })}</span>}
              {page.overdue && <span style={sx('badge', 'badgeError')}>{page.stage === 'needs_review' ? 'needs review' : t('team.stale', { at: page.staleAfter ?? '?' })}</span>}
            </div>
            <div style={st('twMono')}>{page.path}{page.type === undefined ? '' : ` · ${page.type}`}</div>
          </div>
          {onMark !== undefined && <Button style={{ minHeight: 24 }} disabled={busy !== undefined} title={t('team.markHint')} onClick={() => { mark([page.path], page.path) }}>{busy === page.path ? t('team.marking') : t('team.markReviewed')}</Button>}
        </div>
      ))}
    </div>
  )
}

/**
 * The All bundles tab: the plugin's library.
 * @param props - store and entries.
 * @returns the tab.
 */
function BundlesTab({ store, entries, t }: { readonly store: OkfStore, readonly entries: readonly LibraryEntry[], readonly t: T }): ReactNode {
  return (
    <div style={{ ...st('twDetail'), flex: 1 }}>
      <div style={{ ...st('row'), justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={st('note')}>{t('team.bundlesHint')}</span>
        <Button onClick={() => { store.openDialog() }}>{t('add.open')}</Button>
      </div>
      {entries.length === 0 && <div style={st('empty')}>{t('library.empty')}</div>}
      {entries.map(entry => (
        <div key={entry.id} style={st('twRow')}>
          <div style={st('twRowMain')}>
            <div style={st('twRowTitle')}>
              <span>{entry.name}</span>
              <span style={st('badge')}>{entry.origin.kind === 'git' ? t('origin.git') : t('origin.local')}</span>
              {entry.team !== undefined && <span style={sx('badge', 'badgeBrand')}>{t('team.maintainBadge')}</span>}
              {entry.workspace !== undefined && entry.team === undefined && <span style={sx('badge', 'badgeBrand')}>{t('badge.editable')}</span>}
            </div>
            <div style={st('twMono')}>{entry.origin.kind === 'git' ? entry.origin.url : entry.root}</div>
          </div>
          <Button onClick={() => { store.openDialog({ bundleId: entry.id }) }}>{t('team.openInDialog')}</Button>
        </div>
      ))}
    </div>
  )
}

/**
 * New project wiki.
 * @param props - store, status, close.
 * @returns the modal.
 */
function NewWikiDialog({ store, data, t, onClose }: { readonly store: OkfStore, readonly data: TeamStatus, readonly t: T, readonly onClose: () => void }): ReactNode {
  const [name, setName] = useState('')
  const [folder, setFolder] = useState('')
  const [folderTouched, setFolderTouched] = useState(false)
  const [repo, setRepo] = useState('')
  const [owner, setOwner] = useState('')
  const [summary, setSummary] = useState('')
  const [initialize, setInitialize] = useState(true)
  const firstWiki = data.wikis[0]?.folder
  const [template, setTemplate] = useState(firstWiki === undefined ? 'default' : `copy:${firstWiki}`)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const shownFolder = folderTouched ? folder : slugify(name)
  const root = data.team?.root ?? 'okf'
  const path = root === '' ? shownFolder : `${root}/${shownFolder}`
  const submit = (): void => {
    setBusy(true)
    setError(undefined)
    store.createWiki({ name: name.trim(), folder: shownFolder, template, ...repo.trim() === '' ? {} : { repo: repo.trim() }, ...owner.trim() === '' ? {} : { owner: owner.trim() }, ...summary.trim() === '' ? {} : { summary: summary.trim() }, ...initialize && repo.trim() !== '' ? { initialize: true } : {} }).then((outcome) => {
      setBusy(false)
      const init = initText(outcome, t)
      const prText = outcome.answer.pr?.pr !== undefined
        ? t('team.createdPr', { number: outcome.answer.pr.pr.number })
        : outcome.answer.prError !== undefined ? t('team.createdNoPr', { reason: outcome.answer.prError }) : t('team.createdNext')
      store.setNotice({ kind: outcome.answer.prError === undefined ? 'ok' : 'error', text: `${t('team.created', { name: outcome.answer.record.wikiName, branch: outcome.answer.record.branch })} ${prText}${outcome.opened ? '' : `\n${manualText(outcome, t)}`}${init === undefined ? '' : `\n${init.text}`}` })
      onClose()
    }, (failure: unknown) => {
      setBusy(false)
      setError((failure as Error).message)
    })
  }
  return (
    <div style={st('backdrop')} role="presentation" onClick={(event) => { if (event.target === event.currentTarget && !busy) onClose() }}>
      <form style={st('twModal')} role="dialog" aria-label={t('team.newTitle')} onSubmit={(event) => { event.preventDefault(); submit() }}>
        <div style={st('header')}>
          <h2 style={st('title')}>{t('team.newTitle')}</h2>
          <span style={st('twSpacer')} />
          <Button disabled={busy} ariaLabel={t('dialog.close')} onClick={onClose}>×</Button>
        </div>
        <div style={st('twModalBody')}>
          <label style={st('label')} htmlFor="okf-new-name">{t('team.newName')}</label>
          <input id="okf-new-name" style={st('input')} value={name} placeholder="Settlement Wiki" onChange={(event) => { setName(event.target.value) }} />
          <label style={st('label')} htmlFor="okf-new-folder">{t('team.newFolder')}</label>
          <input id="okf-new-folder" style={{ ...st('input'), fontFamily: 'ui-monospace, monospace' }} value={shownFolder} onChange={(event) => { setFolderTouched(true); setFolder(event.target.value) }} />
          <div style={st('note')}>{t('team.newWhere', { repo: data.team?.name ?? '', path })}</div>
          <label style={st('label')} htmlFor="okf-new-repo">{t('team.newRepo')}</label>
          <input id="okf-new-repo" style={st('input')} value={repo} placeholder="https://github.acme.com/payments/payments-service" onChange={(event) => { setRepo(event.target.value) }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            <div>
              <label style={st('label')} htmlFor="okf-new-owner">{t('team.newOwner')}</label>
              <input id="okf-new-owner" style={st('input')} value={owner} placeholder="@alice" onChange={(event) => { setOwner(event.target.value) }} />
            </div>
            <div>
              <label style={st('label')} htmlFor="okf-new-summary">{t('team.newSummary')}</label>
              <input id="okf-new-summary" style={st('input')} value={summary} onChange={(event) => { setSummary(event.target.value) }} />
            </div>
          </div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 10, fontSize: 13, opacity: repo.trim() === '' ? 0.5 : 1 }}>
            <input type="checkbox" checked={initialize && repo.trim() !== ''} disabled={repo.trim() === ''} onChange={(event) => { setInitialize(event.target.checked) }} />
            <span>{t('team.newInitialize')}<br /><span style={st('note')}>{t('team.newInitializeHint')}</span></span>
          </label>
          <label style={st('label')} htmlFor="okf-new-template">{t('team.newTemplate')}</label>
          <select id="okf-new-template" style={{ ...st('select'), maxWidth: '100%' }} value={template} onChange={(event) => { setTemplate(event.target.value) }}>
            {data.wikis.map(wiki => <option key={wiki.folder} value={`copy:${wiki.folder}`}>{t('team.templateCopy', { name: wiki.name })}</option>)}
            <option value="default">{t('team.templateDefault')}</option>
          </select>
          <ol style={st('twSteps')}>
            <li>{t('team.newStep1', { branch: `wiki/new-${shownFolder || '…'}-…` })}</li>
            <li>{t('team.newStep2')}</li>
            <li>{t('team.newStep3')}</li>
          </ol>
          {error !== undefined && <div style={st('error')}>{error}</div>}
        </div>
        <div style={st('twModalFoot')}>
          <Button disabled={busy} onClick={onClose}>{t('add.cancel')}</Button>
          <Button type="submit" variant="primary" disabled={busy || name.trim() === '' || shownFolder === ''}>{busy ? t('team.creating') : t('team.create')}</Button>
        </div>
      </form>
    </div>
  )
}

/**
 * The folder a name suggests.
 * @param name - the wiki name.
 * @returns lowercase ASCII with dashes; a trailing "wiki" is dropped.
 */
export function slugify(name: string): string {
  return name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-?wiki$/, '').slice(0, 40)
}

/**
 * The maintenance record a session works in, if any.
 * @param state - the store state.
 * @param sessionId - the session.
 * @returns the library entry and its record.
 */
function maintenanceOf(state: OkfState, sessionId: string): { entry: LibraryEntry, record: MaintainRecord | undefined } | undefined {
  const bundleId = state.selections[sessionId]?.bundleId
  if (bundleId === undefined || bundleId === null) return undefined
  const entry = state.library.entries.find(candidate => candidate.id === bundleId)
  if (entry?.team === undefined) return undefined
  const data = state.team.status.data
  const id = entry.team.maintainId
  const record = data?.maintains.find(candidate => candidate.id === id) ?? data?.finished?.find(candidate => candidate.id === id)
  return { entry, record }
}

/** Props of {@link MaintainButton}. */
export type MaintainButtonProps = OkfInjected & { readonly sessionId: string, readonly t: T, readonly compact?: boolean | undefined }

/**
 * In a maintenance session: Open pull request (or the pull request's number).
 * @param props - store, session id, translate seat.
 * @returns the button, or nothing outside a maintenance session.
 */
export function MaintainButton({ store, sessionId, t, compact = false }: MaintainButtonProps): ReactNode {
  const state = useOkf(store)
  useEffect(() => { void store.loadSelection(sessionId) }, [store, sessionId])
  const found = maintenanceOf(state, sessionId)
  useEffect(() => {
    if (found !== undefined && state.team.status.status === 'idle') void store.loadTeam()
  }, [store, found, state.team.status.status])
  // While its pull request is open, notice when it merges (e.g. on GitHub)
  // even when the Team Wiki page is not open: on coming back, every few minutes.
  const waiting = found?.record?.pr !== undefined && found.record.closed === undefined
  useEffect(() => {
    if (!waiting) return
    const check = (): void => { if (store.getSnapshot().team.pulls.status !== 'loading') void store.loadPulls() }
    window.addEventListener('focus', check)
    const timer = window.setInterval(check, PR_POLL_MS)
    return () => {
      window.removeEventListener('focus', check)
      window.clearInterval(timer)
    }
  }, [store, waiting])
  if (found === undefined) return null
  const pr = found.record?.pr
  // The round is over (its pull request merged or closed): nothing is left to open.
  const closed = found.record?.closed
  if (closed !== undefined) {
    return (
      <Button
        variant={compact ? undefined : 'primary'}
        style={compact ? { minHeight: 26, borderColor: 'transparent' } : { minHeight: 26 }}
        title={t('team.roundDoneHint')}
        disabled
      >
        {pr === undefined ? t('team.roundClosed') : t(closed === 'merged' ? 'team.prMerged' : 'team.prClosed', { number: pr.number })}
      </Button>
    )
  }
  return (
    <Button
      variant={compact ? undefined : 'primary'}
      style={compact ? { minHeight: 26, borderColor: 'transparent' } : { minHeight: 26 }}
      title={t('team.prButtonHint')}
      onClick={() => { store.openPrDialog(found.entry.team?.maintainId) }}
    >
      {pr === undefined ? t('team.openPr') : t('team.prNumber', { number: pr.number })}
    </Button>
  )
}

/** Props of {@link OpenPrDialog}. */
export type OpenPrDialogProps = OkfInjected & { readonly t: T }

/**
 * The Open pull request dialog for one maintenance workspace.
 * @param props - store and translate seat.
 * @returns the dialog while open, else nothing.
 */
export function OpenPrDialog({ store, t }: OpenPrDialogProps): ReactNode {
  const state = useOkf(store)
  const maintainId = state.team.prDialog?.maintainId
  if (maintainId === undefined) return null
  return <OpenPrBody key={maintainId} store={store} state={state} maintainId={maintainId} t={t} />
}

/**
 * The dialog's body.
 * @param props - store, state, the workspace.
 * @returns the dialog.
 */
function OpenPrBody({ store, state, maintainId, t }: { readonly store: OkfStore, readonly state: OkfState, readonly maintainId: string, readonly t: T }): ReactNode {
  const changes = state.team.changes[maintainId]
  const data = state.team.status.data
  const record = data?.maintains.find(candidate => candidate.id === maintainId) ?? data?.finished?.find(candidate => candidate.id === maintainId) ?? changes?.data?.record
  // Its pull request merged or closed: the round is done, there is nothing to open.
  const closed = record?.closed ?? changes?.data?.record.closed
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const [result, setResult] = useState<OpenPrAnswer | undefined>(undefined)
  const [prefilled, setPrefilled] = useState(false)
  useEffect(() => { void store.loadChanges(maintainId) }, [store, maintainId])
  // Prefill once from what changed; the user edits from there.
  const suggested = changes?.data?.suggested
  useEffect(() => {
    if (prefilled || suggested === undefined) return
    setPrefilled(true)
    setSummary(current => (current.trim() === '' ? suggested.summary : current))
    if (record?.pr === undefined) setTitle(current => (current.trim() === '' ? suggested.title : current))
  }, [prefilled, suggested, record?.pr])
  const close = (): void => { if (!busy) store.openPrDialog(undefined) }
  const submit = (): void => {
    setBusy(true)
    setError(undefined)
    store.openPr(maintainId, { ...title.trim() === '' ? {} : { title: title.trim() }, ...summary.trim() === '' ? {} : { summary: summary.trim() } }).then((answer) => {
      setBusy(false)
      setResult(answer)
      void store.loadChanges(maintainId)
    }, (failure: unknown) => {
      setBusy(false)
      setError((failure as Error).message)
    })
  }
  const files = changes?.data?.files ?? []
  const inside = record === undefined ? files : files.filter(file => file.path.startsWith(`${record.wiki}/`))
  return (
    <div style={st('backdrop')} role="presentation" onClick={(event) => { if (event.target === event.currentTarget) close() }}>
      <div style={st('twModal')} role="dialog" aria-label={t('team.openPr')}>
        <div style={st('header')}>
          <BookIcon />
          <h2 style={st('title')}>{record?.pr === undefined ? t('team.openPr') : t('team.updatePr', { number: record.pr.number })}</h2>
          <span style={st('twRepo')}>{record?.wikiName ?? ''}</span>
          <span style={st('twSpacer')} />
          <Button disabled={busy} ariaLabel={t('dialog.close')} onClick={close}>×</Button>
        </div>
        <div style={st('twModalBody')}>
          {closed !== undefined && (
            <div style={{ ...st('form'), marginTop: 4 }}>
              {record?.pr === undefined
                ? <span style={st('success')}>{t('team.roundClosed')}</span>
                : <a style={st('twLink')} href={record.pr.url} target="_blank" rel="noreferrer">{t(closed === 'merged' ? 'team.prMerged' : 'team.prClosed', { number: record.pr.number })}</a>}
              <div style={st('note')}>{t('team.roundDoneHint')}</div>
            </div>
          )}
          {closed === undefined && <>
          {record !== undefined && <div style={st('note')}>{t('team.prBranch', { branch: record.branch, folder: record.wiki })}</div>}
          <div style={{ ...st('group'), marginTop: 8 }}>{t('team.changedFiles', { count: inside.length })}</div>
          {changes?.status === 'loading' && changes.data === undefined && <div style={st('muted')}>{t('preview.loading')}</div>}
          {changes?.status === 'failed' && <div style={st('error')}>{changes.error}</div>}
          {changes?.data !== undefined && inside.length === 0 && <div style={st('muted')}>{t('team.noChanges')}</div>}
          {inside.slice(0, 40).map(file => (
            <div key={file.path} style={{ ...st('row'), fontSize: 12 }}>
              <span style={sx('badge', file.status === 'deleted' ? 'badgeError' : file.status === 'added' ? 'badgeOk' : undefined)}>{file.status}</span>
              <span style={st('twMono')}>{record === undefined ? file.path : file.path.slice(record.wiki.length + 1)}</span>
              {file.review === 'reviewed' && <span style={sx('badge', 'badgeWarn')}>{t('team.reviewedEdited')}</span>}
            </div>
          ))}
          {files.length > inside.length && <div style={st('note')}>{t('team.outsideFiles', { count: files.length - inside.length })}</div>}
          <label style={st('label')} htmlFor="okf-pr-title">{t('team.prTitle')}</label>
          <input id="okf-pr-title" style={st('input')} value={title} placeholder={record?.pr === undefined ? t('team.prTitleDefault', { name: record?.wikiName ?? '' }) : t('team.prTitleKeep')} onChange={(event) => { setTitle(event.target.value) }} />
          <label style={st('label')} htmlFor="okf-pr-summary">{t('team.prSummary')}</label>
          <textarea id="okf-pr-summary" style={{ ...sx('input', 'twTextarea'), minHeight: 160 }} value={summary} onChange={(event) => { setSummary(event.target.value) }} />
          <p style={st('note')}>{t('team.prExplain')}</p>
          {error !== undefined && <div style={st('error')}>{error}</div>}
          {result !== undefined && <PrResult result={result} t={t} />}
          </>}
        </div>
        <div style={st('twModalFoot')}>
          <Button disabled={busy} onClick={close}>{result === undefined && closed === undefined ? t('add.cancel') : t('dialog.close')}</Button>
          {closed === undefined && <Button variant="primary" disabled={busy} onClick={submit}>{busy ? t('team.prBusy') : record?.pr === undefined ? t('team.openPr') : t('team.updatePrShort')}</Button>}
        </div>
      </div>
    </div>
  )
}

/**
 * What Open pull request did.
 * @param props - the answer.
 * @returns the summary.
 */
function PrResult({ result, t }: { readonly result: OpenPrAnswer, readonly t: T }): ReactNode {
  return (
    <div style={{ ...st('form'), marginTop: 10 }}>
      <div style={st('row')}>
        {result.pr === undefined
          ? <span style={st('success')}>{t('team.pushed', { branch: result.branch })}</span>
          : <a style={st('twLink')} href={result.pr.url} target="_blank" rel="noreferrer">{result.pr.reused ? t('team.prUpdated', { number: result.pr.number }) : t('team.prOpened', { number: result.pr.number })}</a>}
        <span style={sx('badge', result.eligible ? 'badgeOk' : 'badgeWarn')}>{result.eligible ? t('team.eligible') : t('team.needsHuman')}</span>
      </div>
      {!result.eligible && result.reasons.length > 0 && <ul style={st('twReasons')}>{result.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>}
      {result.stamped.length > 0 && <div style={st('note')}>{t('team.stamped', { pages: result.stamped.join(', ') })}</div>}
      {result.notes.map(note => <div key={note} style={st('note')}>{note}</div>)}
    </div>
  )
}
