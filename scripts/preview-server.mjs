/**
 * A development page for looking at the built UI without a Harness.
 *
 * It applies the built Host half (`lib/index.js`) to a stub context, serves its
 * /api/okf/* routes for real (real git, real library folder), and serves a page
 * that executes the built browser artifact the way the shell does: React from
 * this package's node_modules, a `window.__ModuleLoader__`, and a tiny slot
 * registry that renders the `shell.overlay` entry, a fake session header
 * holding the `conversation.session.header.utilities` entry, and a fake sidebar
 * whose `sidebar.panellist` entries switch the main column to their `main`
 * panel (the Team Wiki page). `?panel=okf-team-wiki` opens it directly.
 *
 * Theme: with DSH_ROOT set to a DSH checkout, the page loads DSH's own
 * design-platform.css, so the `--dsw-*` colors are the real ones. `?dark` on
 * the URL switches to the dark theme.
 *
 * Usage: node scripts/preview-server.mjs [--port 4317] [--library <dir>] [--github-api <url>]
 * Development only: it has no authentication and binds to 127.0.0.1.
 */
import { createServer } from 'node:http'
import { existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const argument = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`)
  return index > 0 && process.argv[index + 1] !== undefined ? process.argv[index + 1] : fallback
}
const port = Number(argument('port', '4317'))
const libraryDir = argument('library', join(tmpdir(), 'dsh-okf-preview-library'))
const dshRoot = process.env.DSH_ROOT
const themeCss = dshRoot === undefined ? undefined : join(dshRoot, 'packages', 'client', 'ui-theme', 'src', 'styles', 'design-platform.css')

const host = await import(pathToFileURL(join(root, 'lib', 'index.js')).href)
const routes = new Map()
host.apply({
  connection: { fetch: { register: (route) => { routes.set(route.path, route); return async () => {} } } },
  inject: () => {},
}, { libraryDir, ...argument('github-api', undefined) === undefined ? {} : { team: { githubApi: argument('github-api', undefined) } } })

/** Fallback tokens, used only without a DSH checkout. */
const FALLBACK_TOKENS = `
body { --dsw-alias-bg-base:#fff; --dsw-alias-bg-layer-1:#fff; --dsw-alias-bg-layer-2:#fff; --dsw-alias-bg-layer-3:#fff;
  --dsw-alias-border-l2:rgba(0,0,0,.1); --dsw-alias-border-l3:rgba(0,0,0,.12); --dsw-alias-brand-primary:#0d1117;
  --dsw-alias-interactive-bg-active:rgba(38,49,72,.1); --dsw-alias-interactive-bg-hover:rgba(38,49,72,.06);
  --dsw-alias-label-primary:#0d1117; --dsw-alias-label-secondary:#4b5563; --dsw-alias-label-tertiary:#6b7280;
  --dsw-alias-state-error-primary:#ec1313; --dsw-alias-link:#3b6cf6; --dsw-alias-state-success-primary:#16a34a; --dsw-alias-state-warn-primary:#f59e0b;
  background: var(--dsw-alias-bg-base); }
body[data-ds-dark-theme] { --dsw-alias-bg-base:#14161b; --dsw-alias-bg-layer-1:#1a1d23; --dsw-alias-bg-layer-2:#1f2229; --dsw-alias-bg-layer-3:#262a32;
  --dsw-alias-border-l2:rgba(255,255,255,.12); --dsw-alias-border-l3:rgba(255,255,255,.16); --dsw-alias-brand-primary:#f3f4f6;
  --dsw-alias-interactive-bg-active:rgba(255,255,255,.14); --dsw-alias-interactive-bg-hover:rgba(255,255,255,.08);
  --dsw-alias-label-primary:#f3f4f6; --dsw-alias-label-secondary:#c3c7cf; --dsw-alias-label-tertiary:#9aa0aa; --dsw-alias-link:#6b93ff; }`

const page = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>OKF plugin preview</title>
<link rel="stylesheet" href="/theme.css">
<style>
  html, body { margin: 0; height: 100%; font: 14px/1.4 system-ui, -apple-system, "Segoe UI", sans-serif; color: var(--dsw-alias-label-primary); }
  #shell { display: flex; height: 100%; }
  #sidebar { width: 230px; flex: none; box-sizing: border-box; padding: 14px 10px; border-right: .5px solid var(--dsw-alias-border-l3); display: flex; flex-direction: column; gap: 2px; font-size: 13px; }
  #sidebar .brand { font-weight: 600; padding: 2px 8px 12px; }
  #sidebar .item, #sidebar button { display: flex; align-items: center; gap: 8px; padding: 7px 10px; border: none; border-radius: 8px; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
  #sidebar button[aria-current="page"] { background: var(--dsw-alias-interactive-bg-active); }
  #sidebar .new { justify-content: center; border: .5px solid var(--dsw-alias-border-l2); margin-bottom: 8px; }
  #sidebar .group { font-size: 12px; color: var(--dsw-alias-label-tertiary); padding: 14px 10px 4px; }
  #frame { position: relative; flex: 1; min-width: 0; height: 100%; display: flex; flex-direction: column; }
  #main-panel { flex: 1; min-height: 0; display: none; }
  body.panel #main-panel { display: block; }
  body.panel .header, body.panel .conversation, body.panel .composer { display: none; }
  .header { display: flex; align-items: center; gap: 8px; height: 44px; padding: 0 12px; border-bottom: .5px solid var(--dsw-alias-border-l3); }
  .header .title { flex: 1; font-weight: 600; }
  .conversation { flex: 1; padding: 24px; color: var(--dsw-alias-label-tertiary); }
  .composer { margin: 0 24px 24px; padding: 10px 12px; border: .5px solid var(--dsw-alias-border-l2); border-radius: 14px; }
  .composer .row { display: flex; align-items: center; justify-content: flex-end; gap: 6px; margin-top: 18px; color: var(--dsw-alias-label-tertiary); font-size: 12px; }
  #overlay { position: absolute; inset: 0; pointer-events: none; }
</style></head>
<body>
<div id="shell">
<nav id="sidebar">
  <div class="brand">DSH Local Build</div>
  <button type="button" class="new" onclick="selectPanel(null)">⊕ New Session</button>
  <div class="item">Plugins</div>
  <div class="item">Automation tasks</div>
  <div id="panellist"></div>
  <div class="item">Open Artifact</div>
  <div class="item">More</div>
  <div class="group">Workspaces</div>
  <button type="button" onclick="selectPanel(null)">preview-session</button>
</nav>
<div id="frame">
  <div id="main-panel"></div>
  <div class="header"><span class="title">Session preview-session</span><span id="utilities"></span></div>
  <div class="conversation">A fake conversation. The OKF chip is in the header (top right) and in the composer below.</div>
  <div class="composer"><div>Ask anything…</div><div class="row"><span id="input-right"></span><span>model ▾</span><span>⬆</span></div></div>
  <div id="overlay"></div>
</div>
</div>
<script src="/react.js"></script>
<script src="/react-dom.js"></script>
<script>
  if (new URLSearchParams(location.search).has('dark')) document.body.setAttribute('data-ds-dark-theme', '')
  window.__ModuleLoader__ = { load: (registration) => { window.__okfFactory = registration.factory } }
</script>
<script src="/client.js"></script>
<script>
  // The UMD build has no jsx-runtime; this stand-in spreads static children the way jsxs means them.
  const element = (type, props, key, spread) => {
    const { children, ...rest } = props
    const config = key === undefined ? rest : { ...rest, key }
    return spread && Array.isArray(children) ? React.createElement(type, config, ...children) : React.createElement(type, config, children)
  }
  const jsx = {
    jsx: (type, props, key) => element(type, props, key, false),
    jsxs: (type, props, key) => element(type, props, key, true),
    Fragment: React.Fragment,
  }
  const mod = window.__okfFactory((name) => ({ react: React, 'react/jsx-runtime': jsx })[name])
  let dictionaries = {}
  const lang = new URLSearchParams(location.search).get('lang') || 'en'
  const t = (key, params = {}) => String(dictionaries[lang]?.[key] ?? key).replace(/\\{(\\w+)\\}/g, (_, n) => String(params[n] ?? ''))
  const entries = []
  let panelRoot
  const panels = {}
  window.selectPanel = (id) => {
    document.body.classList.toggle('panel', id !== null)
    for (const button of document.querySelectorAll('#panellist button')) button.setAttribute('aria-current', button.dataset.id === id ? 'page' : 'false')
    if (id !== null && panels[id] !== undefined) { panelRoot ??= ReactDOM.createRoot(document.getElementById('main-panel')); panelRoot.render(panels[id]) }
  }
  const effect = (callback) => { callback(); return () => {} }
  mod.apply({
    effect,
    // No DSH Workspace services here: Edit as workspace and Maintain show their by-hand fallback.
    inject: (deps, callback) => { if (deps.join() === 'layout') callback({ layout: { selectPanel: window.selectPanel }, effect }) },
    locale: { register: (ns, dict) => { dictionaries = dict; return () => {} }, getLocale: () => ({ active: lang }), bind: () => t },
    slots: { inject: (name, contribute) => contribute(), register: (options, component) => { entries.push({ options, component }); return () => {} } },
  })
  const sessionId = 'preview-session'
  const panellist = document.getElementById('panellist')
  for (const { options, component } of entries) {
    if (options.name === 'main') { panels[options.key] = React.createElement(component, { ...options.inject(), t }); continue }
    if (options.name === 'sidebar.panellist') {
      const button = document.createElement('button')
      button.type = 'button'
      button.dataset.id = options.id
      button.onclick = () => { window.selectPanel(options.id) }
      const icon = document.createElement('span')
      button.append(icon, document.createTextNode(options.label()))
      panellist.append(button)
      ReactDOM.createRoot(icon).render(React.createElement(component, { size: 15 }))
      continue
    }
    const target = { 'shell.overlay': 'overlay', 'conversation.session.header.utilities': 'utilities', 'conversation.input.right': 'input-right' }[options.name]
    const props = { ...options.inject(sessionId), t, ...(target === 'overlay' ? {} : { sessionId }) }
    // Each entry gets its own mount point, as each slot occupant does in the shell.
    const mount = document.createElement(target === 'overlay' ? 'div' : 'span')
    if (target === 'overlay') mount.style.cssText = 'position:absolute;inset:0;pointer-events:none'
    document.getElementById(target).append(mount)
    ReactDOM.createRoot(mount).render(React.createElement(component, props))
  }
  const wanted = new URLSearchParams(location.search).get('panel')
  if (wanted !== null) window.selectPanel(wanted)
</script>
</body></html>`

const files = {
  '/react.js': join(root, 'node_modules', 'react', 'umd', 'react.development.js'),
  '/react-dom.js': join(root, 'node_modules', 'react-dom', 'umd', 'react-dom.development.js'),
  '/client.js': join(root, 'lib', 'client.js'),
}

createServer((request, response) => {
  const url = new URL(request.url ?? '/', `http://127.0.0.1:${String(port)}`)
  const route = routes.get(url.pathname)
  if (route !== undefined) {
    const chunks = []
    request.on('data', (chunk) => { chunks.push(chunk) })
    request.on('end', () => {
      const body = request.method === 'GET' || request.method === 'HEAD' ? undefined : Buffer.concat(chunks)
      route.fetch(new Request(url, { method: request.method, headers: request.headers, ...body === undefined ? {} : { body } }))
        .then(async (answer) => {
          response.writeHead(answer.status, Object.fromEntries(answer.headers))
          response.end(Buffer.from(await answer.arrayBuffer()))
        }, (error) => { response.writeHead(500); response.end(String(error)) })
    })
    return
  }
  if (url.pathname === '/') {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
    response.end(page)
    return
  }
  if (url.pathname === '/theme.css') {
    response.writeHead(200, { 'content-type': 'text/css; charset=utf-8' })
    response.end(themeCss !== undefined && existsSync(themeCss) ? readFileSync(themeCss) : FALLBACK_TOKENS)
    return
  }
  const file = files[url.pathname]
  if (file !== undefined) {
    response.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-store' })
    response.end(readFileSync(file))
    return
  }
  response.writeHead(404)
  response.end('not found')
}).listen(port, '127.0.0.1', () => {
  console.log(`OKF preview on http://127.0.0.1:${String(port)}/  (library: ${libraryDir}; theme: ${themeCss ?? 'fallback tokens'})`)
})
