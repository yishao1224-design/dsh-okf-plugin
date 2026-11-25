/**
 * Turn an empty folder into a new knowledge base: an editing workspace that
 * holds one OKF bundle and the toolchain that maintains it.
 *
 * The layout is the one knowledgeAgent uses, so every kb-* skill and
 * `okf.py` command works there unchanged:
 *
 *     <folder>/
 *       AGENTS.md          how an agent works in this knowledge base
 *       .gitignore
 *       scripts/okf.py     the plugin's own copy of the toolchain
 *       okf/               the bundle: SCHEMA.md, index.md, log.md and
 *                          concepts/ entities/ comparisons/ queries/ archive/ sources/
 *
 * `python scripts/okf.py init` writes the bundle when Python is available.
 * Without Python the same skeleton is written here, so the folder is still a
 * valid OKF v0.2 bundle; `okf.py` can run later. The folder becomes a git
 * repository (no commit) when git is available, so it is a workspace the
 * person can commit from. Pages carry only the OKF `status` field: no
 * `lifecycle` key is ever written.
 */
import { copyFile, mkdir, readdir, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { run } from './run.ts'

/** Entries an empty folder may still hold: OS litter and an empty git repository. */
const IGNORABLE = new Set(['.git', '.ds_store', 'thumbs.db', 'desktop.ini'])

/** The bundle folder inside a new knowledge base. */
export const STARTER_BUNDLE = 'okf'

/** The bundle subfolders `okf.py init` makes. */
const BUNDLE_DIRS = ['concepts', 'entities', 'comparisons', 'queries', 'archive', 'sources']

/**
 * Whether a folder is empty enough to become a new knowledge base: nothing in
 * it but OS litter and, at most, a `.git` with no commits checked out.
 * @param folder - an existing folder.
 * @returns true when it holds nothing of the person's.
 */
export async function isEmptyFolder(folder: string): Promise<boolean> {
  const names = await readdir(folder)
  return names.every(name => IGNORABLE.has(name.toLowerCase()))
}

/** What the starter needs. */
export interface StarterOptions {
  /** The Python executable that runs okf.py. */
  readonly python: string
  /** The plugin's own okf.py, copied into the new folder; undefined when this build has none. */
  readonly okfScript?: string
  /** The git executable. */
  readonly git: string
  readonly timeoutMs: number
}

/** What the starter did. */
export interface StarterResult {
  /** The new bundle root. */
  readonly root: string
  /** True when okf.py wrote the bundle; false when the built-in skeleton did. */
  readonly toolchainRan: boolean
  /** True when the folder became a git repository. */
  readonly gitInit: boolean
}

/**
 * Today's date as YYYY-MM-DD.
 * @returns the date.
 */
function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Whether a path is a file.
 * @param path - the path.
 * @returns true for a file.
 */
async function isFile(path: string): Promise<boolean> {
  return stat(path).then(info => info.isFile(), () => false)
}

/**
 * AGENTS.md for a new knowledge base.
 * @param name - its display name.
 * @returns the text.
 */
function agentsText(name: string): string {
  return [
    `# ${name}`,
    '',
    `A knowledge base kept as an OKF v0.2 bundle in \`${STARTER_BUNDLE}/\`.`,
    '',
    '## Before writing',
    '',
    `1. Read \`${STARTER_BUNDLE}/SCHEMA.md\`: page types, tags and the frontmatter template.`,
    `2. Read \`${STARTER_BUNDLE}/index.md\` so you update an existing page instead of writing a duplicate.`,
    `3. Read the newest entries of \`${STARTER_BUNDLE}/log.md\`.`,
    '',
    '## Rules',
    '',
    '- Every page has frontmatter with `type`, `title`, `description`, `status` (`draft | stable | deprecated`) and `updated`.',
    '  A stable page to re-check carries the `needs-review` tag; there is no other state field.',
    `- Never edit files under \`${STARTER_BUNDLE}/sources/\` after they are captured.`,
    '- Links are bundle-relative (`/concepts/foo.md`).',
    '- After editing, run `python scripts/okf.py links`, `index`, `log "<Verb>: message"` and `lint`, and fix what lint reports.',
    '',
  ].join('\n')
}

/**
 * The SCHEMA.md written when okf.py cannot run.
 * @param date - today.
 * @returns the text.
 */
function schemaText(date: string): string {
  return [
    '---', 'type: Schema', 'title: Bundle Schema & Conventions',
    'description: Authoritative conventions for this OKF bundle — types, tags, frontmatter templates, review rules.',
    'status: stable', `updated: ${date}`, '---', '',
    '# Bundle Schema & Conventions', '',
    '*(Starter schema. Run `python scripts/okf.py init` once Python is installed for the full starter, or flesh out the domain, types and tags on first ingestion.)*', '',
    '# Type registry', '',
    '| type | lives in | meaning |', '|------|----------|---------|',
    '| `Concept` | `concepts/` | An idea, definition, method, or explanation |',
    '| `Entity` | `entities/` | A concrete nameable thing (person, org, system, dataset, tool) |',
    '| `Comparison` | `comparisons/` | Structured X-vs-Y |',
    '| `Query` | `queries/` | A filed answer to a real question |',
    '| `Source` | `sources/` | Immutable raw capture |',
    '| `Schema` | root | This file only |', '',
    '# Page frontmatter', '',
    'Every page carries `type`, `title`, `description`, `status` (OKF v0.2: `draft | stable | deprecated`) and `updated`.',
    'A stable page also carries `stale_after`; it needs review once that date passes or when it carries the `needs-review` tag.',
    'Archived pages are `deprecated` pages under `archive/`.', '',
    '# Tag taxonomy', '',
    '- `unverified` — claims not yet checked against a second source',
    '- `contested` — sources actively disagree',
    '- `needs-review` — a stable page to re-check (contradiction found, source changed)', '',
  ].join('\n')
}

/**
 * Lay out a new knowledge base in an empty folder.
 * @param folder - the folder (must exist and be empty, see {@link isEmptyFolder}).
 * @param name - its display name, for AGENTS.md.
 * @param options - toolchain settings.
 * @returns where the bundle is and what ran.
 */
export async function initKnowledgeBase(folder: string, name: string, options: StarterOptions): Promise<StarterResult> {
  const root = join(folder, STARTER_BUNDLE)
  const script = join(folder, 'scripts', 'okf.py')
  let toolchainRan = false
  if (options.okfScript !== undefined && await isFile(options.okfScript)) {
    await mkdir(join(folder, 'scripts'), { recursive: true })
    await copyFile(options.okfScript, script)
    try {
      await run(options.python, [script, 'init', '--bundle', STARTER_BUNDLE], { cwd: folder, timeoutMs: options.timeoutMs })
      toolchainRan = true
    } catch (error) {
      // init ends with a lint run; a non-zero lint still leaves the skeleton written.
      toolchainRan = await isFile(join(root, 'SCHEMA.md')) && await isFile(join(root, 'index.md'))
      if (!toolchainRan) console.warn('[okf] okf.py init failed; writing the starter bundle without it:', error)
    }
  }
  if (!toolchainRan) {
    const date = today()
    for (const dir of BUNDLE_DIRS) await mkdir(join(root, dir), { recursive: true })
    if (!(await isFile(join(root, 'SCHEMA.md')))) await writeFile(join(root, 'SCHEMA.md'), schemaText(date))
    if (!(await isFile(join(root, 'log.md')))) await writeFile(join(root, 'log.md'), `# Bundle Update Log\n\n## ${date}\n* **Initialization**: Bundle skeleton created by the OKF plugin.\n`)
    if (!(await isFile(join(root, 'index.md')))) await writeFile(join(root, 'index.md'), `---\nokf_version: "0.2"\n---\n\n# Bundle Index\n\n* [Bundle Schema & Conventions](SCHEMA.md) - Authoritative conventions for this OKF bundle.\n`)
  }
  if (!(await isFile(join(folder, 'AGENTS.md')))) await writeFile(join(folder, 'AGENTS.md'), agentsText(name))
  if (!(await isFile(join(folder, '.gitignore')))) await writeFile(join(folder, '.gitignore'), '__pycache__/\n*.pyc\n.DS_Store\nThumbs.db\n')
  let gitInit = await stat(join(folder, '.git')).then(() => true, () => false)
  if (!gitInit) {
    gitInit = await run(options.git, ['init', '--quiet'], { cwd: folder, timeoutMs: options.timeoutMs }).then(() => true, (error: unknown) => {
      console.warn('[okf] git init failed; the new knowledge base is not a repository:', error)
      return false
    })
  }
  return { root, toolchainRan, gitInit }
}
