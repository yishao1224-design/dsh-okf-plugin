/**
 * What the model sees: the per-session prompt context.
 *
 * The plugin registers no tools of its own. The context names the bundle's
 * folder and carries its catalog; the model decides which pages to open and
 * reads, greps and globs them with the Harness's own file tools.
 *
 * The bundle a session uses is plugin state (library.json, keyed by session
 * id), not session-log state, so choosing or switching a bundle never writes an
 * event an older DSH build would refuse. The model learns of it through a
 * system-prompt *context*: DSH sends a context's current value after the
 * retained history on every turn, so switching bundles does not rewrite the
 * cached system-prompt prefix, and the agent loop logs the context whenever it
 * changes (model-visible ⟺ logged).
 *
 * The context text callback is synchronous, so it reads the library's
 * in-memory snapshot and a cache of each bundle's `index.md` that re-reads the
 * file when its modification time moves.
 */
import { readFileSync, statSync } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import { publishedDir } from './publish.ts'
import { contains } from './library.ts'
import type { Library } from './library.ts'
import type { Agent, AssembleContext, PromptContext } from '../types/contract.ts'
import type { LibraryEntry } from '../types/okf.ts'

/** Knobs from the plugin row. */
export interface KnowledgeOptions {
  /** How much of the bundle's index.md rides along each turn. 0 sends none. */
  readonly indexChars: number
  /** `generated.by` a Team Wiki maintenance session writes. Default `dsh/agent`. */
  readonly agentActor?: string
}

/** Prompt-context order. In-tree contexts sit at 110-120; this follows them. */
export const CONTEXT_ORDER = 130

/**
 * Find the bundle for an agent: its own selection, else its parent session's
 * (a subagent inherits the bundle of the session that spawned it).
 * @param library - the library.
 * @param agent - the running agent, if any.
 * @returns the entry, or undefined.
 */
export function bundleFor(library: Library, agent: Agent | undefined): LibraryEntry | undefined {
  if (agent === undefined) return undefined
  const { entries, sessions } = library.snapshot()
  const header = agent.session?.header
  for (const id of [agent.id, header?.parentSession]) {
    if (id === undefined) continue
    const selection = sessions[id]
    if (selection === undefined) continue
    const entry = entries.find(candidate => candidate.id === selection.bundleId)
    if (entry !== undefined) return entry
  }
  return undefined
}

/** One cached index.md: its text and the modification time it was read at. */
interface CachedIndex {
  readonly path: string
  readonly mtimeMs: number
  readonly text: string
}

/**
 * Keeps each bundle's index.md in memory for the synchronous context, and
 * re-reads it when the file changes. An editable bundle's index.md changes
 * under the agent's own hands, so a catalog cached at library-change time
 * would go stale by the next turn.
 */
export class IndexCache {
  private readonly texts = new Map<string, CachedIndex>()
  private readonly library: Library

  /** @param library - the library whose bundles to cache. */
  constructor(library: Library) {
    this.library = library
  }

  /**
   * Read every bundle's index.md ahead of time, so a newly selected bundle has
   * its catalog ready on the very next turn.
   * @returns when done.
   */
  async refresh(): Promise<void> {
    const { entries } = this.library.snapshot()
    const next = new Map<string, CachedIndex>()
    for (const entry of entries) {
      const path = join(entry.root, 'index.md')
      try {
        const [info, text] = await Promise.all([stat(path), readFile(path, 'utf8')])
        next.set(entry.id, { path, mtimeMs: info.mtimeMs, text })
      } catch {
        next.set(entry.id, { path, mtimeMs: -1, text: '' })
      }
    }
    this.texts.clear()
    for (const [id, cached] of next) this.texts.set(id, cached)
  }

  /**
   * The current index.md of a bundle. One stat per call; the file is read again
   * only when its modification time moved. Synchronous because the context
   * callback is.
   * @param entry - the bundle.
   * @returns the text, `''` when there is none.
   */
  get(entry: LibraryEntry): string {
    const path = join(entry.root, 'index.md')
    const cached = this.texts.get(entry.id)
    let mtimeMs = -1
    try {
      mtimeMs = statSync(path).mtimeMs
    } catch { /* missing: answer empty below */ }
    if (cached !== undefined && cached.path === path && cached.mtimeMs === mtimeMs) return cached.text
    let text = ''
    if (mtimeMs >= 0) {
      try {
        text = readFileSync(path, 'utf8')
      } catch { /* unreadable: empty */ }
    }
    this.texts.set(entry.id, { path, mtimeMs, text })
    return text
  }
}

/**
 * Drop the frontmatter of an index.md for the prompt.
 * @param source - the file.
 * @returns the body.
 */
function stripFrontmatter(source: string): string {
  return source.replace(/^﻿?---\r?\n[\s\S]*?\r?\n---[ \t]*\r?\n/, '').trim()
}

/** The rules for editing a bundle from its own workspace. */
const EDIT_RULES = [
  "- You may edit this bundle: it is a git working copy inside this session's workspace. Keep it a valid OKF bundle:",
  '  - Read SCHEMA.md, when present, before your first edit, and follow its conventions.',
  '  - Every page keeps its YAML frontmatter with at least type, title and description.',
  '  - A new page gets a line in index.md under the right section. When you rename or remove a page, update index.md and the links that point at it.',
  '  - Add one dated line per change to log.md, following its existing format.',
  '  - Add the needs-review tag to a stable page you create or substantially change, unless the user says otherwise. Pages carry the OKF status field only (draft | stable | deprecated); never add a lifecycle key.',
  '  - Do not commit or push unless the user asks. Leave the changes for the user to review with git diff.',
]

/**
 * Rules for a Team Wiki maintenance workspace. The review rule is the team's:
 * a page is reviewed only when a person stamped it, and any agent edit makes
 * it an unreviewed draft again.
 * @param actor - the `generated.by` value to write.
 * @returns the lines.
 */
function teamEditRules(actor: string, team: NonNullable<LibraryEntry['team']>): string[] {
  const date = new Date().toISOString().slice(0, 10)
  const published = `${publishedDir(team.project ?? team.wiki)}/`
  return [
    "- You may edit this project wiki: it is a team wiki maintenance workspace (its own git clone on a wiki branch) inside this session's workspace. Edit only files under the bundle root. Keep it a valid OKF bundle:",
    '  - Read SCHEMA.md before your first edit, and follow its conventions (types, tags, frontmatter templates).',
    '  - Every page keeps its YAML frontmatter with at least type, title, description, status and updated. There is no lifecycle key; remove one you find on a page you edit.',
    `  - Every page you create or change is an unreviewed draft: set status: draft, updated: ${date}, and generated: { by: ${actor}, at: ${date} } (keep created; add created: ${date} on a new page).`,
    '  - Never add or edit a verified entry, never set status: stable, and never write human:… anywhere. Only a person may mark a page reviewed.',
    '  - Never edit files under sources/ that already exist; add a new dated capture instead. Do not change SCHEMA.md unless the user asks.',
    '  - A new page gets a line in index.md under the right section. When you rename or remove a page, update index.md and the links that point at it. Links are bundle-relative (/concepts/foo.md).',
    `  - The hub's AGENTS.md is the project registry; do not edit it. Pages for people live in ${published} at the repository root; they are generated by the Publish button on the Team Wiki page, so never edit them by hand, and edit nothing else outside the bundle. Published pages are synced to the team's Azure DevOps wiki after merge, so a change there always waits for a person.`,
    '  - `.code/` at the repository root, when present, is a read-only checkout of the project\'s code for you to read. Never edit it; cite files from it in `sources` instead of copying them.',
    '  - Do not run git commit or git push. When the user is happy with the changes, tell them to press Open pull request in the session header: it runs okf.py links, index, lint and log, commits, pushes and opens the pull request. A change that only touches unreviewed pages may merge on its own; editing a reviewed page needs a person.',
  ]
}

/**
 * Whether the session may edit the bundle: it is editable, and the session's
 * workspace holds its root (DSH confines writes to the session workspace).
 * @param entry - the bundle.
 * @param cwd - the session's workspace, if known.
 * @returns true when edits from this session can land.
 */
export function editableHere(entry: LibraryEntry, cwd: string | undefined): boolean {
  return entry.workspace !== undefined && cwd !== undefined && contains(cwd, entry.root)
}

/**
 * How a reply links a bundle file: the bundle root's path from the session's
 * workspace, with a trailing slash ('' when the workspace is the bundle
 * root), or the absolute root when the workspace does not hold it.
 * @param root - the bundle root.
 * @param cwd - the session's workspace, if known.
 * @returns the prefix to put before a bundle-relative path.
 */
export function replyPrefix(root: string, cwd: string | undefined): string {
  if (cwd === undefined || !contains(cwd, root)) return `${root.split(sep).join('/').replace(/\/$/, '')}/`
  const rel = relative(cwd, root).split(sep).join('/')
  return rel === '' ? '' : `${rel}/`
}

/**
 * The context text for one entry.
 * @param entry - the selected bundle.
 * @param index - its index.md text.
 * @param options - size knobs.
 * @param cwd - the session's workspace, which decides whether it may edit.
 * @returns the text.
 */
export function contextText(entry: LibraryEntry, index: string | undefined, options: KnowledgeOptions, cwd?: string): string {
  const editable = editableHere(entry, cwd)
  const origin = entry.origin.kind === 'git'
    ? entry.workspace === undefined
      ? `a local mirror of ${entry.origin.url}${entry.origin.path === '' ? '' : ` (folder ${entry.origin.path})`}${entry.origin.commit === undefined ? '' : ` at commit ${entry.origin.commit.slice(0, 12)}`}; edits to it are overwritten by the next update`
      : `a git clone of ${entry.origin.url}${entry.origin.path === '' ? '' : ` (folder ${entry.origin.path})`}, being edited; its workspace is ${entry.workspace}`
    : entry.team !== undefined
      ? `the project wiki ${entry.team.wiki} in a team wiki maintenance workspace${editable ? " (this session's workspace)" : `, ${entry.workspace ?? ''}`}`
      : editable ? "a git working copy in this session's workspace" : 'a folder on this machine'
  const editing = editable
    ? entry.team !== undefined ? teamEditRules(options.agentActor ?? 'dsh/agent', entry.team) : EDIT_RULES
    : entry.workspace === undefined
      ? ['- Do not edit files in the bundle.']
      : [`- Do not edit the bundle from this session. It is edited from its own workspace, ${entry.workspace}; if the user wants changes, tell them to open that workspace (OKF dialog → Open editing workspace).`]
  const where = replyPrefix(entry.root, cwd)
  const lines = [
    `<okf_bundle id="${entry.id}" name="${entry.name.replace(/"/g, "'")}">`,
    `The user attached an OKF (Open Knowledge Format) knowledge bundle to this session. Treat it as curated knowledge for this work: consult it before answering anything it may cover, and cite the pages you use (for example ${where}concepts/foo.md).`,
    `Bundle root: ${entry.root} (${origin}).`,
    '- Every page is markdown with YAML frontmatter: type, title, description, and usually status (draft | stable | deprecated). index.md is the catalog; SCHEMA.md, when present, defines the conventions; log.md is the change history.',
    '- Use it like a wiki: start from the catalog, decide which pages bear on the question, and read them with your file tools (paths are under the bundle root). Follow the links between pages as far as the question needs. To find exact terms, grep or glob under the bundle root with patterns you choose.',
    ...editing,
    '- When you rely on a page tagged needs-review, past its stale_after date, or with status deprecated, say so in your answer.',
    '- Inside bundle pages, links starting with / are relative to the bundle root.',
    `- In your replies to the user, link a bundle file by ${where === '' ? 'its path from the bundle root' : `its path from the session's workspace, ${where}<path> (e.g. [SCHEMA.md](${where}SCHEMA.md))`}, never with a leading /: the chat resolves links against the workspace${where === '' ? '' : ', not the bundle root'}, so /SCHEMA.md would not be found.`,
  ]
  const body = index === undefined ? '' : stripFrontmatter(index)
  if (options.indexChars > 0 && body !== '') {
    const cut = body.length > options.indexChars
    lines.push('', 'Catalog (index.md):', cut ? `${body.slice(0, options.indexChars)}\n… (truncated; read index.md under the bundle root for the rest)` : body)
  }
  lines.push('</okf_bundle>')
  return lines.join('\n')
}

/**
 * The prompt context.
 * @param library - the library.
 * @param cache - the index cache.
 * @param options - size knobs.
 * @returns the context to register.
 */
export function sessionContext(library: Library, cache: IndexCache, options: KnowledgeOptions): PromptContext {
  return {
    name: 'okf:session-bundle',
    order: CONTEXT_ORDER,
    text: (context: AssembleContext) => {
      const entry = bundleFor(library, context.agent)
      return entry === undefined ? '' : contextText(entry, cache.get(entry), options, context.agent?.session?.header?.cwd)
    },
  }
}
