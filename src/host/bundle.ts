/**
 * Find and read OKF bundles.
 *
 * OKF v0.2 defines a bundle as a directory of markdown files with YAML
 * frontmatter; the root `index.md` may declare `okf_version`, and toolchains
 * such as `okf.py` mark the root with a `SCHEMA.md`. Either marker makes a
 * folder a bundle root here. Reading is permissive, as the spec asks of
 * consumers: unknown keys, unknown types and broken links never fail a read.
 */
import { readdir, readFile, stat } from 'node:fs/promises'
import { join, relative, resolve, sep } from 'node:path'
import { list, parsePage, text } from './frontmatter.ts'
import { pageStage } from './stage.ts'
import type { BundleSummary, LibraryEntry, PageContent, PageSummary } from '../types/okf.ts'

/** Files OKF reserves; they need no `type`. */
export const RESERVED = new Set(['index.md', 'log.md'])
/** Folders never walked. */
const SKIP = new Set(['.git', 'node_modules', '.obsidian', '.github', '.claude', '.vscode'])
/** The most pages one summary lists. */
export const PAGE_CAP = 5000
/** The largest page served whole. */
export const PAGE_BYTES_CAP = 2 * 1024 * 1024

/**
 * Whether an `index.md` text declares `okf_version` in its frontmatter.
 * @param source - the file text.
 * @returns true when it does.
 */
export function declaresOkf(source: string): boolean {
  return text(parsePage(source).meta, 'okf_version') !== undefined
}

/**
 * Pick the bundle roots out of a repository file listing.
 * @param files - repository-relative paths, forward slashes.
 * @param readIndex - reads an `index.md` by path, to check for `okf_version`.
 * @returns repository-relative roots (`''` for the repository root), shallowest first.
 */
export async function findBundleRoots(files: readonly string[], readIndex: (path: string) => Promise<string>): Promise<string[]> {
  const roots = new Set<string>()
  for (const file of files) {
    const parts = file.split('/')
    const name = parts.pop() ?? ''
    if (parts.some(part => SKIP.has(part))) continue
    const dir = parts.join('/')
    if (name === 'SCHEMA.md') roots.add(dir)
    else if (name === 'index.md') {
      try {
        if (declaresOkf(await readIndex(file))) roots.add(dir)
      } catch { /* an unreadable index is not a marker */ }
    }
  }
  // A marker nested inside another bundle belongs to that bundle (e.g. an archived SCHEMA.md).
  const sorted = [...roots].sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b))
  return sorted.filter(root => !sorted.some(outer => outer !== root && (outer === '' || root.startsWith(`${outer}/`))))
}

/**
 * Find the bundle roots under a local folder.
 * @param dir - the folder.
 * @param depth - how deep to look.
 * @returns absolute roots, shallowest first.
 */
export async function findLocalBundleRoots(dir: string, depth = 3): Promise<string[]> {
  const files: string[] = []
  const walk = async (current: string, level: number): Promise<void> => {
    let entries
    try {
      entries = await readdir(current, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (entry.isDirectory() && level < depth && !SKIP.has(entry.name)) await walk(join(current, entry.name), level + 1)
      else if (entry.isFile() && (entry.name === 'SCHEMA.md' || entry.name === 'index.md')) files.push(relative(dir, join(current, entry.name)).split(sep).join('/'))
    }
  }
  await walk(dir, 0)
  const roots = await findBundleRoots(files, path => readFile(join(dir, path), 'utf8'))
  return roots.map(root => (root === '' ? resolve(dir) : resolve(dir, root)))
}

/**
 * Collect every markdown file under a bundle root.
 * @param root - the bundle root.
 * @returns bundle-relative paths with forward slashes, sorted, and whether the cap cut the list.
 */
async function markdownFiles(root: string): Promise<{ files: string[], truncated: boolean }> {
  const files: string[] = []
  let truncated = false
  const walk = async (current: string): Promise<void> => {
    const entries = await readdir(current, { withFileTypes: true })
    for (const entry of entries) {
      if (files.length >= PAGE_CAP) {
        truncated = true
        return
      }
      if (entry.isDirectory()) {
        if (!SKIP.has(entry.name) && !entry.name.startsWith('.')) await walk(join(current, entry.name))
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
        files.push(relative(root, join(current, entry.name)).split(sep).join('/'))
      }
    }
  }
  await walk(root)
  return { files: files.sort((a, b) => a.localeCompare(b)), truncated }
}

/**
 * The first `# Heading` of a body, used as the title when frontmatter has none.
 * @param body - markdown.
 * @returns the heading text, or undefined.
 */
function firstHeading(body: string): string | undefined {
  return /^#\s+(.+)$/m.exec(body)?.[1]?.trim()
}

/**
 * Read a whole bundle's catalog.
 * @param entry - the library entry.
 * @returns the summary the preview draws.
 */
export async function summarize(entry: LibraryEntry): Promise<BundleSummary> {
  const { files, truncated } = await markdownFiles(entry.root)
  const pages: PageSummary[] = []
  const types: Record<string, number> = {}
  const states: Record<string, number> = {}
  const untyped: string[] = []
  let okfVersion: string | undefined
  for (const path of files) {
    const name = path.split('/').pop() ?? path
    const reserved = RESERVED.has(name)
    let source = ''
    try {
      source = await readFile(join(entry.root, path), 'utf8')
    } catch { /* listed but unreadable: still shown, without metadata */ }
    const { meta, body } = parsePage(source)
    if (path === 'index.md') okfVersion = text(meta, 'okf_version')
    const type = text(meta, 'type')
    const tags = list(meta, 'tags')
    const status = text(meta, 'status')
    const stage = pageStage({ status, lifecycle: text(meta, 'lifecycle'), tags, path })
    const state = stage ?? status
    if (!reserved) {
      if (type === undefined) untyped.push(path)
      else types[type] = (types[type] ?? 0) + 1
      if (state !== undefined) states[state] = (states[state] ?? 0) + 1
    }
    const description = text(meta, 'description')
    const updated = text(meta, 'updated')
    pages.push({
      path,
      title: text(meta, 'title') ?? firstHeading(body) ?? name.replace(/\.md$/i, ''),
      ...type === undefined ? {} : { type },
      ...description === undefined ? {} : { description },
      ...status === undefined ? {} : { status },
      ...stage === undefined ? {} : { stage },
      ...updated === undefined ? {} : { updated },
      tags,
      reserved,
    })
  }
  return { entry, ...okfVersion === undefined ? {} : { okfVersion }, pages, types, states, untyped, truncated }
}

/**
 * Resolve a bundle-relative page path, refusing anything that leaves the bundle.
 * @param root - the bundle root.
 * @param path - the requested path (`concepts/foo.md` or `/concepts/foo.md`).
 * @returns the absolute file path.
 * @throws {Error} when the path is not a markdown file inside the bundle.
 */
export function resolvePage(root: string, path: string): string {
  const clean = path.replace(/\\/g, '/').replace(/^\/+/, '')
  if (clean === '' || !clean.toLowerCase().endsWith('.md') || clean.split('/').some(part => part === '..' || part === '.git')) {
    throw new Error('Not a markdown page inside the bundle.')
  }
  const base = resolve(root)
  const full = resolve(base, clean)
  if (full !== base && !full.startsWith(base + sep)) throw new Error('Not a markdown page inside the bundle.')
  return full
}

/**
 * Read one page.
 * @param entry - the library entry.
 * @param path - bundle-relative path.
 * @returns the page's frontmatter and body.
 */
export async function readPage(entry: LibraryEntry, path: string): Promise<PageContent> {
  const full = resolvePage(entry.root, path)
  const info = await stat(full)
  if (info.size > PAGE_BYTES_CAP) throw new Error(`The page is larger than ${String(PAGE_BYTES_CAP / 1024 / 1024)} MB.`)
  const { meta, body } = parsePage(await readFile(full, 'utf8'))
  return { path: path.replace(/\\/g, '/').replace(/^\/+/, ''), meta, body }
}

/**
 * Whether a folder is a bundle root.
 * @param dir - the folder.
 * @returns true when it holds a SCHEMA.md or an index.md declaring okf_version.
 */
export async function isBundleRoot(dir: string): Promise<boolean> {
  try {
    if ((await stat(join(dir, 'SCHEMA.md'))).isFile()) return true
  } catch { /* fall through */ }
  try {
    return declaresOkf(await readFile(join(dir, 'index.md'), 'utf8'))
  } catch {
    return false
  }
}
