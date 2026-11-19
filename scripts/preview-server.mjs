/**
 * A development page for looking at the built UI without a Harness.
 *
 * It applies the built Host half (`lib/index.js`) to a stub context, serves its
 * /api/okf/* routes for real (real git, real library folder), and serves a page
 * that executes the built browser artifact the way the shell does: React from
 * this package's node_modules, a `window.__ModuleLoader__`, and a tiny slot
 * registry that renders the `shell.overlay` entry and a fake session header
 * holding the `conversation.session.header.utilities` entry.
 *
 * Theme: with DSH_ROOT set to a DSH checkout, the page loads DSH's own
 * design-platform.css, so the `--dsw-*` colors are the real ones. `?dark` on
 * the URL switches to the dark theme.
 *
 * Usage: node scripts/preview-server.mjs [--port 4317] [--library <dir>]
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
}, { libraryDir })

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
  #frame { position: relative; height: 100%; display: flex; flex-direction: column; }
  .header { display: flex; align-items: center; gap: 8px; height: 44px; padding: 0 12px; border-bottom: .5px solid var(--dsw-alias-border-l3); }
  .header .title { flex: 1; font-weight: 600; }
  .conversation { flex: 1; padding: 24px; color: var(--dsw-alias-label-tertiary); }
  .composer { margin: 0 24px 24px; padding: 10px 12px; border: .5px solid var(--dsw-alias-border-l2); border-radius: 14px; }
  .composer .row { display: flex; align-items: center; justify-content: flex-end; gap: 6px; margin-top: 18px; color: var(--dsw-alias-label-tertiary); font-size: 12px; }
  #overlay { position: absolute; inset: 0; pointer-events: none; }
</style></head>
<body>
<div id="frame">
  <div class="header"><span class="title">Session preview-session</span><span id="utilities"></span></div>
  <div class="conversation">A fake conversation. The OKF chip is in the header (top right) and in the composer below.</div>
  <div class="composer"><div>Ask anything…</div><div class="row"><span id="input-right"></span><span>model ▾</span><span>⬆</span></div></div>
  <div id="overlay"></div>
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
  mod.apply({
    effect: (callback) => { callback(); return () => {} },
    // No DSH Workspace services here: Edit as workspace shows its by-hand fallback.
    inject: () => {},
    locale: { register: (ns, dict) => { dictionaries = dict; return () => {} }, getLocale: () => ({ active: lang }) },
    slots: { inject: (name, contribute) => contribute(), register: (options, component) => { entries.push({ options, component }); return () => {} } },
  })
  const sessionId = 'preview-session'
  for (const { options, component } of entries) {
    const target = { 'shell.overlay': 'overlay', 'conversation.session.header.utilities': 'utilities', 'conversation.input.right': 'input-right' }[options.name]
    const props = { ...options.inject(sessionId), t, ...(target === 'overlay' ? {} : { sessionId }) }
    ReactDOM.createRoot(document.getElementById(target)).render(React.createElement(component, props))
  }
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
