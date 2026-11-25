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
 *
 * When DSH can see a setup skill (`kb-setup` from knowledgeAgent, by default),
 * in one of its user skill folders or as one this plugin ships (see
 * `skills.ts`), the plugin hands setup to that skill
 * instead: it only makes the folder a git repository with an empty `okf/`, and
 * answers the `/kb-setup` prompt the new session's composer is prefilled with.
 * The person presses send and the agent sets the bundle up in front of them.
 */
import { copyFile, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
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

/**
 * Find a user-invocable skill the way DSH's filesystem skill provider does:
 * `<root>/<name>/SKILL.md` or `<root>/<name>.md`, first root wins. A skill
 * that sets `user-invocable: false` cannot be typed as `/name`, so it is skipped.
 * @param name - the skill name.
 * @param roots - skill folders, highest priority first.
 * @returns the skill's instruction file, or undefined.
 */
export async function findSkill(name: string, roots: readonly string[]): Promise<string | undefined> {
  for (const root of roots) {
    for (const file of [join(root, name, 'SKILL.md'), join(root, `${name}.md`)]) {
      let text: string
      try {
        text = await readFile(file, 'utf8')
      } catch {
        continue
      }
      const front = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1]
      if (front === undefined) continue
      const named = /^name:\s*["']?([^"'\r\n]+?)["']?\s*$/m.exec(front)?.[1]
      if (named !== name) continue
      if (/^user-invocable:\s*["']?(false|no|off|0)["']?\s*$/im.test(front)) continue
      return file
    }
  }
  return undefined
}

/**
 * The composer text that runs the setup skill in the new workspace.
 * @param skill - the skill name.
 * @returns the prompt.
 */
export function setupPrompt(skill: string): string {
  return `/${skill} Set up the new knowledge base in this folder. Use the default bundle folder ${STARTER_BUNDLE}/ (it exists and is empty); do not ask for another name.`
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
  /** A setup skill to hand the work to when it exists, e.g. `kb-setup`; undefined or '' never does. */
  readonly setupSkill?: string
  /** Where DSH looks for skills, highest priority first. */
  readonly skillRoots?: readonly string[]
  /** The instruction file of a skill this plugin itself serves to DSH, when it does. */
  readonly bundledSkill?: (name: string) => Promise<string | undefined>
}

/** What the starter did. */
export interface StarterResult {
  /** The new bundle root. */
  readonly root: string
  /**
   * Who sets the bundle up: `skill` (left to the setup skill, whose prompt
   * is in `prompt`), `toolchain` (okf.py init ran), or `skeleton` (the
   * plugin's built-in files, when Python could not run okf.py).
   */
  readonly setup: 'skill' | 'toolchain' | 'skeleton'
  /** The composer text for the new session: the setup skill's invocation. */
  readonly prompt?: string
  /** The setup skill's instruction file, when `setup` is `skill`. */
  readonly skillFile?: string
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
  const skill = options.setupSkill === undefined || options.setupSkill === '' ? undefined : options.setupSkill
  // A copy in a skill folder wins in DSH, so it is looked for first; then the plugin's own.
  const skillFile = skill === undefined ? undefined : await findSkill(skill, options.skillRoots ?? []) ?? await options.bundledSkill?.(skill)
  if (skill !== undefined && skillFile !== undefined) {
    // The skill lays down scripts/okf.py and the bundle itself; the entry needs its folder now.
    await mkdir(root, { recursive: true })
    const gitInit = await gitInitOnce(folder, options)
    return { root, setup: 'skill', prompt: setupPrompt(skill), skillFile, gitInit }
  }
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
  return { root, setup: toolchainRan ? 'toolchain' : 'skeleton', gitInit: await gitInitOnce(folder, options) }
}

/**
 * Make a folder a git repository unless it is one; never fails.
 * @param folder - the folder.
 * @param options - git settings.
 * @returns whether the folder is a repository afterwards.
 */
async function gitInitOnce(folder: string, options: StarterOptions): Promise<boolean> {
  if (await stat(join(folder, '.git')).then(() => true, () => false)) return true
  return run(options.git, ['init', '--quiet'], { cwd: folder, timeoutMs: options.timeoutMs }).then(() => true, (error: unknown) => {
    console.warn('[okf] git init failed; the new knowledge base is not a repository:', error)
    return false
  })
}
