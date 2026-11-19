/**
 * Inline style table for the OKF chip and dialog.
 *
 * Same approach as the other dsh_plugins bundles: one object, no stylesheet,
 * every color a shell `--dsw-*` custom property so both themes work. Inline
 * styles cannot address `:hover`, so pressable controls merge explicit hover
 * and pressed entries in the components.
 */
import type { CSSProperties } from 'react'

const feedback = 'background-color 120ms ease, border-color 120ms ease, color 120ms ease, transform 90ms ease'
const mono = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'

const table: Readonly<Record<string, CSSProperties>> = {
  // ── session header chip ──
  chip: {
    display: 'inline-flex', alignItems: 'center', gap: 5, height: 26, maxWidth: 200, padding: '0 9px',
    borderWidth: 0.5, borderStyle: 'solid', borderColor: 'var(--dsw-alias-border-l3)', borderRadius: 7,
    background: 'transparent', color: 'var(--dsw-alias-label-secondary)', font: 'inherit', fontSize: 12,
    lineHeight: 1, whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none', transition: feedback,
  },
  chipActive: { color: 'var(--dsw-alias-label-primary)', borderColor: 'var(--dsw-alias-brand-primary)' },
  // The composer tool row's controls are borderless and narrower.
  chipCompact: { height: 28, maxWidth: 160, borderColor: 'transparent', borderRadius: 8, padding: '0 8px' },
  chipText: { overflow: 'hidden', textOverflow: 'ellipsis' },
  hover: { background: 'var(--dsw-alias-interactive-bg-hover)', color: 'var(--dsw-alias-label-primary)' },
  pressed: { background: 'var(--dsw-alias-interactive-bg-active)', transform: 'scale(0.97)' },

  // ── dialog frame ──
  backdrop: {
    position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16, background: 'rgb(0 0 0 / 0.36)', pointerEvents: 'auto', fontFamily: 'inherit',
  },
  dialog: {
    display: 'flex', flexDirection: 'column', width: 'min(1180px, 100%)', height: 'min(820px, 100%)',
    border: '0.5px solid var(--dsw-alias-border-l3)', borderRadius: 14, overflow: 'hidden',
    background: 'var(--dsw-alias-bg-base)', color: 'var(--dsw-alias-label-primary)',
    boxShadow: '0 16px 48px rgb(0 0 0 / 0.28)', fontSize: 13,
  },
  header: {
    display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '12px 16px',
    borderBottom: '0.5px solid var(--dsw-alias-border-l3)',
  },
  title: { margin: 0, fontSize: 15, fontWeight: 600, flex: 'none' },
  sessionBar: { display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 240, flexWrap: 'wrap' },
  muted: { color: 'var(--dsw-alias-label-tertiary)', fontSize: 12 },
  secondary: { color: 'var(--dsw-alias-label-secondary)' },
  body: { display: 'flex', flex: 1, minHeight: 0 },
  side: {
    display: 'flex', flexDirection: 'column', width: 300, flex: 'none', minHeight: 0,
    borderRight: '0.5px solid var(--dsw-alias-border-l3)', background: 'var(--dsw-alias-bg-layer-1, transparent)',
  },
  sideScroll: { flex: 1, overflowY: 'auto', padding: 10 },
  sectionTitle: { margin: '4px 4px 8px', fontSize: 11, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase', color: 'var(--dsw-alias-label-tertiary)' },
  main: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 },
  mainScroll: { flex: 1, overflowY: 'auto', padding: '14px 18px 24px' },

  // ── library list ──
  entry: {
    display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', marginBottom: 4,
    borderWidth: 0.5, borderStyle: 'solid', borderColor: 'transparent', borderRadius: 8,
    background: 'transparent', color: 'inherit', font: 'inherit', cursor: 'pointer', transition: feedback,
  },
  entrySelected: { borderColor: 'var(--dsw-alias-border-l2)', background: 'var(--dsw-alias-interactive-bg-active)' },
  entryName: { display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  entryMeta: { marginTop: 3, fontSize: 11, color: 'var(--dsw-alias-label-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  badge: {
    display: 'inline-block', flex: 'none', padding: '1px 6px', borderRadius: 9, fontSize: 10, fontWeight: 500,
    border: '0.5px solid var(--dsw-alias-border-l3)', color: 'var(--dsw-alias-label-secondary)',
  },
  badgeBrand: { borderColor: 'var(--dsw-alias-brand-primary)', color: 'var(--dsw-alias-brand-primary)' },
  badgeWarn: { borderColor: 'var(--dsw-alias-state-warn-primary)', color: 'var(--dsw-alias-state-warn-primary)' },
  badgeError: { borderColor: 'var(--dsw-alias-state-error-primary)', color: 'var(--dsw-alias-state-error-primary)' },
  badgeOk: { borderColor: 'var(--dsw-alias-state-success-primary)', color: 'var(--dsw-alias-state-success-primary)' },

  // ── controls ──
  button: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 28, padding: '3px 10px',
    borderWidth: 0.5, borderStyle: 'solid', borderColor: 'var(--dsw-alias-border-l3)', borderRadius: 7,
    background: 'transparent', color: 'var(--dsw-alias-label-primary)', font: 'inherit', fontSize: 12,
    whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none', transition: feedback,
  },
  // Brand is near-black in the light theme and near-white in the dark one, so the base background is the readable text on it.
  buttonPrimary: { background: 'var(--dsw-alias-brand-primary)', borderColor: 'var(--dsw-alias-brand-primary)', color: 'var(--dsw-alias-bg-base)' },
  buttonDanger: { color: 'var(--dsw-alias-state-error-primary)' },
  disabled: { opacity: 0.45, cursor: 'not-allowed', transform: 'none' },
  iconButton: { minWidth: 28, padding: '3px 6px' },
  row: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  input: {
    width: '100%', boxSizing: 'border-box', minHeight: 30, padding: '5px 9px',
    border: '0.5px solid var(--dsw-alias-border-l2)', borderRadius: 7, outline: 'none',
    background: 'var(--dsw-alias-bg-base)', color: 'var(--dsw-alias-label-primary)', font: 'inherit', fontSize: 12,
  },
  select: {
    minHeight: 28, maxWidth: 320, padding: '3px 8px', border: '0.5px solid var(--dsw-alias-border-l2)', borderRadius: 7,
    background: 'var(--dsw-alias-bg-base)', color: 'var(--dsw-alias-label-primary)', font: 'inherit', fontSize: 12,
  },
  label: { display: 'block', margin: '8px 0 4px', fontSize: 11, color: 'var(--dsw-alias-label-secondary)' },
  form: { marginTop: 10, padding: 10, border: '0.5px solid var(--dsw-alias-border-l3)', borderRadius: 10 },
  tabs: { display: 'flex', gap: 4, marginBottom: 4 },
  tab: { flex: 1 },
  tabActive: { borderColor: 'var(--dsw-alias-brand-primary)', color: 'var(--dsw-alias-brand-primary)' },
  note: { margin: '6px 0 0', fontSize: 11, lineHeight: 1.45, color: 'var(--dsw-alias-label-tertiary)', overflowWrap: 'anywhere' },
  error: { margin: '8px 0 0', padding: '6px 8px', borderRadius: 7, fontSize: 12, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', color: 'var(--dsw-alias-state-error-primary)', border: '0.5px solid var(--dsw-alias-state-error-primary)' },
  success: { margin: '8px 0 0', fontSize: 12, color: 'var(--dsw-alias-state-success-primary)' },
  candidate: { fontFamily: mono, fontSize: 11 },

  // ── preview ──
  previewHead: { display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 12, marginBottom: 12, borderBottom: '0.5px solid var(--dsw-alias-border-l3)' },
  previewTitle: { margin: 0, fontSize: 17, fontWeight: 600, overflowWrap: 'anywhere' },
  stats: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  group: { margin: '14px 0 6px', fontSize: 11, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase', color: 'var(--dsw-alias-label-tertiary)' },
  pageRow: {
    display: 'block', width: '100%', textAlign: 'left', padding: '7px 9px', borderRadius: 7, border: 'none',
    background: 'transparent', color: 'inherit', font: 'inherit', cursor: 'pointer', transition: feedback,
  },
  pageTitle: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontWeight: 500 },
  pageDesc: { marginTop: 2, fontSize: 12, color: 'var(--dsw-alias-label-secondary)', lineHeight: 1.4 },
  pagePath: { fontFamily: mono, fontSize: 11, color: 'var(--dsw-alias-label-tertiary)' },
  metaTable: { width: '100%', borderCollapse: 'collapse', margin: '8px 0 16px', fontSize: 12 },
  metaKey: { width: 140, padding: '3px 8px 3px 0', verticalAlign: 'top', color: 'var(--dsw-alias-label-tertiary)', fontFamily: mono, fontSize: 11 },
  metaValue: { padding: '3px 0', verticalAlign: 'top', overflowWrap: 'anywhere', fontFamily: mono, fontSize: 11, whiteSpace: 'pre-wrap' },
  empty: { padding: '40px 12px', textAlign: 'center', color: 'var(--dsw-alias-label-tertiary)' },

  // ── markdown ──
  markdown: { lineHeight: 1.6, fontSize: 13.5, overflowWrap: 'anywhere' },
  mdHeading: { margin: '18px 0 8px', fontWeight: 600, lineHeight: 1.3 },
  mdParagraph: { margin: '0 0 10px' },
  mdCode: { padding: '1px 5px', borderRadius: 4, background: 'var(--dsw-alias-interactive-bg-hover)', fontFamily: mono, fontSize: '0.9em' },
  mdPre: { margin: '0 0 12px', padding: '10px 12px', borderRadius: 8, overflowX: 'auto', background: 'var(--dsw-alias-interactive-bg-hover)', fontFamily: mono, fontSize: 12, lineHeight: 1.5 },
  mdQuote: { margin: '0 0 12px', padding: '2px 12px', borderLeft: '3px solid var(--dsw-alias-border-l2)', color: 'var(--dsw-alias-label-secondary)' },
  mdList: { margin: '0 0 10px', paddingLeft: 22 },
  mdItem: { margin: '2px 0' },
  mdRule: { margin: '16px 0', border: 'none', borderTop: '0.5px solid var(--dsw-alias-border-l3)' },
  mdLink: { color: 'var(--dsw-alias-link)', textDecoration: 'none', cursor: 'pointer' },
  mdTableWrap: { margin: '0 0 12px', overflowX: 'auto' },
  mdTable: { borderCollapse: 'collapse', fontSize: 12.5 },
  mdCell: { padding: '5px 9px', border: '0.5px solid var(--dsw-alias-border-l3)', verticalAlign: 'top' },
  mdHeadCell: { fontWeight: 600, background: 'var(--dsw-alias-interactive-bg-hover)' },
}

/**
 * Read one style by name.
 * @param name - a key of this module's table.
 * @returns the style object.
 * @throws {Error} when the name is missing, which is a build-time mistake.
 */
export function st(name: string): CSSProperties {
  const style = table[name]
  if (style === undefined) throw new Error(`okf: no style named ${JSON.stringify(name)}`)
  return style
}

/**
 * Merge several named styles, skipping falsy names.
 * @param names - style names, or false/undefined to skip.
 * @returns the merged style.
 */
export function sx(...names: (string | false | undefined)[]): CSSProperties {
  return Object.assign({}, ...names.filter((name): name is string => typeof name === 'string').map(st)) as CSSProperties
}
