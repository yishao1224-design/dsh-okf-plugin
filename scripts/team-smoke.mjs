/**
 * Smoke-test the Team Wiki end to end, without a Harness, a browser or the network.
 *
 * - A bare git repository plays the team wiki on GitHub: `okf/payments` is a
 *   copy of knowledgeAgent's bundle (one page stamped reviewed by a person) and
 *   `scripts/okf.py` is its toolchain. Git reaches it under the GitHub URL
 *   through a `url.<file>.insteadOf` rule, so every git command the plugin runs
 *   is real.
 * - A local HTTP server stands in for the GitHub REST API (pull requests,
 *   labels, check runs), and keeps `refs/pull/<n>/head` in the bare repository
 *   the way GitHub does.
 * - The built Host module is applied to a stub context, and its /api/okf/team/*
 *   routes are called with real Requests: connect, status, wiki detail,
 *   Maintain, the session's prompt context, Open pull request (eligible, then
 *   a reviewed page edited → reset + needs a person, then a lint failure), the
 *   PR list with verdicts, New project wiki, a merged PR closing its workspace,
 *   and the built CI checker `lib/check-pr.js`.
 *
 * Needs a knowledgeAgent checkout: `WIKI_FIXTURE`, else ../knowledgeAgent,
 * else /home/user/knowledgeAgent. Usage: node scripts/team-smoke.mjs
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
  console.error('team-smoke: no OKF fixture. Set WIKI_FIXTURE to a knowledgeAgent checkout (with okf/ and scripts/okf.py).')
  process.exit(2)
}
const python = process.env.PYTHON ?? (process.platform === 'win32' ? 'python' : 'python3')
const work = realpathSync.native(mkdtempSync(join(tmpdir(), 'dsh-okf-team-')))
const failures = []
const check = (condition, message) => { if (!condition) failures.push(message) }
const git = (cwd, ...args) => execFileSync('git', ['-c', 'user.name=smoke', '-c', 'user.email=smoke@example.invalid', '-c', 'init.defaultBranch=main', '-c', 'core.autocrlf=false', ...args], { cwd, encoding: 'utf8' }).trim()

// ── 1 · the team wiki repository ──────────────────────────────────────────
const seed = join(work, 'seed')
mkdirSync(join(seed, 'scripts'), { recursive: true })
mkdirSync(join(seed, 'okf'), { recursive: true })
cpSync(join(fixture, 'okf'), join(seed, 'okf', 'payments'), { recursive: true })
cpSync(join(fixture, 'scripts', 'okf.py'), join(seed, 'scripts', 'okf.py'))
writeFileSync(join(seed, 'README.md'), '# team wiki\n')
const reviewedPath = join(seed, 'okf', 'payments', 'concepts', 'knowledge-lifecycle.md')
writeFileSync(reviewedPath, readFileSync(reviewedPath, 'utf8').replace(/^tags:/m, 'generated:\n  by: claude-code/opus-5\n  at: 2026-08-01\nverified:\n  - by: human:alice\n    at: 2026-08-27\ntags:'))
git(seed, 'init', '-q')
git(seed, 'add', '-A')
git(seed, 'commit', '-qm', 'seed team wiki')
const origin = join(work, 'origin.git')
git(work, 'clone', '-q', '--bare', seed, origin)
git(origin, 'symbolic-ref', 'HEAD', 'refs/heads/main')

const URL_ = 'https://github.com/acme/team-wiki'
// Every git the plugin starts inherits this: the GitHub URL resolves to the bare repository.
process.env.GIT_CONFIG_COUNT = '2'
process.env.GIT_CONFIG_KEY_0 = `url.${pathToFileURL(origin).href}.insteadOf`
process.env.GIT_CONFIG_VALUE_0 = URL_
process.env.GIT_CONFIG_KEY_1 = 'protocol.file.allow'
process.env.GIT_CONFIG_VALUE_1 = 'always'
process.env.DSH_OKF_GITHUB_TOKEN = 'smoke-token'

// ── 2 · a stand-in for the GitHub REST API ────────────────────────────────
const pulls = []
const seen = []
const server = createServer((request, response) => {
  let body = ''
  request.on('data', (chunk) => { body += chunk })
  request.on('end', () => {
    const url = new URL(request.url ?? '/', 'http://x')
    seen.push(`${request.method} ${url.pathname}${url.search} auth=${request.headers.authorization === 'Bearer smoke-token' ? 'yes' : 'no'}`)
    const send = (status, value) => { response.writeHead(status, { 'content-type': 'application/json' }); response.end(JSON.stringify(value)) }
    const base = '/repos/acme/team-wiki'
    const json = body === '' ? {} : JSON.parse(body)
    const view = pull => ({ number: pull.number, title: pull.title, html_url: `https://github.com/acme/team-wiki/pull/${String(pull.number)}`, draft: false, updated_at: '2026-11-19T08:00:00Z', user: { login: 'dsh-bot' }, head: { ref: pull.head, sha: git(origin, 'rev-parse', `refs/heads/${pull.head}`) }, base: { ref: pull.base }, labels: pull.labels.map(name => ({ name })), state: pull.state, merged: pull.state === 'merged' ? true : false })
    if (request.method === 'GET' && url.pathname === `${base}/pulls`) {
      const head = url.searchParams.get('head')
      const open = pulls.filter(pull => pull.state === 'open' && (head === null || `acme:${pull.head}` === head))
      return send(200, open.map(view))
    }
    if (request.method === 'POST' && url.pathname === `${base}/pulls`) {
      const pull = { number: pulls.length + 1, title: json.title, body: json.body, head: json.head, base: json.base, labels: [], state: 'open' }
      pulls.push(pull)
      git(origin, 'update-ref', `refs/pull/${String(pull.number)}/head`, `refs/heads/${pull.head}`)
      return send(201, view(pull))
    }
    let match = new RegExp(`^${base}/pulls/(\\d+)$`).exec(url.pathname)
    if (match !== null) {
      const pull = pulls[Number(match[1]) - 1]
      if (pull === undefined) return send(404, { message: 'Not Found' })
      if (request.method === 'PATCH') {
        Object.assign(pull, { ...'title' in json ? { title: json.title } : {}, body: json.body })
        git(origin, 'update-ref', `refs/pull/${String(pull.number)}/head`, `refs/heads/${pull.head}`)
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
    if (request.method === 'GET' && /\/commits\/[^/]+\/check-runs$/.test(url.pathname)) {
      return send(200, { check_runs: [{ status: 'in_progress', conclusion: null }] })
    }
    return send(404, { message: `no mock for ${request.method} ${url.pathname}` })
  })
})
await new Promise((done) => { server.listen(0, '127.0.0.1', done) })
const githubApi = `http://127.0.0.1:${String(server.address().port)}`

// ── 3 · the Host half ─────────────────────────────────────────────────────
const host = await import(pathToFileURL(join(root, 'lib', 'index.js')).href)
const routes = new Map()
const contexts = []
const libraryDir = join(work, 'library')
host.apply({
  connection: { fetch: { register: (route) => { routes.set(route.path, route); return async () => {} } } },
  inject: (_deps, callback) => { callback({ systemPrompt: { context: (c) => { contexts.push(c); return () => {} } } }) },
}, { libraryDir, team: { githubApi, python, agentActor: 'dsh/smoke' } })

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
    console.error(`team-smoke: ${label} answered ${String(answer.status)} ${JSON.stringify(answer.body)}`)
    server.close()
    process.exit(1)
  }
  return answer.body
}

let answer = await api('/api/okf/team')
check(answer.status === 200 && answer.body.team === undefined && answer.body.wikis.length === 0, `nothing connected yet: ${JSON.stringify(answer.body)}`)
answer = await api('/api/okf/team/pulls')
check(answer.status === 409 && answer.body.error.code === 'no-team', 'pull requests need a repository')
answer = await api('/api/okf/team/connect', { method: 'POST', body: { url: 'https://user:pw@github.com/acme/team-wiki' } })
check(answer.status === 400 && answer.body.error.code === 'bad-url', 'a URL with a credential is refused')

// The older layout: project wikis under okf/, no AGENTS.md registry.
let status = must(await api('/api/okf/team/connect', { method: 'POST', body: { url: URL_, root: 'okf' } }), 'connect')
check(status.team.name === 'github.com/acme/team-wiki' && status.team.root === 'okf' && status.baseBranch === 'main' && status.hasToken === true, `connected: ${JSON.stringify(status.team)}`)
check(status.wikis.length === 1 && status.wikis[0].folder === 'okf/payments' && status.wikis[0].name === 'Payments', `one project wiki: ${JSON.stringify(status.wikis)}`)
const stats = status.wikis[0].stats
check(stats.pages > 5 && stats.reviewed === 1 && stats.unreviewed === stats.pages - 1, `review counts: ${JSON.stringify(stats)}`)

const detail = must(await api('/api/okf/team/wiki', { query: { folder: 'okf/payments' } }), 'wiki')
const reviewed = detail.pages.find(page => page.path === 'concepts/knowledge-lifecycle.md')
check(reviewed?.review === 'reviewed' && reviewed.reviewer === 'alice' && reviewed.reviewedAt === '2026-08-27', `reviewed page: ${JSON.stringify(reviewed)}`)
check(!detail.pages.some(page => page.path === 'index.md' || page.path === 'log.md' || page.path.startsWith('sources/')), 'index, log and captures are not counted as pages')
check((await api('/api/okf/team/wiki', { query: { folder: 'okf/nope' } })).status === 404, 'an unknown wiki is 404')

// Preview: a read-only library entry on the base branch.
answer = must(await api('/api/okf/team/attach', { method: 'POST', body: { folder: 'okf/payments' } }), 'attach')
check(answer.entry.id === 'team-main-okf-payments' && answer.entry.teamWiki === 'okf/payments' && answer.entry.workspace === undefined && answer.entry.root === join(libraryDir, 'team', 'main', 'okf', 'payments'), `attach: ${JSON.stringify(answer.entry)}`)

// ── Maintain ──
const maintained = must(await api('/api/okf/team/maintain', { method: 'POST', body: { folder: 'okf/payments' } }), 'maintain')
const record = maintained.record
const ws = maintained.workspace
check(maintained.created === true && /^wiki\/payments-\d{12}-[0-9a-f]{4}$/.test(record.branch) && ws === join(libraryDir, 'team', 'work', 'okf-payments') && record.entryId === 'team-okf-payments', `maintain: ${JSON.stringify(record)}`)
check(git(ws, 'rev-parse', '--abbrev-ref', 'HEAD') === record.branch, 'the workspace is on its own branch')
check(maintained.entry.team?.maintainId === record.id && maintained.entry.workspace === ws && maintained.entry.root === join(ws, 'okf', 'payments'), `maintain entry: ${JSON.stringify(maintained.entry)}`)
const again = must(await api('/api/okf/team/maintain', { method: 'POST', body: { folder: 'okf/payments' } }), 'maintain again')
check(again.created === false && again.record.id === record.id, 'Maintain reuses the open workspace')
status = must(await api('/api/okf/team'), 'status')
check(status.wikis[0].maintainId === record.id && status.maintains.length === 1, 'the wiki shows as being maintained')

// The session in that workspace gets the team rules; a session elsewhere does not.
must(await api('/api/okf/session', { method: 'POST', body: { sessionId: 's-m', bundleId: maintained.entry.id } }), 'select')
await new Promise((done) => { setTimeout(done, 50) })
let text = contexts[0].text({ agent: { id: 's-m', session: { header: { id: 's-m', cwd: ws } } } })
check(text.includes('team wiki maintenance workspace') && text.includes('generated: { by: dsh/smoke') && text.includes('Never add or edit a verified entry') && text.includes('Open pull request'), `maintain context: ${text.slice(0, 1200)}`)
text = contexts[0].text({ agent: { id: 's-m', session: { header: { id: 's-m', cwd: join(work, 'elsewhere') } } } })
check(text.includes('Do not edit the bundle from this session') && !text.includes('Never add or edit a verified entry'), 'outside its workspace the wiki is read-only')

// ── Open pull request: a new unreviewed page → eligible ──
const today = new Date().toISOString().slice(0, 10)
const page = [
  '---', 'type: Concept', 'title: Release Process', 'description: How the team ships a service to staging and production.',
  'status: draft', 'lifecycle: draft', `created: ${today}`, `updated: ${today}`, 'generated:', '  by: dsh/smoke', `  at: ${today}`, 'tags: []', '---', '',
  '# Release Process', '', 'Verify on staging first. See [the lifecycle](/concepts/knowledge-lifecycle.md) and [OKF](/concepts/open-knowledge-format.md).', '',
].join('\n')
writeFileSync(join(ws, 'okf', 'payments', 'concepts', 'release-process.md'), page)
writeFileSync(join(ws, 'README.md'), '# changed outside the wiki\n')
let changes = must(await api('/api/okf/team/changes', { query: { id: record.id } }), 'changes')
check(changes.files.some(file => file.path === 'okf/payments/concepts/release-process.md' && file.status === 'added' && file.review === 'unreviewed') && changes.uncommitted === 2, `changes: ${JSON.stringify(changes)}`)

let pr = must(await api('/api/okf/team/open-pr', { method: 'POST', body: { id: record.id, title: 'Add the release process page' } }), 'open-pr 1')
check(pr.eligible === true && pr.reasons.length === 0 && pr.pushed === true && pr.pr?.number === 1 && pr.pr.reused === false, `pr 1: ${JSON.stringify(pr)}`)
check(pr.files.every(path => path.startsWith('okf/payments/')) && pr.files.includes('okf/payments/index.md') && pr.files.includes('okf/payments/log.md'), `pr 1 files: ${pr.files.join(', ')}`)
check(pr.notes.some(note => note.includes('Left out') && note.includes('README.md')), `stray change is left out: ${pr.notes.join(' | ')}`)
check(pulls[0].labels.includes('wiki-auto-merge') && pulls[0].base === 'main' && pulls[0].head === record.branch && pulls[0].body.includes('Eligible'), `pr 1 on GitHub: ${JSON.stringify(pulls[0]).slice(0, 300)}`)
check(seen.filter(line => line.includes('/pulls')).every(line => line.endsWith('auth=yes')), 'GitHub calls carry the token')
const log = readFileSync(join(ws, 'okf', 'payments', 'log.md'), 'utf8')
check(log.includes('**Creation**: [Release Process](/concepts/release-process.md) — Add the release process page'), `log line: ${log.slice(0, 300)}`)
check(readFileSync(join(ws, 'okf', 'payments', 'index.md'), 'utf8').includes('concepts/release-process.md'), 'index.md lists the new page')
check(git(origin, 'rev-parse', `refs/heads/${record.branch}`) === git(ws, 'rev-parse', 'HEAD'), 'the branch is pushed')
check(git(ws, 'log', '-1', '--format=%B').includes(`Wiki-Workspace: ${record.id}`), 'the commit names its workspace')

// CI's checker agrees, from git alone.
const clone = join(work, 'ci')
git(work, 'clone', '-q', origin, clone)
git(clone, 'checkout', '-q', record.branch)
let ci = spawnSync(process.execPath, [join(root, 'lib', 'check-pr.js'), 'origin/main', 'HEAD', 'okf'], { cwd: clone, encoding: 'utf8', env: { ...process.env, GITHUB_OUTPUT: join(work, 'gh-output') } })
check(ci.status === 0 && ci.stdout.includes('project wiki: okf/payments') && ci.stdout.includes('eligible for auto-merge'), `check-pr eligible: ${ci.status} ${ci.stdout} ${ci.stderr}`)
check(readFileSync(join(work, 'gh-output'), 'utf8').includes('wiki=okf/payments'), 'check-pr hands the wiki folder to the lint step')

// The PR list: the verdict comes from git, not the label.
let list = must(await api('/api/okf/team/pulls', { query: { refresh: '1' } }), 'pulls')
check(list.pulls.length === 1 && list.pulls[0].wikis.join() === 'okf/payments' && list.pulls[0].eligible === true && list.pulls[0].checks === 'pending' && list.pulls[0].maintainId === record.id && list.note === undefined, `pulls: ${JSON.stringify(list)}`)

// ── A reviewed page edited without resetting its stamp → reset, needs a person ──
const lifecycle = join(ws, 'okf', 'payments', 'concepts', 'knowledge-lifecycle.md')
writeFileSync(lifecycle, readFileSync(lifecycle, 'utf8').replace(/\n# (.+)\n/, '\n# $1 (team edition)\n'))
changes = must(await api('/api/okf/team/changes', { query: { id: record.id } }), 'changes 2')
check(changes.files.some(file => file.path.endsWith('knowledge-lifecycle.md') && file.review === 'reviewed'), 'the dialog warns that a reviewed page changed')
pr = must(await api('/api/okf/team/open-pr', { method: 'POST', body: { id: record.id } }), 'open-pr 2')
check(pr.stamped.join() === 'concepts/knowledge-lifecycle.md' && pr.eligible === false && pr.reasons.some(reason => reason.includes('alice reviewed')) && pr.pr?.reused === true && pr.pr.number === 1, `pr 2: ${JSON.stringify(pr)}`)
const reset = readFileSync(lifecycle, 'utf8')
check(/^lifecycle: draft$/m.test(reset) && /by: dsh\/smoke/.test(reset) && reset.includes('human:alice'), 'the edited reviewed page is an unreviewed draft that keeps its history')
check(!pulls[0].labels.includes('wiki-auto-merge') && pulls[0].body.includes('Needs a person'), 'the auto-merge label comes off')
check(pulls[0].title === 'Add the release process page', `an update without a title keeps the pull request's title: ${pulls[0].title}`)
git(clone, 'fetch', '-q', 'origin')
ci = spawnSync(process.execPath, [join(root, 'lib', 'check-pr.js'), 'origin/main', `origin/${record.branch}`, 'okf'], { cwd: clone, encoding: 'utf8', env: { ...process.env, GITHUB_OUTPUT: '' } })
check(ci.status === 1 && ci.stdout.includes('alice reviewed'), `check-pr needs a person: ${ci.status} ${ci.stdout}`)
list = must(await api('/api/okf/team/pulls', { query: { refresh: '1' } }), 'pulls 2')
check(list.pulls[0].eligible === false && list.pulls[0].reasons.some(reason => reason.includes('alice reviewed')), `pulls 2: ${JSON.stringify(list.pulls[0])}`)

// ── Lint failure: nothing is committed ──
const head = git(ws, 'rev-parse', 'HEAD')
writeFileSync(join(ws, 'okf', 'payments', 'concepts', 'broken.md'), '---\ntype: Entity\ntitle: Broken\ndescription: d\nstatus: draft\nlifecycle: draft\nupdated: 2026-11-19\n---\nbody\n')
answer = await api('/api/okf/team/open-pr', { method: 'POST', body: { id: record.id } })
check(answer.status === 422 && answer.body.error.code === 'lint-failed' && git(ws, 'rev-parse', 'HEAD') === head, `lint failure: ${JSON.stringify(answer.body).slice(0, 300)}`)
rmSync(join(ws, 'okf', 'payments', 'concepts', 'broken.md'))
git(ws, 'checkout', '-q', '--', 'okf/payments')

// ── New project wiki ──
answer = await api('/api/okf/team/create', { method: 'POST', body: { name: 'Payments', folder: 'payments' } })
check(answer.status === 409 && answer.body.error.code === 'exists', 'an existing folder is refused')
const created = must(await api('/api/okf/team/create', { method: 'POST', body: { name: 'Settlement Wiki', folder: 'settlement', template: 'copy:okf/payments' } }), 'create')
const nws = created.workspace
check(created.record.isNew === true && /^wiki\/new-settlement-[0-9a-f]{4}$/.test(created.record.branch) && created.record.wiki === 'okf/settlement' && created.entry.root === join(nws, 'okf', 'settlement'), `create: ${JSON.stringify(created.record)}`)
check(created.prError === undefined && created.pr?.pr?.number === 2 && created.pr.eligible === false && created.pr.reasons.some(reason => reason.includes('SCHEMA.md')), `setup PR: ${JSON.stringify(created.pr ?? created.prError)}`)
check(created.pr.files.every(path => path.startsWith('okf/settlement/') || path === 'AGENTS.md') && /\| Payments \|.*`okf\/payments\/` \|\n\| Settlement Wiki \|.*`okf\/settlement\/` \|/.test(readFileSync(join(created.workspace, 'AGENTS.md'), 'utf8')) && created.pr.files.includes('okf/settlement/SCHEMA.md') && created.pr.files.includes('okf/settlement/index.md'), `setup files: ${created.pr.files.join(', ')}`)
check(/^wiki_name: "Settlement Wiki"$/m.test(readFileSync(join(nws, 'okf', 'settlement', 'SCHEMA.md'), 'utf8')), 'SCHEMA.md carries the wiki name')
check(git(nws, 'status', '--porcelain') === '', 'okf.py init leaves nothing outside the new wiki')
status = must(await api('/api/okf/team'), 'status 2')
check(status.maintains.some(item => item.id === created.record.id && item.pr?.number === 2) && status.wikis.length === 1, 'the new wiki is pending until it merges')
list = must(await api('/api/okf/team/pulls', { query: { refresh: '1' } }), 'pulls 3')
check(list.pulls.length === 2 && list.pulls.find(item => item.number === 2)?.wikis.join() === 'okf/settlement', `a new wiki's PR maps to its folder: ${JSON.stringify(list.pulls.map(item => item.wikis))}`)

// ── Merging closes the workspace; Maintain starts fresh ──
git(origin, 'update-ref', 'refs/heads/main', `refs/heads/${created.record.branch}`)
pulls[1].state = 'merged'
list = must(await api('/api/okf/team/pulls', { query: { refresh: '1' } }), 'pulls 4')
check(list.pulls.length === 1, 'a merged PR leaves the list')
status = must(await api('/api/okf/team/refresh', { method: 'POST', body: {} }), 'refresh')
check(status.wikis.map(wiki => wiki.folder).join() === 'okf/payments,okf/settlement' && status.wikis[1].name === 'Settlement Wiki', `after merge: ${JSON.stringify(status.wikis.map(wiki => [wiki.folder, wiki.name]))}`)
check(!status.maintains.some(item => item.id === created.record.id), 'the merged workspace is closed')
const fresh = must(await api('/api/okf/team/maintain', { method: 'POST', body: { folder: 'okf/settlement' } }), 'maintain settlement')
check(fresh.created === true && fresh.record.id !== created.record.id && !fresh.record.isNew, 'Maintain after merge makes a fresh workspace')
answer = await api('/api/okf/team/open-pr', { method: 'POST', body: { id: fresh.record.id } })
check(answer.status === 409 && answer.body.error.code === 'nothing-changed', 'an untouched workspace has nothing to propose')

// Update on a maintenance entry is refused; it is not a mirror.
answer = await api('/api/okf/update', { method: 'POST', body: { id: maintained.entry.id } })
check(answer.status === 400 && answer.body.error.code === 'team-workspace', `update of a maintenance entry: ${JSON.stringify(answer.body)}`)

server.close()
rmSync(work, { recursive: true, force: true })
if (failures.length > 0) {
  for (const failure of failures) console.error(`team-smoke: FAIL — ${failure}`)
  process.exit(1)
}
console.log('team-smoke: OK')
console.log(`  fixture        ${fixture}`)
console.log(`  github calls   ${String(seen.length)}`)
process.exit(0)
