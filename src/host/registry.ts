/**
 * The project registry of a team wiki hub: a Markdown table in the hub's
 * `AGENTS.md`, one row per project.
 *
 *     ## Project registry
 *
 *     | Project | Repo | Summary | Owner | Bundle |
 *     |---|---|---|---|---|
 *     | Payments | https://dev.azure.com/acme/pay/_git/payments | Card and wallet payments | @alice | `payments/` |
 *
 * Columns are found by header name, case-insensitively and in any order:
 * `Project` (or Name), `Repo` (Repository, Code), `Summary` (Description),
 * `Owner` (Owners), `Bundle` (Bundle dir, Directory, Folder, Path). Only
 * `Project` and `Bundle` are required. Cells may use backticks and
 * `[text](url)` links. The first table with both required columns wins.
 *
 * Pure text in, data out: the Host, the CI checker and the tests share it.
 */

/** One registered project. */
export interface RegistryEntry {
  readonly project: string
  /** Repository-relative bundle folder, `/` separators, no trailing slash. */
  readonly bundle: string
  readonly repo?: string
  readonly summary?: string
  readonly owner?: string
}

/** The registry table's location in the file, for appending. */
export interface Registry {
  readonly entries: RegistryEntry[]
  /** Index of the line after the table's last row. */
  readonly endLine: number
}

const COLUMNS: Readonly<Record<keyof RegistryEntry, RegExp>> = {
  project: /^(project|name|project name)$/,
  bundle: /^(bundle|bundle dir|bundle directory|bundle folder|directory|folder|path|wiki)$/,
  repo: /^(repo|repository|repo url|code|code repo)$/,
  summary: /^(summary|description|about)$/,
  owner: /^(owner|owners|maintainer|contact)$/,
}

/**
 * Split a table row into cells.
 * @param line - `| a | b |`.
 * @returns the trimmed cells.
 */
function cells(line: string): string[] {
  const body = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  return body.split(/(?<!\\)\|/).map(cell => cell.trim().replace(/\\\|/g, '|'))
}

/**
 * A cell as plain text: backticks dropped, a link reduced to its target or text.
 * @param cell - the cell.
 * @param preferUrl - take a link's URL rather than its text.
 * @returns the text.
 */
function plain(cell: string, preferUrl = false): string {
  const link = /\[([^\]]*)\]\(([^)\s]+)\)/.exec(cell)
  const value = link === null ? cell : preferUrl ? link[2] ?? '' : cell.replace(link[0], link[1] ?? '')
  return value.replace(/`/g, '').replace(/<([^>]+)>/g, '$1').trim()
}

/**
 * Normalize a bundle folder.
 * @param value - as written.
 * @returns `a/b`, or '' when it names the repository root or is unsafe.
 */
export function cleanBundle(value: string): string {
  const path = value.replace(/\\/g, '/').replace(/^\.?\//, '').replace(/\/+$/, '').trim()
  if (path === '.' || path.split('/').some(part => part === '..' || part === '')) return ''
  return path
}

/**
 * Parse the registry out of AGENTS.md.
 * @param source - the file.
 * @returns the registry, or undefined when the file has no registry table.
 */
export function parseRegistry(source: string): Registry | undefined {
  const lines = source.split(/\r?\n/)
  for (let index = 0; index + 1 < lines.length; index += 1) {
    const header = lines[index] ?? ''
    const rule = lines[index + 1] ?? ''
    if (!header.trim().startsWith('|') || !/^\s*\|?\s*:?-{3,}/.test(rule)) continue
    const names = cells(header).map(name => plain(name).toLowerCase())
    const column = (key: keyof RegistryEntry): number => names.findIndex(name => COLUMNS[key].test(name))
    const at = { project: column('project'), bundle: column('bundle'), repo: column('repo'), summary: column('summary'), owner: column('owner') }
    if (at.project < 0 || at.bundle < 0) continue
    const entries: RegistryEntry[] = []
    let line = index + 2
    for (; line < lines.length && (lines[line] ?? '').trim().startsWith('|'); line += 1) {
      const row = cells(lines[line] ?? '')
      const project = plain(row[at.project] ?? '')
      const bundle = cleanBundle(plain(row[at.bundle] ?? ''))
      if (project === '' || bundle === '') continue
      const optional = (key: 'repo' | 'summary' | 'owner'): string | undefined => {
        const value = at[key] < 0 ? '' : plain(row[at[key]] ?? '', key === 'repo')
        return value === '' || value === '-' || value === '—' ? undefined : value
      }
      const repo = optional('repo')
      const summary = optional('summary')
      const owner = optional('owner')
      entries.push({ project, bundle, ...repo === undefined ? {} : { repo }, ...summary === undefined ? {} : { summary }, ...owner === undefined ? {} : { owner } })
    }
    return { entries, endLine: line }
  }
  return undefined
}

/**
 * Escape a value for a table cell.
 * @param value - the text.
 * @returns the cell text.
 */
function cell(value: string | undefined): string {
  return value === undefined || value.trim() === '' ? '—' : value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim()
}

/**
 * Add a project to AGENTS.md: a row at the end of the registry table, or a new
 * `## Project registry` section when the file has none.
 * @param source - the file ('' when it does not exist).
 * @param entry - the project.
 * @returns the new file.
 */
export function addRegistryRow(source: string, entry: RegistryEntry): string {
  const row = `| ${cell(entry.project)} | ${cell(entry.repo)} | ${cell(entry.summary)} | ${cell(entry.owner)} | \`${entry.bundle}/\` |`
  const registry = parseRegistry(source)
  const eol = source.includes('\r\n') ? '\r\n' : '\n'
  if (registry === undefined) {
    const section = [
      '## Project registry',
      '',
      'One row per project. Agents read this table to find a project\'s OKF bundle in this repository.',
      '',
      '| Project | Repo | Summary | Owner | Bundle |',
      '|---|---|---|---|---|',
      row,
      '',
    ].join(eol)
    return source.trim() === '' ? `# Agent instructions${eol}${eol}${section}` : `${source.replace(/\s*$/, '')}${eol}${eol}${section}`
  }
  const lines = source.split(/\r?\n/)
  // A registry with a different column order gets the cells in its own order.
  const header = cells(lines[registry.endLine - registry.entries.length - 2] ?? '')
  const names = header.map(name => plain(name).toLowerCase())
  const ordered = names.some(name => !/^(project|repo|summary|owner|bundle)$/.test(name))
    ? `| ${names.map((name) => {
      if (COLUMNS.project.test(name)) return cell(entry.project)
      if (COLUMNS.bundle.test(name)) return `\`${entry.bundle}/\``
      if (COLUMNS.repo.test(name)) return cell(entry.repo)
      if (COLUMNS.summary.test(name)) return cell(entry.summary)
      if (COLUMNS.owner.test(name)) return cell(entry.owner)
      return '—'
    }).join(' | ')} |`
    : `| ${names.map(name => ({ project: cell(entry.project), repo: cell(entry.repo), summary: cell(entry.summary), owner: cell(entry.owner), bundle: `\`${entry.bundle}/\`` })[name] ?? '—').join(' | ')} |`
  lines.splice(registry.endLine, 0, names.length > 0 ? ordered : row)
  return lines.join(eol)
}
