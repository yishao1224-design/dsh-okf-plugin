/**
 * kb-publish: render a project's OKF bundle into Azure DevOps wiki pages.
 *
 * The output lives in the hub at `published/Projects/<Project>.md` (the
 * project's landing page) and `published/Projects/<Project>/…` (one page per
 * concept), the layout an Azure DevOps wiki expects: a page `X.md` with its
 * sub-pages in the folder `X/`. After the pull request merges,
 * examples/wiki-publish-to-ado.yml mirrors `published/Projects/` into the
 * wiki's `Projects/` section.
 *
 * Rendering is pure and deterministic (no clock), so publishing an unchanged
 * bundle changes nothing:
 * - frontmatter is dropped; the review state becomes a line under the title;
 * - `index.md` becomes the landing page; `log.md`, `SCHEMA.md`, `sources/`,
 *   `archive/` and deprecated or archived pages are not published;
 * - file and folder names follow the wiki's title rules (space → `-`,
 *   `-` and `:<>*?|"%` percent-encoded), from each page's `title`;
 * - each folder gets a page listing its pages;
 * - links between published pages become wiki paths (`/Projects/P/Concepts/X`);
 *   links to anything else in the bundle go to the file in the hub; links to
 *   nothing become plain text.
 */
import { posix } from 'node:path'
import { reviewState, splitPage } from './review.ts'
import { pageStage } from './stage.ts'
import { parsePage, text as metaText } from './frontmatter.ts'

/** A file of the bundle. */
export interface BundleFile {
  /** Bundle-relative, `/` separators. */
  readonly path: string
  readonly source: string
}

/** What the landing page says about the project. */
export interface PublishProject {
  readonly name: string
  /** The bundle's folder in the hub. */
  readonly folder: string
  /** The hub's web URL (no `.git`). */
  readonly hubWeb: string
  /** The hub's base branch. */
  readonly branch: string
  readonly summary?: string
  readonly owner?: string
  readonly repo?: string
}

/** One rendered page. */
export interface PublishedPage {
  /** Hub-relative path under `published/Projects/`. */
  readonly path: string
  readonly content: string
}

/** The rendering. */
export interface Publication {
  /** The project's folder: `published/Projects/<Project>`. */
  readonly dir: string
  /** The landing page: `published/Projects/<Project>.md`. */
  readonly landing: string
  readonly pages: PublishedPage[]
  /** Bundle pages left out, with why. */
  readonly skipped: { path: string, reason: string }[]
}

/**
 * A page or folder name as an Azure DevOps wiki file name.
 * @param title - the title shown in the wiki.
 * @returns the name (without `.md`).
 */
export function adoName(title: string): string {
  const clean = title.replace(/[\\/#\r\n\t]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^\.+/, '') || 'Untitled'
  return clean
    .replace(/%/g, '%25')
    .replace(/[:<>*?|"-]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/ /g, '-')
}

/**
 * A browsable URL for a git remote.
 * @param url - https or scp-style ssh.
 * @returns the web URL, without credentials or `.git`.
 */
export function webUrl(url: string): string {
  const trimmed = url.trim()
  const scp = /^[\w.-]+@([\w.-]+):(.+)$/.exec(trimmed)
  const https = scp !== null && !trimmed.includes('://') ? `https://${scp[1] ?? ''}/${scp[2] ?? ''}` : trimmed.replace(/^ssh:\/\/[^@/]+@/, 'https://').replace(/\/\/[^@/]+@/, '//')
  return https.replace(/\.git$/, '').replace(/\/$/, '')
}

/**
 * The published folder of a project, hub-relative.
 * @param name - the project name.
 * @returns `published/Projects/<name>`.
 */
export function publishedDir(name: string): string {
  return `published/Projects/${adoName(name)}`
}

/**
 * The project a `published/Projects/…` path belongs to, as its file name.
 * @param path - hub-relative.
 * @returns the encoded project name, or undefined.
 */
export function publishedProject(path: string): string | undefined {
  return /^published\/Projects\/([^/]+?)(?:\.md$|\/)/.exec(path)?.[1]
}

/** Folder names: `concepts` → `Concepts`, `how-to` → `How To`. */
function folderTitle(segment: string): string {
  return segment.split(/[-_\s]+/).filter(Boolean).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || segment
}

/** The first `# ` heading of a body. */
function firstHeading(body: string): RegExpExecArray | null {
  return /^#[ \t]+(.+?)[ \t]*#*[ \t]*$/m.exec(body)
}

/** Whether a bundle file is published as a page. */
function skipReason(path: string, source: string): string | undefined {
  if (!path.endsWith('.md')) return 'not markdown'
  if (path === 'index.md' || path === 'log.md' || path === 'SCHEMA.md' || path.endsWith('/index.md')) return 'bundle bookkeeping'
  if (path.startsWith('sources/')) return 'raw source capture'
  if (path.startsWith('archive/')) return 'archived'
  const meta = parsePage(source).meta
  const stage = pageStage({ status: metaText(meta, 'status'), lifecycle: metaText(meta, 'lifecycle'), path })
  if (stage === 'deprecated' || stage === 'archived') return stage
  return undefined
}

/**
 * Render a bundle.
 * @param files - every file of the bundle (pages and others).
 * @param project - the project.
 * @returns the pages to write.
 */
export function renderBundle(files: readonly BundleFile[], project: PublishProject): Publication {
  const dir = publishedDir(project.name)
  const wikiRoot = `/Projects/${adoName(project.name)}`
  const known = new Set(files.map(file => file.path))
  const skipped: { path: string, reason: string }[] = []

  // 1 · Where each published page goes.
  const target = new Map<string, string>() // bundle path → path under dir, without .md
  const titleOf = new Map<string, string>()
  const descriptionOf = new Map<string, string>()
  const taken = new Set<string>()
  const pages = files.filter((file) => {
    const reason = skipReason(file.path, file.source)
    if (reason !== undefined && reason !== 'not markdown' && file.path !== 'index.md') skipped.push({ path: file.path, reason })
    return reason === undefined
  }).sort((a, b) => a.path.localeCompare(b.path))
  for (const file of pages) {
    const meta = parsePage(file.source).meta
    const split = splitPage(file.source)
    const title = metaText(meta, 'title') ?? firstHeading(split?.body ?? file.source)?.[1] ?? folderTitle(posix.basename(file.path, '.md'))
    const folders = posix.dirname(file.path) === '.' ? [] : posix.dirname(file.path).split('/').map(segment => adoName(folderTitle(segment)))
    let name = adoName(title)
    for (let n = 2; taken.has([...folders, name].join('/').toLowerCase()); n += 1) name = adoName(`${title} (${String(n)})`)
    const out = [...folders, name].join('/')
    taken.add(out.toLowerCase())
    target.set(file.path, out)
    titleOf.set(file.path, title)
    const description = metaText(meta, 'description')
    if (description !== undefined) descriptionOf.set(file.path, description)
  }

  const hubFile = (path: string): string => `${project.hubWeb}/blob/${project.branch}/${project.folder === '' ? '' : `${project.folder}/`}${path.split('/').map(encodeURIComponent).join('/')}`
  const wikiLink = (out: string): string => `${wikiRoot}/${out}`

  /** Rewrite the links of a body that lives at `from` in the bundle. */
  const relink = (body: string, from: string): string => {
    let fence = false
    return body.split('\n').map((line) => {
      if (/^\s*(```|~~~)/.test(line)) fence = !fence
      if (fence) return line
      return line.replace(/(!?)\[([^\]\n]*)\]\(([^)\s]+)((?:\s+"[^"]*")?)\)/g, (whole, bang: string, label: string, href: string, title: string) => {
        if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('#') || href.startsWith('//')) return whole
        const [rawPath = '', anchor] = href.split('#', 2)
        let path: string
        try {
          path = decodeURIComponent(rawPath)
        } catch {
          path = rawPath
        }
        const resolved = path.startsWith('/') ? posix.normalize(path.slice(1)) : posix.normalize(posix.join(posix.dirname(from), path))
        if (resolved.startsWith('..')) return bang === '' ? label : whole
        const page = target.get(resolved)
        if (page !== undefined && bang === '') return `[${label}](${wikiLink(page)}${anchor === undefined ? '' : `#${anchor}`}${title})`
        if (resolved === 'index.md' && bang === '') return `[${label}](${wikiRoot}${title})`
        if (known.has(resolved)) return `${bang}[${label}](${hubFile(resolved)}${anchor === undefined ? '' : `#${anchor}`}${title})`
        return bang === '' ? label : whole
      })
    }).join('\n')
  }

  const footer = (from: string): string => `\n---\n\n_Published from [${project.folder === '' ? '' : `${project.folder}/`}${from}](${hubFile(from)}) in the team wiki hub. Edit the bundle there, not this page; it is overwritten on the next publish._\n`

  // 2 · Concept pages.
  const out: PublishedPage[] = []
  for (const file of pages) {
    const split = splitPage(file.source)
    let body = (split?.body ?? file.source).replace(/\r\n/g, '\n').replace(/^\n+/, '')
    const review = reviewState(file.source)
    const status = review.state === 'reviewed'
      ? `> Reviewed by ${review.reviewer ?? '?'} on ${review.reviewedAt ?? '?'}.`
      : review.stage === 'needs_review'
        ? '> **Due for re-review.** Its sources changed or its review date passed; check before relying on it.'
        : `> **Unreviewed.** ${review.generatedBy === undefined ? 'Written by an agent' : `Written by ${review.generatedBy}${review.generatedAt === undefined ? '' : ` on ${review.generatedAt}`}`}; a person has not checked it yet.`
    const heading = firstHeading(body)
    if (heading !== null && body.slice(0, heading.index).trim() === '') {
      const end = heading.index + heading[0].length
      body = `${body.slice(0, end)}\n\n${status}\n${body.slice(end)}`
    } else {
      body = `# ${titleOf.get(file.path) ?? file.path}\n\n${status}\n\n${body}`
    }
    out.push({ path: `${dir}/${target.get(file.path) ?? ''}.md`, content: `${relink(body, file.path).replace(/\s*$/, '\n')}${footer(file.path)}` })
  }

  // 3 · A page for each folder, listing what is in it.
  const folders = new Map<string, string[]>() // out folder → bundle paths of its direct pages
  for (const file of pages) {
    const parts = (target.get(file.path) ?? '').split('/')
    for (let depth = 1; depth < parts.length; depth += 1) {
      const folder = parts.slice(0, depth).join('/')
      if (!folders.has(folder)) folders.set(folder, [])
    }
    if (parts.length > 1) folders.get(parts.slice(0, -1).join('/'))?.push(file.path)
  }
  const pageNames = new Set([...target.values()].map(path => path.toLowerCase()))
  for (const [folder, members] of [...folders].sort(([a], [b]) => a.localeCompare(b))) {
    if (pageNames.has(folder.toLowerCase())) continue
    const title = decodeURIComponent(folder.split('/').at(-1) ?? folder).replace(/-/g, ' ')
    const lines = members
      .sort((a, b) => (titleOf.get(a) ?? a).localeCompare(titleOf.get(b) ?? b))
      .map(path => `- [${titleOf.get(path) ?? path}](${wikiLink(target.get(path) ?? '')})${descriptionOf.has(path) ? ` — ${descriptionOf.get(path) ?? ''}` : ''}`)
    const sub = [...folders.keys()].filter(other => other.startsWith(`${folder}/`) && !other.slice(folder.length + 1).includes('/'))
    out.push({ path: `${dir}/${folder}.md`, content: `# ${title}\n\n${[...sub.map(other => `- [${decodeURIComponent(other.split('/').at(-1) ?? other).replace(/-/g, ' ')}](${wikiLink(other)})`), ...lines].join('\n') || '_Nothing published here yet._'}\n` })
  }

  // 4 · The landing page, from index.md.
  const index = files.find(file => file.path === 'index.md')
  const about = [
    project.summary,
    [project.owner === undefined ? undefined : `Owner: ${project.owner}`, project.repo === undefined ? undefined : /^https?:\/\//.test(project.repo) ? `[Code repository](${project.repo})` : `Code: ${project.repo}`].filter(Boolean).join(' · '),
  ].filter(text => text !== undefined && text !== '')
  let landing = `# ${project.name}\n\n${about.map(line => `${line ?? ''}\n\n`).join('')}> Published from the OKF bundle \`${project.folder === '' ? '/' : `${project.folder}/`}\` in [the team wiki hub](${project.hubWeb}). Pages marked **Unreviewed** were written by an agent and not yet checked by a person.\n`
  if (index !== undefined) {
    const body = (splitPage(index.source)?.body ?? index.source).replace(/\r\n/g, '\n').replace(/^\s*#[ \t]+.*\n/, '')
      // Under the landing page's own title, the catalog's sections are one level down.
      .split('\n').map(line => (/^#{1,5}[ \t]/.test(line) ? `#${line}` : line)).join('\n')
    landing += `\n${relink(body, 'index.md').trim()}\n`
  } else {
    const top = [...folders.keys()].filter(folder => !folder.includes('/'))
    const loose = pages.filter(file => !(target.get(file.path) ?? '').includes('/'))
    landing += `\n${[...top.map(folder => `- [${decodeURIComponent(folder).replace(/-/g, ' ')}](${wikiLink(folder)})`), ...loose.map(file => `- [${titleOf.get(file.path) ?? file.path}](${wikiLink(target.get(file.path) ?? '')})`)].join('\n')}\n`
  }
  return { dir, landing: `${dir}.md`, pages: [{ path: `${dir}.md`, content: landing }, ...out], skipped }
}
