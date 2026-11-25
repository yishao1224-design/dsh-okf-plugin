/**
 * The OKF browser UI: a chip in each session's header, and one dialog (rendered
 * in the frame's overlay layer) holding the library, the add form, the bundle
 * preview and the page reader.
 *
 * The chip shows which bundle the session uses and opens the dialog for that
 * session. The dialog's header carries the session's bundle selector, so the
 * one surface covers all three jobs: fetch, preview, select.
 */
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react'
import type { Translate } from '../types/contract.ts'
import type { BundleSummary, LibraryEntry, PageContent, PageSummary, PickFolderAnswer } from '../types/okf.ts'
import type { OkfKey } from './locales.ts'
import { renderMarkdown } from './markdown.tsx'
import { ApiFailure, type OkfState, type OkfStore } from './store.ts'
import { st, sx } from './styles.ts'

/** The store seat both registrations' inject faces supply. */
export interface OkfInjected {
  readonly store: OkfStore
}

type T = Translate<OkfKey>

/**
 * Read the whole store.
 * @param store - the store.
 * @returns the current state, re-rendering on change.
 */
export function useOkf(store: OkfStore): OkfState {
  const subscribe = useCallback((listener: () => void) => store.subscribe(listener), [store])
  const get = useCallback(() => store.getSnapshot(), [store])
  return useSyncExternalStore(subscribe, get, get)
}

/** Props of {@link Button}. */
interface ButtonProps {
  readonly onClick?: () => void
  readonly children: ReactNode
  readonly variant?: 'primary' | 'danger' | undefined
  readonly disabled?: boolean
  readonly title?: string | undefined
  readonly style?: CSSProperties
  readonly type?: 'button' | 'submit'
  readonly ariaLabel?: string
}

/**
 * A pressable control with hover and pressed states.
 * @param props - handler, label, variant.
 * @returns the button.
 */
export function Button({ onClick, children, variant, disabled = false, title, style, type = 'button', ariaLabel }: ButtonProps): ReactNode {
  const [hover, setHover] = useState(false)
  const [press, setPress] = useState(false)
  const merged = {
    ...sx('button', variant === 'primary' && 'buttonPrimary', variant === 'danger' && 'buttonDanger'),
    ...!disabled && variant !== 'primary' && hover ? st('hover') : {},
    ...!disabled && press ? st('pressed') : {},
    ...disabled ? st('disabled') : {},
    ...style,
  }
  return (
    <button
      type={type}
      style={merged}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      onClick={onClick}
      onPointerEnter={() => { setHover(true) }}
      onPointerLeave={() => { setHover(false); setPress(false) }}
      onPointerDown={() => { setPress(true) }}
      onPointerUp={() => { setPress(false) }}
      onPointerCancel={() => { setPress(false) }}
    >
      {children}
    </button>
  )
}

/**
 * A small book glyph.
 * @returns the icon.
 */
export function BookIcon(): ReactNode {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true" style={{ flex: 'none' }}>
      <path d="M2.5 2.5h4a2 2 0 0 1 2 2v9a1.5 1.5 0 0 0-1.5-1.5h-4.5zM13.5 2.5h-4a2 2 0 0 0-2 2v9a1.5 1.5 0 0 1 1.5-1.5h4.5z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}

/** Props of {@link SessionChip}: the inject face, the session slot's id, and the locale seat. */
export type SessionChipProps = OkfInjected & { readonly sessionId: string, readonly t: T, readonly compact?: boolean | undefined }

/**
 * The session chip. It sits in the session header and in the composer's tool
 * row: DSH hides the header utilities while a session is still blank, which is
 * exactly when a bundle is usually chosen, so the composer copy is the one that
 * is always reachable. `compact` drops the border to match the composer controls.
 * @param props - store, session id, translate seat, and the compact flag.
 * @returns the chip.
 */
export function SessionChip({ store, sessionId, t, compact = false }: SessionChipProps): ReactNode {
  const state = useOkf(store)
  const [hover, setHover] = useState(false)
  useEffect(() => { void store.loadSelection(sessionId) }, [store, sessionId])
  const selection = state.selections[sessionId]
  const entry = selection?.bundleId === null || selection === undefined ? undefined : state.library.entries.find(candidate => candidate.id === selection.bundleId)
  const name = entry?.name ?? selection?.bundleId ?? undefined
  return (
    <button
      type="button"
      style={{ ...sx('chip', name !== undefined && 'chipActive', compact && 'chipCompact'), ...hover ? st('hover') : {} }}
      title={name === undefined ? t('chip.title') : t('chip.titleSelected', { name })}
      aria-label={name === undefined ? t('chip.title') : t('chip.titleSelected', { name })}
      onPointerEnter={() => { setHover(true) }}
      onPointerLeave={() => { setHover(false) }}
      onClick={() => { store.openDialog({ sessionId }) }}
    >
      <BookIcon />
      <span style={st('chipText')}>{name === undefined ? t('chip.none') : `OKF · ${name}`}</span>
    </button>
  )
}

/** Props of {@link OkfDialog}. */
export type OkfDialogProps = OkfInjected & { readonly t: T }

/**
 * The overlay entry: renders the dialog while it is open, nothing otherwise.
 * @param props - store and translate seat.
 * @returns the dialog or null.
 */
export function OkfDialog({ store, t }: OkfDialogProps): ReactNode {
  const state = useOkf(store)
  const { dialog } = state
  useEffect(() => {
    if (!dialog.open) return undefined
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') store.closeDialog()
    }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey) }
  }, [dialog.open, store])
  if (!dialog.open) return null
  const entry = state.library.entries.find(candidate => candidate.id === dialog.bundleId)
  return (
    <div style={st('backdrop')} onPointerDown={(event) => { if (event.target === event.currentTarget) store.closeDialog() }}>
      <div style={st('dialog')} role="dialog" aria-modal="true" aria-label={t('dialog.title')}>
        <div style={st('header')}>
          <h2 style={st('title')}>{t('dialog.title')}</h2>
          {dialog.sessionId === undefined ? <span style={{ flex: 1 }} /> : <SessionBar store={store} state={state} sessionId={dialog.sessionId} t={t} />}
          <Button onClick={() => { store.closeDialog() }} ariaLabel={t('dialog.close')} style={st('iconButton')}>✕</Button>
        </div>
        <div style={st('body')}>
          <LibraryPane store={store} state={state} t={t} />
          <div style={st('main')}>
            {entry === undefined
              ? <div style={st('empty')}>{t('preview.pick')}</div>
              : <Preview key={`${entry.id}:${entry.fetchedAt ?? ''}:${entry.origin.kind === 'git' ? entry.origin.commit ?? '' : ''}`} store={store} entry={entry} pagePath={dialog.pagePath} sessionId={dialog.sessionId} selected={dialog.sessionId !== undefined && state.selections[dialog.sessionId]?.bundleId === entry.id} t={t} />}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * The header's "this session uses" selector.
 * @param props - store, state, session id, translate seat.
 * @returns the selector.
 */
function SessionBar({ store, state, sessionId, t }: { readonly store: OkfStore, readonly state: OkfState, readonly sessionId: string, readonly t: T }): ReactNode {
  const selection = state.selections[sessionId]
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const choose = (bundleId: string | null): void => {
    setSaved(false)
    setError(undefined)
    store.select(sessionId, bundleId).then(() => { setSaved(true) }, (failure: unknown) => { setError((failure as Error).message) })
  }
  return (
    <div style={st('sessionBar')}>
      <label style={st('secondary')} htmlFor="okf-session-select">{t('session.label')}</label>
      <select
        id="okf-session-select"
        style={st('select')}
        value={selection?.bundleId ?? ''}
        disabled={selection?.loaded !== true}
        onChange={(event) => { choose(event.target.value === '' ? null : event.target.value) }}
      >
        <option value="">{t('session.none')}</option>
        {state.library.entries.map(entry => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
        {selection?.bundleId != null && !state.library.entries.some(entry => entry.id === selection.bundleId) && <option value={selection.bundleId}>{selection.bundleId}</option>}
      </select>
      {saved && <span style={st('success')}>{t('session.saved')}</span>}
      {error !== undefined && <span style={{ ...st('muted'), color: 'var(--dsw-alias-state-error-primary)' }}>{error}</span>}
      {!saved && error === undefined && <span style={st('muted')}>{t('session.hint')}</span>}
    </div>
  )
}

/**
 * The library column: entries, then the add form.
 * @param props - store, state, translate seat.
 * @returns the column.
 */
function LibraryPane({ store, state, t }: { readonly store: OkfStore, readonly state: OkfState, readonly t: T }): ReactNode {
  const [adding, setAdding] = useState(false)
  const { library, dialog } = state
  const sessionBundle = dialog.sessionId === undefined ? undefined : state.selections[dialog.sessionId]?.bundleId
  return (
    <div style={st('side')}>
      <div style={st('sideScroll')}>
        <p style={st('sectionTitle')}>{t('library.title')}</p>
        {library.status === 'offline' && (
          <div style={st('error')}>
            {t('library.offline')}
            <div style={{ marginTop: 6 }}><Button onClick={() => { void store.refreshLibrary() }}>{t('action.retry')}</Button></div>
          </div>
        )}
        {library.status === 'ready' && library.entries.length === 0 && <p style={st('note')}>{t('library.empty')}</p>}
        {library.entries.map(entry => (
          <EntryRow key={entry.id} entry={entry} selected={dialog.bundleId === entry.id} inSession={sessionBundle === entry.id} onClick={() => { store.preview(entry.id) }} t={t} />
        ))}
        <div style={{ marginTop: 8 }}>
          {adding
            ? <AddForm store={store} t={t} onDone={(entry) => { setAdding(false); if (entry !== undefined) store.preview(entry.id) }} />
            : <Button onClick={() => { setAdding(true) }} style={{ width: '100%' }}>{`＋ ${t('add.open')}`}</Button>}
        </div>
        {library.libraryDir !== undefined && <p style={st('note')}>{t('library.dir', { dir: library.libraryDir })}</p>}
      </div>
    </div>
  )
}

/**
 * One library entry.
 * @param props - the entry and its flags.
 * @returns the row.
 */
function EntryRow({ entry, selected, inSession, onClick, t }: { readonly entry: LibraryEntry, readonly selected: boolean, readonly inSession: boolean, readonly onClick: () => void, readonly t: T }): ReactNode {
  const [hover, setHover] = useState(false)
  const where = entry.origin.kind === 'git' ? `${entry.origin.url}${entry.origin.path === '' ? '' : ` · ${entry.origin.path}`}` : entry.root
  return (
    <button
      type="button"
      style={{ ...sx('entry', selected && 'entrySelected'), ...!selected && hover ? st('hover') : {} }}
      onClick={onClick}
      onPointerEnter={() => { setHover(true) }}
      onPointerLeave={() => { setHover(false) }}
      title={where}
    >
      <span style={st('entryName')}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.name}</span>
        <span style={st('badge')}>{entry.origin.kind === 'git' ? providerLabel(entry) : t('origin.local')}</span>
        {entry.workspace !== undefined && <span style={sx('badge', 'badgeOk')}>{t('badge.editable')}</span>}
        {inSession && <span style={sx('badge', 'badgeBrand')}>{t('library.inSession')}</span>}
      </span>
      <span style={{ ...st('entryMeta'), display: 'block' }}>{where}</span>
    </button>
  )
}

/**
 * The provider label of a git entry.
 * @param entry - a git entry.
 * @returns e.g. "GitHub".
 */
function providerLabel(entry: LibraryEntry): string {
  if (entry.origin.kind !== 'git') return ''
  return entry.origin.provider === 'github' ? 'GitHub' : entry.origin.provider === 'azure-devops' ? 'Azure DevOps' : 'Git'
}

/**
 * The add form: fetch from git, or add a local folder.
 * @param props - store, translate seat, and the done callback.
 * @returns the form.
 */
function AddForm({ store, t, onDone }: { readonly store: OkfStore, readonly t: T, readonly onDone: (entry?: LibraryEntry) => void }): ReactNode {
  const [tab, setTab] = useState<'git' | 'local'>('git')
  const [url, setUrl] = useState('')
  const [ref, setRef] = useState('')
  const [path, setPath] = useState('')
  const [id, setId] = useState('')
  const [local, setLocal] = useState('')
  // What the folder dialog found in the chosen folder; cleared when the path is typed.
  const [picked, setPicked] = useState<PickFolderAnswer['kind']>(undefined)
  const [picking, setPicking] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<ApiFailure | Error | undefined>(undefined)

  const submit = (override?: string): void => {
    setBusy(true)
    setError(undefined)
    const work: Promise<LibraryEntry> = tab === 'git'
      ? store.fetchBundle({ url, ...ref.trim() === '' ? {} : { ref: ref.trim() }, ...(override ?? path).trim() === '' ? {} : { path: (override ?? path).trim() }, ...id.trim() === '' ? {} : { id: id.trim() } })
      // An empty folder becomes a new knowledge base, then opens as its editing workspace
      // (with the kb-setup skill prefilled in the composer when DSH has that skill).
      : store.addLocal(override ?? local, id.trim() === '' ? undefined : id.trim(), true).then(async (answer) => {
          if (answer.created !== undefined) await store.editAsWorkspace(answer.entry.id, answer.created.prompt).catch(() => undefined)
          return answer.entry
        })
    work.then((entry) => { setBusy(false); onDone(entry) }, (failure: unknown) => { setBusy(false); setError(failure as Error) })
  }
  const browse = (): void => {
    setPicking(true)
    setError(undefined)
    store.pickFolder(local).then((answer) => {
      setPicking(false)
      if (answer.path === null) return
      setLocal(answer.path)
      setPicked(answer.kind)
    }, (failure: unknown) => { setPicking(false); setError(failure as Error) })
  }
  const candidates = error instanceof ApiFailure && error.code === 'many-bundles'
    ? ((error.detail as { candidates?: unknown } | undefined)?.candidates as string[] | undefined) ?? []
    : []
  const canSubmit = !busy && !picking && (tab === 'git' ? url.trim() !== '' : local.trim() !== '')

  return (
    <form style={st('form')} onSubmit={(event) => { event.preventDefault(); if (canSubmit) submit() }}>
      <div style={st('tabs')}>
        <Button style={{ ...st('tab'), ...tab === 'git' ? st('tabActive') : {} }} onClick={() => { setTab('git'); setError(undefined) }}>{t('add.tabGit')}</Button>
        <Button style={{ ...st('tab'), ...tab === 'local' ? st('tabActive') : {} }} onClick={() => { setTab('local'); setError(undefined) }}>{t('add.tabLocal')}</Button>
      </div>
      {tab === 'git'
        ? (
            <>
              <label style={st('label')} htmlFor="okf-url">{t('add.url')}</label>
              <input id="okf-url" style={st('input')} value={url} onChange={(event) => { setUrl(event.target.value) }} placeholder="https://dev.azure.com/org/project/_git/repo" spellCheck={false} autoFocus />
              <p style={st('note')}>{t('add.urlHint')}</p>
              <label style={st('label')} htmlFor="okf-ref">{t('add.ref')}</label>
              <input id="okf-ref" style={st('input')} value={ref} onChange={(event) => { setRef(event.target.value) }} placeholder="e.g. main" spellCheck={false} />
              <label style={st('label')} htmlFor="okf-path">{t('add.path')}</label>
              <input id="okf-path" style={st('input')} value={path} onChange={(event) => { setPath(event.target.value) }} placeholder="e.g. okf" spellCheck={false} />
            </>
          )
        : (
            <>
              <label style={st('label')} htmlFor="okf-local">{t('add.localPath')}</label>
              <div style={{ ...st('row'), flexWrap: 'nowrap' }}>
                <input id="okf-local" style={{ ...st('input'), flex: 1, minWidth: 0 }} value={local} onChange={(event) => { setLocal(event.target.value); setPicked(undefined) }} placeholder="D:\\repos\\project\\okf" spellCheck={false} autoFocus />
                <Button disabled={busy || picking} title={t('add.browseHint')} onClick={browse}>{picking ? t('add.browsing') : t('add.browse')}</Button>
              </div>
              <p style={st('note')}>{picked === 'empty' ? t('add.emptyPicked') : picked === 'other' ? t('add.otherPicked') : t('add.localHint')}</p>
            </>
          )}
      <label style={st('label')} htmlFor="okf-id">{t('add.id')}</label>
      <input id="okf-id" style={st('input')} value={id} onChange={(event) => { setId(event.target.value) }} spellCheck={false} />
      <div style={{ ...st('row'), marginTop: 10 }}>
        <Button type="submit" variant="primary" disabled={!canSubmit}>{busy ? (tab === 'git' ? t('add.busy') : t('add.busyLocal')) : tab === 'git' ? t('add.submit') : picked === 'empty' ? t('add.submitCreate') : t('add.submitLocal')}</Button>
        <Button onClick={() => { onDone() }} disabled={busy}>{t('add.cancel')}</Button>
      </div>
      {error !== undefined && <div style={st('error')}>{error.message}</div>}
      {candidates.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <p style={st('note')}>{t('add.pick')}</p>
          <div style={{ ...st('row'), marginTop: 4 }}>
            {candidates.map(candidate => (
              <Button key={candidate} style={st('candidate')} onClick={() => { if (tab === 'git') setPath(candidate); else { setLocal(candidate); setPicked(undefined) } submit(candidate) }}>{candidate === '' ? '/' : candidate}</Button>
            ))}
          </div>
        </div>
      )}
      {tab === 'git' && <p style={st('note')}>{t('add.auth')}</p>}
    </form>
  )
}

/** Async data with its state. */
type Loadable<V> = { readonly status: 'loading' } | { readonly status: 'ready', readonly value: V } | { readonly status: 'error', readonly message: string }

/**
 * The bundle preview: header, actions, catalog, or one page.
 * @param props - the entry, the page being read, the session context.
 * @returns the preview.
 */
function Preview({ store, entry, pagePath, sessionId, selected, t }: { readonly store: OkfStore, readonly entry: LibraryEntry, readonly pagePath: string | undefined, readonly sessionId: string | undefined, readonly selected: boolean, readonly t: T }): ReactNode {
  const [summary, setSummary] = useState<Loadable<BundleSummary>>({ status: 'loading' })
  const [reload, setReload] = useState(0)
  useEffect(() => {
    let live = true
    setSummary({ status: 'loading' })
    store.summary(entry.id).then(
      (value) => { if (live) setSummary({ status: 'ready', value }) },
      (failure: unknown) => { if (live) setSummary({ status: 'error', message: (failure as Error).message }) },
    )
    return () => { live = false }
  }, [store, entry.id, reload])
  // Opening another page starts at its top, not where the last one was scrolled to.
  const scroller = useRef<HTMLDivElement | null>(null)
  useEffect(() => { scroller.current?.scrollTo?.({ top: 0 }) }, [pagePath])

  return (
    <div style={st('mainScroll')} ref={scroller}>
      <PreviewHeader store={store} entry={entry} summary={summary.status === 'ready' ? summary.value : undefined} sessionId={sessionId} selected={selected} t={t} onChanged={() => { setReload(value => value + 1) }} />
      {summary.status === 'loading' && <div style={st('empty')}>{t('preview.loading')}</div>}
      {summary.status === 'error' && <div style={st('error')}>{t('error.generic', { message: summary.message })}</div>}
      {summary.status === 'ready' && (pagePath === undefined
        ? <Catalog summary={summary.value} onOpen={(path) => { store.openPage(path) }} t={t} />
        : <PageView store={store} entry={entry} path={pagePath} summary={summary.value} t={t} />)}
    </div>
  )
}

/**
 * The preview's head: name, origin, stats and the entry's actions.
 * @param props - the entry, its summary when loaded, and the session context.
 * @returns the head.
 */
function PreviewHeader({ store, entry, summary, sessionId, selected, t, onChanged }: { readonly store: OkfStore, readonly entry: LibraryEntry, readonly summary: BundleSummary | undefined, readonly sessionId: string | undefined, readonly selected: boolean, readonly t: T, readonly onChanged: () => void }): ReactNode {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error', text: string, dirty?: boolean } | undefined>(undefined)
  const [confirming, setConfirming] = useState(false)
  const [deleteFiles, setDeleteFiles] = useState(true)
  const origin = entry.origin
  const update = (force: boolean): void => {
    setBusy(true)
    setMessage(undefined)
    store.update(entry.id, force).then(({ entry: next, changed }) => {
      setBusy(false)
      const commit = next.origin.kind === 'git' ? (next.origin.commit ?? '').slice(0, 8) : ''
      setMessage({ kind: 'ok', text: changed ? t('action.updatedNew', { commit }) : t('action.updated', { commit }) })
      onChanged()
    }, (failure: unknown) => {
      setBusy(false)
      setMessage({ kind: 'error', text: (failure as Error).message, dirty: /local copy has edits/i.test((failure as Error).message) })
    })
  }
  return (
    <div style={st('previewHead')}>
      <h3 style={st('previewTitle')}>{entry.name}</h3>
      <div style={{ ...st('muted'), overflowWrap: 'anywhere' }}>
        {origin.kind === 'git'
          ? <>{origin.url}{origin.ref === undefined ? '' : ` @ ${origin.ref}`}{origin.path === '' ? '' : ` · ${origin.path}`}</>
          : entry.root}
        {entry.workspace !== undefined && entry.workspace !== entry.root && <div>{entry.workspace}</div>}
      </div>
      <div style={st('stats')}>
        {summary !== undefined && <span style={st('badge')}>{t('preview.pages', { count: String(summary.pages.length) })}</span>}
        {summary !== undefined && <span style={sx('badge', summary.okfVersion === undefined ? 'badgeWarn' : 'badgeOk')}>{summary.okfVersion === undefined ? t('preview.noVersion') : t('preview.version', { version: summary.okfVersion })}</span>}
        {origin.kind === 'git' && origin.commit !== undefined && <span style={st('badge')}>{t('preview.commit', { commit: origin.commit.slice(0, 8) })}</span>}
        {entry.fetchedAt !== undefined && <span style={st('badge')}>{t('preview.fetched', { at: new Date(entry.fetchedAt).toLocaleString() })}</span>}
        {entry.workspace !== undefined && <span style={sx('badge', 'badgeOk')} title={entry.workspace}>{t('badge.editable')}</span>}
        {summary !== undefined && Object.entries(summary.types).sort((a, b) => b[1] - a[1]).map(([type, n]) => <span key={`t-${type}`} style={st('badge')}>{`${type} ${String(n)}`}</span>)}
        {summary !== undefined && Object.entries(summary.states).sort((a, b) => b[1] - a[1]).map(([state, n]) => <span key={`s-${state}`} style={sx('badge', stateTone(state))}>{`${state} ${String(n)}`}</span>)}
      </div>
      {summary !== undefined && summary.untyped.length > 0 && <span style={{ ...st('muted'), color: 'var(--dsw-alias-state-warn-primary)' }} title={summary.untyped.join('\n')}>{t('preview.untyped', { count: String(summary.untyped.length) })}</span>}
      {summary?.truncated === true && <span style={st('muted')}>{t('preview.truncated', { count: String(summary.pages.length) })}</span>}
      <div style={{ ...st('row'), marginTop: 4 }}>
        {sessionId !== undefined && (
          <Button variant={selected ? undefined : 'primary'} disabled={selected} onClick={() => { void store.select(sessionId, entry.id).catch(() => undefined) }}>
            {selected ? `✓ ${t('action.using')}` : t('action.use')}
          </Button>
        )}
        {origin.kind === 'git' && <Button disabled={busy} onClick={() => { update(false) }}>{busy ? t('action.updating') : t('action.update')}</Button>}
        {!confirming && <Button variant="danger" disabled={busy} onClick={() => { setConfirming(true) }}>{t('action.remove')}</Button>}
      </div>
      <EditWorkspace store={store} entry={entry} t={t} />
      {confirming && (
        <div style={{ ...st('form'), marginTop: 4 }}>
          <div>{t('action.removeConfirm', { name: entry.name })}</div>
          {origin.kind === 'git' && (
            <label style={{ ...st('row'), marginTop: 6, fontSize: 12 }}>
              <input type="checkbox" checked={deleteFiles} onChange={(event) => { setDeleteFiles(event.target.checked) }} />
              {t('action.removeFiles')}
            </label>
          )}
          <div style={{ ...st('row'), marginTop: 8 }}>
            <Button variant="danger" onClick={() => { void store.remove(entry.id, origin.kind === 'git' && deleteFiles).catch((failure: unknown) => { setMessage({ kind: 'error', text: (failure as Error).message }) }) }}>{t('action.removeYes')}</Button>
            <Button onClick={() => { setConfirming(false) }}>{t('add.cancel')}</Button>
          </div>
        </div>
      )}
      {message?.kind === 'ok' && <span style={st('success')}>{message.text}</span>}
      {message?.kind === 'error' && (
        <div style={st('error')}>
          {message.text}
          {message.dirty === true && <div style={{ marginTop: 6 }}><Button variant="danger" onClick={() => { update(true) }}>{t('action.forceUpdate')}</Button></div>}
        </div>
      )}
    </div>
  )
}

/**
 * Edit as workspace: one button that makes the bundle editable where it is (a
 * git bundle's own checkout, a local bundle's folder) and opens a session in
 * that folder with the bundle attached. On an editable bundle it reopens it.
 * @param props - the entry.
 * @returns the control.
 */
function EditWorkspace({ store, entry, t }: { readonly store: OkfStore, readonly entry: LibraryEntry, readonly t: T }): ReactNode {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ kind: 'manual', path: string, name: string, reason?: string } | { kind: 'error', text: string } | undefined>(undefined)
  const editable = entry.workspace !== undefined
  const run = (): void => {
    setBusy(true)
    setResult(undefined)
    store.editAsWorkspace(entry.id).then((outcome) => {
      setBusy(false)
      if (outcome.opened) return
      setResult({ kind: 'manual', path: outcome.workspace, name: outcome.entry.name, ...outcome.reason === undefined || outcome.reason === 'unavailable' ? {} : { reason: outcome.reason } })
    }, (failure: unknown) => {
      setBusy(false)
      setResult({ kind: 'error', text: (failure as Error).message })
    })
  }
  return (
    <div>
      <div style={{ ...st('row'), marginTop: 4 }}>
        <Button disabled={busy} title={editable ? entry.workspace ?? '' : t('edit.hint')} onClick={run}>
          {busy ? t('edit.busy') : editable ? t('edit.openExisting') : t('edit.open')}
        </Button>
      </div>
      {result?.kind === 'manual' && (
        <div style={{ ...st('note'), marginTop: 6 }}>
          {t('edit.manual', { path: result.path, name: result.name })}
          {result.reason !== undefined && <div>{t('edit.manualReason', { reason: result.reason })}</div>}
        </div>
      )}
      {result?.kind === 'error' && <div style={st('error')}>{result.text}</div>}
    </div>
  )
}

/**
 * The badge tone of a stage or status value.
 * @param state - the value.
 * @returns a badge style name.
 */
function stateTone(state: string | undefined): string | undefined {
  if (state === undefined) return undefined
  if (state === 'needs_review' || state === 'draft') return 'badgeWarn'
  if (state === 'deprecated' || state === 'archived') return 'badgeError'
  if (state === 'active' || state === 'stable') return 'badgeOk'
  return undefined
}

/**
 * The catalog: a filter and the pages grouped by top folder.
 * @param props - the summary, the open handler, the translate seat.
 * @returns the catalog.
 */
function Catalog({ summary, onOpen, t }: { readonly summary: BundleSummary, readonly onOpen: (path: string) => void, readonly t: T }): ReactNode {
  const [filter, setFilter] = useState('')
  const groups = useMemo(() => {
    const words = filter.toLowerCase().split(/\s+/).filter(Boolean)
    const matched = summary.pages.filter((page) => {
      if (words.length === 0) return true
      const hay = `${page.title} ${page.path} ${page.description ?? ''} ${page.tags.join(' ')} ${page.type ?? ''} ${page.stage ?? ''}`.toLowerCase()
      return words.every(word => hay.includes(word))
    })
    const byGroup = new Map<string, PageSummary[]>()
    for (const page of matched) {
      const group = page.path.includes('/') ? page.path.split('/')[0] ?? '' : ''
      byGroup.set(group, [...byGroup.get(group) ?? [], page])
    }
    // Root files first (index, SCHEMA, log), then folders alphabetically.
    return [...byGroup.entries()].sort((a, b) => (a[0] === '' ? -1 : b[0] === '' ? 1 : a[0].localeCompare(b[0])))
  }, [summary, filter])
  return (
    <div>
      <input style={st('input')} value={filter} onChange={(event) => { setFilter(event.target.value) }} placeholder={t('preview.filter')} aria-label={t('preview.filter')} spellCheck={false} />
      {groups.length === 0 && <div style={st('empty')}>{t('preview.noMatch')}</div>}
      {groups.map(([group, pages]) => (
        <div key={group}>
          <p style={st('group')}>{`${group === '' ? t('preview.root') : group} · ${String(pages.length)}`}</p>
          {pages.map(page => <PageRow key={page.path} page={page} onOpen={onOpen} />)}
        </div>
      ))}
    </div>
  )
}

/**
 * One catalog row.
 * @param props - the page and the open handler.
 * @returns the row.
 */
function PageRow({ page, onOpen }: { readonly page: PageSummary, readonly onOpen: (path: string) => void }): ReactNode {
  const [hover, setHover] = useState(false)
  const state = page.stage ?? page.status
  return (
    <button type="button" style={{ ...st('pageRow'), ...hover ? st('hover') : {} }} onClick={() => { onOpen(page.path) }} onPointerEnter={() => { setHover(true) }} onPointerLeave={() => { setHover(false) }}>
      <span style={st('pageTitle')}>
        <span>{page.title}</span>
        {page.type !== undefined && <span style={st('badge')}>{page.type}</span>}
        {state !== undefined && <span style={sx('badge', stateTone(state))}>{state}</span>}
        {page.tags.map(tag => <span key={tag} style={st('badge')}>{`#${tag}`}</span>)}
        <span style={st('pagePath')}>{page.path}</span>
      </span>
      {page.description !== undefined && <span style={{ ...st('pageDesc'), display: 'block' }}>{page.description}</span>}
    </button>
  )
}

/**
 * Mark reviewed, for a Team Wiki page being read in the preview.
 * @param props - store, the project wiki's folder, the page.
 * @returns the button and what it did.
 */
function MarkReviewed({ store, folder, path, t }: { readonly store: OkfStore, readonly folder: string, readonly path: string, readonly t: T }): ReactNode {
  const [state, setState] = useState<{ busy: boolean, text?: string, error?: boolean }>({ busy: false })
  const mark = (): void => {
    setState({ busy: true })
    store.reviewPages(folder, [path]).then((answer) => {
      const text = answer.prError !== undefined
        ? t('team.reviewFailed', { count: answer.marked.length, who: answer.reviewer, reason: answer.prError })
        : answer.pr?.pr !== undefined
          ? t('team.reviewDone', { count: answer.marked.length, who: answer.reviewer, number: answer.pr.pr.number })
          : t('team.reviewPushed', { count: answer.marked.length, who: answer.reviewer, branch: answer.record.branch })
      setState({ busy: false, text, error: answer.prError !== undefined || answer.marked.length === 0 })
    }, (failure: unknown) => {
      setState({ busy: false, text: (failure as Error).message, error: true })
    })
  }
  return (
    <span style={{ ...st('row'), marginLeft: 'auto', gap: 8 }}>
      {state.text !== undefined && <span style={state.error === true ? st('error') : st('note')}>{state.text}</span>}
      <Button variant="primary" disabled={state.busy} title={t('team.markHint')} onClick={mark}>{state.busy ? t('team.marking') : t('team.markReviewed')}</Button>
    </span>
  )
}

/**
 * One page: back link, frontmatter, rendered body.
 * @param props - the entry and page path.
 * @returns the page.
 */
function PageView({ store, entry, path, summary, t }: { readonly store: OkfStore, readonly entry: LibraryEntry, readonly path: string, readonly summary: BundleSummary, readonly t: T }): ReactNode {
  const [page, setPage] = useState<Loadable<PageContent>>({ status: 'loading' })
  useEffect(() => {
    let live = true
    setPage({ status: 'loading' })
    store.page(entry.id, path).then(
      (value) => { if (live) setPage({ status: 'ready', value }) },
      (failure: unknown) => { if (live) setPage({ status: 'error', message: (failure as Error).message }) },
    )
    return () => { live = false }
  }, [store, entry.id, path])
  const known = summary.pages.find(candidate => candidate.path === path)
  return (
    <div>
      <div style={{ ...st('row'), marginBottom: 10 }}>
        <Button onClick={() => { store.openPage(undefined) }}>{`← ${t('action.back')}`}</Button>
        <span style={st('pagePath')}>{path}</span>
        {(entry.teamWiki ?? entry.team?.wiki) !== undefined && known !== undefined && !known.reserved && <MarkReviewed store={store} folder={entry.teamWiki ?? entry.team?.wiki ?? ''} path={path} t={t} />}
      </div>
      {page.status === 'loading' && <div style={st('empty')}>{t('preview.loading')}</div>}
      {page.status === 'error' && <div style={st('error')}>{t('error.generic', { message: page.message })}</div>}
      {page.status === 'ready' && (
        <>
          {/* Most pages open with their own `# Title`; show ours only when the body does not. */}
          {!/^\s*#\s/.test(page.value.body) && <h3 style={st('previewTitle')}>{known?.title ?? path}</h3>}
          <div style={{ ...st('stats'), marginBottom: 6 }}>
            {known?.type !== undefined && <span style={st('badge')}>{known.type}</span>}
            {(known?.stage ?? known?.status) !== undefined && <span style={sx('badge', stateTone(known?.stage ?? known?.status))}>{(known?.stage ?? known?.status)?.replace('_', ' ')}</span>}
            {known?.updated !== undefined && <span style={st('badge')}>{known.updated}</span>}
          </div>
          {Object.keys(page.value.meta).length > 0 && (
            <details style={{ margin: '0 0 14px' }}>
              <summary style={{ ...st('muted'), cursor: 'pointer' }}>{`${t('page.meta')} · ${String(Object.keys(page.value.meta).length)}`}</summary>
              <table style={st('metaTable')} aria-label={t('page.meta')}>
                <tbody>
                  {Object.entries(page.value.meta).map(([key, value]) => (
                    <tr key={key}>
                      <td style={st('metaKey')}>{key}</td>
                      <td style={st('metaValue')}>{Array.isArray(value) ? value.join(', ') : String(value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          )}
          <div style={st('markdown')}>
            {page.value.body.trim() === ''
              ? <p style={st('muted')}>{t('page.empty')}</p>
              : renderMarkdown(page.value.body, { pagePath: path, onBundleLink: (target) => { store.openPage(target) } })}
          </div>
        </>
      )}
    </div>
  )
}
