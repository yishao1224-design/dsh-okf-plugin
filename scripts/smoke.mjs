/**
 * Smoke-test both halves of the OKF bundle without a Harness or a browser.
 *
 * 1. Two throwaway git repositories act as remotes (file:// URLs, so no
 *    network): one holds a bundle in a subfolder, one holds two bundles.
 * 2. The built Host module (`lib/index.js`) is applied to a stub context; its
 *    registered routes are called with real `Request`s: fetch, the many-bundles
 *    refusal, preview, path-traversal refusal, session select, update (clean,
 *    dirty, forced), add-local and remove. The prompt context is exercised
 *    against a stub agent, including a subagent that inherits its parent's
 *    bundle, and the plugin must register no tools.
 * 3. The built browser artifact (`lib/client.js`) is executed the way the shell
 *    does — a `window.__ModuleLoader__` registration and a module table that
 *    answers React — with `fetch` wired straight into the Host routes. Its chip
 *    and dialog are rendered to markup, and the markdown renderer is checked
 *    for the untrusted-content rules.
 *
 * Usage: node scripts/smoke.mjs
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const work = mkdtempSync(join(tmpdir(), 'dsh-okf-smoke-'))
const failures = []
/** Record one failed assertion. */
const check = (condition, message) => { if (!condition) failures.push(message) }

// ── 1 · fixture remotes ───────────────────────────────────────────────────
/**
 * Run git in a folder.
 * @param cwd - the folder.
 * @param args - the arguments.
 * @returns stdout.
 */
const git = (cwd, ...args) => execFileSync('git', ['-c', 'user.name=smoke', '-c', 'user.email=smoke@example.invalid', '-c', 'init.defaultBranch=main', '-c', 'core.autocrlf=false', ...args], { cwd, encoding: 'utf8' }).trim()
/**
 * Write files under a folder.
 * @param base - the folder.
 * @param files - path → text.
 */
const write = (base, files) => {
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(base, path)), { recursive: true })
    writeFileSync(join(base, path), text)
  }
}

const remoteA = join(work, 'remote-a')
mkdirSync(remoteA)
git(remoteA, 'init', '-q')
write(remoteA, {
  'README.md': '# Not part of the bundle\n',
  'src/app.js': 'console.log(1)\n',
  'docs/kb/SCHEMA.md': '---\ntype: Schema\ntitle: Schema\ndescription: Conventions.\n---\n# Schema\n',
  'docs/kb/index.md': '---\nokf_version: "0.2"\n---\n\n# Bundle Index\n\n* [Alpha](concepts/alpha.md) - The alpha concept.\n',
  'docs/kb/log.md': '# Log\n\n## 2026-10-01\n* **Creation**: seeded.\n',
  'docs/kb/concepts/alpha.md': [
    '---', 'type: Concept', 'title: Alpha Widget', 'description: What an alpha widget is.', 'status: stable',
    'updated: 2026-10-01', 'tags: [widgets, core]', 'sources:', '  - resource: /sources/x.md', '    id: x', '---', '',
    '# Alpha Widget', '', 'An alpha widget **rotates** the `gearbox`. See [Beta](/concepts/beta.md) and [Gamma](../entities/gamma.md).', '',
    '<script>alert(1)</script>', '', '[evil](javascript:alert(1)) and [site](https://example.com)', '',
    '| Key | Value |', '|-----|------:|', '| a | 1 |', '', '- one', '- two', '  - nested', '', '```js', 'const x = "<b>"', '```', '',
  ].join('\n'),
  'docs/kb/concepts/beta.md': '---\ntype: Concept\ntitle: Beta\ndescription: Deprecated beta.\nstatus: deprecated\nlifecycle: deprecated\n---\n\n# Beta\n\nReplaced by alpha widget.\n',
  'docs/kb/entities/gamma.md': '---\ntitle: Gamma without type\n---\nGamma body mentions gearbox too.\n',
})
git(remoteA, 'add', '-A')
git(remoteA, 'commit', '-qm', 'seed')
git(remoteA, 'config', 'uploadpack.allowFilter', 'true')
const urlA = pathToFileURL(remoteA).href

const remoteB = join(work, 'remote-b')
mkdirSync(remoteB)
git(remoteB, 'init', '-q')
write(remoteB, {
  'one/SCHEMA.md': '---\ntype: Schema\n---\n',
  'two/index.md': '---\nokf_version: "0.2"\n---\n# Two\n',
  'one/archive/SCHEMA.md': '---\ntype: Schema\n---\n',
})
git(remoteB, 'add', '-A')
git(remoteB, 'commit', '-qm', 'seed')
const urlB = pathToFileURL(remoteB).href

// ── 2 · the Host half ─────────────────────────────────────────────────────
const host = await import(pathToFileURL(join(root, 'lib', 'index.js')).href)
check(JSON.stringify(host.inject) === '["connection"]', `host inject ${JSON.stringify(host.inject)}`)

const routes = new Map()
const contexts = []
const tools = []
const injected = []
const libraryDir = join(work, 'library')
host.apply({
  connection: { fetch: { register: (route) => { routes.set(route.path, route); return async () => {} } } },
  inject: (deps, callback) => {
    injected.push(deps.join(','))
    callback({ systemPrompt: { context: (c) => { contexts.push(c); return () => {} } }, tools: { register: (t) => { tools.push(t); return () => {} } } })
  },
}, { libraryDir, indexChars: 2000 })

check(routes.size === 25, `expected 25 routes, saw ${String(routes.size)}`)
check([...routes.values()].every(route => route.path.startsWith('/api/okf/') && route.requestBody === 'buffered'), 'every route must sit under /api/okf with a buffered body')
check(injected.join('|') === 'systemPrompt|tools', `optional services ${injected.join('|')}`)
check(contexts.length === 1 && contexts[0].name === 'okf:session-bundle' && typeof contexts[0].text === 'function', 'one prompt context with a text callback')
check(tools.map(t => t.name).join(',') === 'wiki_sync_from_code,wiki_open_pr' && tools.every(t => t.parameters.type === 'object' && t.parameters.additionalProperties === false && t.output.schema.type === 'object' && typeof t.output.render === 'function'), `the two Team Wiki tools, saw ${tools.map(t => t.name).join(',')}`)

/**
 * Call a registered route.
 * @param path - absolute route.
 * @param options - method, query, body.
 * @returns status and parsed body.
 */
async function api(path, { method = 'GET', query, body } = {}) {
  const route = routes.get(path)
  if (route === undefined) throw new Error(`no route ${path}`)
  const url = `http://127.0.0.1:3080${path}${query === undefined ? '' : `?${new URLSearchParams(query)}`}`
  const response = await route.fetch(new Request(url, { method, ...body === undefined ? {} : { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } } }))
  const text = await response.text()
  return { status: response.status, headers: response.headers, body: text === '' ? null : JSON.parse(text) }
}

let answer = await api('/api/okf/library')
check(answer.status === 200 && answer.body.entries.length === 0 && answer.headers.get('cache-control') === 'no-store', 'empty library')
answer = await api('/api/okf/library', { method: 'POST', body: {} })
check(answer.status === 405, 'a POST to a GET route answers 405')

answer = await api('/api/okf/fetch', { method: 'POST', body: { url: 'https://user:secret@github.com/a/b' } })
check(answer.status === 400 && answer.body.error.code === 'bad-url', 'a URL with a credential is refused')
answer = await api('/api/okf/fetch', { method: 'POST', body: { url: '--upload-pack=evil' } })
check(answer.status === 400, 'an option-looking URL is refused')
answer = await api('/api/okf/fetch', { method: 'POST', body: { url: urlA, ref: '--evil' } })
check(answer.status === 400 && answer.body.error.code === 'bad-ref', 'an option-looking ref is refused')

answer = await api('/api/okf/fetch', { method: 'POST', body: { url: urlA, id: 'Alpha KB' } })
check(answer.status === 200, `fetch answered ${String(answer.status)} ${JSON.stringify(answer.body)}`)
const entry = answer.body.entry
check(entry?.id === 'alpha-kb' && entry.origin.kind === 'git' && entry.origin.path === 'docs/kb' && /^[0-9a-f]{40}$/.test(entry.origin.commit), `fetched entry ${JSON.stringify(entry)}`)
const checkout = join(libraryDir, 'repos', 'alpha-kb')
check(existsSync(join(checkout, 'docs', 'kb', 'concepts', 'alpha.md')), 'the bundle folder was not checked out')
check(!existsSync(join(checkout, 'README.md')) && !existsSync(join(checkout, 'src')), 'files outside the bundle folder were checked out (sparse checkout failed)')

answer = await api('/api/okf/fetch', { method: 'POST', body: { url: urlA, id: 'alpha-kb' } })
check(answer.status === 409 && answer.body.error.code === 'exists', 'a duplicate id answers 409')
answer = await api('/api/okf/fetch', { method: 'POST', body: { url: urlB } })
check(answer.status === 422 && answer.body.error.code === 'many-bundles' && JSON.stringify(answer.body.error.detail?.candidates) === '["one","two"]', `many-bundles ${JSON.stringify(answer.body)}`)
answer = await api('/api/okf/fetch', { method: 'POST', body: { url: urlB, path: 'two' } })
check(answer.status === 200 && answer.body.entry.id === 'remote-b-two', `fetch with a chosen path ${JSON.stringify(answer.body)}`)
answer = await api('/api/okf/fetch', { method: 'POST', body: { url: urlB, path: '../x', id: 'x' } })
check(answer.status === 400 && answer.body.error.code === 'bad-path', 'a path climbing out of the repo is refused')
answer = await api('/api/okf/fetch', { method: 'POST', body: { url: pathToFileURL(join(work, 'nope')).href, id: 'nope' } })
check(answer.status === 502 && answer.body.error.code.startsWith('git-'), `a missing remote answers a git error: ${JSON.stringify(answer.body)}`)
check(!existsSync(join(libraryDir, 'repos', 'nope')), 'a failed fetch left a folder behind')

// Preview.
answer = await api('/api/okf/bundle', { query: { id: 'alpha-kb' } })
const summary = answer.body
check(answer.status === 200 && summary.okfVersion === '0.2', `summary okfVersion ${JSON.stringify(summary?.okfVersion)}`)
check(summary.pages.length === 6, `summary pages ${String(summary.pages?.length)}`)
check(summary.types.Concept === 2 && summary.types.Schema === 1 && summary.states.active === 1 && summary.states.deprecated === 1, `summary counts ${JSON.stringify(summary.types)} ${JSON.stringify(summary.states)}`)
check(JSON.stringify(summary.untyped) === '["entities/gamma.md"]', `untyped ${JSON.stringify(summary.untyped)}`)
const alpha = summary.pages.find(page => page.path === 'concepts/alpha.md')
check(alpha?.title === 'Alpha Widget' && alpha.tags.join(',') === 'widgets,core' && alpha.stage === 'active', `alpha summary ${JSON.stringify(alpha)}`)
check(summary.pages.find(page => page.path === 'index.md')?.reserved === true, 'index.md must be reserved')
answer = await api('/api/okf/page', { query: { id: 'alpha-kb', path: '/concepts/alpha.md' } })
check(answer.status === 200 && answer.body.meta.title === 'Alpha Widget' && answer.body.body.includes('rotates'), 'page read')
check(answer.body.meta.sources === undefined, 'a nested frontmatter block must not be guessed at')
for (const bad of ['../../../README.md', 'concepts/../../../README.md', '..\\..\\README.md', 'concepts/alpha.txt']) {
  answer = await api('/api/okf/page', { query: { id: 'alpha-kb', path: bad } })
  check(answer.status === 400, `path ${bad} answered ${String(answer.status)}`)
}
answer = await api('/api/okf/page', { query: { id: 'alpha-kb', path: 'concepts/missing.md' } })
check(answer.status === 404, 'a missing page answers 404')
answer = await api('/api/okf/bundle', { query: { id: 'zzz' } })
check(answer.status === 404 && answer.body.error.code === 'unknown-bundle', 'an unknown bundle answers 404')

// Session selection, prompt context.
const agent = (id, parentSession) => ({ id, session: { header: { id, ...parentSession === undefined ? {} : { parentSession } } } })
check(contexts[0].text({ agent: agent('s-1') }) === '', 'no bundle → empty context')
check(contexts[0].text({}) === '', 'no agent → empty context')
answer = await api('/api/okf/session', { query: { sessionId: 's-1' } })
check(answer.status === 200 && answer.body === null, 'no selection reads null')
answer = await api('/api/okf/session', { method: 'POST', body: { sessionId: 's-1', bundleId: 'nope' } })
check(answer.status === 404, 'selecting an unknown bundle answers 404')
answer = await api('/api/okf/session', { method: 'POST', body: { sessionId: 's-1', bundleId: 'alpha-kb' } })
check(answer.status === 200 && answer.body.bundleId === 'alpha-kb', 'select')
answer = await api('/api/okf/session', { query: { sessionId: 's-1' } })
check(answer.body?.bundleId === 'alpha-kb', 'selection reads back')
await new Promise((resolve) => { setTimeout(resolve, 50) })
let text = contexts[0].text({ agent: agent('s-1') })
check(text.startsWith('<okf_bundle id="alpha-kb"') && text.includes(join(checkout, 'docs', 'kb')) && text.includes('file tools') && !text.includes('okf_read') && !text.includes('okf_search'), `context text ${text.slice(0, 300)}`)
check(text.includes('Catalog (index.md):') && text.includes('[Alpha](concepts/alpha.md)') && !text.includes('okf_version'), 'context carries the index body without its frontmatter')
check(contexts[0].text({ agent: agent('sub-1', 's-1') }).includes('alpha-kb'), 'a subagent inherits its parent session\'s bundle')
check(contexts[0].text({ agent: agent('s-2') }) === '', 'another session sees nothing')

// Update: clean, then a new commit, then local edits.
answer = await api('/api/okf/update', { method: 'POST', body: { id: 'alpha-kb' } })
check(answer.status === 200 && answer.body.changed === false, `update with nothing new ${JSON.stringify(answer.body)}`)
write(remoteA, { 'docs/kb/concepts/delta.md': '---\ntype: Concept\ntitle: Delta\n---\nNew.\n', 'README.md': 'changed outside\n' })
git(remoteA, 'add', '-A')
git(remoteA, 'commit', '-qm', 'delta')
answer = await api('/api/okf/update', { method: 'POST', body: { id: 'alpha-kb' } })
check(answer.status === 200 && answer.body.changed === true && answer.body.entry.origin.commit === git(remoteA, 'rev-parse', 'HEAD'), `update to the new commit ${JSON.stringify(answer.body)}`)
check(existsSync(join(checkout, 'docs', 'kb', 'concepts', 'delta.md')) && !existsSync(join(checkout, 'README.md')), 'update must bring the new page and keep the checkout sparse')
writeFileSync(join(checkout, 'docs', 'kb', 'concepts', 'alpha.md'), 'local edit\n')
answer = await api('/api/okf/update', { method: 'POST', body: { id: 'alpha-kb' } })
check(answer.status === 502 && /local copy has edits/.test(answer.body.error.message), `a dirty checkout is not overwritten: ${JSON.stringify(answer.body)}`)
answer = await api('/api/okf/update', { method: 'POST', body: { id: 'alpha-kb', force: true } })
check(answer.status === 200 && readFileSync(join(checkout, 'docs', 'kb', 'concepts', 'alpha.md'), 'utf8').includes('Alpha Widget'), 'a forced update restores the remote content')

// Add a local folder: the parent of a bundle is accepted when it holds exactly one.
const localParent = join(work, 'local-project')
write(localParent, { 'okf/SCHEMA.md': '---\ntype: Schema\n---\n', 'okf/index.md': '# Index\n', 'okf/a.md': '---\ntype: Concept\ntitle: A\n---\n' })
answer = await api('/api/okf/add-local', { method: 'POST', body: { path: localParent } })
check(answer.status === 200 && answer.body.entry.root === join(localParent, 'okf') && answer.body.entry.id === 'local-project-okf' && answer.body.entry.origin.kind === 'local', `add-local ${JSON.stringify(answer.body)}`)
answer = await api('/api/okf/add-local', { method: 'POST', body: { path: join(localParent, 'okf') } })
check(answer.status === 409, 'adding the same folder twice answers 409')
answer = await api('/api/okf/add-local', { method: 'POST', body: { path: join(work, 'missing') } })
check(answer.status === 422 && answer.body.error.code === 'bad-path', 'a missing local folder answers 422')
// An empty folder: refused without initialize, a new knowledge base with it.
const blank = join(work, 'blank-kb')
mkdirSync(blank)
answer = await api('/api/okf/add-local', { method: 'POST', body: { path: blank } })
check(answer.status === 422 && answer.body.error.code === 'no-bundle' && readdirSync(blank).length === 0, `an empty folder is refused without initialize ${JSON.stringify(answer.body)}`)
answer = await api('/api/okf/add-local', { method: 'POST', body: { path: blank, initialize: true } })
check(answer.status === 200 && answer.body.entry.root === join(blank, 'okf') && answer.body.entry.workspace === realpathSync.native(blank) && answer.body.created?.workspace === realpathSync.native(blank), `initialize makes a knowledge base ${JSON.stringify(answer.body)}`)
check(answer.body.created?.toolchainRan === true && answer.body.created?.gitInit === true, `okf.py init and git init ran ${JSON.stringify(answer.body.created)}`)
for (const file of ['okf/SCHEMA.md', 'okf/index.md', 'okf/log.md', 'okf/concepts', 'okf/sources', 'scripts/okf.py', 'AGENTS.md', '.gitignore', '.git']) check(existsSync(join(blank, file)), `the new knowledge base has ${file}`)
check(readFileSync(join(blank, 'okf', 'index.md'), 'utf8').includes('okf_version'), 'the new index.md carries okf_version')
check(!/^lifecycle:/m.test(readFileSync(join(blank, 'okf', 'SCHEMA.md'), 'utf8')), 'the new SCHEMA.md has no lifecycle key')
check(execFileSync('python3', [join(blank, 'scripts', 'okf.py'), 'lint'], { cwd: blank, encoding: 'utf8' }) !== undefined, 'the new bundle lints clean')
answer = await api('/api/okf/edit-workspace', { method: 'POST', body: { id: 'blank-kb-okf' } })
check(answer.status === 200 && answer.body.created === false && answer.body.workspace === realpathSync.native(blank), `the new knowledge base is already editable ${JSON.stringify(answer.body)}`)
answer = await api('/api/okf/add-local', { method: 'POST', body: { path: blank, initialize: true } })
check(answer.status === 409, `a folder that is already a knowledge base is not added twice ${JSON.stringify(answer.body)}`)
const notEmpty = join(work, 'not-empty')
write(notEmpty, { 'notes.txt': 'mine\n' })
answer = await api('/api/okf/add-local', { method: 'POST', body: { path: notEmpty, initialize: true } })
check(answer.status === 422 && answer.body.error.code === 'no-bundle' && readdirSync(notEmpty).length === 1, `a folder with files of its own is never initialized ${JSON.stringify(answer.body)}`)
await api('/api/okf/remove', { method: 'POST', body: { id: 'blank-kb-okf' } })
// The folder dialog: this test machine has none, which answers 501, not a hang.
if (process.platform === 'linux' && !['zenity', 'kdialog'].some(name => { try { execFileSync('which', [name], { stdio: 'ignore' }); return true } catch { return false } })) {
  answer = await api('/api/okf/pick-folder', { method: 'POST', body: {} })
  check(answer.status === 501 && answer.body.error.code === 'no-picker', `pick-folder without a dialog answers 501 ${JSON.stringify(answer.body)}`)
}
answer = await api('/api/okf/update', { method: 'POST', body: { id: 'local-project-okf' } })
check(answer.status === 400 && answer.body.error.code === 'not-git', 'a local entry cannot be updated')

// Remove: the session selection goes, the checkout goes; a local folder stays.
answer = await api('/api/okf/remove', { method: 'POST', body: { id: 'alpha-kb', deleteFiles: true } })
check(answer.status === 200 && !existsSync(checkout), 'remove with deleteFiles deletes the checkout')
answer = await api('/api/okf/session', { query: { sessionId: 's-1' } })
check(answer.body === null, 'removing a bundle clears the sessions that used it')
check(contexts[0].text({ agent: agent('s-1') }) === '', 'the context empties when the bundle goes')
answer = await api('/api/okf/remove', { method: 'POST', body: { id: 'local-project-okf', deleteFiles: true } })
check(answer.status === 200 && existsSync(join(localParent, 'okf', 'a.md')), 'a local folder is never deleted')
answer = await api('/api/okf/remove', { method: 'POST', body: { id: 'local-project-okf' } })
check(answer.status === 404, 'removing twice answers 404')
answer = await api('/api/okf/fetch', { method: 'POST', body: 'not json' })
check(answer.status === 400 && answer.body.error.code === 'bad-request', 'a non-object body answers 400')

// Remote URL recognition.
const remotes = {
  'https://github.com/yishao1224-design/knowledgeAgent': ['github', 'knowledgeAgent', 'yishao1224-design', true],
  'git@github.com:owner/repo.git': ['github', 'repo', 'owner', false],
  'https://dev.azure.com/contoso/Fabrikam/_git/Knowledge': ['azure-devops', 'Knowledge', 'contoso', true],
  'https://contoso@dev.azure.com/contoso/Fabrikam%20Web/_git/kb': ['azure-devops', 'kb', 'contoso', true],
  'https://contoso.visualstudio.com/Fabrikam/_git/kb': ['azure-devops', 'kb', 'contoso', true],
  'https://contoso.visualstudio.com/DefaultCollection/Fabrikam/_git/kb': ['azure-devops', 'kb', 'contoso', true],
  'git@ssh.dev.azure.com:v3/contoso/Fabrikam/kb': ['azure-devops', 'kb', 'contoso', false],
  'https://gitlab.example.com/group/sub/kb.git': ['git', 'kb', 'group', true],
}
for (const [url, [provider, repo, owner, http]] of Object.entries(remotes)) {
  const info = host.parseRemote(url)
  check(info.provider === provider && info.repo === repo && info.owner === owner && info.http === http, `parseRemote(${url}) = ${JSON.stringify(info)}`)
}
check(host.parseRemote('https://contoso@dev.azure.com/contoso/Fabrikam%20Web/_git/kb').project === 'Fabrikam Web', 'Azure DevOps project name is decoded')
check(host.redact('fatal: https://u:tok123@dev.azure.com/x Authorization: Basic abc==', 'tok123') === 'fatal: https://***@dev.azure.com/x Authorization: Basic ***', `redact ${host.redact('fatal: https://u:tok123@dev.azure.com/x Authorization: Basic abc==', 'tok123')}`)

// ── 3 · the browser artifact ──────────────────────────────────────────────
// Put one bundle back for the UI checks.
await api('/api/okf/fetch', { method: 'POST', body: { url: urlA, id: 'alpha-kb' } })
await api('/api/okf/session', { method: 'POST', body: { sessionId: 's-1', bundleId: 'alpha-kb' } })

// Edit as workspace: the library's own checkout becomes the workspace.
const checkoutA = join(libraryDir, 'repos', 'alpha-kb')
check(git(checkoutA, 'rev-parse', '--is-shallow-repository') === 'true', 'the mirror starts shallow')
answer = await api('/api/okf/edit-workspace', { method: 'POST', body: { id: 'alpha-kb' } })
const editWs = answer.body?.workspace
if (editWs === undefined) { console.error('edit-workspace answered', answer.status, JSON.stringify(answer.body)); process.exit(1) }
check(answer.status === 200 && answer.body.created === true && editWs === realpathSync.native(checkoutA) && answer.body.entry.id === 'alpha-kb' && answer.body.entry.workspace === editWs, `edit-workspace answer ${JSON.stringify(answer.body)}`)
check(git(checkoutA, 'rev-parse', '--is-shallow-repository') === 'false' && !existsSync(join(checkoutA, 'README.md')), 'Edit as workspace unshallows the mirror and keeps it sparse')
answer = await api('/api/okf/edit-workspace', { method: 'POST', body: { id: 'alpha-kb' } })
check(answer.status === 200 && answer.body.created === false && answer.body.workspace === editWs, 'Edit as workspace is idempotent')
check((await api('/api/okf/library')).body.entries.filter(entry => entry.id.startsWith('alpha-kb')).length === 1, 'no second copy is made')

// The prompt context: edit rules only where the session's workspace holds the bundle.
await api('/api/okf/session', { method: 'POST', body: { sessionId: 's-edit', bundleId: 'alpha-kb' } })
await api('/api/okf/session', { method: 'POST', body: { sessionId: 's-ro', bundleId: 'remote-b-two' } })
await new Promise((resolve) => { setTimeout(resolve, 50) })
const agentAt = (id, cwd) => ({ id, session: { header: { id, cwd } } })
text = contexts[0].text({ agent: agentAt('s-edit', editWs) })
check(text.includes('You may edit this bundle') && text.includes('log.md') && text.includes('needs-review') && text.includes('never add a lifecycle key') && text.includes('being edited') && !text.includes('overwritten by the next update') && !text.includes('Do not edit'), `editable context ${text.slice(0, 900)}`)
text = contexts[0].text({ agent: agentAt('s-edit', join(work, 'elsewhere')) })
check(text.includes('Do not edit the bundle from this session') && text.includes(editWs) && !text.includes('You may edit'), 'an editable bundle is read-only outside its own workspace')
text = contexts[0].text({ agent: agentAt('s-ro', editWs) })
check(text.includes('Do not edit files in the bundle.') && !text.includes('You may edit'), 'a bundle that is not editable stays read-only')

// The catalog follows index.md edits on the next turn.
const editIndex = join(checkoutA, 'docs', 'kb', 'index.md')
writeFileSync(editIndex, `${readFileSync(editIndex, 'utf8')}\n* [Zeta](concepts/zeta.md) - added by the agent.\n`)
const later = new Date(Date.now() + 5000)
utimesSync(editIndex, later, later)
text = contexts[0].text({ agent: agentAt('s-edit', editWs) })
check(text.includes('[Zeta](concepts/zeta.md)'), 'the catalog must pick up an edited index.md without a library change')

// Update never discards edits: refused while dirty, never forced, fast-forward only.
answer = await api('/api/okf/update', { method: 'POST', body: { id: 'alpha-kb' } })
check(answer.status === 502 && /uncommitted changes/.test(answer.body.error.message) && readFileSync(editIndex, 'utf8').includes('Zeta'), `update refuses uncommitted edits: ${JSON.stringify(answer.body)}`)
answer = await api('/api/okf/update', { method: 'POST', body: { id: 'alpha-kb', force: true } })
check(answer.status === 409 && answer.body.error.code === 'editing' && readFileSync(editIndex, 'utf8').includes('Zeta'), `a forced update of an edited bundle is refused: ${JSON.stringify(answer.body)}`)
git(checkoutA, 'checkout', '--', 'docs/kb/index.md')
write(remoteA, { 'README.md': 'changed again outside\n' })
git(remoteA, 'commit', '-qam', 'outside change')
answer = await api('/api/okf/update', { method: 'POST', body: { id: 'alpha-kb' } })
check(answer.status === 200 && answer.body.changed === true && answer.body.entry.workspace === editWs && git(checkoutA, 'rev-parse', 'HEAD') === git(remoteA, 'rev-parse', 'HEAD') && !existsSync(join(checkoutA, 'README.md')), `a clean edited bundle fast-forwards and stays sparse: ${JSON.stringify(answer.body)}`)
writeFileSync(join(checkoutA, 'docs', 'kb', 'concepts', 'alpha.md'), 'edited by the agent\n')
git(checkoutA, 'commit', '-qam', 'local edit')
write(remoteA, { 'README.md': 'and again\n' })
git(remoteA, 'commit', '-qam', 'diverge')
answer = await api('/api/okf/update', { method: 'POST', body: { id: 'alpha-kb' } })
check(answer.status === 502 && /commits the remote does not have/.test(answer.body.error.message) && git(checkoutA, 'log', '-1', '--format=%s') === 'local edit', `a diverged edited bundle keeps its commits: ${JSON.stringify(answer.body)}`)

// Remove never deletes unsaved work, and a later fetch never overwrites it.
answer = await api('/api/okf/remove', { method: 'POST', body: { id: 'alpha-kb', deleteFiles: true } })
check(answer.status === 409 && answer.body.error.code === 'unsaved-work' && /commits not pushed/.test(answer.body.error.message) && existsSync(join(checkoutA, '.git')), `remove refuses to delete unpushed commits: ${JSON.stringify(answer.body)}`)
answer = await api('/api/okf/remove', { method: 'POST', body: { id: 'alpha-kb' } })
check(answer.status === 200 && existsSync(join(checkoutA, '.git')), 'remove without deleting keeps the files')
answer = await api('/api/okf/fetch', { method: 'POST', body: { url: urlA, id: 'alpha-kb' } })
check(answer.status === 409 && answer.body.error.code === 'unsaved-work' && git(checkoutA, 'log', '-1', '--format=%s') === 'local edit', `a fetch must not overwrite a leftover checkout with unsaved work: ${JSON.stringify(answer.body)}`)
rmSync(checkoutA, { recursive: true, force: true })
answer = await api('/api/okf/fetch', { method: 'POST', body: { url: urlA, id: 'alpha-kb' } })
check(answer.status === 200 && answer.body.entry.workspace === undefined, 'a fresh fetch is read-only again')
await api('/api/okf/session', { method: 'POST', body: { sessionId: 's-1', bundleId: 'alpha-kb' } })

// A local entry is edited in place; its workspace is the git top level.
answer = await api('/api/okf/add-local', { method: 'POST', body: { path: join(remoteA, 'docs', 'kb'), id: 'in-place' } })
check(answer.status === 200, `add-local for in-place editing ${JSON.stringify(answer.body)}`)
answer = await api('/api/okf/edit-workspace', { method: 'POST', body: { id: 'in-place' } })
check(answer.status === 200 && answer.body.entry.id === 'in-place' && answer.body.workspace === realpathSync.native(remoteA), `in-place workspace ${JSON.stringify(answer.body)}`)
answer = await api('/api/okf/remove', { method: 'POST', body: { id: 'in-place', deleteFiles: true } })
check(answer.status === 200 && existsSync(join(remoteA, 'docs', 'kb', 'index.md')), 'removing a local entry never deletes its folder')

const source = readFileSync(join(root, 'lib', 'client.js'), 'utf8')
let factory
globalThis.window = { __ModuleLoader__: { load: (registration) => { check(registration.id === manifest.name, `registered id ${registration.id}`); factory = registration.factory } } }
new Function('window', source)(globalThis.window)
check(factory !== undefined, 'no factory was registered')
const requested = []
const table = { react: React, 'react/jsx-runtime': await import('react/jsx-runtime') }
const client = factory((specifier) => {
  requested.push(specifier)
  const value = table[specifier]
  if (value === undefined) throw new Error(`module table cannot answer ${specifier}`)
  return value
})
check(JSON.stringify(client.inject) === '["slots","locale"]', `client inject ${JSON.stringify(client.inject)}`)

const calls = []
globalThis.fetch = async (input, init) => {
  calls.push({ input, init })
  const url = new URL(String(input), 'http://127.0.0.1:3080/')
  const route = routes.get(url.pathname)
  if (route === undefined) return new Response('<!doctype html>', { status: 200, headers: { 'content-type': 'text/html' } })
  return route.fetch(new Request(url, { method: init.method ?? 'GET', ...init.body === undefined ? {} : { body: init.body, headers: init.headers } }))
}


const wsItems = []
const wsListeners = new Set()
const wsCalls = []
let failCreate = false
const workspacesStub = {
  list: { getSnapshot: () => ({ items: [...wsItems] }), subscribe: (listener) => { wsListeners.add(listener); return () => { wsListeners.delete(listener) } } },
  create: async ({ path }) => {
    wsCalls.push(`create ${path}`)
    if (failCreate) throw new Error('workspace create failed: workspace/invalid-path')
    const view = { workspaceId: `ws-${String(wsItems.length + 1)}`, path, title: 'kb' }
    // The list feed delivers the row after create answers, as the real one can.
    setTimeout(() => { wsItems.push(view); for (const listener of [...wsListeners]) listener() }, 20)
    return view
  },
}
const uiWorkspaceStub = {
  connectWorkspace: async (workspaceId) => {
    if (!wsItems.some(item => item.workspaceId === workspaceId)) throw new Error(`uiWorkspace.connectWorkspace: unknown workspace ${workspaceId}`)
    wsCalls.push(`connect ${workspaceId}`)
    return `s-${workspaceId}`
  },
  openSession: (target) => { wsCalls.push(`open ${target}`) },
}
const clientInjected = []
const registrations = []
const disposers = []
let dictionaries
const effect = (callback) => { const dispose = callback(); if (typeof dispose === 'function') disposers.push(dispose); return () => {} }
client.apply({
  effect,
  inject: (deps, callback) => { clientInjected.push(deps.join(',')); callback({ workspaces: workspacesStub, uiWorkspace: uiWorkspaceStub, effect }) },
  locale: { register: (ns, dict) => { dictionaries = dict; registrations.push({ kind: 'dictionary', ns }); return () => { registrations.push({ kind: 'dictionary-disposed' }) } }, getLocale: () => ({ active: 'en' }), bind: () => (k, params = {}) => String(dictionaries?.en[k] ?? k).replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? '')) },
  slots: {
    inject: (name, contribute) => contribute(),
    register: (options, component) => { registrations.push({ kind: 'register', options, component }); return () => { registrations.push({ kind: 'disposed', id: options.id }) } },
  },
})
const entries = registrations.filter(item => item.kind === 'register')
check(entries.map(item => `${item.options.name}#${item.options.id ?? item.options.key}`).join(',') === 'shell.overlay#okf-dialog,conversation.session.header.utilities#okf-bundle,conversation.input.right#okf-bundle,main#okf-team-wiki,sidebar.panellist#okf-team-wiki,shell.overlay#okf-team-pr,conversation.session.header.utilities#okf-team-pr,conversation.input.right#okf-team-pr', `slot registrations ${entries.map(item => `${item.options.name}#${item.options.id ?? item.options.key}`).join(',')}`)
const panelEntry = entries.find(item => item.options.name === 'sidebar.panellist')
check(panelEntry?.options.label?.() === 'Team Wiki' && client.PANEL_ID === 'okf-team-wiki', `the sidebar entry is labelled Team Wiki: ${String(panelEntry?.options.label?.())}`)
check(renderToStaticMarkup(React.createElement(panelEntry.component, { size: 16 })).startsWith('<svg width="16"'), 'the sidebar glyph honours the requested size')
check(entries.every(item => item.options.locale === 'okf'), 'both entries declare the okf namespace')
check(Object.keys(dictionaries.zh).sort().join('|') === Object.keys(dictionaries.en).sort().join('|'), 'zh and en dictionaries have different keys')
const t = (k, params = {}) => String(dictionaries.en[k] ?? k).replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? ''))
const [dialogEntry, chipEntry, composerEntry] = entries
check(composerEntry?.options.inject('s-1').compact === true && composerEntry.component === chipEntry.component, 'the composer entry is the compact chip')
const store = dialogEntry.options.inject().store
check(chipEntry.options.inject('s-1').store === store, 'both entries share one store')

await store.refreshLibrary()
await store.loadSelection('s-1')
await store.loadSelection('s-2')
check(calls.every(call => !String(call.input).startsWith('/') && call.init.credentials === 'same-origin' && call.init.cache === 'no-store' && call.init.signal instanceof AbortSignal), 'requests must be document-relative, same-origin, no-store, with a deadline')
const chip = (sessionId) => renderToStaticMarkup(React.createElement(chipEntry.component, { ...chipEntry.options.inject(sessionId), sessionId, t }))
check(chip('s-1').includes('OKF · Alpha KB') || chip('s-1').includes('OKF · alpha-kb') || chip('s-1').includes('OKF · remote-a/docs/kb'), `chip with a bundle: ${chip('s-1')}`)
check(chip('s-2').includes('>OKF<'), `chip without a bundle: ${chip('s-2')}`)

const dialog = () => renderToStaticMarkup(React.createElement(dialogEntry.component, { ...dialogEntry.options.inject(), t }))
check(dialog() === '', 'the dialog renders nothing while closed')
store.openDialog({ sessionId: 's-1' })
let html = dialog()
check(html.includes('role="dialog"') && html.includes('This session uses') && html.includes('Library') && html.includes('Add bundle'), `dialog chrome: ${html.slice(0, 400)}`)
check(html.includes('<option value="alpha-kb" selected="">'), 'the session selector shows the session\'s bundle')
check(html.includes('Used by this session'), 'the previewed bundle is marked as the session\'s')
check(clientInjected.join('|') === 'workspaces,uiWorkspace|layout', `optional client services ${clientInjected.join('|')}`)
check(html.includes('>Edit as workspace<') && !html.includes('Editable'), 'a read-only bundle offers Edit as workspace')

// Edit as workspace through DSH's Workspace services: mark editable, register, wait for the row, connect, attach, open.
let outcome = await store.editAsWorkspace('alpha-kb')
check(outcome.opened === true && outcome.entry.id === 'alpha-kb' && outcome.workspace === realpathSync.native(checkoutA), `edit outcome ${JSON.stringify(outcome)}`)
check(wsCalls.join(' | ') === `create ${realpathSync.native(checkoutA)} | connect ws-1 | open s-ws-1`, `workspace calls ${wsCalls.join(' | ')}`)
check((await api('/api/okf/session', { query: { sessionId: 's-ws-1' } })).body?.bundleId === 'alpha-kb', 'the new session has the bundle attached')
check(store.getSnapshot().dialog.open === false, 'the dialog closes once the workspace opens')
failCreate = true
outcome = await store.editAsWorkspace('alpha-kb')
check(outcome.opened === false && outcome.workspace === realpathSync.native(checkoutA) && /invalid-path/.test(outcome.reason ?? ''), `a refused workspace hands the folder back: ${JSON.stringify(outcome)}`)
failCreate = false
store.openDialog({ sessionId: 's-1' })
html = dialog()
check(html.includes('Open editing workspace') && html.includes('>Editable<'), 'an editable bundle offers to reopen its workspace and is marked editable')
await store.select('s-2', 'remote-b-two')
check((await api('/api/okf/session', { query: { sessionId: 's-2' } })).body?.bundleId === 'remote-b-two', 'the store\'s select reached the Host')
const sum = await store.summary('alpha-kb')
check(sum.pages.length === 7, `store summary pages ${String(sum.pages.length)}`)
store.closeDialog()
check(dialog() === '', 'the dialog closes')

// The Team Wiki page: with no repository connected it asks for one.
const mainEntry = entries.find(item => item.options.name === 'main')
const teamPage = () => renderToStaticMarkup(React.createElement(mainEntry.component, { ...mainEntry.options.inject(), t }))
check(mainEntry.options.inject().store === store, 'the Team Wiki page shares the store')
check(teamPage().includes('Loading the team wiki'), 'the page starts loading')
await store.loadTeam()
html = teamPage()
check(html.includes('>Team Wiki<') && html.includes('Connect the team wiki repository') && html.includes('placeholder="blank = repository root"'), `team page without a repository: ${html.slice(0, 500)}`)
const prEntry = entries.find(item => item.options.name === 'conversation.session.header.utilities' && item.options.id === 'okf-team-pr')
check(renderToStaticMarkup(React.createElement(prEntry.component, { ...prEntry.options.inject('s-1'), sessionId: 's-1', t })) === '', 'Open pull request stays hidden outside a maintenance session')
check(client.slugify('Settlement Wiki') === 'settlement' && client.slugify('Payments-Ops') === 'payments-ops', 'folder suggestions')

// Offline: a route nobody registered answers the app's HTML.
const offlineFetch = globalThis.fetch
globalThis.fetch = async () => new Response('<!doctype html>', { status: 200, headers: { 'content-type': 'text/html' } })
const lonely = client.apply
void lonely
await store.refreshLibrary()
check(store.getSnapshot().library.status === 'offline', 'a non-JSON answer reads as offline')
globalThis.fetch = offlineFetch
await store.refreshLibrary()
check(store.getSnapshot().library.status === 'ready', 'the library recovers')

// Markdown: untrusted content renders as text; bundle links resolve in place.
const opened = []
const md = (text, pagePath = 'concepts/alpha.md') => renderToStaticMarkup(React.createElement('div', null, client.renderMarkdown(text, { pagePath, onBundleLink: (p) => { opened.push(p) } })))
const page = await store.page('alpha-kb', 'concepts/alpha.md')
html = md(page.body)
check(!html.includes('<script>') && html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'), 'raw HTML must render as text')
check(!/href="javascript/i.test(html) && html.includes('>evil</span>'), 'a javascript: link must not become an href')
check(html.includes('href="https://example.com"') && html.includes('rel="noopener noreferrer"') && html.includes('target="_blank"'), 'external links open safely in a new tab')
check(html.includes('<strong>rotates</strong>') && html.includes('gearbox</code>'), 'emphasis and inline code')
check(html.includes('title="concepts/beta.md"') && html.includes('title="entities/gamma.md"'), `bundle links resolve: ${html}`)
check(/<table[^>]*>.*<th[^>]*>Key<\/th>.*text-align:right/.test(html), 'tables with alignment')
check(/<ul[^>]*><li[^>]*>one<\/li><li[^>]*>two<ul[^>]*><li[^>]*>nested<\/li><\/ul><\/li><\/ul>/.test(html), `nested lists: ${html.match(/<ul.*<\/ul>/)?.[0]}`)
check(html.includes('const x = &quot;&lt;b&gt;&quot;'), 'fenced code is escaped')
check(client.bundleTarget('../entities/x.md', 'concepts/a.md') === 'entities/x.md' && client.bundleTarget('/x.md', 'a/b/c.md') === 'x.md', 'relative and root links')
check(client.bundleTarget('../../x.md', 'concepts/a.md') === undefined && client.bundleTarget('https://a.b/c.md', 'a.md') === undefined, 'links leaving the bundle are not bundle links')

for (const dispose of disposers.reverse()) dispose()
check(registrations.filter(item => item.kind === 'disposed').length === 8 && registrations.some(item => item.kind === 'dictionary-disposed'), 'disposal removes every entry and the dictionaries')
const unexpected = [...new Set(requested)].filter(specifier => specifier !== 'react' && specifier !== 'react/jsx-runtime')
check(unexpected.length === 0, `artifact requested non-platform modules: ${unexpected.join(', ')}`)

rmSync(work, { recursive: true, force: true })

if (failures.length > 0) {
  for (const failure of failures) console.error(`smoke: FAIL — ${failure}`)
  process.exit(1)
}
console.log('smoke: OK')
console.log(`  id             ${manifest.name}`)
console.log(`  host routes    ${[...routes.keys()].join(' ')}`)
console.log(`  client inject  ${JSON.stringify(client.inject)}`)
console.log(`  table requests ${[...new Set(requested)].join(', ')}`)
process.exit(0)
