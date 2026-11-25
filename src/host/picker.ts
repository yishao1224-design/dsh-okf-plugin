/**
 * Open the operating system's own folder picker on the machine the Host runs on.
 *
 * DSH serves its page from the local Host, so the browser page cannot open a
 * native folder dialog that answers with an absolute path. The Host can: it
 * runs the platform's own picker as a child process and answers with the
 * chosen path.
 *
 * - Windows: Windows PowerShell's `FolderBrowserDialog`, owned by a hidden
 *   top-most form so it opens in front of the browser. The script travels as
 *   `-EncodedCommand` and the start folder as an environment variable, so no
 *   path is ever quoted into a command line. Output is UTF-8, for non-ASCII paths.
 * - macOS: `osascript` with `choose folder`.
 * - Linux and the rest: `zenity`, else `kdialog`.
 *
 * Cancelling answers `null`, never an error.
 */
import { execFile } from 'node:child_process'
import { stat } from 'node:fs/promises'
import { LibraryError } from './library.ts'

/** How long a person may take to choose. */
const PICK_TIMEOUT_MS = 15 * 60_000

/** One way to run a picker. */
interface PickerCommand {
  readonly file: string
  readonly args: readonly string[]
  readonly env?: NodeJS.ProcessEnv
  /** Exit codes that mean the person cancelled. */
  readonly cancel: readonly number[]
}

/** The Windows script: the start folder comes in through `DSH_OKF_PICK_START`. */
const WINDOWS_SCRIPT = [
  '$ErrorActionPreference = "Stop"',
  '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8',
  'Add-Type -AssemblyName System.Windows.Forms',
  'Add-Type -AssemblyName System.Drawing',
  '[System.Windows.Forms.Application]::EnableVisualStyles()',
  '$owner = New-Object System.Windows.Forms.Form',
  '$owner.TopMost = $true',
  '$owner.ShowInTaskbar = $false',
  '$owner.StartPosition = "CenterScreen"',
  '$owner.Size = New-Object System.Drawing.Size(1, 1)',
  '$owner.Opacity = 0',
  '$owner.Show()',
  '$owner.Activate()',
  '$dialog = New-Object System.Windows.Forms.FolderBrowserDialog',
  '$dialog.Description = $env:DSH_OKF_PICK_TITLE',
  '$dialog.ShowNewFolderButton = $true',
  'if ($env:DSH_OKF_PICK_START -and (Test-Path -LiteralPath $env:DSH_OKF_PICK_START -PathType Container)) { $dialog.SelectedPath = $env:DSH_OKF_PICK_START }',
  '$answer = $dialog.ShowDialog($owner)',
  '$owner.Close()',
  'if ($answer -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::Out.Write($dialog.SelectedPath); exit 0 }',
  'exit 3',
].join('\n')

/**
 * AppleScript text literal.
 * @param value - any text.
 * @returns it quoted for AppleScript.
 */
function appleText(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

/**
 * The picker commands to try, in order, for a platform.
 * @param platform - `process.platform`.
 * @param title - the dialog's prompt.
 * @param start - a folder to open at, if any.
 * @returns the candidates.
 */
export function pickerCommands(platform: NodeJS.Platform, title: string, start: string | undefined): PickerCommand[] {
  if (platform === 'win32') {
    const encoded = Buffer.from(WINDOWS_SCRIPT, 'utf16le').toString('base64')
    const env = { ...process.env, DSH_OKF_PICK_TITLE: title, DSH_OKF_PICK_START: start ?? '' }
    const args = ['-NoProfile', '-NonInteractive', '-STA', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded]
    return [
      { file: 'powershell.exe', args, env, cancel: [3] },
      { file: 'pwsh.exe', args, env, cancel: [3] },
    ]
  }
  if (platform === 'darwin') {
    const where = start === undefined ? '' : ` default location (POSIX file ${appleText(start)})`
    return [{ file: 'osascript', args: ['-e', `POSIX path of (choose folder with prompt ${appleText(title)}${where})`], cancel: [1] }]
  }
  return [
    { file: 'zenity', args: ['--file-selection', '--directory', `--title=${title}`, ...start === undefined ? [] : [`--filename=${start.endsWith('/') ? start : `${start}/`}`]], cancel: [1] },
    { file: 'kdialog', args: ['--title', title, '--getexistingdirectory', start ?? '.'], cancel: [1] },
  ]
}

/** What one attempt did. */
type Attempt = { readonly kind: 'picked', readonly path: string } | { readonly kind: 'cancelled' } | { readonly kind: 'missing' } | { readonly kind: 'failed', readonly message: string }

/**
 * Run one picker command.
 * @param command - the command.
 * @returns what happened.
 */
function attempt(command: PickerCommand): Promise<Attempt> {
  return new Promise((resolve) => {
    execFile(command.file, [...command.args], { timeout: PICK_TIMEOUT_MS, windowsHide: true, encoding: 'utf8', ...command.env === undefined ? {} : { env: command.env } }, (error, stdout, stderr) => {
      if (error === null) {
        const path = String(stdout).replace(/\r?\n$/, '').trim()
        resolve(path === '' ? { kind: 'cancelled' } : { kind: 'picked', path })
        return
      }
      const err = error as NodeJS.ErrnoException & { killed?: boolean, code?: number | string }
      if (err.code === 'ENOENT') resolve({ kind: 'missing' })
      else if (typeof err.code === 'number' && command.cancel.includes(err.code)) resolve({ kind: 'cancelled' })
      else if (err.killed === true) resolve({ kind: 'cancelled' })
      else resolve({ kind: 'failed', message: String(stderr || err.message).trim().split(/\r?\n/).slice(-4).join('\n') })
    })
  })
}

/** Options for {@link pickFolder}; seams for tests. */
export interface PickOptions {
  /** The dialog's prompt. */
  readonly title?: string
  /** A folder to start in; ignored unless it exists. */
  readonly start?: string
  /** Default `process.platform`. */
  readonly platform?: NodeJS.Platform
  /** Replace the commands to try. */
  readonly commands?: readonly PickerCommand[]
}

/**
 * Let the person choose a folder with the system's own dialog.
 * @param options - prompt, start folder.
 * @returns the absolute path, or null when they cancelled.
 * @throws {LibraryError} `no-picker` when this machine has no folder dialog to open.
 */
export async function pickFolder(options: PickOptions = {}): Promise<string | null> {
  const start = options.start === undefined || options.start.trim() === '' ? undefined : options.start.trim()
  const usable = start !== undefined && await stat(start).then(info => info.isDirectory(), () => false) ? start : undefined
  const commands = options.commands ?? pickerCommands(options.platform ?? process.platform, options.title ?? 'Choose a folder', usable)
  let failure: string | undefined
  for (const command of commands) {
    const result = await attempt(command)
    if (result.kind === 'picked') return result.path
    if (result.kind === 'cancelled') return null
    if (result.kind === 'failed') failure ??= result.message
  }
  throw new LibraryError('no-picker', failure === undefined
    ? 'This machine has no folder dialog the plugin can open (on Linux, install zenity or kdialog). Type the folder\'s path instead.'
    : `The folder dialog could not open: ${failure}. Type the folder's path instead.`, 501)
}
