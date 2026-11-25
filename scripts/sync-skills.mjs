/**
 * Copy knowledgeAgent's kb-* skills and its okf.py toolchain into this plugin.
 *
 * - `<knowledgeAgent>/skills/kb-*`   → `skills/kb-*` (served to DSH as bundled skills)
 * - `<knowledgeAgent>/scripts/okf.py` → `templates/hub/scripts/okf.py` and
 *   `skills/kb-setup/okf.py` (kb-setup expects it next to its SKILL.md)
 *
 * knowledgeAgent stays the source of truth: edit the skills there, then run
 * this and commit the result. The smoke test checks the two okf.py copies match.
 *
 * Usage: node scripts/sync-skills.mjs <path to a knowledgeAgent checkout>
 */
import { cpSync, existsSync, readdirSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const from = process.argv[2]
if (from === undefined) {
  console.error('usage: node scripts/sync-skills.mjs <knowledgeAgent checkout>')
  process.exit(2)
}
const source = resolve(from)
const script = join(source, 'scripts', 'okf.py')
if (!existsSync(join(source, 'skills')) || !existsSync(script)) {
  console.error(`sync-skills: ${source} has no skills/ or scripts/okf.py`)
  process.exit(2)
}
const target = join(root, 'skills')
rmSync(target, { recursive: true, force: true })
const names = readdirSync(join(source, 'skills'), { withFileTypes: true })
  .filter(entry => entry.isDirectory() && entry.name.startsWith('kb-') && existsSync(join(source, 'skills', entry.name, 'SKILL.md')))
  .map(entry => entry.name)
for (const name of names) cpSync(join(source, 'skills', name), join(target, name), { recursive: true })
cpSync(script, join(root, 'templates', 'hub', 'scripts', 'okf.py'))
if (names.includes('kb-setup')) cpSync(script, join(target, 'kb-setup', 'okf.py'))
console.log(`sync-skills: ${names.join(', ')} and okf.py from ${source}`)
