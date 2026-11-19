/**
 * Browser half of the OKF bundle plugin.
 *
 * - `conversation.input.right`: a compact chip in the composer's tool row that
 *   shows the session's bundle and opens the dialog for that session. DSH draws
 *   this row in a blank session too, where a bundle is usually chosen.
 * - `conversation.session.header.utilities`: the same chip in the session
 *   header, which DSH shows only once the session has messages.
 * - `shell.overlay`: the dialog itself (library, fetch form, preview, page
 *   reader, session selector), drawn over the frame while open.
 *
 * - `sidebar.panellist` + `main`: the Team Wiki page (see `team.tsx`): the team
 *   wiki repository's project wikis, their pull requests, New project wiki and
 *   Maintain. In a maintenance session, an Open pull request button joins the
 *   chip in the header and composer, and its dialog sits in `shell.overlay`.
 *
 * Every entry shares one store. The `apply`/`inject` shape is the contract the
 * Harness client Loader mounts; types come from `../types/contract.ts`.
 *
 * DSH's `workspaces` and `uiWorkspace` services (for Edit as workspace) are
 * reached through `ctx.inject`, not the hard `inject` list, so the dialog still
 * loads on a shell that does not provide them; Edit as workspace then hands the
 * user the folder to add by hand.
 */
import type { ClientContext } from '../types/contract.ts'
import type { WorkspaceNavigation } from './store.ts'
import { OkfDialog, SessionChip } from './components.tsx'
import type { OkfInjected } from './components.tsx'
import { en, NS, zh } from './locales.ts'
import { createOkfStore } from './store.ts'
import { MaintainButton, OpenPrDialog, TeamWikiIcon, TeamWikiPage } from './team.tsx'

/** The `main` key of the Team Wiki page and the id of its sidebar entry. */
export const PANEL_ID = 'okf-team-wiki'

/** Required services: the slot registry and dictionaries. */
export const inject = ['slots', 'locale']

/**
 * Client plugin body.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'okf: dictionaries')
  const t = ctx.locale.bind(NS)

  let navigation: Omit<WorkspaceNavigation, 'layout'> | undefined
  let layout: WorkspaceNavigation['layout']
  ctx.inject(['workspaces', 'uiWorkspace'], (scope) => {
    scope.effect(() => {
      navigation = { workspaces: scope.workspaces, uiWorkspace: scope.uiWorkspace }
      return () => { navigation = undefined }
    }, 'okf: workspace services')
  })
  ctx.inject(['layout'], (scope) => {
    scope.effect(() => {
      layout = scope.layout
      return () => { layout = undefined }
    }, 'okf: layout service')
  })
  const current = (): WorkspaceNavigation | undefined => (navigation === undefined ? undefined : { ...navigation, ...layout === undefined ? {} : { layout } })

  ctx.effect(() => {
    const store = createOkfStore(undefined, current)
    const injected = (): OkfInjected => ({ store })
    const disposeDialog = ctx.slots.inject('shell.overlay', () => ctx.slots.register({
      name: 'shell.overlay',
      id: 'okf-dialog',
      locale: NS,
      inject: injected,
    }, OkfDialog))
    const disposeChip = ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.register({
      name: 'conversation.session.header.utilities',
      id: 'okf-bundle',
      order: -20,
      locale: NS,
      inject: injected,
    }, SessionChip))
    const disposeComposer = ctx.slots.inject('conversation.input.right', () => ctx.slots.register({
      name: 'conversation.input.right',
      id: 'okf-bundle',
      order: -20,
      locale: NS,
      inject: () => ({ store, compact: true }),
    }, SessionChip))
    const disposeTeam = [
      ctx.slots.inject('main', () => ctx.slots.register({
        name: 'main',
        key: PANEL_ID,
        locale: NS,
        inject: injected,
      }, TeamWikiPage)),
      ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
        name: 'sidebar.panellist',
        id: PANEL_ID,
        order: 30,
        locale: NS,
        label: () => t('panel'),
      }, TeamWikiIcon)),
      ctx.slots.inject('shell.overlay', () => ctx.slots.register({
        name: 'shell.overlay',
        id: 'okf-team-pr',
        locale: NS,
        inject: injected,
      }, OpenPrDialog)),
      ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.register({
        name: 'conversation.session.header.utilities',
        id: 'okf-team-pr',
        order: -21,
        locale: NS,
        inject: injected,
      }, MaintainButton)),
      ctx.slots.inject('conversation.input.right', () => ctx.slots.register({
        name: 'conversation.input.right',
        id: 'okf-team-pr',
        order: -21,
        locale: NS,
        inject: () => ({ store, compact: true }),
      }, MaintainButton)),
    ]
    return () => {
      for (const dispose of disposeTeam.reverse()) dispose()
      disposeComposer()
      disposeChip()
      disposeDialog()
      store.dispose()
    }
  }, 'okf: session chip, dialog and Team Wiki page')
}

// Re-exported for scripts/smoke.mjs, which tests the built artifact only.
export { bundleTarget, renderMarkdown } from './markdown.tsx'
export { slugify } from './team.tsx'
