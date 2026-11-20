/**
 * A suggested title and summary for a wiki pull request, from what changed.
 * Pure: the Host's changes() and openPr() and the tests share it.
 */

/** One changed file of the project wiki, bundle-relative. */
export interface SummaryFile {
  readonly path: string
  readonly status: 'added' | 'modified' | 'deleted'
  readonly title?: string
  readonly description?: string
}

/** What the dialog prefills. */
export interface PrSuggestion {
  readonly title: string
  readonly summary: string
}

const LIST_MAX = 25

/** `n thing(s)`. */
function count(n: number, one: string, many = `${one}s`): string {
  return `${String(n)} ${n === 1 ? one : many}`
}

/**
 * Suggest a pull request title and summary.
 * @param wiki - the project name.
 * @param files - changed files of its bundle (bundle-relative paths).
 * @param options - isNew: the pull request sets the project up; published: published pages it changes.
 * @returns the suggestion.
 */
export function suggestPr(wiki: string, files: readonly SummaryFile[], options: { readonly isNew?: boolean, readonly published?: number } = {}): PrSuggestion {
  const isPage = (file: SummaryFile): boolean => file.path.endsWith('.md') && !['index.md', 'log.md', 'SCHEMA.md'].includes(file.path) && !file.path.startsWith('sources/') && !file.path.startsWith('archive/')
  const pages = files.filter(isPage)
  const added = pages.filter(file => file.status === 'added')
  const modified = pages.filter(file => file.status === 'modified')
  const deleted = pages.filter(file => file.status === 'deleted')
  const captures = files.filter(file => file.path.startsWith('sources/') && file.status === 'added')
  const schema = files.some(file => file.path === 'SCHEMA.md')
  const published = options.published ?? 0

  const parts = [
    added.length > 0 ? `adds ${count(added.length, 'page')}` : '',
    modified.length > 0 ? `updates ${count(modified.length, 'page')}` : '',
    deleted.length > 0 ? `removes ${count(deleted.length, 'page')}` : '',
    captures.length > 0 ? `captures ${count(captures.length, 'source')}` : '',
    published > 0 ? `republishes ${count(published, 'wiki page')}` : '',
  ].filter(Boolean)
  const lead = parts.length === 0
    ? `Bookkeeping changes to the ${wiki} wiki.`
    : `${options.isNew === true ? `Sets up the ${wiki} project wiki and ` : `In the ${wiki} wiki, `}${parts.length === 1 ? parts[0] ?? '' : `${parts.slice(0, -1).join(', ')} and ${parts.at(-1) ?? ''}`}.`

  const name = (file: SummaryFile): string => file.title ?? file.path
  const line = (file: SummaryFile): string => `- ${name(file)}${file.description === undefined ? '' : ` — ${file.description}`} (\`${file.path}\`)`
  const section = (heading: string, list: readonly SummaryFile[], render = line): string[] => {
    if (list.length === 0) return []
    const shown = list.slice(0, LIST_MAX).map(render)
    return ['', `**${heading}**`, ...shown, ...list.length > LIST_MAX ? [`- …and ${String(list.length - LIST_MAX)} more`] : []]
  }
  const summary = [
    lead[0]?.toUpperCase() === lead[0] ? lead : `${lead.charAt(0).toUpperCase()}${lead.slice(1)}`,
    ...section('New pages', added),
    ...section('Updated pages', modified),
    ...section('Removed pages', deleted, file => `- ${name(file)} (\`${file.path}\`)`),
    ...section('New source captures', captures, file => `- ${file.title === undefined ? `\`${file.path}\`` : `${file.title} (\`${file.path}\`)`}`),
    ...schema ? ['', `${options.isNew === true ? 'Adds' : 'Changes'} \`SCHEMA.md\`, the bundle conventions.`] : [],
  ].join('\n')

  let title: string
  if (options.isNew === true) title = `Add the ${wiki} project wiki`
  else if (pages.length === 1 && captures.length === 0) title = `${added.length === 1 ? 'Add' : deleted.length === 1 ? 'Remove' : 'Update'} ${name(pages[0] as SummaryFile)}`
  else if (parts.length === 0) title = `Tidy the ${wiki} wiki`
  else if (pages.length === 0 && captures.length === 0 && published > 0) title = `Publish ${wiki} to the wiki`
  else title = `${wiki}: ${parts.join(', ')}`
  return { title: title.slice(0, 120), summary }
}
