/**
 * CI check for an agent's team wiki pull request: may it auto-merge?
 *
 * Runs in the wiki repository's workflow (examples/wiki-auto-merge.yml):
 *
 *     node check-pr.js <base-ref> [head-ref=HEAD] [wiki-root]
 *
 * The project a change belongs to comes from the hub's AGENTS.md registry
 * (its Bundle column; `published/Projects/<Project>/` belongs to that project
 * too), on either side of the change. Without a registry, it is the folder
 * directly under `wiki-root` (default: the repository root) that holds a
 * SCHEMA.md, or `wiki-root` itself when it is a bundle. A pull request must
 * touch exactly one project. Changes to `published/` and `AGENTS.md` always
 * need a person.
 *
 * Exit 0: eligible (only unreviewed pages, new captures, index.md/log.md).
 * Exit 1: needs a person; the reasons are printed. Exit 2: usage or git error.
 * When `GITHUB_OUTPUT` is set, writes `wiki=<folder>` there so the workflow
 * lints that project wiki. The verdict is recomputed from git here, never read
 * from the label the agent set. Node built-ins only.
 */
import { execFileSync } from 'node:child_process'
import { appendFileSync } from 'node:fs'
import { judge } from './host/eligibility.ts'
import type { ChangedFile } from './host/eligibility.ts'
import { adoName, publishedProject } from './host/publish.ts'
import { parseRegistry } from './host/registry.ts'
import { describeReview } from './host/review.ts'

const [baseRef, headRef = 'HEAD', rootArg = ''] = process.argv.slice(2)
if (baseRef === undefined) {
  console.error('usage: node check-pr.js <base-ref> [head-ref=HEAD] [wiki-root]')
  process.exit(2)
}
const root = rootArg.replace(/\\/g, '/').replace(/^\.\/|\/$/g, '')

/**
 * Run git.
 * @param args - arguments.
 * @returns stdout.
 */
function git(...args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] })
}

/**
 * A file at a ref, or undefined.
 * @param ref - the commit.
 * @param path - the path.
 * @returns the text.
 */
function show(ref: string, path: string): string | undefined {
  try {
    return git('show', `${ref}:${path}`)
  } catch {
    return undefined
  }
}

/**
 * Whether a file exists at either ref.
 * @param refs - the commits.
 * @param path - the path.
 * @returns true when one has it.
 */
function existsAt(refs: readonly string[], path: string): boolean {
  return refs.some((ref) => {
    try {
      git('cat-file', '-e', `${ref}:${path}`)
      return true
    } catch {
      return false
    }
  })
}

try {
  const mergeBase = git('merge-base', baseRef, headRef).trim()
  const parts = git('diff', '--name-status', '--no-renames', '-z', mergeBase, headRef).split('\0')
  const files: ChangedFile[] = []
  for (let index = 0; index + 1 < parts.length; index += 2) {
    const code = parts[index] ?? ''
    const path = parts[index + 1] ?? ''
    const status = code.startsWith('A') ? 'added' : code.startsWith('D') ? 'deleted' : 'modified'
    const before = status === 'added' ? undefined : show(mergeBase, path)
    const after = status === 'deleted' ? undefined : show(headRef, path)
    files.push({ path, status, ...before === undefined ? {} : { before }, ...after === undefined ? {} : { after } })
  }

  const refs = [mergeBase, headRef]
  const prefix = root === '' ? '' : `${root}/`
  // The hub's AGENTS.md registry names each project's bundle folder (either side of the change).
  const registry = [...parseRegistry(show(mergeBase, 'AGENTS.md') ?? '')?.entries ?? [], ...parseRegistry(show(headRef, 'AGENTS.md') ?? '')?.entries ?? []]
  const added = files.filter(file => file.status === 'added' && file.path.endsWith('/SCHEMA.md')).map(file => file.path.slice(0, -'/SCHEMA.md'.length))
  const rootIsWiki = registry.length === 0 && existsAt(refs, `${prefix}SCHEMA.md`)
  const slug = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  const wikiOf = (path: string): string | undefined => {
    const published = publishedProject(path)
    if (published !== undefined) return registry.find(entry => adoName(entry.project) === published || slug(entry.project) === slug(published))?.bundle
    const folders = [...registry.map(entry => entry.bundle), ...added].sort((a, b) => b.length - a.length)
    const match = folders.find(folder => path.startsWith(`${folder}/`))
    if (match !== undefined || registry.length > 0) return match
    // No registry: a folder directly under the root holding a SCHEMA.md, or the root itself.
    if (!path.startsWith(prefix)) return undefined
    const first = path.slice(prefix.length).split('/')
    if (first.length > 1 && existsAt(refs, `${prefix}${first[0] ?? ''}/SCHEMA.md`)) return `${prefix}${first[0] ?? ''}`
    return rootIsWiki ? root : undefined
  }
  const wikis = [...new Set(files.map(file => wikiOf(file.path)).filter((wiki): wiki is string => wiki !== undefined))]
  const wiki = wikis.length === 1 ? wikis[0] ?? '' : ''
  if (process.env.GITHUB_OUTPUT !== undefined && process.env.GITHUB_OUTPUT !== '') appendFileSync(process.env.GITHUB_OUTPUT, `wiki=${wiki}\n`)

  const verdict = judge(wiki, files)
  if (wikis.length === 0) verdict.reasons.push(`touches no project wiki under ${root || 'the repository root'}`)
  if (wikis.length > 1) verdict.reasons.push(`touches ${String(wikis.length)} project wikis: ${wikis.join(', ')}`)
  console.log(`project wiki: ${wiki || '(none)'}`)
  for (const page of verdict.pages) {
    console.log(`${page.status.padEnd(8)} ${page.path}  [${page.before === undefined ? 'new' : describeReview(page.before)} → ${page.after === undefined ? 'deleted' : describeReview(page.after)}]`)
  }
  if (verdict.reasons.length === 0) {
    console.log('eligible for auto-merge')
    process.exit(0)
  }
  console.log('needs a human review:')
  for (const reason of verdict.reasons) console.log(`- ${reason}`)
  process.exit(1)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(2)
}
