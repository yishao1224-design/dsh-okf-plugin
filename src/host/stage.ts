/**
 * A page's lifecycle stage, read off OKF v0.2 frontmatter.
 *
 * Pages carry the standard `status` alone (`draft | stable | deprecated`);
 * the finer stages are derived, as knowledgeAgent's SCHEMA.md defines them:
 *
 * | stage        | frontmatter                                   |
 * |--------------|-----------------------------------------------|
 * | draft        | `status: draft`                               |
 * | active       | `status: stable`                              |
 * | needs_review | `status: stable` and the `needs-review` tag   |
 * | deprecated   | `status: deprecated`                          |
 * | archived     | `status: deprecated`, under `archive/`        |
 *
 * An overdue `stale_after` also puts a stable page up for review; callers that
 * know today's date check it separately. Pages written before the retired
 * `lifecycle` key was dropped still carry it; it is read as before, so such a
 * bundle keeps working until `okf.py migrate` folds it out.
 *
 * @module
 */

/** The five lifecycle stages. */
export type PageStage = 'draft' | 'active' | 'needs_review' | 'deprecated' | 'archived'

/** The tag that flags a stable page for re-checking. */
export const REVIEW_TAG = 'needs-review'

const STAGES = new Set<string>(['draft', 'active', 'needs_review', 'deprecated', 'archived'])

/**
 * A page's stage.
 * @param page - its `status`, legacy `lifecycle`, `tags`, and bundle-relative path.
 * @returns the stage, or undefined when the page states none.
 */
export function pageStage(page: { readonly status?: string | undefined, readonly lifecycle?: string | undefined, readonly tags?: readonly string[] | undefined, readonly path?: string | undefined }): PageStage | undefined {
  const flagged = page.tags?.includes(REVIEW_TAG) === true
  const archived = page.path !== undefined && /^\/?archive\//.test(page.path)
  const legacy = page.lifecycle !== undefined && STAGES.has(page.lifecycle) ? page.lifecycle as PageStage : undefined
  if (legacy !== undefined) return legacy === 'active' && flagged ? 'needs_review' : legacy
  switch (page.status) {
    case 'draft': return 'draft'
    case 'stable': return flagged ? 'needs_review' : 'active'
    case 'deprecated': return archived ? 'archived' : 'deprecated'
    default: return undefined
  }
}
