/**
 * The knowledge-base skills this plugin ships, offered to DSH as a skill provider.
 *
 * `skills/kb-*` beside the built module are knowledgeAgent's lifecycle skills
 * (kb-setup, kb-ingest, kb-query, kb-review, kb-curate, kb-lint), copied in by
 * `scripts/sync-skills.mjs`. kb-setup carries `okf.py` next to its SKILL.md,
 * as it expects; the copy is the same file as `templates/hub/scripts/okf.py`.
 *
 * They are registered with `ctx.skills.registerProvider` (the way DSH's own
 * Office skill is) at DSH's bundled rank, the lowest priority: a same-named
 * skill in the project, `~/.dsh/skills` or `~/.agents/skills` wins, so a person
 * can still override one. Each load re-reads the file.
 */
import { readdir, readFile } from 'node:fs/promises'
import { join, sep } from 'node:path'
import { parsePage, text } from './frontmatter.ts'
import type { FrontValue } from './frontmatter.ts'

/** DSH's rank for bundled skills (`BUNDLED_SKILL_RANK` in `@deepseek-ai/dsh-skill`). */
export const BUNDLED_SKILL_RANK = 600

/** The provider's name in DSH's skill registry. */
export const PROVIDER_NAME = 'dsh-okf'

/** Who may invoke a skill (`SkillInvocationPolicy`). */
export interface SkillInvocation {
  readonly modelInvocable: boolean
  readonly userInvocable: boolean
}

/** A catalog entry (`SkillCandidate`). */
export interface SkillCandidate {
  readonly name: string
  readonly description: string
  readonly whenToUse?: string
  readonly invocation: SkillInvocation
  readonly source: string
  readonly provider: string
  readonly path?: string
  readonly resourceBase?: { readonly kind: 'directory', readonly path: string }
  readonly rank: number
  readonly locator: unknown
}

/** A loaded skill (`SkillDefinition`). */
export interface SkillDefinition {
  readonly name: string
  readonly description: string
  readonly whenToUse?: string
  readonly invocation: SkillInvocation
  readonly source: string
  readonly provider: string
  readonly path?: string
  readonly resourceBase?: { readonly kind: 'directory', readonly path: string }
  readonly content: string
}

/** Lookup options the registry passes (`SkillLookupOptions`). */
export interface SkillLookupOptions {
  readonly cwd?: string
  readonly signal?: AbortSignal
}

/** One source of skills (`SkillProvider`). */
export interface SkillProvider {
  readonly name: string
  list(options: SkillLookupOptions): Promise<readonly SkillCandidate[] | { readonly candidates: readonly SkillCandidate[], readonly complete: boolean }>
  get(candidate: SkillCandidate, options: SkillLookupOptions): Promise<SkillDefinition | undefined>
}

/** DSH's skill registry, reduced to what this plugin uses (`ctx.skills`). */
export interface SkillsService {
  registerProvider(create: (control: { readonly signal: AbortSignal, readonly invalidate: () => void }) => SkillProvider): () => void
}

/** A skill as read from disk. */
interface ReadSkill {
  readonly name: string
  readonly description: string
  readonly whenToUse?: string
  readonly invocation: SkillInvocation
  readonly file: string
  readonly dir: string
  readonly content: string
}

/**
 * Read a frontmatter boolean the way DSH's filesystem provider does.
 * @param meta - the frontmatter.
 * @param key - the key.
 * @returns the value, or undefined when absent or not a boolean spelling.
 */
function flag(meta: Readonly<Record<string, FrontValue>>, key: string): boolean | undefined {
  const value = meta[key]
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1 ? true : value === 0 ? false : undefined
  if (typeof value !== 'string') return undefined
  const lower = value.toLowerCase()
  if (['true', 'yes', 'on', '1'].includes(lower)) return true
  if (['false', 'no', 'off', '0'].includes(lower)) return false
  return undefined
}

/**
 * Read one bundled skill.
 * @param dir - its folder (holding SKILL.md).
 * @returns the skill, or undefined when the file is missing or malformed.
 */
async function readSkill(dir: string): Promise<ReadSkill | undefined> {
  const file = join(dir, 'SKILL.md')
  let source: string
  try {
    source = await readFile(file, 'utf8')
  } catch {
    return undefined
  }
  const page = parsePage(source)
  const name = text(page.meta, 'name')
  const description = text(page.meta, 'description')
  if (!page.hasFrontmatter || name === undefined || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name) || description === undefined || description === '') return undefined
  const whenToUse = text(page.meta, 'whenToUse')
  return {
    name,
    description,
    ...whenToUse === undefined ? {} : { whenToUse },
    invocation: { modelInvocable: flag(page.meta, 'disable-model-invocation') !== true, userInvocable: flag(page.meta, 'user-invocable') !== false },
    file,
    dir,
    content: page.body.trim(),
  }
}

/**
 * Every skill in a folder of skill folders.
 * @param root - the folder (`skills/`).
 * @returns the readable skills, by name.
 */
export async function bundledSkills(root: string): Promise<ReadSkill[]> {
  let names: string[]
  try {
    names = (await readdir(root, { withFileTypes: true })).filter(entry => entry.isDirectory()).map(entry => entry.name).sort()
  } catch {
    return []
  }
  const skills: ReadSkill[] = []
  for (const name of names) {
    const skill = await readSkill(join(root, name))
    if (skill !== undefined && skill.name === name) skills.push(skill)
  }
  return skills
}

/**
 * The provider for a folder of bundled skills.
 * @param root - the folder.
 * @returns a factory for `ctx.skills.registerProvider`.
 */
export function skillProvider(root: string): (control: { readonly signal: AbortSignal, readonly invalidate: () => void }) => SkillProvider {
  const summary = (skill: ReadSkill): Omit<SkillDefinition, 'content'> => ({
    name: skill.name,
    description: skill.description,
    ...skill.whenToUse === undefined ? {} : { whenToUse: skill.whenToUse },
    invocation: skill.invocation,
    source: 'bundled',
    provider: PROVIDER_NAME,
    path: skill.file,
    // Forward slashes, as DSH's own bundled provider reports it.
    resourceBase: { kind: 'directory', path: skill.dir.split(sep).join('/') },
  })
  return control => ({
    name: PROVIDER_NAME,
    list: async () => (await bundledSkills(root)).map(skill => ({ ...summary(skill), rank: BUNDLED_SKILL_RANK, locator: skill.dir })),
    get: async (candidate) => {
      const skill = typeof candidate.locator === 'string' ? await readSkill(candidate.locator) : undefined
      if (skill === undefined || skill.name !== candidate.name) {
        control.invalidate()
        return undefined
      }
      return { ...summary(skill), content: skill.content }
    },
  })
}
