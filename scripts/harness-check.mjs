/**
 * Optional integration check against a DSH source checkout. NOT part of
 * `npm run smoke`, because it needs that checkout; this package otherwise needs none.
 *
 * `smoke.mjs` stubs `ctx.inject` and `systemPrompt`, and stubs cannot tell
 * whether DSH accepts what this bundle registers. This applies the built
 * Host module (`lib/index.js`) in a real cordis Context next to DSH's real
 * `SystemPrompt` and `ToolRuntime` services, each provided by a SIBLING plugin
 * as in the Harness (a service on the root context would hide a missing
 * inject), and asserts:
 *
 * - the module applies under strict injection with only `connection` in `inject`;
 * - `ctx.inject(['systemPrompt'])` reaches the real service;
 * - `SystemPrompt.assemble({ agent })` carries the session's bundle as a context
 *   and carries nothing for a session without a bundle;
 * - no `okf_*` tool reaches the real `ToolRuntime` (the agent reads the bundle
 *   with the Harness's own file tools).
 *
 * Usage (from this package's root; needs the checkout's dependencies installed):
 *   DSH_ROOT=D:/project/dsh node --import file:///D:/project/dsh/node_modules/tsx/dist/esm/index.mjs scripts/harness-check.mjs
 */
import { createRequire } from 'node:module'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const dshRoot = (process.env.DSH_ROOT ?? '').replace(/\\/g, '/').replace(/\/$/, '')
if (dshRoot === '') {
  console.error('harness-check: set DSH_ROOT to a DSH source checkout, and load its tsx (see the usage in this file).')
  process.exit(2)
}
const root = dirname(dirname(fileURLToPath(import.meta.url)))
const toolsDir = `${dshRoot}/packages/core/tools/`
const promptDir = `${dshRoot}/packages/core/system-prompt/`
const { Context } = await import(pathToFileURL(createRequire(`${toolsDir}package.json`).resolve('@deepseek-ai/cordis')).href)
const SystemPrompt = (await import(pathToFileURL(`${promptDir}lib/index.js`).href)).default
const ToolRuntime = (await import(pathToFileURL(`${toolsDir}lib/index.js`).href)).default
const mine = await import(pathToFileURL(join(root, 'lib', 'index.js')).href)

const failures = []
const check = (condition, message) => { if (!condition) failures.push(message) }
const work = mkdtempSync(join(tmpdir(), 'dsh-okf-harness-'))

// A library with one local bundle, selected for session s-1.
const bundle = join(work, 'kb')
mkdirSync(join(bundle, 'concepts'), { recursive: true })
writeFileSync(join(bundle, 'index.md'), '---\nokf_version: "0.2"\n---\n# Index\n\n* [Alpha](concepts/alpha.md) - alpha.\n')
writeFileSync(join(bundle, 'concepts', 'alpha.md'), '---\ntype: Concept\ntitle: Alpha\n---\nAlpha mentions turbines.\n')

const routes = new Map()
const ctx = new Context()
await ctx.plugin({ apply(provider) { provider.provide('connection', { fetch: { register: (route) => { routes.set(route.path, route); return async () => {} } } }) } }).await()
await ctx.plugin(SystemPrompt, {}).await()
await ctx.plugin(ToolRuntime, {}).await()

const fiber = ctx.plugin(mine, { libraryDir: join(work, 'library') })
let applyError
try {
  await Promise.race([fiber.await(), new Promise((_, reject) => { setTimeout(() => { reject(new Error('the Host module never finished applying; is its inject unmet?')) }, 5000) })])
} catch (error) {
  applyError = error
}
check(applyError === undefined, `the Host module failed to apply: ${String(applyError?.message ?? applyError)}`)

const post = async (path, body) => {
  const response = await routes.get(path).fetch(new Request(`http://127.0.0.1${path}`, { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }))
  return { status: response.status, body: await response.json() }
}
let answer = await post('/api/okf/add-local', { path: bundle, id: 'kb' })
check(answer.status === 200, `add-local answered ${String(answer.status)} ${JSON.stringify(answer.body)}`)
answer = await post('/api/okf/session', { sessionId: 's-1', bundleId: 'kb' })
check(answer.status === 200, `select answered ${String(answer.status)}`)
await new Promise((resolve) => { setTimeout(resolve, 100) })

const systemPrompt = ctx.get('systemPrompt')
const agent = id => ({ id, session: { header: { id } } })

const withBundle = await systemPrompt.assemble({ agent: agent('s-1') })
const context = withBundle.contexts.find(item => item.name === 'okf:session-bundle')
check(context !== undefined && context.text.includes('<okf_bundle id="kb"') && context.text.includes('[Alpha](concepts/alpha.md)'), `assembled contexts: ${JSON.stringify(withBundle.contexts).slice(0, 400)}`)
const toolNames = withBundle.tools.map(tool => tool.name)
check(!toolNames.some(name => name.startsWith('okf_')), `the plugin must register no tools: ${toolNames.join(', ')}`)
const without = await systemPrompt.assemble({ agent: agent('s-2') })
const empty = without.contexts.find(item => item.name === 'okf:session-bundle')
check(empty === undefined || empty.text === '', `a session without a bundle got context: ${JSON.stringify(empty)}`)

await fiber.dispose()
const after = await systemPrompt.assemble({ agent: agent('s-1') })
check(!after.contexts.some(item => item.name === 'okf:session-bundle'), 'disposing the plugin must remove its prompt context')
rmSync(work, { recursive: true, force: true })

if (failures.length > 0) {
  for (const failure of failures) console.error(`harness-check: FAIL — ${failure}`)
  process.exit(1)
}
console.log('harness-check: OK')
console.log(`  context        ${context.name} (${String(context.text.length)} chars)`)
process.exit(0)
