/**
 * Smoke-test the Team Wiki with a hub in Azure Repos, without the network.
 *
 * - A bare git repository plays https://dev.azure.com/acme/Wiki/_git/team-wiki
 *   (reached through `url.<file>.insteadOf`), with `okf/payments` from the
 *   knowledgeAgent fixture.
 * - A local HTTP server stands in for the Azure DevOps REST API (pull
 *   requests, labels, statuses, auto-complete, connectionData). Azure Repos
 *   has no `refs/pull/<n>/head`, so the plugin fetches the source branch.
 * - Covers: connect, Maintain, Open pull request (eligible → tagged and
 *   auto-complete on; a reviewed page edited → tag off and auto-complete off),
 *   the PR list with its verdict and statuses, Mark reviewed with the PAT's
 *   account as reviewer, and a completed pull request closing its workspace.
 *
 * Needs a knowledgeAgent checkout: `WIKI_FIXTURE`, else ../knowledgeAgent,
 * else /home/user/knowledgeAgent. Usage: node scripts/ado-smoke.mjs
 */
import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const fixture = [process.env.WIKI_FIXTURE, join(root, '..', 'knowledgeAgent'), '/home/user/knowledgeAgent']
  .filter(Boolean).map(path => resolve(path)).find(path => existsSync(join(path, 'okf', 'SCHEMA.md')) && existsSync(join(path, 'scripts', 'okf.py')))
if (fixture === undefined) {
  console.error('ado-smoke: no OKF fixture. Set WIKI_FIXTURE to a knowledgeAgent checkout (with okf/ and scripts/okf.py).')
  process.exit(2)
}
const python = process.env.PYTHON ?? (process.platform === 'win32' ? 'python' : 'python3')
const work = realpathSync.native(mkdtempSync(join(tmpdir(), 'dsh-okf-ado-')))
const failures = []
const check = (condition, message) => { if (!condition) failures.push(message) }
const git = (cwd, ...args) => execFileSync('git', ['-c', 'user.name=smoke', '-c', 'user.email=smoke@example.invalid', '-c', 'init.defaultBranch=main', '-c', 'core.autocrlf=false', ...args], { cwd, encoding: 'utf8' }).trim()

// ── 1 · the hub ───────────────────────────────────────────────────────────
const seed = join(work, 'seed')
mkdirSync(join(seed, 'scripts'), { recursive: true })
mkdirSync(join(seed, 'okf'), { recursive: true })
cpSync(join(fixture, 'okf'), join(seed, 'okf', 'payments'), { recursive: true })
cpSync(join(fixture, 'scripts', 'okf.py'), join(seed, 'scripts', 'okf.py'))
const reviewedPath = join(seed, 'okf', 'payments', 'concepts', 'knowledge-lifecycle.md')
writeFileSync(reviewedPath, readFileSync(reviewedPath, 'utf8').replace(/^tags:/m, 'generated:\n  by: claude-code/opus-5\n  at: 2026-08-01\nverified:\n  - by: human:alice\n    at: 2026-08-27\ntags:'))
git(seed, 'init', '-q')
git(seed, 'add', '-A')
git(seed, 'commit', '-qm', 'seed team wiki')
const origin = join(work, 'origin.git')
git(work, 'clone', '-q', '--bare', seed, origin)
git(origin, 'symbolic-ref', 'HEAD', 'refs/heads/main')

const URL_ = 'https://dev.azure.com/acme/Wiki/_git/team-wiki'
process.env.GIT_CONFIG_COUNT = '2'
process.env.GIT_CONFIG_KEY_0 = `url.${pathToFileURL(origin).href}.insteadOf`
process.env.GIT_CONFIG_VALUE_0 = URL_
process.env.GIT_CONFIG_KEY_1 = 'protocol.file.allow'
process.env.GIT_CONFIG_VALUE_1 = 'always'
delete process.env.DSH_OKF_GITHUB_TOKEN
delete process.env.DSH_OKF_GIT_TOKEN
process.env.DSH_OKF_AZURE_TOKEN = 'ado-pat'
const AUTH = `Basic ${Buffer.from(':ado-pat').toString('base64')}`
const ME = '6f1c2a5e-0000-4000-8000-000000000001'
const NOBODY = '00000000-0000-0000-0000-000000000000'

// ── 2 · a stand-in for the Azure DevOps REST API ──────────────────────────
const pulls = []
const seen = []
let statuses = [{ state: 'pending', context: { genre: 'continuous-integration', name: 'wiki-check' } }]
const server = createServer((request, response) => {
  let body = ''
  request.on('data', (chunk) => { body += chunk })
  request.on('end', () => {
    const url = new URL(request.url ?? '/', 'http://x')
    seen.push({ line: `${request.method} ${url.pathname}`, auth: request.headers.authorization === AUTH, version: url.searchParams.get('api-version') })
    const send = (status, value) => { response.writeHead(status, { 'content-type': 'application/json' }); response.end(JSON.stringify(value)) }
    const json = body === '' ? {} : JSON.parse(body)
    if (request.method === 'GET' && url.pathname === '/acme/_apis/connectionData') {
      return send(200, { authenticatedUser: { id: ME, providerDisplayName: 'Alice A', properties: { Account: { $type: 'System.String', $value: 'alice@acme.com' } } } })
    }
    const base = '/acme/Wiki/_apis/git/repositories/team-wiki/pullrequests'
    const view = pull => ({
      pullRequestId: pull.id, title: pull.title, description: pull.description, status: pull.status, isDraft: false,
      creationDate: '2026-11-19T08:00:00Z', sourceRefName: pull.source, targetRefName: pull.target,
      createdBy: { displayName: 'DSH bot', uniqueName: 'bot@acme.com' },
      lastMergeSourceCommit: { commitId: git(origin, 'rev-parse', pull.source) },
      labels: pull.labels.map(name => ({ name, active: true })),
      ...pull.autoComplete === undefined ? {} : { autoCompleteSetBy: { id: pull.autoComplete }, completionOptions: pull.completion },
    })
    if (url.pathname === base && request.method === 'GET') {
      const status = url.searchParams.get('searchCriteria.status')
      const source = url.searchParams.get('searchCriteria.sourceRefName')
      const target = url.searchParams.get('searchCriteria.targetRefName')
      const rows = pulls.filter(pull => (status === null || pull.status === status) && (source === null || pull.source === source) && (target === null || pull.target === target))
      return send(200, { value: rows.map(view), count: rows.length })
    }
    if (url.pathname === base && request.method === 'POST') {
      const pull = { id: pulls.length + 101, title: json.title, description: json.description, source: json.sourceRefName, target: json.targetRefName, status: 'active', labels: [] }
      pulls.push(pull)
      return send(201, view(pull))
    }
    let match = new RegExp(`^${base}/(\\d+)$`).exec(url.pathname)
    if (match !== null) {
      const pull = pulls.find(item => item.id === Number(match[1]))
      if (pull === undefined) return send(404, { message: 'TF401180: The requested pull request was not found.' })
      if (request.method === 'PATCH') {
        if ('title' in json) pull.title = json.title
        if ('description' in json) pull.description = json.description
        if ('autoCompleteSetBy' in json) {
          pull.autoComplete = json.autoCompleteSetBy.id === NOBODY ? undefined : json.autoCompleteSetBy.id
          pull.completion = json.completionOptions
        }
      }
      return send(200, view(pull))
    }
    match = new RegExp(`^${base}/(\\d+)/labels(?:/(.+))?$`).exec(url.pathname)
    if (match !== null) {
      const pull = pulls.find(item => item.id === Number(match[1]))
      if (request.method === 'POST') {
        pull.labels = [...new Set([...pull.labels, json.name])]
        return send(200, { name: json.name, active: true })
      }
      if (request.method === 'DELETE') {
        const name = decodeURIComponent(match[2] ?? '')
        if (!pull.labels.includes(name)) return send(404, { message: 'label not found' })
        pull.labels = pull.labels.filter(label => label !== name)
        return send(204, null)
      }
    }
    match = new RegExp(`^${base}/(\\d+)/statuses$`).exec(url.pathname)
    if (match !== null && request.method === 'GET') return send(200, { value: statuses, count: statuses.length })
    return send(404, { message: `no mock for ${request.method} ${url.pathname}` })
  })
})
await new Promise((done) => { server.listen(0, '127.0.0.1', done) })
const azureApi = `http://127.0.0.1:${String(server.address().port)}`

// ── 3 · the Host half ─────────────────────────────────────────────────────
const host = await import(pathToFileURL(join(root, 'lib', 'index.js')).href)
const routes = new Map()
const libraryDir = join(work, 'library')
host.apply({
  connection: { fetch: { register: (route) => { routes.set(route.path, route); return async () => {} } } },
  inject: (_deps, callback) => { callback({ systemPrompt: { context: () => () => {} }, tools: { register: () => () => {} } }) },
}, { libraryDir, skills: false, team: { azureApi, python, agentActor: 'dsh/smoke' } })

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
    console.error(`ado-smoke: ${label} answered ${String(answer.status)} ${JSON.stringify(answer.body)}`)
    server.close()
    process.exit(1)
  }
  return answer.body
}

let status = must(await api('/api/okf/team/connect', { method: 'POST', body: { url: URL_, root: 'okf' } }), 'connect')
check(status.team.provider === 'azure-devops' && status.hasToken === true && status.baseBranch === 'main' && status.wikis.length === 1, `connected: ${JSON.stringify({ team: status.team, hasToken: status.hasToken })}`)

// ── Maintain, then an eligible pull request ──
const maintained = must(await api('/api/okf/team/maintain', { method: 'POST', body: { folder: 'okf/payments' } }), 'maintain')
const record = maintained.record
const ws = maintained.workspace
const today = new Date().toISOString().slice(0, 10)
writeFileSync(join(ws, 'okf', 'payments', 'concepts', 'release-process.md'), [
  '---', 'type: Concept', 'title: Release Process', 'description: How the team ships a service to staging and production.',
  'status: draft', `created: ${today}`, `updated: ${today}`, 'generated:', '  by: dsh/smoke', `  at: ${today}`, 'tags: []', '---', '',
  '# Release Process', '', 'Verify on staging first. See [the lifecycle](/concepts/knowledge-lifecycle.md).', '',
].join('\n'))
let pr = must(await api('/api/okf/team/open-pr', { method: 'POST', body: { id: record.id, title: 'Add the release process page' } }), 'open-pr 1')
const first = pulls[0]
check(pr.eligible === true && pr.pr?.number === 101 && pr.pr.reused === false && pr.pr.url === `${azureApi}/acme/Wiki/_git/team-wiki/pullrequest/101`, `pr 1: ${JSON.stringify(pr)}`)
check(first?.source === `refs/heads/${record.branch}` && first.target === 'refs/heads/main' && first.title === 'Add the release process page' && first.description.includes('Eligible'), `pr 1 on ADO: ${JSON.stringify(first).slice(0, 300)}`)
check(first.labels.includes('wiki-auto-merge') && first.autoComplete === ME && first.completion?.mergeStrategy === 'squash' && first.completion.deleteSourceBranch === true, `eligible → tagged and auto-complete on: ${JSON.stringify({ labels: first.labels, auto: first.autoComplete, completion: first.completion })}`)
check(seen.every(call => call.auth && call.version === '7.1'), `every call carries the PAT and api-version: ${JSON.stringify(seen.filter(call => !call.auth || call.version !== '7.1'))}`)
check(git(origin, 'rev-parse', `refs/heads/${record.branch}`) === git(ws, 'rev-parse', 'HEAD'), 'the branch is pushed')

// ── The PR list: fetched from the source branch, statuses read ──
let list = must(await api('/api/okf/team/pulls', { query: { refresh: '1' } }), 'pulls')
check(list.note === undefined && list.pulls.length === 1 && list.pulls[0].number === 101 && list.pulls[0].wikis.join() === 'okf/payments' && list.pulls[0].eligible === true && list.pulls[0].checks === 'pending' && list.pulls[0].labels.includes('wiki-auto-merge') && list.pulls[0].maintainId === record.id && list.pulls[0].author === 'bot@acme.com', `pulls: ${JSON.stringify(list)}`)
statuses = [...statuses, { state: 'succeeded', context: { genre: 'continuous-integration', name: 'wiki-check' } }]
list = must(await api('/api/okf/team/pulls', { query: { refresh: '1' } }), 'pulls ok')
check(list.pulls[0].checks === 'success', `the latest status per context counts: ${list.pulls[0].checks}`)
statuses = [{ state: 'failed', context: { genre: 'continuous-integration', name: 'wiki-check' } }]
list = must(await api('/api/okf/team/pulls', { query: { refresh: '1' } }), 'pulls failed')
check(list.pulls[0].checks === 'failure', `a failed status: ${list.pulls[0].checks}`)

// ── A reviewed page edited → needs a person: tag off, auto-complete off ──
const lifecycle = join(ws, 'okf', 'payments', 'concepts', 'knowledge-lifecycle.md')
writeFileSync(lifecycle, readFileSync(lifecycle, 'utf8').replace(/\n# (.+)\n/, '\n# $1 (team edition)\n'))
pr = must(await api('/api/okf/team/open-pr', { method: 'POST', body: { id: record.id } }), 'open-pr 2')
check(pr.eligible === false && pr.pr?.reused === true && pr.pr.number === 101 && pulls.length === 1, `pr 2: ${JSON.stringify(pr)}`)
check(!first.labels.includes('wiki-auto-merge') && first.autoComplete === undefined && first.title === 'Add the release process page' && first.description.includes('Needs a person'), `needs a person → tag and auto-complete off: ${JSON.stringify({ labels: first.labels, auto: first.autoComplete, title: first.title })}`)

// ── Mark reviewed: the reviewer is the PAT's account ──
const reviewed = must(await api('/api/okf/team/review', { method: 'POST', body: { folder: 'okf/payments', paths: ['concepts/release-process.md'] } }), 'mark reviewed')
const pageText = readFileSync(join(ws, 'okf', 'payments', 'concepts', 'release-process.md'), 'utf8')
check(reviewed.reviewer === 'alice@acme.com' && reviewed.marked.length === 1 && /verified:\n {2}- by: human:alice@acme\.com/.test(pageText), `review: ${JSON.stringify({ reviewer: reviewed.reviewer, marked: reviewed.marked })} ${pageText.slice(0, 400)}`)
check(reviewed.pr?.pr?.number === 101 && reviewed.pr.eligible === false && first.autoComplete === undefined, `the review goes into the same pull request, for a person: ${JSON.stringify(reviewed.pr ?? reviewed.prError)}`)

// ── Completing the pull request closes the workspace and moves main/ ──
git(origin, 'update-ref', 'refs/heads/main', `refs/heads/${record.branch}`)
first.status = 'completed'
list = must(await api('/api/okf/team/pulls', { query: { refresh: '1' } }), 'pulls after merge')
check(list.pulls.length === 0 && list.statusChanged === true, `a completed PR leaves the list and refreshes: ${JSON.stringify(list)}`)
status = must(await api('/api/okf/team'), 'status after merge')
check(!status.maintains.some(item => item.id === record.id && item.closed === undefined), 'the completed workspace is closed')
check(existsSync(join(libraryDir, 'team', 'main', 'okf', 'payments', 'concepts', 'release-process.md')), 'the base branch clone has the merged page')

server.close()
rmSync(work, { recursive: true, force: true })
if (failures.length > 0) {
  for (const failure of failures) console.error(`ado-smoke: FAIL — ${failure}`)
  process.exit(1)
}
console.log('ado-smoke: OK')
console.log(`  azure calls    ${String(seen.length)}`)
process.exit(0)
