/**
 * A deliberately small YAML-frontmatter reader for OKF pages.
 *
 * The Host half ships as one file with no `node_modules` behind it, so it
 * cannot lean on a YAML library. OKF frontmatter in practice is flat: scalar
 * keys, inline lists (`tags: [a, b]`), block lists of scalars, and the odd
 * nested mapping (`sources`, `generated`). The preview only needs the flat
 * keys, so this reader parses those and records nested blocks as `undefined`
 * rather than guessing. A page whose frontmatter it cannot read still shows,
 * just without metadata.
 */

/** One frontmatter value as the preview uses it. */
export type FrontValue = string | number | boolean | null | readonly string[]

/** The split of one markdown file. */
export interface ParsedPage {
  /** Top-level keys this reader understood. */
  readonly meta: Readonly<Record<string, FrontValue>>
  /** Whether the file opened with a `---` frontmatter block. */
  readonly hasFrontmatter: boolean
  /** The markdown after the frontmatter. */
  readonly body: string
}

/**
 * Read a YAML scalar.
 * @param raw - the text after `key:`, trimmed.
 * @returns the scalar value.
 */
function scalar(raw: string): string | number | boolean | null {
  const text = raw.replace(/\s+#.*$/, '').trim()
  if (text === '' || text === '~' || text === 'null') return null
  if (text === 'true') return true
  if (text === 'false') return false
  const quoted = /^(['"])(.*)\1$/.exec(text)
  if (quoted !== null) return quoted[1] === "'" ? (quoted[2] ?? '').replace(/''/g, "'") : unescapeDouble(quoted[2] ?? '')
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text)
  return text
}

/**
 * Undo the common escapes of a double-quoted YAML string.
 * @param text - the inside of the quotes.
 * @returns the plain string.
 */
function unescapeDouble(text: string): string {
  return text.replace(/\\(["\\nt])/g, (_, ch: string) => (ch === 'n' ? '\n' : ch === 't' ? '\t' : ch))
}

/**
 * Read an inline flow list such as `[a, "b c", d]`.
 * @param raw - the text including the brackets.
 * @returns the items as strings.
 */
function inlineList(raw: string): string[] {
  const inner = raw.trim().slice(1, -1).trim()
  if (inner === '') return []
  return inner.split(',').map(item => String(scalar(item.trim()) ?? '')).filter(item => item !== '')
}

/**
 * Split a markdown file into frontmatter and body.
 * @param source - the whole file.
 * @returns the understood keys, and the body.
 */
export function parsePage(source: string): ParsedPage {
  const text = source.replace(/^\uFEFF/, '')
  const open = /^---[ \t]*\r?\n/.exec(text)
  if (open === null) return { meta: {}, hasFrontmatter: false, body: text }
  const rest = text.slice(open[0].length)
  const close = /^---[ \t]*(\r?\n|$)/m.exec(rest)
  if (close === null) return { meta: {}, hasFrontmatter: false, body: text }
  const block = rest.slice(0, close.index)
  const body = rest.slice(close.index + close[0].length)
  const meta: Record<string, FrontValue> = {}
  const lines = block.split(/\r?\n/)
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? ''
    const match = /^([A-Za-z_][\w-]*)\s*:(.*)$/.exec(line)
    if (match === null) continue
    const key = match[1] ?? ''
    const value = (match[2] ?? '').trim()
    if (value.startsWith('[') && value.endsWith(']')) {
      meta[key] = inlineList(value)
      continue
    }
    if (value !== '' && !value.startsWith('#') && value !== '|' && value !== '>') {
      meta[key] = scalar(value)
      continue
    }
    // An empty value opens a block: a list of scalars is kept, anything nested is skipped.
    const items: string[] = []
    let nested = false
    while (index + 1 < lines.length && /^(\s+|-\s|-$)/.test(lines[index + 1] ?? '')) {
      index += 1
      const child = lines[index] ?? ''
      const item = /^\s*-\s+(.*)$/.exec(child)
      if (item !== null && !/^[A-Za-z_][\w-]*\s*:/.test(item[1] ?? '') && !/^\s{4,}/.test(child)) items.push(String(scalar(item[1] ?? '') ?? ''))
      else if (child.trim() !== '') nested = true
    }
    if (!nested) meta[key] = items
  }
  return { meta, hasFrontmatter: true, body }
}

/**
 * Read a key as a string.
 * @param meta - the parsed frontmatter.
 * @param key - the key.
 * @returns the value as text, or undefined when absent or not a scalar.
 */
export function text(meta: Readonly<Record<string, FrontValue>>, key: string): string | undefined {
  const value = meta[key]
  if (value === null || value === undefined || Array.isArray(value)) return undefined
  return String(value)
}

/**
 * Read a key as a list of strings.
 * @param meta - the parsed frontmatter.
 * @param key - the key.
 * @returns the list; a scalar becomes a one-item list.
 */
export function list(meta: Readonly<Record<string, FrontValue>>, key: string): string[] {
  const value = meta[key]
  if (Array.isArray(value)) return [...value as readonly string[]]
  if (value === null || value === undefined || value === '') return []
  return [String(value)]
}
