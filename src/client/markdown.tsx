/**
 * A small markdown renderer that builds React elements directly.
 *
 * Bundles come from remote repositories, so their text is untrusted. Building
 * elements (never `innerHTML`) means raw HTML in a page renders as text and
 * cannot run script. Links are limited to http(s) and mailto; any other href
 * is shown as text. Bundle links (`/concepts/foo.md`, `../entities/bar.md`)
 * are handed to `onBundleLink` so the preview can open the page in place;
 * links to other bundle files (a workbook or PDF kept under `sources/`) go
 * to `onFileLink`, which opens them with their default app.
 *
 * Covers what OKF pages use: ATX headings, paragraphs, emphasis, inline code,
 * fenced code, block quotes, nested lists, GFM tables, rules, links, images
 * (shown as links: the preview loads no remote content).
 */
import { createElement, Fragment, type CSSProperties, type ReactNode } from 'react'
import { st } from './styles.ts'
import { fixSourceLink } from '../shared/gitweb.ts'

/** How links behave. */
export interface MarkdownOptions {
  /** Path of the page being shown, bundle-relative, to resolve relative links. */
  readonly pagePath: string
  /** Open a bundle page. */
  readonly onBundleLink: (path: string) => void
  /** Open a bundle file that is not a page; without it such links show as text. */
  readonly onFileLink?: (path: string) => void
}

/**
 * Resolve a link found in a page to a bundle-relative path.
 * @param href - the link target.
 * @param pagePath - the page holding the link.
 * @returns the bundle path, or undefined when the link leaves the bundle or is not a page.
 */
export function bundleTarget(href: string, pagePath: string): string | undefined {
  const target = bundleFile(href, pagePath)
  return target?.toLowerCase().endsWith('.md') === true ? target : undefined
}

/**
 * Resolve a link found in a page to a bundle-relative file of any kind.
 * @param href - the link target.
 * @param pagePath - the page holding the link.
 * @returns the bundle path, or undefined when the link is external or leaves the bundle.
 */
export function bundleFile(href: string, pagePath: string): string | undefined {
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//') || href.startsWith('#')) return undefined
  const target = href.split('#')[0]?.split('?')[0] ?? ''
  if (target === '') return undefined
  const base = target.startsWith('/') ? [] : pagePath.split('/').slice(0, -1)
  for (const part of target.split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') {
      if (base.length === 0) return undefined
      base.pop()
    } else {
      base.push(decodeURIComponent(part))
    }
  }
  return base.join('/')
}

/**
 * Whether an external href is safe to open.
 * @param href - the target.
 * @returns true for http(s) and mailto.
 */
function safeExternal(href: string): boolean {
  return /^(https?:|mailto:)/i.test(href)
}

let keySeed = 0
/** @returns a fresh element key. */
const key = (): string => `m${String(keySeed += 1)}`

/**
 * Render inline markdown.
 * @param text - one paragraph's text.
 * @param options - link handling.
 * @returns the nodes.
 */
export function inline(text: string, options: MarkdownOptions): ReactNode[] {
  const nodes: ReactNode[] = []
  // Order matters: code first (nothing inside it is markup), then images, links, autolinks, emphasis.
  const pattern = /(`+)([\s\S]*?[^`])\1(?!`)|!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)|\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)|<(https?:\/\/[^>\s]+)>|\*\*([^*]+?)\*\*|__([^_]+?)__|\*([^*\s][^*]*?)\*|(?<![\w])_([^_\s][^_]*?)_(?![\w])|~~([^~]+?)~~/g
  let last = 0
  for (const match of text.matchAll(pattern)) {
    const at = match.index ?? 0
    if (at > last) nodes.push(text.slice(last, at))
    last = at + match[0].length
    if (match[2] !== undefined) {
      nodes.push(createElement('code', { key: key(), style: st('mdCode') }, match[2].trim()))
    } else if (match[4] !== undefined) {
      nodes.push(link(match[4], `🖼 ${match[3] || match[4]}`, options))
    } else if (match[6] !== undefined) {
      nodes.push(link(match[6], inline(match[5] ?? '', options), options))
    } else if (match[7] !== undefined) {
      nodes.push(link(match[7], match[7], options))
    } else if (match[8] !== undefined || match[9] !== undefined) {
      nodes.push(createElement('strong', { key: key() }, inline(match[8] ?? match[9] ?? '', options)))
    } else if (match[10] !== undefined || match[11] !== undefined) {
      nodes.push(createElement('em', { key: key() }, inline(match[10] ?? match[11] ?? '', options)))
    } else if (match[12] !== undefined) {
      nodes.push(createElement('del', { key: key() }, inline(match[12], options)))
    }
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

/**
 * One link.
 * @param href - the target.
 * @param label - what to show.
 * @param options - link handling.
 * @returns a bundle link, an external link, or plain text.
 */
function link(href: string, label: ReactNode, options: MarkdownOptions): ReactNode {
  const target = bundleTarget(href, options.pagePath)
  if (target !== undefined) {
    return createElement('a', {
      key: key(),
      href: '#',
      style: st('mdLink'),
      title: target,
      onClick: (event: { preventDefault(): void }) => { event.preventDefault(); options.onBundleLink(target) },
    }, label)
  }
  const file = options.onFileLink === undefined ? undefined : bundleFile(href, options.pagePath)
  if (file !== undefined && file !== '') {
    return createElement('a', {
      key: key(),
      href: '#',
      style: st('mdLink'),
      title: file,
      onClick: (event: { preventDefault(): void }) => { event.preventDefault(); options.onFileLink?.(file) },
    }, label)
  }
  if (safeExternal(href)) return createElement('a', { key: key(), href: fixSourceLink(href), target: '_blank', rel: 'noopener noreferrer', style: st('mdLink') }, label)
  return createElement('span', { key: key(), title: href }, label)
}

/** A list item being collected. */
interface ListItem {
  lines: string[]
}

/**
 * Split a table row into cells.
 * @param line - `| a | b |`.
 * @returns the cell texts.
 */
function cells(line: string): string[] {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/).map(cell => cell.trim().replace(/\\\|/g, '|'))
}

/**
 * Render block markdown.
 * @param source - the markdown.
 * @param options - link handling.
 * @returns the nodes.
 */
export function renderMarkdown(source: string, options: MarkdownOptions): ReactNode[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n')
  const out: ReactNode[] = []
  let index = 0
  const isBlank = (line: string | undefined): boolean => line === undefined || line.trim() === ''
  const listMarker = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/

  while (index < lines.length) {
    const line = lines[index] ?? ''
    if (isBlank(line)) {
      index += 1
      continue
    }
    const fence = /^\s*(```+|~~~+)\s*([\w+-]*)/.exec(line)
    if (fence !== null) {
      const close = fence[1] ?? '```'
      const code: string[] = []
      index += 1
      while (index < lines.length && !(lines[index] ?? '').trim().startsWith(close)) {
        code.push(lines[index] ?? '')
        index += 1
      }
      index += 1
      out.push(createElement('pre', { key: key(), style: st('mdPre') }, createElement('code', null, code.join('\n'))))
      continue
    }
    const heading = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line)
    if (heading !== null) {
      const level = (heading[1] ?? '#').length
      const style: CSSProperties = { ...st('mdHeading'), fontSize: [20, 17, 15, 14, 13, 13][level - 1] }
      out.push(createElement(`h${String(level)}`, { key: key(), style }, inline(heading[2] ?? '', options)))
      index += 1
      continue
    }
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      out.push(createElement('hr', { key: key(), style: st('mdRule') }))
      index += 1
      continue
    }
    if (/^\s*>/.test(line)) {
      const quote: string[] = []
      while (index < lines.length && /^\s*>/.test(lines[index] ?? '')) {
        quote.push((lines[index] ?? '').replace(/^\s*>\s?/, ''))
        index += 1
      }
      out.push(createElement('blockquote', { key: key(), style: st('mdQuote') }, renderMarkdown(quote.join('\n'), options)))
      continue
    }
    if (line.includes('|') && /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(lines[index + 1] ?? '')) {
      const head = cells(line)
      const align = cells(lines[index + 1] ?? '').map(cell => (cell.endsWith(':') ? (cell.startsWith(':') ? 'center' : 'right') : 'left'))
      index += 2
      const rows: string[][] = []
      while (index < lines.length && !isBlank(lines[index]) && (lines[index] ?? '').includes('|')) {
        rows.push(cells(lines[index] ?? ''))
        index += 1
      }
      out.push(createElement('div', { key: key(), style: st('mdTableWrap') },
        createElement('table', { style: st('mdTable') },
          createElement('thead', null, createElement('tr', null, head.map((cell, column) => createElement('th', { key: String(column), style: { ...st('mdCell'), ...st('mdHeadCell'), textAlign: align[column] as CSSProperties['textAlign'] } }, inline(cell, options))))),
          createElement('tbody', null, rows.map((row, rowIndex) => createElement('tr', { key: String(rowIndex) }, head.map((_, column) => createElement('td', { key: String(column), style: { ...st('mdCell'), textAlign: align[column] as CSSProperties['textAlign'] } }, inline(row[column] ?? '', options)))))))))
      continue
    }
    const first = listMarker.exec(line)
    if (first !== null) {
      const indent = (first[1] ?? '').length
      const ordered = /\d/.test(first[2] ?? '')
      const items: ListItem[] = []
      while (index < lines.length) {
        const current = lines[index] ?? ''
        const marker = listMarker.exec(current)
        if (marker !== null && (marker[1] ?? '').length === indent) {
          items.push({ lines: [marker[3] ?? ''] })
          index += 1
          continue
        }
        const item = items.at(-1)
        if (item === undefined) break
        if (isBlank(current)) {
          // A blank line ends the list unless the next line continues it, indented or as another item.
          const next = lines[index + 1]
          const nextMarker = next === undefined ? null : listMarker.exec(next)
          if (next !== undefined && ((nextMarker !== null && (nextMarker[1] ?? '').length >= indent) || /^\s{2,}\S/.test(next))) {
            item.lines.push('')
            index += 1
            continue
          }
          break
        }
        if (/^\s+\S/.test(current) && (current.length - current.trimStart().length) > indent) {
          item.lines.push(current.slice(Math.min(indent + 2, current.length - current.trimStart().length)))
          index += 1
          continue
        }
        if (marker !== null) break
        // A lazy continuation line of the item's paragraph.
        item.lines.push(current.trim())
        index += 1
      }
      out.push(createElement(ordered ? 'ol' : 'ul', { key: key(), style: st('mdList') }, items.map((item) => {
        const text = item.lines.join('\n')
        const task = /^\[([ xX])\]\s+/.exec(text)
        const content = task === null ? text : text.slice(task[0].length)
        // A tight item stays inline; text followed directly by a nested list keeps
        // its text inline too, so the item does not grow a paragraph margin.
        const parts = content.split('\n')
        const nestedAt = parts.findIndex(part => listMarker.test(part) || /^\s*(```|>|#)/.test(part))
        const headLines = nestedAt < 0 ? parts : parts.slice(0, nestedAt)
        const tight = !headLines.some(part => part.trim() === '')
        const body = tight && nestedAt < 0
          ? inline(content.replace(/\n/g, ' '), options)
          : tight && nestedAt > 0
            ? [...inline(headLines.join(' '), options), ...renderMarkdown(parts.slice(nestedAt).join('\n'), options)]
            : renderMarkdown(content, options)
        return createElement('li', { key: key(), style: st('mdItem') },
          task === null ? body : createElement(Fragment, null, createElement('span', { 'aria-hidden': true }, task[1] === ' ' ? '☐ ' : '☑ '), body))
      })))
      continue
    }
    const paragraph: string[] = []
    while (index < lines.length && !isBlank(lines[index])) {
      const current = lines[index] ?? ''
      if (paragraph.length > 0 && (/^(#{1,6}\s|```|~~~|\s*>)/.test(current) || listMarker.test(current))) break
      paragraph.push(current.trim())
      index += 1
    }
    out.push(createElement('p', { key: key(), style: st('mdParagraph') }, inline(paragraph.join(' '), options)))
  }
  return out
}
