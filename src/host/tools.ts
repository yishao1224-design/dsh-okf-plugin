/**
 * Model tools for unattended wiki upkeep: Sync from code and Open pull request,
 * the same two steps the Team Wiki page runs, so a DSH automation task (a
 * Schedule reminder in a session in the project's maintenance workspace) can
 * keep a project wiki in step with its code:
 *
 *   wiki_sync_from_code  →  the agent edits the pages it names  →  wiki_open_pr
 *
 * Both call the Team service directly; nothing here duplicates its git or
 * pull request work. A quiet day costs one `git ls-remote`.
 *
 * @module
 */
import { LibraryError } from './library.ts'
import type { Team } from './team.ts'
import type { TextBlock, ToolDefinition, ToolRunContext } from '../types/contract.ts'
import type { MaintainRecord } from '../types/okf.ts'

/** The tool names, for the README and the smoke test. */
export const TOOL_NAMES = { sync: 'wiki_sync_from_code', openPr: 'wiki_open_pr' } as const

/** What `wiki_sync_from_code` answers. */
export type SyncToolValue =
  | { status: 'up-to-date', folder: string, commit: string }
  | {
    status: 'task'
    folder: string
    wiki: string
    workspace: string
    branch: string
    /** The wiki recorded no usable code commit: the task reads the code through. */
    readThrough: boolean
    from?: string
    to: string
    files: number
    pages: number
    task: string
  }
  | { status: 'nothing-to-do', folder: string, workspace: string, to: string }

/** What `wiki_open_pr` answers. */
export type OpenPrToolValue =
  | { status: 'opened', folder: string, number: number, url: string, reused: boolean, eligible: boolean, reasons: string[], files: string[], branch: string }
  | { status: 'pushed', folder: string, branch: string, files: string[], note: string }
  | { status: 'nothing-changed', folder: string }
  | { status: 'no-round', folder: string }

/** A JSON object schema with string properties. */
function stringsSchema(properties: Record<string, string>): Record<string, unknown> {
  return {
    type: 'object',
    properties: Object.fromEntries(Object.entries(properties).map(([key, description]) => [key, { type: 'string', description }])),
    additionalProperties: false,
  }
}

/**
 * Read the optional string arguments a tool declares.
 * @param args - the model's arguments.
 * @param keys - the declared keys.
 * @returns the present, non-blank values, trimmed.
 * @throws {Error} on anything that is not an object of strings.
 */
function strings<K extends string>(args: unknown, keys: readonly K[]): Partial<Record<K, string>> {
  if (args === undefined || args === null) return {}
  if (typeof args !== 'object' || Array.isArray(args)) throw new Error('Arguments must be an object.')
  const out: Partial<Record<K, string>> = {}
  for (const [key, value] of Object.entries(args)) {
    if (!(keys as readonly string[]).includes(key)) throw new Error(`Unknown argument "${key}". Allowed: ${keys.join(', ')}.`)
    if (value === undefined || value === null) continue
    if (typeof value !== 'string') throw new Error(`"${key}" must be a string.`)
    if (value.trim() !== '') out[key as K] = value.trim()
  }
  return out
}

/** A value as lossless JSON: no `undefined` fields. */
function plain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

/** One text block. */
function text(value: string): TextBlock[] {
  return [{ type: 'text', text: value }]
}

/**
 * Which project wiki a call means: the one it names, else the one whose
 * maintenance workspace the session runs in, else the only one there is.
 * @param team - the Team service.
 * @param named - the `folder` argument.
 * @param exec - the call, for the session's working directory.
 * @returns the wiki folder.
 * @throws {Error} naming the choices when it cannot tell.
 */
async function wikiOf(team: Team, named: string | undefined, exec: ToolRunContext): Promise<string> {
  const status = await team.status()
  if (status.team === undefined) throw new Error('No team wiki repository is connected. Connect one on the Team Wiki page first.')
  const folders = status.wikis.filter(wiki => wiki.missing !== true).map(wiki => wiki.folder)
  if (named !== undefined) {
    const folder = named.replace(/^\/+|\/+$/g, '')
    if (!folders.includes(folder)) throw new Error(`There is no project wiki "${named}". Project wikis: ${folders.join(', ') || '(none)'}.`)
    return folder
  }
  const cwd = exec.agent?.session.header.cwd
  const here = cwd === undefined ? undefined : await team.wikiAt(cwd)
  if (here !== undefined) return here
  if (folders.length === 1 && folders[0] !== undefined) return folders[0]
  throw new Error(`Name the project wiki with "folder". Project wikis: ${folders.join(', ') || '(none)'}.`)
}

/**
 * The two tools.
 * @param team - the Team service.
 * @returns the definitions to register.
 */
export function wikiTools(team: Team): ToolDefinition[] {
  const sync: ToolDefinition = {
    name: TOOL_NAMES.sync,
    description: [
      'Team Wiki: Sync from code. Checks whether a project\'s code repository has commits its wiki does not reflect yet.',
      'If not, answers status "up-to-date" and there is nothing to do.',
      'If so, it prepares the project\'s maintenance workspace (a wiki branch, the code checked out read-only under .code/) and answers status "task" with the workspace and a task listing the changed code and the wiki pages that cite it.',
      'Do that task: edit the pages in the workspace, run the lint it names, then call wiki_open_pr.',
      '"folder" is the wiki folder in the hub (e.g. "payments"); omit it in a session that runs in that wiki\'s maintenance workspace.',
    ].join(' '),
    parameters: stringsSchema({ folder: 'Project wiki folder in the hub, e.g. "payments". Optional in its maintenance workspace.' }),
    output: {
      schema: { type: 'object' },
      render: (_args, value) => {
        const answer = value as SyncToolValue
        if (answer.status === 'up-to-date') return text(`The ${answer.folder} wiki already reflects the code (commit ${answer.commit.slice(0, 10)}). Nothing to do.`)
        if (answer.status === 'nothing-to-do') return text(`The ${answer.folder} wiki records commit ${answer.to.slice(0, 10)} now, and no page needs changing. Nothing to do.`)
        return text([
          answer.readThrough
            ? `The ${answer.wiki} wiki records no code commit it can diff from, so this is a full read-through of the code at ${answer.to.slice(0, 10)}.`
            : `The code moved from ${(answer.from ?? '').slice(0, 10)} to ${answer.to.slice(0, 10)}: ${String(answer.files)} files changed, ${String(answer.pages)} wiki pages cite them.`,
          `Workspace: ${answer.workspace} (branch ${answer.branch}). Paths in the task are relative to it.`,
          `When the pages are done, call ${TOOL_NAMES.openPr} with folder "${answer.folder}".`,
          '',
          answer.task,
        ].join('\n'))
      },
    },
    async execute(args, exec) {
      const folder = await wikiOf(team, strings(args, ['folder']).folder, exec)
      const answer = await team.sync(folder)
      if (!('record' in answer)) return plain<SyncToolValue>({ status: 'up-to-date', folder, commit: answer.commit })
      const info = answer.sync
      const task = answer.initialize?.prompt
      if (info === undefined || task === undefined) {
        if (answer.initializeError !== undefined) throw new Error(answer.initializeError)
        return plain<SyncToolValue>({ status: 'nothing-to-do', folder, workspace: answer.workspace, to: info?.to ?? '' })
      }
      if (info.upToDate === true) return plain<SyncToolValue>({ status: 'up-to-date', folder, commit: info.to })
      return plain<SyncToolValue>({
        status: 'task',
        folder,
        wiki: answer.record.wikiName,
        workspace: answer.workspace,
        branch: answer.record.branch,
        readThrough: info.fallback === true,
        ...info.from === undefined ? {} : { from: info.from },
        to: info.to,
        files: info.files,
        pages: info.pages,
        task,
      })
    },
  }

  const openPr: ToolDefinition = {
    name: TOOL_NAMES.openPr,
    description: [
      'Team Wiki: Open pull request. Commits the project wiki\'s maintenance workspace (marking pages the agent wrote as unreviewed drafts), runs okf.py lint, pushes the wiki branch and opens or updates its pull request on the hub.',
      'Call it after finishing the task wiki_sync_from_code gave. If lint fails nothing is pushed: fix what it reports and call it again.',
      'A person reviews and merges the pull request; this tool never merges.',
    ].join(' '),
    parameters: stringsSchema({
      folder: 'Project wiki folder in the hub, e.g. "payments". Optional in its maintenance workspace.',
      title: 'Pull request title. Default: one written from the changed pages.',
      summary: 'One or two sentences on what changed and why, for the pull request description.',
    }),
    output: {
      schema: { type: 'object' },
      render: (_args, value) => {
        const answer = value as OpenPrToolValue
        switch (answer.status) {
          case 'opened':
            return text([
              `${answer.reused ? 'Updated' : 'Opened'} pull request #${String(answer.number)}: ${answer.url}`,
              `${String(answer.files.length)} files on ${answer.branch}. ${answer.eligible ? 'Eligible for auto-merge once CI agrees.' : `Needs a person: ${answer.reasons.join('; ')}`}`,
            ].join('\n'))
          case 'pushed': return text(`Pushed ${answer.branch} (${String(answer.files.length)} files), but no pull request was opened: ${answer.note}`)
          case 'nothing-changed': return text(`Nothing in the ${answer.folder} wiki has changed, so there is no pull request to open.`)
          case 'no-round': return text(`The ${answer.folder} wiki has no open maintenance round. Call ${TOOL_NAMES.sync} first.`)
        }
      },
    },
    async execute(args, exec) {
      const input = strings(args, ['folder', 'title', 'summary'])
      const folder = await wikiOf(team, input.folder, exec)
      const record: MaintainRecord | undefined = (await team.status()).maintains.find(item => item.wiki === folder)
      if (record === undefined) return plain<OpenPrToolValue>({ status: 'no-round', folder })
      try {
        const answer = await team.openPr(record.id, { ...input.title === undefined ? {} : { title: input.title }, ...input.summary === undefined ? {} : { summary: input.summary } })
        if (answer.pr === undefined) {
          return plain<OpenPrToolValue>({ status: 'pushed', folder, branch: answer.branch, files: [...answer.files], note: answer.notes.join(' ') || 'the hub host did not open one' })
        }
        return plain<OpenPrToolValue>({
          status: 'opened',
          folder,
          number: answer.pr.number,
          url: answer.pr.url,
          reused: answer.pr.reused,
          eligible: answer.eligible,
          reasons: [...answer.reasons],
          files: [...answer.files],
          branch: answer.branch,
        })
      } catch (error) {
        if (error instanceof LibraryError && error.code === 'nothing-changed') return plain<OpenPrToolValue>({ status: 'nothing-changed', folder })
        throw error
      }
    },
  }

  return [sync, openPr]
}
