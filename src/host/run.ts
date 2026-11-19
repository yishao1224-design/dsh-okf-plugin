/**
 * Run `git` and the OKF toolchain (`python scripts/okf.py`) as child processes.
 *
 * Git never prompts: `GIT_TERMINAL_PROMPT=0` and a null askpass turn a missing
 * credential into an error the model can report, instead of a hung process.
 * A push token travels as an `http.extraHeader` through `GIT_CONFIG_*`
 * variables, so it never appears in argv, the remote URL, or `.git/config`
 * (the same scheme as dsh-okf-plugin).
 */
import { execFile } from 'node:child_process'

/** A failed command, with the part of its output worth showing. */
export class RunError extends Error {
  /** The exit code, when the process exited. */
  readonly exitCode: number | undefined
  /** stdout, credential-free. */
  readonly stdout: string

  /**
   * @param message - what went wrong, credential-free.
   * @param exitCode - the exit code.
   * @param stdout - what the process printed to stdout.
   */
  constructor(message: string, exitCode: number | undefined, stdout = '') {
    super(message)
    this.name = 'RunError'
    this.exitCode = exitCode
    this.stdout = stdout
  }
}

/** How to run one command. */
export interface RunOptions {
  readonly cwd: string
  readonly timeoutMs?: number
  /** A bearer token for an HTTPS git remote; sent as a header, never stored. */
  readonly token?: string
  readonly signal?: AbortSignal
}

/**
 * Remove anything that looks like a credential.
 * @param text - command output.
 * @param token - the token in use, if any.
 * @returns the text, safe to show.
 */
export function redact(text: string, token?: string): string {
  let out = text.replace(/(https?:\/\/)[^@\s/]+@/g, '$1***@').replace(/(Authorization:\s*\w+\s+)\S+/gi, '$1***')
  if (token !== undefined && token !== '') out = out.split(token).join('***')
  return out
}

/**
 * The environment a child runs with.
 * @param token - a git HTTP token, if any.
 * @returns the environment.
 */
function childEnv(token: string | undefined): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    GIT_TERMINAL_PROMPT: '0',
    GIT_ASKPASS: '',
    SSH_ASKPASS: '',
    GCM_INTERACTIVE: 'never',
    GIT_SSH_COMMAND: process.env.GIT_SSH_COMMAND ?? 'ssh -o BatchMode=yes',
    PYTHONIOENCODING: 'utf-8',
    PYTHONUTF8: '1',
  }
  if (token !== undefined && token !== '') {
    const index = Number(env.GIT_CONFIG_COUNT ?? '0') || 0
    env.GIT_CONFIG_COUNT = String(index + 1)
    env[`GIT_CONFIG_KEY_${String(index)}`] = 'http.extraHeader'
    env[`GIT_CONFIG_VALUE_${String(index)}`] = `Authorization: Basic ${Buffer.from(`x-access-token:${token}`).toString('base64')}`
  }
  return env
}

/**
 * Run one command.
 * @param file - the executable.
 * @param args - its arguments.
 * @param options - cwd, deadline, token.
 * @returns stdout, with trailing whitespace trimmed.
 * @throws {RunError} on a non-zero exit, a timeout, or a missing executable.
 */
export function run(file: string, args: readonly string[], options: RunOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(file, [...args], {
      cwd: options.cwd,
      env: childEnv(options.token),
      timeout: options.timeoutMs ?? 120_000,
      maxBuffer: 16 * 1024 * 1024,
      windowsHide: true,
      ...options.signal === undefined ? {} : { signal: options.signal },
    }, (error, stdout, stderr) => {
      const out = redact(String(stdout), options.token).trimEnd()
      if (error === null) {
        resolve(out)
        return
      }
      const err = error as NodeJS.ErrnoException & { killed?: boolean, code?: number | string }
      if (err.code === 'ENOENT') {
        reject(new RunError(`${file} was not found. Install it, or set its path in the plugin config.`, undefined))
        return
      }
      if (err.killed === true) {
        reject(new RunError(`${file} ${args[0] ?? ''} took too long and was stopped.`, undefined, out))
        return
      }
      const said = redact(String(stderr || err.message), options.token).trim()
      reject(new RunError(said.split(/\r?\n/).slice(-12).join('\n') || `${file} failed`, typeof err.code === 'number' ? err.code : undefined, out))
    })
  })
}
