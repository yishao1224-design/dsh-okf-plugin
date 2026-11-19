/**
 * Review state of a wiki page, and the frontmatter stamp an agent edit leaves.
 *
 * The bundle has no separate "reviewed" field. Following `okf/SCHEMA.md` in
 * knowledgeAgent, a page counts as **reviewed** when all of these hold:
 *
 * - `lifecycle: active`;
 * - its latest `verified` entry is by a person (`by: human:<id>`);
 * - that verification is not older than the page's `generated.at`, i.e. nobody
 *   rewrote the page after the person confirmed it.
 *
 * Everything else is **unreviewed**. An agent edit therefore resets a page to
 * unreviewed by construction: it replaces `generated` with `{ by: <agent>, at:
 * today }` and sets `lifecycle: draft`, and never writes `verified` (only a
 * person's review may, see SCHEMA.md "generated vs verified").
 *
 * The Host ships with no YAML library, so this edits the frontmatter as text,
 * one top-level key block at a time, and leaves every other key untouched.
 */

/** A page's review state. */
export interface ReviewState {
  readonly state: 'reviewed' | 'unreviewed'
  readonly lifecycle?: string
  readonly reviewer?: string
  readonly reviewedAt?: string
  readonly generatedBy?: string
  readonly generatedAt?: string
}

/** A file split at its frontmatter. */
export interface SplitPage {
  /** The lines between the `---` fences. */
  readonly block: string[]
  /** Everything after the closing fence. */
  readonly body: string
  /** The line ending the file uses. */
  readonly eol: string
}

/**
 * Split a markdown file into its frontmatter lines and body.
 * @param source - the file.
 * @returns the split, or undefined when the file has no frontmatter.
 */
export function splitPage(source: string): SplitPage | undefined {
  const text = source.replace(/^﻿/, '')
  const eol = text.includes('\r\n') ? '\r\n' : '\n'
  const open = /^---[ \t]*\r?\n/.exec(text)
  if (open === null) return undefined
  const rest = text.slice(open[0].length)
  const close = /^---[ \t]*(\r?\n|$)/m.exec(rest)
  if (close === null) return undefined
  const block = rest.slice(0, close.index).replace(/\r?\n$/, '')
  return { block: block === '' ? [] : block.split(/\r?\n/), body: rest.slice(close.index + close[0].length), eol }
}

/**
 * Put a split page back together.
 * @param page - the split.
 * @returns the file.
 */
export function joinPage(page: SplitPage): string {
  return ['---', ...page.block, '---', ''].join(page.eol) + page.body
}

/** One top-level key with the lines that belong to it. */
interface KeyBlock {
  readonly key: string | undefined
  readonly lines: string[]
}

/**
 * Group frontmatter lines by top-level key. Comment and blank lines stay with
 * the key above them; lines before the first key form a keyless block.
 * @param lines - the frontmatter lines.
 * @returns the blocks in order.
 */
function blocks(lines: readonly string[]): KeyBlock[] {
  const out: KeyBlock[] = []
  for (const line of lines) {
    const match = /^([A-Za-z_][\w-]*)\s*:/.exec(line)
    if (match !== null) out.push({ key: match[1], lines: [line] })
    else if (out.length === 0) out.push({ key: undefined, lines: [line] })
    else out[out.length - 1]?.lines.push(line)
  }
  return out
}

/**
 * The lines of one top-level key.
 * @param lines - the frontmatter lines.
 * @param key - the key.
 * @returns its lines, or undefined when absent.
 */
export function keyLines(lines: readonly string[], key: string): string[] | undefined {
  return blocks(lines).find(block => block.key === key)?.lines
}

/**
 * Replace or add top-level keys.
 * @param lines - the frontmatter lines.
 * @param values - key → the replacement lines (the first starts with `key:`).
 * @returns the new frontmatter lines. New keys go at the end, in the given order.
 */
export function setKeys(lines: readonly string[], values: Readonly<Record<string, readonly string[]>>): string[] {
  const all = blocks(lines)
  const done = new Set<string>()
  const out: string[] = []
  for (const block of all) {
    const replacement = block.key === undefined ? undefined : values[block.key]
    if (replacement === undefined || block.key === undefined) {
      out.push(...block.lines)
      continue
    }
    if (done.has(block.key)) continue
    done.add(block.key)
    // Keep trailing comments/blank lines that followed the old value.
    const trailing: string[] = []
    for (let index = block.lines.length - 1; index > 0; index -= 1) {
      const line = block.lines[index] ?? ''
      if (line.trim() === '' || /^#/.test(line)) trailing.unshift(line)
      else break
    }
    out.push(...replacement, ...trailing)
  }
  for (const [key, replacement] of Object.entries(values)) {
    if (!done.has(key)) out.push(...replacement)
  }
  return out
}

/**
 * Read a scalar, dropping quotes and a trailing comment.
 * @param raw - the text after `key:`.
 * @returns the value, or undefined when blank.
 */
function scalar(raw: string): string | undefined {
  const text = raw.replace(/\s+#.*$/, '').trim()
  if (text === '' || text === '~' || text === 'null') return undefined
  const quoted = /^(['"])(.*)\1$/.exec(text)
  return quoted === null ? text : quoted[2]
}

/**
 * Read `{ by, at }` from either flow style (`{by: x, at: y}`) or block style
 * (`by: x` / `at: y` on their own lines).
 * @param lines - the lines holding one actor record.
 * @returns the fields found.
 */
function actor(lines: readonly string[]): { by?: string, at?: string } {
  const joined = lines.join('\n')
  const out: { by?: string, at?: string } = {}
  for (const field of ['by', 'at'] as const) {
    const match = new RegExp(`(?:^|[\\s{,-])${field}\\s*:\\s*([^,}\\n]+)`).exec(joined)
    const value = match === null ? undefined : scalar(match[1] ?? '')
    if (value !== undefined) out[field] = value
  }
  return out
}

/**
 * Read the `verified` list: one actor record per `- ` item.
 * @param lines - the key's lines.
 * @returns the records in file order.
 */
function verifiedEntries(lines: readonly string[]): { by?: string, at?: string }[] {
  const head = lines[0] ?? ''
  const inline = /^verified\s*:\s*\[(.*)\]\s*$/.exec(head)
  if (inline !== null) return [...(inline[1] ?? '').matchAll(/\{[^}]*\}/g)].map(match => actor([match[0]]))
  const items: string[][] = []
  for (const line of lines.slice(1)) {
    if (/^\s*-/.test(line)) items.push([line])
    else if (items.length > 0 && line.trim() !== '') items[items.length - 1]?.push(line)
  }
  return items.map(actor)
}

/**
 * Compare two ISO dates (or date-times) as text; both sort lexically.
 * @param a - one date.
 * @param b - the other.
 * @returns true when a is on or after b.
 */
function notBefore(a: string, b: string): boolean {
  return a.slice(0, 10) >= b.slice(0, 10)
}

/**
 * The review state of a page.
 * @param source - the file.
 * @returns the state.
 */
export function reviewState(source: string): ReviewState {
  const page = splitPage(source)
  if (page === undefined) return { state: 'unreviewed' }
  const lifecycle = scalar((keyLines(page.block, 'lifecycle')?.[0] ?? '').replace(/^lifecycle\s*:/, ''))
  const generatedLines = keyLines(page.block, 'generated')
  const generated = generatedLines === undefined ? {} : actor([generatedLines[0]?.replace(/^generated\s*:/, '') ?? '', ...generatedLines.slice(1)])
  const verifiedLines = keyLines(page.block, 'verified')
  const verified = verifiedLines === undefined ? [] : verifiedEntries(verifiedLines)
  const last = verified[verified.length - 1]
  const base = {
    ...lifecycle === undefined ? {} : { lifecycle },
    ...generated.by === undefined ? {} : { generatedBy: generated.by },
    ...generated.at === undefined ? {} : { generatedAt: generated.at },
  }
  const human = last?.by?.startsWith('human:') === true && last.at !== undefined
  const current = human && (generated.at === undefined || notBefore(last.at ?? '', generated.at))
  if (lifecycle === 'active' && human && current) {
    return { state: 'reviewed', ...base, reviewer: last.by?.slice('human:'.length) ?? '', reviewedAt: last.at ?? '' }
  }
  return { state: 'unreviewed', ...base }
}

/**
 * One line describing a review state, for tool output.
 * @param review - the state.
 * @returns the line.
 */
export function describeReview(review: ReviewState): string {
  const life = review.lifecycle === undefined ? '' : `, lifecycle ${review.lifecycle}`
  if (review.state === 'reviewed') return `reviewed by ${review.reviewer ?? '?'} on ${review.reviewedAt ?? '?'}${life}`
  const by = review.generatedBy === undefined ? '' : `, written by ${review.generatedBy}${review.generatedAt === undefined ? '' : ` on ${review.generatedAt}`}`
  return `unreviewed${by}${life}`
}

/** Today as `YYYY-MM-DD` in local time. */
export function today(): string {
  const now = new Date()
  const pad = (value: number): string => String(value).padStart(2, '0')
  return `${String(now.getFullYear())}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/**
 * Stamp an agent edit: the page becomes an unreviewed draft written by `actor`.
 * Keeps `verified` (it is history), `created`, and every other key.
 * @param source - the file after the edit.
 * @param agent - the `generated.by` actor, e.g. `dsh/deepseek-v4`.
 * @param date - today.
 * @returns the stamped file.
 * @throws {Error} when the file has no frontmatter.
 */
export function stampAgentEdit(source: string, agent: string, date: string): string {
  const page = splitPage(source)
  if (page === undefined) throw new Error('The page has no YAML frontmatter.')
  const values: Record<string, string[]> = {
    status: ['status: draft'],
    lifecycle: ['lifecycle: draft'],
    updated: [`updated: ${date}`],
    generated: ['generated:', `  by: ${agent}`, `  at: ${date}`],
  }
  if (keyLines(page.block, 'created') === undefined) values.created = [`created: ${date}`]
  return joinPage({ ...page, block: setKeys(page.block, values) })
}
