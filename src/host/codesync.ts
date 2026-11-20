/**
 * Sync from code: which code commit a project wiki reflects, which of its
 * pages cite files that changed since, and the task a session gets to bring
 * those pages up to date.
 *
 * The commit lives in the project's SCHEMA.md frontmatter as `code_commit`
 * (with `code_synced`, the date), both OKF extension keys. Wikis written
 * before that key existed fall back to the commit their pages' `sources`
 * cite most often (`…/blob/<sha>/…`).
 */

import { splitPage } from './review.ts'

/** A changed file between two commits, from `git diff --name-status`. */
export interface CodeChange {
  /** A added, M modified, D deleted, R renamed (path is the new one, from the old one). */
  readonly status: string
  readonly path: string
  readonly from?: string
}

/** A page whose `sources` cite changed files. */
export interface AffectedPage {
  readonly path: string
  readonly cites: readonly string[]
}

/**
 * The `code_commit` a SCHEMA.md records.
 * @param schema - the SCHEMA.md text.
 * @returns the commit, or undefined.
 */
export function schemaCommit(schema: string): string | undefined {
  const page = splitPage(schema)
  if (page === undefined) return undefined
  for (const line of page.block) {
    const match = /^code_commit:\s*["']?([0-9a-f]{7,40})["']?\s*(#.*)?$/.exec(line)
    if (match !== null) return match[1]
  }
  return undefined
}

/**
 * The commit pages cite most often in `…/blob/<sha>/…` source links.
 * @param frontmatters - the pages' frontmatter text.
 * @returns the commit, or undefined when none cites one.
 */
export function citedCommit(frontmatters: readonly string[]): string | undefined {
  const counts = new Map<string, number>()
  for (const text of frontmatters) {
    for (const match of text.matchAll(/\/blob\/([0-9a-f]{7,40})\//g)) {
      const sha = match[1] ?? ''
      counts.set(sha, (counts.get(sha) ?? 0) + 1)
    }
  }
  let best: string | undefined
  let most = 0
  for (const [sha, count] of counts) {
    if (count > most) {
      best = sha
      most = count
    }
  }
  return best
}

/**
 * The frontmatter of a page, as text.
 * @param source - the page.
 * @returns the frontmatter lines joined, or '' without frontmatter.
 */
export function frontmatterOf(source: string): string {
  return splitPage(source)?.block.join('\n') ?? ''
}

/**
 * Set `code_commit` and `code_synced` in a SCHEMA.md.
 * @param schema - the SCHEMA.md text.
 * @param commit - the code commit the wiki now reflects.
 * @param date - today, `YYYY-MM-DD`.
 * @returns the new text (unchanged when it has no frontmatter).
 */
export function setSchemaCommit(schema: string, commit: string, date: string): string {
  const page = splitPage(schema)
  if (page === undefined) return schema
  const block = page.block.filter(line => !/^code_(commit|synced):/.test(line))
  block.push(`code_commit: ${commit}`, `code_synced: ${date}`)
  return ['---', ...block, '---', ''].join(page.eol) + page.body
}

/**
 * Same commit, when either may be abbreviated.
 * @param a - one commit.
 * @param b - the other.
 * @returns whether they name the same commit.
 */
export function sameCommit(a: string, b: string): boolean {
  return a.length >= 7 && b.length >= 7 && (a.startsWith(b) || b.startsWith(a))
}

/**
 * Read `git diff --name-status -z` output.
 * @param raw - the output.
 * @returns the changes.
 */
export function parseNameStatus(raw: string): CodeChange[] {
  const parts = raw.split('\0').filter(part => part !== '')
  const out: CodeChange[] = []
  for (let index = 0; index < parts.length;) {
    const status = parts[index] ?? ''
    if (/^[RC]/.test(status)) {
      out.push({ status: status[0] ?? 'R', from: parts[index + 1] ?? '', path: parts[index + 2] ?? '' })
      index += 3
    } else {
      out.push({ status: status[0] ?? 'M', path: parts[index + 1] ?? '' })
      index += 2
    }
  }
  return out
}

/**
 * The pages whose frontmatter cites a changed file (by its repository path).
 * @param pages - bundle-relative path and frontmatter text of each page.
 * @param changes - the changed files.
 * @returns the affected pages, with what each cites.
 */
export function affectedPages(pages: readonly { path: string, frontmatter: string }[], changes: readonly CodeChange[]): AffectedPage[] {
  const paths = [...new Set(changes.flatMap(change => change.from === undefined ? [change.path] : [change.path, change.from]))]
  const out: AffectedPage[] = []
  for (const page of pages) {
    const cites = paths.filter((path) => {
      const at = page.frontmatter.indexOf(path)
      if (at < 0) return false
      // A whole path: not the tail of a longer name, nor the head of one.
      const before = page.frontmatter[at - 1] ?? ' '
      const after = page.frontmatter[at + path.length] ?? ' '
      return /[\s/'"(:,[]/.test(before) && /[\s'"),#\]]|$/.test(after)
    })
    if (cites.length > 0) out.push({ path: page.path, cites })
  }
  return out
}

/** What {@link syncPrompt} needs. */
export interface SyncTask {
  readonly wikiName: string
  readonly folder: string
  readonly url: string
  /** The code checkout, workspace-relative, e.g. `.code/payments`. */
  readonly code: string
  readonly from: string
  readonly to: string
  readonly commits: readonly string[]
  readonly changes: readonly CodeChange[]
  readonly affected: readonly AffectedPage[]
  /** `<web>/blob/<to>/<path>` or similar, for re-pinned sources. */
  readonly resource: string
  readonly agent: string
  readonly date: string
}

const LIST_CAP = 150

/**
 * The task a session gets to update a project wiki for code changes.
 * @param task - the changes and where things are.
 * @returns the prompt.
 */
export function syncPrompt(task: SyncTask): string {
  const short = (sha: string): string => sha.slice(0, 10)
  const list = <T>(items: readonly T[], line: (item: T) => string): string[] => [
    ...items.slice(0, LIST_CAP).map(line),
    ...items.length > LIST_CAP ? [`- … and ${String(items.length - LIST_CAP)} more`] : [],
  ]
  const label: Record<string, string> = { A: 'added', M: 'modified', D: 'deleted', R: 'renamed', C: 'copied', T: 'type changed' }
  return [
    `Update the ${task.wikiName} project wiki (the OKF bundle \`${task.folder}/\`) for the code changes in ${task.url} from ${short(task.from)} to ${short(task.to)}.`,
    '',
    `The code is checked out read-only at \`${task.code}/\`, at ${short(task.to)}. See a change with \`git -C ${task.code} diff ${short(task.from)} ${short(task.to)} -- <path>\`, and the history with \`git -C ${task.code} log ${short(task.from)}..${short(task.to)}\`.`,
    '',
    `Commits (${String(task.commits.length)}):`,
    ...list(task.commits, commit => `- ${commit}`),
    '',
    `Changed files (${String(task.changes.length)}):`,
    ...list(task.changes, change => `- ${label[change.status] ?? change.status}: ${change.path}${change.from === undefined ? '' : ` (from ${change.from})`}`),
    '',
    task.affected.length === 0
      ? 'No page cites these files in its `sources`, so find the pages they affect by reading the wiki (start from index.md).'
      : `Pages that cite changed files (start here, but other pages may be affected too):`,
    ...list(task.affected, page => `- ${page.path}: ${page.cites.join(', ')}`),
    '',
    'Then:',
    `- Update every page whose content no longer matches the code. Write as an unreviewed draft (status: draft, lifecycle: draft, generated: { by: ${task.agent}, at: ${task.date} }); never write \`verified\`.`,
    `- Re-point the \`sources\` you re-read at the new commit (resource: ${task.resource}).`,
    '- Add a page for a new module or concept no page covers. For something removed, mark its page deprecated with a `## Deprecation` section; do not delete it.',
    '- Skip changes that do not change what the wiki says (tests, formatting, refactors with the same behaviour).',
    `- Capture a changed key file under \`${task.folder}/sources/\` as a new dated file only if a page needs it; never edit an existing capture.`,
    `- Add a log entry, run \`python scripts/okf.py links --bundle ${task.folder}\`, \`index\` and \`lint\`, and fix what lint reports.`,
    `- SCHEMA.md already records \`code_commit: ${task.to}\`; leave it.`,
    '',
    'Never edit anything under `.code/`. When you are done, give me a short summary of what you changed and what you were unsure about; I will press Open pull request.',
  ].join('\n')
}
