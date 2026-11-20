/**
 * Smoke-test the team wiki hub layout on GitHub Enterprise:
 *
 *     AGENTS.md                 project registry (Project | Repo | Summary | Owner | Bundle)
 *     scripts/okf.py            shared toolchain
 *     payments/                 one OKF bundle per project, at the repository root
 *     published/Projects/Payments/   what kb-publish rendered for the ADO wiki
 *
 * Like team-smoke.mjs: a bare repository behind `url.insteadOf`, a local HTTP
 * server for the GitHub (Enterprise) REST API, the built Host module on a stub
 * context, and the built CI checker. Checks: the registry drives the project
 * list (summary, owner, repo, a registered but missing folder, publish
 * status), a new page is eligible, a change under published/ needs a person,
 * New project wiki adds a registry row and opens one pull request with both,
 * and check-pr maps each change through the registry.
 *
 * Needs a knowledgeAgent checkout (see team-smoke.mjs). Usage: node scripts/hub-smoke.mjs
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const fixture = [process.env.WIKI_FIXTURE, join(root, '..', 'knowledgeAgent'), '/home/user/knowledgeAgent']
  .filter(Boolean).map(path => resolve(path)).find(path => existsSync(join(path, 'okf', 'SCHEMA.md')) && existsSync(join(path, 'scripts', 'okf.py')))
if (fixture === undefined) {
  console.error('hub-smoke: no OKF fixture. Set WIKI_FIXTURE to a knowledgeAgent checkout (with okf/ and scripts/okf.py).')
  process.exit(2)
}
const python = process.env.PYTHON ?? (process.platform === 'win32' ? 'python' : 'python3')
const work = realpathSync.native(mkdtempSync(join(tmpdir(), 'dsh-okf-hub-')))
const failures = []
const check = (condition, message) => { if (!condition) failures.push(message) }
const git = (cwd, ...args) => execFileSync('git', ['-c', 'user.name=smoke', '-c', 'user.email=smoke@example.invalid', '-c', 'init.defaultBranch=main', '-c', 'core.autocrlf=false', ...args], { cwd, encoding: 'utf8' }).trim()

// ── 1 · the hub repository ────────────────────────────────────────────────
const seed = join(work, 'seed')
mkdirSync(join(seed, 'scripts'), { recursive: true })
cpSync(join(fixture, 'okf'), join(seed, 'payments'), { recursive: true })
cpSync(join(fixture, 'scripts', 'okf.py'), join(seed, 'scripts', 'okf.py'))
mkdirSync(join(seed, 'published', 'Projects', 'Payments'), { recursive: true })
writeFileSync(join(seed, 'published', 'Projects', 'Payments.md'), '# Payments\n')
writeFileSync(join(seed, 'published', 'Projects', 'Payments', 'Overview.md'), '# Overview\n\nRendered by kb-publish.\n')
writeFileSync(join(seed, 'AGENTS.md'), [
  '# Team wiki hub', '',
  'Agents: find a project here, then read its bundle\'s index.md.', '',
  '## Project registry', '',
  '| Project | Repo | Summary | Owner | Bundle |',
  '|---|---|---|---|---|',
  '| Payments | [payments-service](https://github.acme.com/pay/payments-service) | Card and wallet payments | @alice | `payments/` |',
  '| Ledger | — | Double-entry ledger | @bob | `ledger/` |',
  '',
  '## Rules', '', 'Pages an agent writes are unreviewed until a person reviews them.', '',
].join('\n'))
git(seed, 'init', '-q')
git(seed, 'add', '-A')
git(seed, 'commit', '-qm', 'seed hub')
const origin = join(work, 'origin.git')
const emptyOrigin = join(work, 'empty.git')
git(work, 'clone', '-q', '--bare', seed, origin)
git(origin, 'symbolic-ref', 'HEAD', 'refs/heads/main')

const URL_ = 'https://github.acme.com/acme/hub'
// The Payments code repository (registry Repo column), for Initialize from code.
const codeSeed = join(work, 'code-seed')
mkdirSync(join(codeSeed, 'src'), { recursive: true })
writeFileSync(join(codeSeed, 'README.md'), '# payments-service\n\nCard and wallet payments.\n')
writeFileSync(join(codeSeed, 'src', 'main.ts'), 'export function pay(): void {}\n')
git(codeSeed, 'init', '-q')
git(codeSeed, 'add', '-A')
git(codeSeed, 'commit', '-qm', 'code')
const codeOrigin = join(work, 'code.git')
git(work, 'clone', '-q', '--bare', codeSeed, codeOrigin)
process.env.GIT_CONFIG_COUNT = '3'
process.env.GIT_CONFIG_KEY_2 = `url.${pathToFileURL(codeOrigin).href}.insteadOf`
process.env.GIT_CONFIG_VALUE_2 = 'https://github.acme.com/pay/payments-service'
process.env.GIT_CONFIG_KEY_0 = `url.${pathToFileURL(origin).href}.insteadOf`
process.env.GIT_CONFIG_VALUE_0 = URL_
process.env.GIT_CONFIG_KEY_1 = 'protocol.file.allow'
process.env.GIT_CONFIG_VALUE_1 = 'always'
process.env.DSH_OKF_GITHUB_TOKEN = 'smoke-token'

// ── 2 · a stand-in for the GitHub Enterprise REST API (/api/v3) ──────────
const pulls = []
let failPulls = false
const seen = []
const server = createServer((request, response) => {
  let body = ''
  request.on('data', (chunk) => { body += chunk })
  request.on('end', () => {
    const url = new URL(request.url ?? '/', 'http://x')
    seen.push(`${request.method} ${url.pathname}`)
    const send = (status, value) => { response.writeHead(status, { 'content-type': 'application/json' }); response.end(JSON.stringify(value)) }
    const repoName = url.pathname.startsWith('/api/v3/repos/acme/empty/') ? 'empty' : 'hub'
    const base = `/api/v3/repos/acme/${repoName}`
    const bare = repoName === 'empty' ? emptyOrigin : origin
    const json = body === '' ? {} : JSON.parse(body)
    const view = pull => ({ number: pull.number, title: pull.title, html_url: `${URL_}/pull/${String(pull.number)}`, draft: false, updated_at: '2026-11-19T08:00:00Z', user: { login: 'dsh-bot' }, head: { ref: pull.head, sha: git(bare, 'rev-parse', `refs/heads/${pull.head}`) }, base: { ref: pull.base }, labels: pull.labels.map(name => ({ name })), state: pull.state, merged: pull.merged === true })
    if (request.method === 'GET' && url.pathname === '/api/v3/user') return send(200, { login: 'alice-gh' })
    if (request.method === 'GET' && url.pathname === `${base}/pulls`) {
      const head = url.searchParams.get('head')
      return send(200, pulls.filter(pull => pull.state === 'open' && (head === null || `acme:${pull.head}` === head)).map(view))
    }
    if (request.method === 'POST' && url.pathname === `${base}/pulls` && failPulls) {
      failPulls = false
      return send(401, { message: 'Bad credentials' })
    }
    if (request.method === 'POST' && url.pathname === `${base}/pulls`) {
      const pull = { number: pulls.length + 1, title: json.title, body: json.body, head: json.head, base: json.base, labels: [], state: 'open' }
      pulls.push(pull)
      git(bare, 'update-ref', `refs/pull/${String(pull.number)}/head`, `refs/heads/${pull.head}`)
      return send(201, view(pull))
    }
    let match = new RegExp(`^${base}/pulls/(\\d+)$`).exec(url.pathname)
    if (match !== null) {
      const pull = pulls[Number(match[1]) - 1]
      if (pull === undefined) return send(404, { message: 'Not Found' })
      if (request.method === 'PATCH') {
        Object.assign(pull, { ...'title' in json ? { title: json.title } : {}, body: json.body })
        git(bare, 'update-ref', `refs/pull/${String(pull.number)}/head`, `refs/heads/${pull.head}`)
      }
      return send(200, view(pull))
    }
    match = new RegExp(`^${base}/issues/(\\d+)/labels(?:/(.+))?$`).exec(url.pathname)
    if (match !== null) {
      const pull = pulls[Number(match[1]) - 1]
      if (request.method === 'POST') pull.labels = [...new Set([...pull.labels, ...json.labels])]
      if (request.method === 'DELETE') {
        const name = decodeURIComponent(match[2] ?? '')
        if (!pull.labels.includes(name)) return send(404, { message: 'Label does not exist' })
        pull.labels = pull.labels.filter(label => label !== name)
      }
      return send(200, pull.labels.map(name => ({ name })))
    }
    if (request.method === 'GET' && /\/commits\/[^/]+\/check-runs$/.test(url.pathname)) return send(200, { check_runs: [] })
    return send(404, { message: `no mock for ${request.method} ${url.pathname}` })
  })
})
await new Promise((done) => { server.listen(0, '127.0.0.1', done) })
const githubApi = `http://127.0.0.1:${String(server.address().port)}/api/v3`

// ── 3 · the Host half ─────────────────────────────────────────────────────
const host = await import(pathToFileURL(join(root, 'lib', 'index.js')).href)
const routes = new Map()
const libraryDir = join(work, 'library')
host.apply({
  connection: { fetch: { register: (route) => { routes.set(route.path, route); return async () => {} } } },
  inject: (_deps, callback) => { callback({ systemPrompt: { context: () => () => {} } }) },
}, { libraryDir, team: { githubHost: 'github.acme.com', githubApi, python, agentActor: 'dsh/smoke' } })

async function api(path, { method = 'GET', query, body } = {}) {
  const route = routes.get(path)
  if (route === undefined) throw new Error(`no route ${path}`)
  const url = `http://127.0.0.1:3080${path}${query === undefined ? '' : `?${new URLSearchParams(query)}`}`
  const response = await route.fetch(new Request(url, { method, ...body === undefined ? {} : { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } } }))
  const text = await response.text()
  return { status: response.status, body: text === '' ? null : JSON.parse(text) }
}
const must = (answer, label) => {
  if (answer.status !== 200) {
    console.error(`hub-smoke: ${label} answered ${String(answer.status)} ${JSON.stringify(answer.body)}`)
    server.close()
    process.exit(1)
  }
  return answer.body
}
const checker = (cwd, head) => spawnSync(process.execPath, [join(root, 'lib', 'check-pr.js'), 'origin/main', head], { cwd, encoding: 'utf8', env: { ...process.env, GITHUB_OUTPUT: join(work, 'gh-output') } })

// ── Connect: the registry is the project list ──
let status = must(await api('/api/okf/team/connect', { method: 'POST', body: { url: URL_ } }), 'connect')
check(status.team.provider === 'github' && status.team.root === '' && status.hasToken === true, `GHE remote is GitHub: ${JSON.stringify(status.team)}`)
const [payments, ledger] = status.wikis
check(status.wikis.length === 2 && payments?.folder === 'payments' && payments.name === 'Payments' && payments.registered === true, `registry projects: ${JSON.stringify(status.wikis)}`)
check(payments?.summary === 'Card and wallet payments' && payments.owner === '@alice' && payments.repo === 'https://github.acme.com/pay/payments-service' && payments.missing !== true, `registry columns: ${JSON.stringify(payments)}`)
check(payments?.published?.path === 'published/Projects/Payments' && /^\d{4}-\d{2}-\d{2}$/.test(payments.published.updated ?? ''), `publish status: ${JSON.stringify(payments?.published)}`)
check(ledger?.folder === 'ledger' && ledger.missing === true && ledger.published === undefined, `registered but missing: ${JSON.stringify(ledger)}`)
check(!status.wikis.some(wiki => wiki.folder === 'published' || wiki.folder === 'scripts'), 'published/ and scripts/ are not projects')

// ── Maintain Payments: a new page alone is eligible ──
const maintained = must(await api('/api/okf/team/maintain', { method: 'POST', body: { folder: 'payments' } }), 'maintain')
const record = maintained.record
const ws = maintained.workspace
check(record.wiki === 'payments' && record.wikiName === 'Payments' && maintained.entry.root === join(ws, 'payments') && maintained.entry.team?.project === 'Payments', `maintain: ${JSON.stringify(maintained.entry)}`)
const today = new Date().toISOString().slice(0, 10)
writeFileSync(join(ws, 'payments', 'concepts', 'refunds.md'), [
  '---', 'type: Concept', 'title: Refunds', 'description: How a card payment is refunded.',
  'status: draft', 'lifecycle: draft', `created: ${today}`, `updated: ${today}`, 'generated:', '  by: dsh/smoke', `  at: ${today}`, 'tags: []', '---', '',
  '# Refunds', '', 'Refunds go back to the original card. See [the lifecycle](/concepts/knowledge-lifecycle.md).', '',
].join('\n'))
const suggested = must(await api('/api/okf/team/changes', { query: { id: record.id } }), 'changes').suggested
check(suggested?.title === 'Add Refunds' && suggested.summary.startsWith('In the Payments wiki, adds 1 page.') && suggested.summary.includes('- Refunds — How a card payment is refunded. (`concepts/refunds.md`)'), `suggested PR text: ${JSON.stringify(suggested)}`)
let pr = must(await api('/api/okf/team/open-pr', { method: 'POST', body: { id: record.id } }), 'open-pr 1')
check(pulls[0]?.title === 'Add Refunds' && pulls[0].body.includes('- Refunds — How a card payment is refunded.'), `the suggestion is used when the dialog is left empty: ${pulls[0]?.title} ${pulls[0]?.body.slice(0, 300)}`)
check(pr.eligible === true && pr.pr?.number === 1 && pr.files.every(path => path.startsWith('payments/')), `pr 1: ${JSON.stringify(pr)}`)
check(pulls[0]?.labels.includes('wiki-auto-merge') && seen.some(line => line === 'POST /api/v3/repos/acme/hub/pulls'), `pr 1 on GHE: ${seen.join(' | ')}`)
const clone = join(work, 'ci')
git(work, 'clone', '-q', origin, clone)
git(clone, 'checkout', '-q', record.branch)
let ci = checker(clone, 'HEAD')
check(ci.status === 0 && ci.stdout.includes('project wiki: payments') && readFileSync(join(work, 'gh-output'), 'utf8').includes('wiki=payments'), `check-pr via registry: ${ci.status} ${ci.stdout} ${ci.stderr}`)

// ── A change to its published pages goes in the same PR and needs a person ──
writeFileSync(join(ws, 'published', 'Projects', 'Payments', 'Overview.md'), '# Overview\n\nRendered again by kb-publish, with refunds.\n')
writeFileSync(join(ws, 'published', 'Projects', 'Other.md'), '# not this project\n')
pr = must(await api('/api/okf/team/open-pr', { method: 'POST', body: { id: record.id } }), 'open-pr 2')
check(pr.eligible === false && pr.files.includes('published/Projects/Payments/Overview.md') && !pr.files.includes('published/Projects/Other.md') && pr.reasons.some(reason => reason.includes('published')), `pr 2: ${JSON.stringify(pr)}`)
check(pr.pr?.reused === true && !pulls[0].labels.includes('wiki-auto-merge'), 'the label comes off')
git(clone, 'fetch', '-q', 'origin')
ci = checker(clone, `origin/${record.branch}`)
check(ci.status === 1 && ci.stdout.includes('project wiki: payments') && ci.stdout.includes('published'), `check-pr published: ${ci.status} ${ci.stdout} ${ci.stderr}`)
let list = must(await api('/api/okf/team/pulls', { query: { refresh: '1' } }), 'pulls')
check(list.pulls.length === 1 && list.pulls[0].wikis.join() === 'payments' && list.pulls[0].eligible === false, `pulls: ${JSON.stringify(list.pulls)}`)

// ── Publish: render the bundle into published/Projects/ in the same workspace and PR ──
let published = must(await api('/api/okf/team/publish', { method: 'POST', body: { folder: 'payments' } }), 'publish')
const pub = join(ws, 'published', 'Projects')
check(published.created === false && published.record.id === record.id && published.dir === 'published/Projects/Payments' && published.pr?.pr?.number === 1 && published.pr.pr.reused === true && published.pr.eligible === false, `publish reuses the workspace and PR: ${JSON.stringify({ ...published, skipped: published.skipped.length })}`)
check(published.pr.files.includes('published/Projects/Payments.md') && published.pr.files.includes('published/Projects/Payments/Concepts/Refunds.md') && published.pr.files.includes('published/Projects/Payments/Concepts.md'), `published files: ${published.pr.files.filter(path => path.startsWith('published/')).join(', ')}`)
check(!existsSync(join(pub, 'Payments', 'Overview.md')) && existsSync(join(pub, 'Other.md')) && !published.pr.files.includes('published/Projects/Other.md'), 'regenerates only its own folder: a stale page goes, another project stays')
check(published.skipped.some(item => item.path.startsWith('sources/')) && !existsSync(join(pub, 'Payments', 'Sources')) && !existsSync(join(pub, 'Payments', 'Log.md')), `sources and log are not published: ${JSON.stringify(published.skipped)}`)
const refunds = readFileSync(join(pub, 'Payments', 'Concepts', 'Refunds.md'), 'utf8')
check(refunds.startsWith('# Refunds\n\n> **Unreviewed.** Written by dsh/smoke') && refunds.includes('[the lifecycle](/Projects/Payments/Concepts/The-Knowledge-Lifecycle)') && !refunds.includes('lifecycle: draft') && refunds.includes('https://github.com/acme/hub/blob/main/payments/concepts/refunds.md'.replace('github.com', 'github.acme.com')), `rendered page: ${refunds}`)
check(readFileSync(join(pub, 'Payments', 'Concepts', 'The-Knowledge-Lifecycle.md'), 'utf8').includes('> **Unreviewed.**'), 'the review state is on every page')
const landing = readFileSync(join(pub, 'Payments.md'), 'utf8')
check(landing.startsWith('# Payments\n\nCard and wallet payments\n\nOwner: @alice · [Code repository](https://github.acme.com/pay/payments-service)') && landing.includes('](/Projects/Payments/Concepts/') && !/\]\(\/concepts\//.test(landing), `landing page: ${landing.slice(0, 900)}`)
git(clone, 'fetch', '-q', 'origin')
ci = checker(clone, `origin/${record.branch}`)
check(ci.status === 1 && ci.stdout.includes('project wiki: payments') && ci.stdout.includes('published/Projects/Payments.md'), `check-pr maps the landing page: ${ci.status} ${ci.stdout} ${ci.stderr}`)
published = must(await api('/api/okf/team/publish', { method: 'POST', body: { folder: 'payments' } }), 'publish again')
check(published.unchanged === true && published.pr === undefined, `publishing an unchanged bundle proposes nothing: ${JSON.stringify(published.prError ?? published.unchanged)}`)

// ── Initialize from code: a read-only checkout in .code/, outside every pull request ──
// The one button: Sync from code on a wiki never synced reads the code through, as Initialize does.
const init = must(await api('/api/okf/team/sync', { method: 'POST', body: { folder: 'payments' } }), 'first sync')
check(init.sync?.fallback === true && init.sync.to === init.initialize?.commit, `the first sync is a read-through: ${JSON.stringify(init.sync)}`)
check(init.record.id === record.id && init.initialize?.code === '.code/payments' && init.initialize.repo === 'https://github.acme.com/pay/payments-service' && /^[0-9a-f]{40}$/.test(init.initialize.commit), `initialize: ${JSON.stringify(init.initialize ?? init)}`)
check(existsSync(join(ws, '.code', 'payments', 'src', 'main.ts')) && /^\/\.code\/$/m.test(readFileSync(join(ws, '.git', 'info', 'exclude'), 'utf8')) && !git(ws, 'status', '--porcelain').includes('.code'), 'the code is checked out and ignored')
const prompt = init.initialize?.prompt ?? ''
check(prompt.includes('`.code/payments/`') && prompt.includes('`payments/`') && prompt.includes('lifecycle: draft') && prompt.includes('generated: { by: dsh/smoke') && prompt.includes(`https://github.acme.com/pay/payments-service/blob/${init.initialize?.commit ?? ''}/<path>`) && prompt.includes('Never edit anything under `.code/`'), `prompt: ${prompt}`)
check(readFileSync(join(ws, 'payments', 'SCHEMA.md'), 'utf8').includes(`code_commit: ${init.initialize?.commit ?? '?'}`), 'Initialize records the code commit in SCHEMA.md')
writeFileSync(join(ws, 'payments', 'concepts', 'overview.md'), [
  '---', 'type: Concept', 'title: Overview', 'description: What payments-service does.', 'status: draft', 'lifecycle: draft', 'updated: 2026-11-20',
  'sources:', `  - id: main`, `    resource: https://github.acme.com/pay/payments-service/blob/${init.initialize?.commit ?? ''}/src/main.ts`, '---', '', '# Overview', '', 'It pays.', '',
].join('\n'))
pr = must(await api('/api/okf/team/open-pr', { method: 'POST', body: { id: record.id } }), 'open-pr after initialize')
check(!pr.files.some(path => path.startsWith('.code/')) && !pr.notes.some(note => note.includes('.code')), `the checkout stays out of the pull request: ${pr.files.join(', ')} | ${pr.notes.join(' | ')}`)
answer: {
  const noRepo = await api('/api/okf/team/initialize', { method: 'POST', body: { folder: 'ledger' } })
  check(noRepo.status !== 200, `a project without a code repository is refused: ${JSON.stringify(noRepo.body)}`)
}

// ── Sync from code: Refresh notices new code commits; Sync diffs them and names the pages that cite them ──
const codeBefore = init.initialize?.commit ?? ''
git(origin, 'update-ref', 'refs/heads/main', `refs/heads/${record.branch}`)
status = must(await api('/api/okf/team/refresh', { method: 'POST', body: {} }), 'refresh with code check')
let paymentsCode = status.wikis.find(wiki => wiki.folder === 'payments')?.code
check(paymentsCode?.recorded === codeBefore && paymentsCode.head === codeBefore && paymentsCode.behind === undefined, `code in step: ${JSON.stringify(paymentsCode)}`)
const upToDate = must(await api('/api/okf/team/sync', { method: 'POST', body: { folder: 'payments' } }), 'sync up to date')
check(upToDate.upToDate === true && upToDate.commit === codeBefore, `nothing new to sync: ${JSON.stringify(upToDate)}`)
writeFileSync(join(codeSeed, 'src', 'main.ts'), 'export function pay(amount: number): void {}\n')
writeFileSync(join(codeSeed, 'src', 'refund.ts'), 'export function refund(): void {}\n')
git(codeSeed, 'add', '-A')
git(codeSeed, 'commit', '-qm', 'Pay an amount; add refunds')
git(codeSeed, 'push', '-q', codeOrigin, 'HEAD:main')
const codeAfter = git(codeSeed, 'rev-parse', 'HEAD')
status = must(await api('/api/okf/team/refresh', { method: 'POST', body: {} }), 'refresh after a code commit')
paymentsCode = status.wikis.find(wiki => wiki.folder === 'payments')?.code
check(paymentsCode?.behind === true && paymentsCode.head === codeAfter && paymentsCode.recorded === codeBefore, `code updated: ${JSON.stringify(paymentsCode)}`)
check(status.wikis.find(wiki => wiki.folder === 'ledger')?.code === undefined, 'a project without a repository has no code state')
const synced = must(await api('/api/okf/team/sync', { method: 'POST', body: { folder: 'payments' } }), 'sync')
check(synced.record?.id === record.id && synced.sync?.from === codeBefore && synced.sync.to === codeAfter && synced.sync.files === 2 && synced.sync.pages === 1, `sync: ${JSON.stringify(synced.sync)}`)
const syncTask = synced.initialize?.prompt ?? ''
check(syncTask.includes('- concepts/overview.md: src/main.ts') && syncTask.includes('- modified: src/main.ts') && syncTask.includes('- added: src/refund.ts') && syncTask.includes('Pay an amount; add refunds') && syncTask.includes(`blob/${codeAfter}/<path>`), `sync task: ${syncTask}`)
check(readFileSync(join(ws, 'payments', 'SCHEMA.md'), 'utf8').includes(`code_commit: ${codeAfter}`) && existsSync(join(ws, '.code', 'payments', 'src', 'refund.ts')), 'the workspace records the new commit and has the new code')

// ── Mark reviewed: stamps the person behind the token and needs a person to merge ──
answer: {
  const bad = await api('/api/okf/team/review', { method: 'POST', body: { folder: 'payments', paths: ['../AGENTS.md'] } })
  check(bad.status === 400 || bad.status === 422, `a path outside the wiki is refused: ${JSON.stringify(bad.body)}`)
}
const reviewed = must(await api('/api/okf/team/review', { method: 'POST', body: { folder: 'payments', paths: ['concepts/overview.md', 'concepts/missing.md'] } }), 'mark reviewed')
const overviewText = readFileSync(join(ws, 'payments', 'concepts', 'overview.md'), 'utf8')
check(reviewed.reviewer === 'alice-gh' && reviewed.marked.length === 1 && reviewed.skipped.length === 1 && reviewed.record.id === record.id, `review: ${JSON.stringify({ ...reviewed, entry: undefined })}`)
check(/verified:\n {2}- by: human:alice-gh\n {4}at: \d{4}-\d{2}-\d{2}/.test(overviewText) && overviewText.includes('lifecycle: active') && overviewText.includes('status: stable') && /stale_after: \d{4}-\d{2}-\d{2}/.test(overviewText), `marked page: ${overviewText}`)
check(reviewed.pr?.pr !== undefined && reviewed.pr.eligible === false && !reviewed.pr.stamped.includes('concepts/overview.md'), `the review PR needs a person and is not reset: ${JSON.stringify(reviewed.pr ?? reviewed.prError)}`)
const preview = must(await api('/api/okf/team/attach', { method: 'POST', body: { folder: 'payments' } }), 'attach payments')
check(preview.entry.id === 'team-main-payments' && preview.entry.teamWiki === 'payments' && preview.entry.id !== record.entryId, `preview entry stays apart from the workspace entry: ${JSON.stringify(preview.entry)}`)

// ── New project wiki: a bundle at the root plus a registry row, one PR ──
const created = must(await api('/api/okf/team/create', { method: 'POST', body: { name: 'Settlement', template: 'copy:payments', repo: 'https://github.acme.com/pay/settlement', owner: '@carol', summary: 'Daily settlement | batches', initialize: true } }), 'create')
check(created.initialize === undefined && typeof created.initializeError === 'string', `an unreachable code repository does not stop New project wiki: ${created.initializeError}`)
const nws = created.workspace
check(created.record.wiki === 'settlement' && created.entry.root === join(nws, 'settlement'), `create: ${JSON.stringify(created.record)}`)
check(created.prError === undefined && created.pr?.files.includes('AGENTS.md') && created.pr.files.includes('settlement/SCHEMA.md') && created.pr.eligible === false && created.pr.reasons.some(reason => reason.includes('AGENTS.md')), `setup PR: ${JSON.stringify(created.pr ?? created.prError)}`)
const agents = readFileSync(join(nws, 'AGENTS.md'), 'utf8')
check(agents.includes('| Settlement | https://github.acme.com/pay/settlement | Daily settlement \\| batches | @carol | `settlement/` |') && agents.indexOf('| Settlement') < agents.indexOf('## Rules'), `registry row: ${agents}`)
check(git(nws, 'status', '--porcelain') === '', 'nothing left uncommitted')
answer: {
  const again = await api('/api/okf/team/create', { method: 'POST', body: { name: 'ledger' } })
  check(again.status === 409, `a registered name is refused: ${JSON.stringify(again.body)}`)
}
git(clone, 'fetch', '-q', 'origin')
ci = checker(clone, `origin/${created.record.branch}`)
check(ci.status === 1 && ci.stdout.includes('project wiki: settlement') && ci.stdout.includes('AGENTS.md'), `check-pr new project: ${ci.status} ${ci.stdout} ${ci.stderr}`)

// A setup pull request that failed to open (say, no token yet) can be opened later from its card.
failPulls = true
const shadow = must(await api('/api/okf/team/create', { method: 'POST', body: { name: 'Shadow' } }), 'create without a pull request')
check(shadow.pr === undefined && typeof shadow.prError === 'string', `the setup PR failed: ${JSON.stringify(shadow.prError)}`)
status = must(await api('/api/okf/team'), 'status with a pending wiki')
check(status.maintains.some(item => item.id === shadow.record.id && item.pr === undefined) && !status.wikis.some(wiki => wiki.folder === 'shadow'), 'the new wiki waits without a pull request')
const reopened = must(await api('/api/okf/team/maintain', { method: 'POST', body: { folder: 'shadow' } }), 'open the pending workspace')
check(reopened.record.id === shadow.record.id && reopened.created === false, 'Open workspace on a pending wiki reuses its workspace')
const shadowPr = must(await api('/api/okf/team/open-pr', { method: 'POST', body: { id: shadow.record.id } }), 'open the missing setup PR')
check(shadowPr.pr?.number !== undefined && shadowPr.files.includes('shadow/SCHEMA.md') && shadowPr.files.includes('AGENTS.md'), `setup PR opened later: ${JSON.stringify(shadowPr)}`)
for (const pull of pulls) if (pull.number === shadowPr.pr?.number) pull.state = 'closed'

// After merge the registry lists it with its columns.
git(origin, 'update-ref', 'refs/heads/main', `refs/heads/${created.record.branch}`)
status = must(await api('/api/okf/team/refresh', { method: 'POST', body: {} }), 'refresh')
const settlement = status.wikis.find(wiki => wiki.folder === 'settlement')
check(settlement?.name === 'Settlement' && settlement.owner === '@carol' && settlement.summary === 'Daily settlement | batches' && settlement.published === undefined, `after merge: ${JSON.stringify(status.wikis)}`)

// ── An empty repository: connect, then Set up the hub ──
git(work, 'init', '-q', '--bare', emptyOrigin)
const EMPTY_URL = 'https://github.acme.com/acme/empty'
process.env.GIT_CONFIG_COUNT = '4'
process.env.GIT_CONFIG_KEY_3 = `url.${pathToFileURL(emptyOrigin).href}.insteadOf`
process.env.GIT_CONFIG_VALUE_3 = EMPTY_URL
status = must(await api('/api/okf/team/connect', { method: 'POST', body: { url: EMPTY_URL, ref: 'main' } }), 'connect empty')
check(status.empty === true && status.commit === undefined && status.wikis.length === 0 && status.baseBranch === 'main', `an empty repository connects: ${JSON.stringify(status)}`)
status = must(await api('/api/okf/team/refresh', { method: 'POST', body: {} }), 'refresh empty')
check(status.empty === true, 'refresh keeps it empty')
status = must(await api('/api/okf/team/setup', { method: 'POST', body: {} }), 'setup')
check(status.empty === undefined && /^[0-9a-f]{40}$/.test(status.commit ?? '') && status.wikis.length === 0, `set up: ${JSON.stringify(status)}`)
const tree = git(emptyOrigin, 'ls-tree', '-r', '--name-only', 'main').split('\n')
check(['AGENTS.md', 'README.md', 'scripts/okf.py', 'published/Projects/.gitkeep', '.github/wiki/check-pr.js', '.github/wiki/workflows/wiki-auto-merge.yml', '.github/wiki/workflows/wiki-publish-to-ado.yml'].every(path => tree.includes(path)), `hub skeleton: ${tree.join(', ')}`)
answer: {
  const again = await api('/api/okf/team/setup', { method: 'POST', body: {} })
  check(again.status === 409 && again.body.error.code === 'not-empty', `a second setup is refused: ${JSON.stringify(again.body)}`)
}
const first = must(await api('/api/okf/team/create', { method: 'POST', body: { name: 'Payments', owner: '@alice' } }), 'create in new hub')
const firstAgents = readFileSync(join(first.workspace, 'AGENTS.md'), 'utf8')
check(first.record.wiki === 'payments' && /\|---\|---\|---\|---\|---\|\n\| Payments \| — \| — \| @alice \| `payments\/` \|/.test(firstAgents) && first.pr?.files.includes('payments/index.md'), `first project in the new hub: ${first.prError ?? ''} ${firstAgents.slice(-300)}`)

// Merged on GitHub: the next pull-request check moves main/ and the new wiki leaves "not merged".
check(first.pr?.pr?.number !== undefined, 'the first project opened a pull request')
for (const pull of pulls) if (pull.number !== first.pr?.pr?.number) pull.state = 'closed'
git(emptyOrigin, 'update-ref', 'refs/heads/main', `refs/heads/${first.record.branch}`)
Object.assign(pulls[(first.pr?.pr?.number ?? 1) - 1], { state: 'closed', merged: true })
const afterMerge = must(await api('/api/okf/team/pulls', { query: { refresh: '1' } }), 'pulls after merge')
check(afterMerge.statusChanged === true, `a merge is reported: ${JSON.stringify(afterMerge)}`)
status = must(await api('/api/okf/team'), 'status after merge')
check(status.wikis.some(wiki => wiki.folder === 'payments') && !status.maintains.some(record => record.id === first.record.id) && status.commit === git(emptyOrigin, 'rev-parse', 'main'), `the merged wiki is listed: ${JSON.stringify(status)}`)
const cached = must(await api('/api/okf/team/pulls'), 'cached pulls')
check(cached.statusChanged === undefined, 'a cached answer does not report the merge again')

// A finished workspace of the older one-folder-per-round layout is tidied on refresh; one with uncommitted work stays.
{
  const teamDir = join(first.workspace, '..', '..')
  const legacy = join(teamDir, 'work', 'payments-20261101-0900-abcd')
  const dirtyLegacy = join(teamDir, 'work', 'payments-20261102-0900-ef01')
  for (const dir of [legacy, dirtyLegacy]) git(join(teamDir, 'work'), 'clone', '--quiet', emptyOrigin, dir)
  writeFileSync(join(dirtyLegacy, 'notes.md'), 'unsaved\n')
  const teamFile = join(teamDir, 'team.json')
  const saved = JSON.parse(readFileSync(teamFile, 'utf8'))
  for (const [id, dir] of [['payments-20261101-0900-abcd', legacy], ['payments-20261102-0900-ef01', dirtyLegacy]]) {
    saved.maintains.push({ id, wiki: 'payments', wikiName: 'Payments', branch: `wiki/${id}`, workspace: realpathSync(dir), entryId: `team-${id}`, createdAt: '2026-11-01T09:00:00Z', closed: 'merged' })
  }
  writeFileSync(teamFile, JSON.stringify(saved, null, 2))
  must(await api('/api/okf/team/refresh', { method: 'POST', body: {} }), 'refresh sweeps')
  check(!existsSync(legacy) && existsSync(join(dirtyLegacy, 'notes.md')) && existsSync(first.workspace), 'old finished workspaces are removed, unsaved ones kept')
}

// The next round reuses the project's one folder, reset to the merged main on a new branch.
writeFileSync(join(first.workspace, 'payments', 'scratch.md'), 'left over\n')
const round2 = must(await api('/api/okf/team/maintain', { method: 'POST', body: { folder: 'payments' } }), 'maintain after merge')
check(round2.created === true && round2.workspace === first.workspace && round2.record.branch !== first.record.branch && round2.entry.id === first.entry.id, `one folder per project: ${round2.workspace} vs ${first.workspace}`)
check(git(round2.workspace, 'rev-parse', 'HEAD') === git(emptyOrigin, 'rev-parse', 'main') && git(round2.workspace, 'rev-parse', '--abbrev-ref', 'HEAD') === round2.record.branch, 'reset to the latest main on the new branch')
check(!existsSync(join(round2.workspace, 'payments', 'scratch.md')) && git(round2.workspace, 'stash', 'list').includes('dsh-okf: left over on'), 'leftovers are stashed, not lost')
const again2 = must(await api('/api/okf/team/maintain', { method: 'POST', body: { folder: 'payments' } }), 'maintain again')
check(again2.created === false && again2.record.id === round2.record.id, 'an open round is reused')

server.close()
rmSync(work, { recursive: true, force: true })
if (failures.length > 0) {
  for (const failure of failures) console.error(`hub-smoke: FAIL — ${failure}`)
  process.exit(1)
}
console.log('hub-smoke: OK')
console.log(`  fixture        ${fixture}`)
console.log(`  github calls   ${String(seen.length)}`)
process.exit(0)
