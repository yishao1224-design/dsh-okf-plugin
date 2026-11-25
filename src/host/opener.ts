/**
 * Open a file with its default app on the machine the Host runs on.
 *
 * Bundles keep handed-over files as they are (a workbook, a PDF, a diagram
 * under `sources/`), and the preview, served by the local Host, cannot show
 * those itself. The Host opens them the way a double-click would: Excel for
 * a workbook, the PDF reader for a PDF.
 *
 * - Windows: `explorer.exe <file>` (no shell, so no path is ever quoted
 *   into a command line).
 * - macOS: `open <file>`.
 * - Linux and the rest: `xdg-open <file>`.
 *
 * The opener is started detached and not waited for.
 */
import { spawn } from 'node:child_process'
import { stat } from 'node:fs/promises'
import { LibraryError } from './library.ts'

/**
 * The command that opens a file with its default app.
 * @param platform - `process.platform`.
 * @param file - the absolute path.
 * @returns the executable and its arguments.
 */
export function openerCommand(platform: NodeJS.Platform, file: string): { readonly file: string, readonly args: readonly string[] } {
  if (platform === 'win32') return { file: 'explorer.exe', args: [file] }
  if (platform === 'darwin') return { file: 'open', args: [file] }
  return { file: 'xdg-open', args: [file] }
}

/** Options for {@link openFile}; seams for tests. */
export interface OpenOptions {
  /** Default `process.platform`. */
  readonly platform?: NodeJS.Platform
  /** Replace the command. */
  readonly command?: { readonly file: string, readonly args: readonly string[] }
}

/**
 * Open a file with its default app.
 * @param file - the absolute path of an existing file.
 * @param options - seams for tests.
 * @throws {LibraryError} `not-found` when there is no such file, `no-opener` when this machine cannot open files.
 */
export async function openFile(file: string, options: OpenOptions = {}): Promise<void> {
  if (!(await stat(file).then(info => info.isFile(), () => false))) throw new LibraryError('not-found', 'There is no such file in the bundle.', 404)
  const command = options.command ?? openerCommand(options.platform ?? process.platform, file)
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command.file, [...command.args], { detached: true, stdio: 'ignore', windowsHide: false })
    child.once('error', (error: NodeJS.ErrnoException) => {
      reject(new LibraryError('no-opener', error.code === 'ENOENT'
        ? `This machine has no ${command.file} to open files with. Open ${file} yourself.`
        : `The file could not be opened: ${error.message}`, 501))
    })
    child.once('spawn', () => {
      child.unref()
      resolve()
    })
  })
}
