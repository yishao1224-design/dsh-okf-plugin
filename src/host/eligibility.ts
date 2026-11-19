/**
 * Whether an agent's wiki change may merge without a person.
 *
 * The rule from the team-wiki design: an agent pull request may auto-merge to
 * the main branch when lint passes and it only touches **unreviewed** wiki
 * pages. Concretely, every changed file must be one of:
 *
 * - a page under the bundle that was unreviewed (or new) before the change and
 *   is still unreviewed after it;
 * - `index.md` / `log.md` (maintained by the toolchain);
 * - a new file under `sources/` (captures are append-only).
 *
 * Anything else needs a person: editing a reviewed page (it resets to
 * unreviewed, which a person should see), deleting a page, touching
 * `SCHEMA.md`, `archive/`, an existing capture, or anything outside the bundle,
 * or a page that claims a human review the agent cannot give.
 *
 * The same function backs the Team Wiki page's Open pull request and `lib/check-pr.js`, which
 * the wiki repository's CI runs before it enables auto-merge, so the label the
 * agent sets is never trusted on its own.
 */
import { reviewState } from './review.ts'
import type { ReviewState } from './review.ts'

/** One changed file between the base and the proposed change. */
export interface ChangedFile {
  /** Repository-relative path with `/` separators. */
  readonly path: string
  readonly status: 'added' | 'modified' | 'deleted'
  /** Text before the change, for modified and deleted files. */
  readonly before?: string
  /** Text after the change, for added and modified files. */
  readonly after?: string
}

/** One changed page in the verdict. */
export interface PageChange {
  readonly path: string
  readonly status: ChangedFile['status']
  readonly before?: ReviewState
  readonly after?: ReviewState
}

/** The verdict. */
export interface Verdict {
  readonly eligible: boolean
  /** Why it is not eligible; empty when it is. */
  readonly reasons: string[]
  readonly pages: PageChange[]
}

/**
 * Judge a change.
 * @param bundleDir - the bundle folder in the repository, e.g. `okf`.
 * @param files - the changed files.
 * @returns the verdict.
 */
export function judge(bundleDir: string, files: readonly ChangedFile[]): Verdict {
  const prefix = `${bundleDir.replace(/\\/g, '/').replace(/^\.\/|\/$/g, '')}/`
  const reasons: string[] = []
  const pages: PageChange[] = []
  if (files.length === 0) reasons.push('the change is empty')
  for (const file of files) {
    if (!file.path.startsWith(prefix)) {
      reasons.push(`changes ${file.path}, which is outside the wiki`)
      continue
    }
    const rel = file.path.slice(prefix.length)
    if (rel === 'index.md' || rel === 'log.md') continue
    if (rel.startsWith('sources/')) {
      if (file.status !== 'added') reasons.push(`${file.status === 'deleted' ? 'deletes' : 'modifies'} the capture ${rel}; captures are immutable`)
      continue
    }
    if (rel === 'SCHEMA.md') {
      reasons.push('changes SCHEMA.md, the bundle conventions')
      continue
    }
    if (rel.startsWith('archive/')) {
      reasons.push(`changes the archived page ${rel}`)
      continue
    }
    if (!rel.endsWith('.md')) {
      reasons.push(`changes ${rel}, which is not a wiki page`)
      continue
    }
    const before = file.before === undefined ? undefined : reviewState(file.before)
    const after = file.after === undefined ? undefined : reviewState(file.after)
    pages.push({ path: rel, status: file.status, ...before === undefined ? {} : { before }, ...after === undefined ? {} : { after } })
    if (file.status === 'deleted') reasons.push(`deletes the page ${rel}`)
    if (before?.state === 'reviewed') reasons.push(`edits ${rel}, which ${before.reviewer ?? 'a person'} reviewed on ${before.reviewedAt ?? '?'}`)
    if (after?.state === 'reviewed') reasons.push(`${rel} claims a human review; only a person may stamp verified`)
  }
  return { eligible: reasons.length === 0, reasons, pages }
}
