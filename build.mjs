/**
 * Build the two artifacts this bundle ships.
 *
 * `lib/index.js` is the Host half: a plain ESM module the Loader imports for
 * the row named in `cordis.patch.yml`. It serves the /api/okf/* Fetch routes,
 * and the per-session prompt context. It runs
 * from the installed folder with no node_modules, so it may import only Node
 * built-ins.
 *
 * `lib/client.js` is the browser half, and its *wrapper* is a protocol, not a
 * preference. The Harness client module system is a lazy CommonJS table: a
 * browser bundle must arrive as one script that only REGISTERS a factory, then
 * materialize that factory on first import. So the artifact is wrapped in
 * exactly this shape, with the id the client graph keys the row by (the package
 * name) and every non-platform import left as a `require` the module table
 * answers:
 *
 *     window.__ModuleLoader__.load({ id: '<package name>', factory: (require) => {
 *       var module = { exports: {} }; var exports = module.exports;
 *       ...bundle body...
 *       return module.exports;
 *     } });
 *
 * React stays an external `require` because the shell seeds React into the
 * module table; inlining a copy would give the pill a second React instance and
 * break hooks against the shell's renderer.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { build } from 'tsdown'

const root = fileURLToPath(new URL('.', import.meta.url))
const manifest = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

if (typeof manifest.name !== 'string' || manifest.name === '') {
  throw new Error('build: package.json must declare a name; the client artifact registers under it')
}
if (manifest.dsh?.client?.platform !== 'web') {
  throw new Error('build: this bundle expects dsh.client.platform === "web"')
}

/**
 * Resolve the `exports["./client"]` target as written, preserving the author's
 * key spelling (`./client` or `client`) rather than normalizing it.
 * @param exportsField - the manifest's `exports` value.
 * @returns the relative client artifact path.
 */
function clientExport(exportsField) {
  if (typeof exportsField !== 'object' || exportsField === null) {
    throw new Error('build: package.json needs an exports map')
  }
  const key = Object.keys(exportsField).find(candidate => candidate.replace(/^\.\//, '') === 'client')
  if (key === undefined) throw new Error('build: package.json exports must declare a "client" subpath')
  const entry = exportsField[key]
  const value = typeof entry === 'string' ? entry : entry?.default
  if (typeof value !== 'string') throw new Error('build: exports["./client"] must be a string or carry a string default')
  return value
}

const clientEntry = clientExport(manifest.exports)

// Host half: ordinary ESM, no wrapper. `fixedExtension: false` keeps the
// artifact at the `lib/index.js` this manifest's exports promise (the default
// for a node-target ESM build is `.mjs`).
await build({
  cwd: root,
  entry: { index: 'src/index.ts' },
  outDir: 'lib',
  format: ['esm'],
  platform: 'node',
  target: 'es2022',
  fixedExtension: false,
  clean: false,
  dts: false,
  sourcemap: false,
})

// Browser half: the registered lazy factory.
await build({
  cwd: root,
  entry: { client: 'src/client/index.ts' },
  outDir: 'lib',
  format: ['cjs'],
  platform: 'browser',
  target: 'es2022',
  clean: false,
  dts: false,
  sourcemap: false,
  deps: {
    // The shell seeds these identities into the module table; a bundled copy
    // would be a second instance and break hooks against the shell renderer.
    neverBundle: ['react', 'react/jsx-runtime', 'react-dom', 'react-dom/client'],
    alwaysBundle: () => true,
  },
  inputOptions: { resolve: { conditionNames: ['browser', 'import', 'module', 'default'] } },
  outputOptions: {
    entryFileNames: clientEntry.replace(/^\.\//, '').replace(/^lib\//, ''),
    intro: 'var module = { exports: {} }; var exports = module.exports;',
    banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(manifest.name)}, factory: (require) => {`,
    footer: 'return module.exports; } });',
  },
})

const artifact = readFileSync(new URL(clientEntry, import.meta.url), 'utf8')
if (!artifact.startsWith('window.__ModuleLoader__.load(')) {
  throw new Error(`build: ${clientEntry} does not open with the module-loader registration`)
}
// This bundle styles itself inline, so a stylesheet toolchain reaching the
// browser artifact is a build mistake rather than a feature.
for (const forbidden of ['.module.css', 'lightningcss']) {
  if (artifact.includes(forbidden)) {
    throw new Error(`build: ${clientEntry} unexpectedly carries "${forbidden}" — the UI styles itself inline`)
  }
}

// The Host half must not reach for a package the installed folder does not have.
const host = readFileSync(new URL('./lib/index.js', import.meta.url), 'utf8')
const imports = [...host.matchAll(/^import\s.*?from\s+['"]([^'"]+)['"]/gm)].map(match => match[1])
const foreign = imports.filter(specifier => !specifier.startsWith('node:'))
if (foreign.length > 0) throw new Error(`build: lib/index.js imports non-built-in modules: ${foreign.join(', ')}`)

console.log(`build: ${manifest.name} -> lib/index.js + ${clientEntry} (${String(artifact.length)} bytes, id ${manifest.name})`)
