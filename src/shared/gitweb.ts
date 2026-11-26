/**
 * Browser links into a git repository: the web page of a remote and of one
 * file in it at a commit or branch. Shared by the Host (task prompts,
 * publishing) and the Client (source links), so it uses no Node API.
 *
 * GitHub, GitHub Enterprise, GitLab, Gitea and most other hosts show a file
 * at `<web>/blob/<ref>/<path>`. Azure DevOps does not: its file page is
 * `<web>?path=/<path>&version=GC<sha>` (GB<branch> for a branch), and a
 * `/blob/` link there is a 404.
 */

/**
 * A browsable URL for a git remote.
 * @param url - https or ssh (scp-style or ssh://).
 * @returns the web URL, without credentials or `.git`.
 */
export function webUrl(url: string): string {
  const trimmed = url.trim()
  const scp = /^[\w.-]+@([\w.-]+):(.+)$/.exec(trimmed)
  const https = scp !== null && !trimmed.includes('://') ? `https://${scp[1] ?? ''}/${scp[2] ?? ''}` : trimmed.replace(/^ssh:\/\/[^@/]+@/, 'https://').replace(/\/\/[^@/]+@/, '//')
  const web = https.replace(/\.git$/, '').replace(/\/$/, '')
  // Azure DevOps SSH remotes: ssh.dev.azure.com/v3/{org}/{project}/{repo}
  // and {org}@vs-ssh.visualstudio.com/v3/{org}/{project}/{repo}.
  const ado = /^https?:\/\/(ssh\.dev\.azure\.com|vs-ssh\.visualstudio\.com)(?::\d+)?\/(?:v3\/)?([^/]+)\/([^/]+)\/([^/]+)$/i.exec(web)
  if (ado !== null) {
    const [, host = '', org = '', project = '', repo = ''] = ado
    return host.toLowerCase() === 'ssh.dev.azure.com'
      ? `https://dev.azure.com/${org}/${project}/_git/${repo}`
      : `https://${org}.visualstudio.com/${project}/_git/${repo}`
  }
  return web
}

/**
 * Whether a web URL is an Azure DevOps repository (or a page under one).
 * @param web - the URL.
 * @returns true for dev.azure.com and *.visualstudio.com `_git` URLs.
 */
export function isAzureWeb(web: string): boolean {
  return /^https?:\/\/(?:[^/@]+@)?(?:dev\.azure\.com|[\w-]+\.visualstudio\.com)\/.*\/_git\/[^/?#]+/i.test(web)
}

/** Which version of a file a link shows. */
export type FileRef = { readonly commit: string } | { readonly branch: string }

/**
 * The web page of one file of a repository.
 * @param remote - the remote (any form {@link webUrl} takes).
 * @param ref - the commit or branch.
 * @param path - repository-relative; '<path>' is kept as a placeholder.
 * @returns the URL.
 */
export function fileUrl(remote: string, ref: FileRef, path: string): string {
  const web = webUrl(remote)
  const clean = path.replace(/^\/+/, '')
  const encoded = clean === '<path>' ? clean : clean.split('/').map(encodeURIComponent).join('/')
  if (isAzureWeb(web)) {
    const version = 'commit' in ref ? `GC${ref.commit}` : `GB${encodeURIComponent(ref.branch)}`
    return `${web}?path=/${encoded}&version=${version}`
  }
  return `${web}/blob/${'commit' in ref ? ref.commit : ref.branch}/${encoded}`
}

/**
 * The `resource` a page's `sources` entry gets for a file of the code
 * repository, with `<path>` left for the agent to fill in.
 * @param remote - the code remote.
 * @param commit - the commit the wiki reflects.
 * @returns a URL template, or a plain description for a non-HTTP remote.
 */
export function sourceTemplate(remote: string, commit: string): string {
  const web = webUrl(remote)
  return /^https?:\/\//.test(web) ? fileUrl(remote, { commit }, '<path>') : `${remote} at ${commit}, <path>`
}

/**
 * Repair an Azure DevOps file link written in GitHub's shape
 * (`…/_git/<repo>/blob/<ref>/<path>`, which Azure DevOps answers with a
 * 404) into the shape it serves. Any other URL comes back unchanged.
 * @param url - a link, e.g. a page's `sources[].resource`.
 * @returns the working link.
 */
export function fixSourceLink(url: string): string {
  const match = /^(https?:\/\/(?:[^/@]+@)?(?:dev\.azure\.com|[\w-]+\.visualstudio\.com)\/.*?\/_git\/[^/?#]+)\/blob\/([^/?#]+)\/([^?#]*)(#.*)?$/i.exec(url.trim())
  if (match === null) return url
  const [, web = '', ref = '', path = '', hash = ''] = match
  const version = /^[0-9a-f]{7,40}$/i.test(ref) ? `GC${ref}` : `GB${ref}`
  const line = /^#L(\d+)(?:-L?(\d+))?$/i.exec(hash)
  const lines = line === null ? '' : `&line=${line[1] ?? ''}&lineEnd=${line[2] ?? line[1] ?? ''}&lineStartColumn=1&lineEndColumn=1&lineStyle=plain&_a=contents`
  return `${web.replace(/\/\/[^/@]+@/, '//')}?path=/${path}&version=${version}${lines}`
}

/**
 * The commits a text's file links pin: `/blob/<sha>/` (GitHub shape) and
 * `version=GC<sha>` (Azure DevOps).
 * @param text - e.g. a page's frontmatter.
 * @returns the commits, in order of appearance (repeats kept).
 */
export function linkedCommits(text: string): string[] {
  return [...text.matchAll(/\/blob\/([0-9a-f]{7,40})\/|[?&]version=GC([0-9a-f]{7,40})\b/gi)].map(match => (match[1] ?? match[2] ?? '').toLowerCase())
}

/**
 * {@link fixSourceLink} applied to every Azure DevOps `/blob/` link in a text.
 * @param text - e.g. a whole page.
 * @returns the text with working links, and how many were rewritten.
 */
export function fixSourceLinks(text: string): { text: string, count: number } {
  let count = 0
  const out = text.replace(/https?:\/\/(?:[^/@\s]+@)?(?:dev\.azure\.com|[\w-]+\.visualstudio\.com)\/[^\s)'"<>\]]*?\/_git\/[^/?#\s]+\/blob\/[^\s)'"<>\]]+/gi, (link) => {
    const fixed = fixSourceLink(link)
    if (fixed !== link) count += 1
    return fixed
  })
  return { text: out, count }
}
