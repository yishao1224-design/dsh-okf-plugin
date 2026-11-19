import { homedir } from "node:os";
import { basename, isAbsolute, join, relative, resolve, sep } from "node:path";
import { copyFile, mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { readFileSync, realpathSync, statSync } from "node:fs";
import { randomBytes } from "node:crypto";
//#region src/host/frontmatter.ts
/**
* Read a YAML scalar.
* @param raw - the text after `key:`, trimmed.
* @returns the scalar value.
*/
function scalar$1(raw) {
	const text = raw.replace(/\s+#.*$/, "").trim();
	if (text === "" || text === "~" || text === "null") return null;
	if (text === "true") return true;
	if (text === "false") return false;
	const quoted = /^(['"])(.*)\1$/.exec(text);
	if (quoted !== null) return quoted[1] === "'" ? (quoted[2] ?? "").replace(/''/g, "'") : unescapeDouble(quoted[2] ?? "");
	if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
	return text;
}
/**
* Undo the common escapes of a double-quoted YAML string.
* @param text - the inside of the quotes.
* @returns the plain string.
*/
function unescapeDouble(text) {
	return text.replace(/\\(["\\nt])/g, (_, ch) => ch === "n" ? "\n" : ch === "t" ? "	" : ch);
}
/**
* Read an inline flow list such as `[a, "b c", d]`.
* @param raw - the text including the brackets.
* @returns the items as strings.
*/
function inlineList(raw) {
	const inner = raw.trim().slice(1, -1).trim();
	if (inner === "") return [];
	return inner.split(",").map((item) => String(scalar$1(item.trim()) ?? "")).filter((item) => item !== "");
}
/**
* Split a markdown file into frontmatter and body.
* @param source - the whole file.
* @returns the understood keys, and the body.
*/
function parsePage(source) {
	const text = source.replace(/^\uFEFF/, "");
	const open = /^---[ \t]*\r?\n/.exec(text);
	if (open === null) return {
		meta: {},
		hasFrontmatter: false,
		body: text
	};
	const rest = text.slice(open[0].length);
	const close = /^---[ \t]*(\r?\n|$)/m.exec(rest);
	if (close === null) return {
		meta: {},
		hasFrontmatter: false,
		body: text
	};
	const block = rest.slice(0, close.index);
	const body = rest.slice(close.index + close[0].length);
	const meta = {};
	const lines = block.split(/\r?\n/);
	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index] ?? "";
		const match = /^([A-Za-z_][\w-]*)\s*:(.*)$/.exec(line);
		if (match === null) continue;
		const key = match[1] ?? "";
		const value = (match[2] ?? "").trim();
		if (value.startsWith("[") && value.endsWith("]")) {
			meta[key] = inlineList(value);
			continue;
		}
		if (value !== "" && !value.startsWith("#") && value !== "|" && value !== ">") {
			meta[key] = scalar$1(value);
			continue;
		}
		const items = [];
		let nested = false;
		while (index + 1 < lines.length && /^(\s+|-\s|-$)/.test(lines[index + 1] ?? "")) {
			index += 1;
			const child = lines[index] ?? "";
			const item = /^\s*-\s+(.*)$/.exec(child);
			if (item !== null && !/^[A-Za-z_][\w-]*\s*:/.test(item[1] ?? "") && !/^\s{4,}/.test(child)) items.push(String(scalar$1(item[1] ?? "") ?? ""));
			else if (child.trim() !== "") nested = true;
		}
		if (!nested) meta[key] = items;
	}
	return {
		meta,
		hasFrontmatter: true,
		body
	};
}
/**
* Read a key as a string.
* @param meta - the parsed frontmatter.
* @param key - the key.
* @returns the value as text, or undefined when absent or not a scalar.
*/
function text(meta, key) {
	const value = meta[key];
	if (value === null || value === void 0 || Array.isArray(value)) return void 0;
	return String(value);
}
/**
* Read a key as a list of strings.
* @param meta - the parsed frontmatter.
* @param key - the key.
* @returns the list; a scalar becomes a one-item list.
*/
function list(meta, key) {
	const value = meta[key];
	if (Array.isArray(value)) return [...value];
	if (value === null || value === void 0 || value === "") return [];
	return [String(value)];
}
//#endregion
//#region src/host/bundle.ts
/**
* Find and read OKF bundles.
*
* OKF v0.2 defines a bundle as a directory of markdown files with YAML
* frontmatter; the root `index.md` may declare `okf_version`, and toolchains
* such as `okf.py` mark the root with a `SCHEMA.md`. Either marker makes a
* folder a bundle root here. Reading is permissive, as the spec asks of
* consumers: unknown keys, unknown types and broken links never fail a read.
*/
/** Files OKF reserves; they need no `type`. */
const RESERVED = /* @__PURE__ */ new Set(["index.md", "log.md"]);
/** Folders never walked. */
const SKIP = /* @__PURE__ */ new Set([
	".git",
	"node_modules",
	".obsidian",
	".github",
	".claude",
	".vscode"
]);
/** The largest page served whole. */
const PAGE_BYTES_CAP = 2097152;
/**
* Whether an `index.md` text declares `okf_version` in its frontmatter.
* @param source - the file text.
* @returns true when it does.
*/
function declaresOkf(source) {
	return text(parsePage(source).meta, "okf_version") !== void 0;
}
/**
* Pick the bundle roots out of a repository file listing.
* @param files - repository-relative paths, forward slashes.
* @param readIndex - reads an `index.md` by path, to check for `okf_version`.
* @returns repository-relative roots (`''` for the repository root), shallowest first.
*/
async function findBundleRoots(files, readIndex) {
	const roots = /* @__PURE__ */ new Set();
	for (const file of files) {
		const parts = file.split("/");
		const name = parts.pop() ?? "";
		if (parts.some((part) => SKIP.has(part))) continue;
		const dir = parts.join("/");
		if (name === "SCHEMA.md") roots.add(dir);
		else if (name === "index.md") try {
			if (declaresOkf(await readIndex(file))) roots.add(dir);
		} catch {}
	}
	const sorted = [...roots].sort((a, b) => a.split("/").length - b.split("/").length || a.localeCompare(b));
	return sorted.filter((root) => !sorted.some((outer) => outer !== root && (outer === "" || root.startsWith(`${outer}/`))));
}
/**
* Find the bundle roots under a local folder.
* @param dir - the folder.
* @param depth - how deep to look.
* @returns absolute roots, shallowest first.
*/
async function findLocalBundleRoots(dir, depth = 3) {
	const files = [];
	const walk = async (current, level) => {
		let entries;
		try {
			entries = await readdir(current, { withFileTypes: true });
		} catch {
			return;
		}
		for (const entry of entries) if (entry.isDirectory() && level < depth && !SKIP.has(entry.name)) await walk(join(current, entry.name), level + 1);
		else if (entry.isFile() && (entry.name === "SCHEMA.md" || entry.name === "index.md")) files.push(relative(dir, join(current, entry.name)).split(sep).join("/"));
	};
	await walk(dir, 0);
	return (await findBundleRoots(files, (path) => readFile(join(dir, path), "utf8"))).map((root) => root === "" ? resolve(dir) : resolve(dir, root));
}
/**
* Collect every markdown file under a bundle root.
* @param root - the bundle root.
* @returns bundle-relative paths with forward slashes, sorted, and whether the cap cut the list.
*/
async function markdownFiles(root) {
	const files = [];
	let truncated = false;
	const walk = async (current) => {
		const entries = await readdir(current, { withFileTypes: true });
		for (const entry of entries) {
			if (files.length >= 5e3) {
				truncated = true;
				return;
			}
			if (entry.isDirectory()) {
				if (!SKIP.has(entry.name) && !entry.name.startsWith(".")) await walk(join(current, entry.name));
			} else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) files.push(relative(root, join(current, entry.name)).split(sep).join("/"));
		}
	};
	await walk(root);
	return {
		files: files.sort((a, b) => a.localeCompare(b)),
		truncated
	};
}
/**
* The first `# Heading` of a body, used as the title when frontmatter has none.
* @param body - markdown.
* @returns the heading text, or undefined.
*/
function firstHeading(body) {
	return /^#\s+(.+)$/m.exec(body)?.[1]?.trim();
}
/**
* Read a whole bundle's catalog.
* @param entry - the library entry.
* @returns the summary the preview draws.
*/
async function summarize(entry) {
	const { files, truncated } = await markdownFiles(entry.root);
	const pages = [];
	const types = {};
	const states = {};
	const untyped = [];
	let okfVersion;
	for (const path of files) {
		const name = path.split("/").pop() ?? path;
		const reserved = RESERVED.has(name);
		let source = "";
		try {
			source = await readFile(join(entry.root, path), "utf8");
		} catch {}
		const { meta, body } = parsePage(source);
		if (path === "index.md") okfVersion = text(meta, "okf_version");
		const type = text(meta, "type");
		const state = text(meta, "lifecycle") ?? text(meta, "status");
		if (!reserved) {
			if (type === void 0) untyped.push(path);
			else types[type] = (types[type] ?? 0) + 1;
			if (state !== void 0) states[state] = (states[state] ?? 0) + 1;
		}
		const description = text(meta, "description");
		const status = text(meta, "status");
		const lifecycle = text(meta, "lifecycle");
		const updated = text(meta, "updated");
		pages.push({
			path,
			title: text(meta, "title") ?? firstHeading(body) ?? name.replace(/\.md$/i, ""),
			...type === void 0 ? {} : { type },
			...description === void 0 ? {} : { description },
			...status === void 0 ? {} : { status },
			...lifecycle === void 0 ? {} : { lifecycle },
			...updated === void 0 ? {} : { updated },
			tags: list(meta, "tags"),
			reserved
		});
	}
	return {
		entry,
		...okfVersion === void 0 ? {} : { okfVersion },
		pages,
		types,
		states,
		untyped,
		truncated
	};
}
/**
* Resolve a bundle-relative page path, refusing anything that leaves the bundle.
* @param root - the bundle root.
* @param path - the requested path (`concepts/foo.md` or `/concepts/foo.md`).
* @returns the absolute file path.
* @throws {Error} when the path is not a markdown file inside the bundle.
*/
function resolvePage(root, path) {
	const clean = path.replace(/\\/g, "/").replace(/^\/+/, "");
	if (clean === "" || !clean.toLowerCase().endsWith(".md") || clean.split("/").some((part) => part === ".." || part === ".git")) throw new Error("Not a markdown page inside the bundle.");
	const base = resolve(root);
	const full = resolve(base, clean);
	if (full !== base && !full.startsWith(base + sep)) throw new Error("Not a markdown page inside the bundle.");
	return full;
}
/**
* Read one page.
* @param entry - the library entry.
* @param path - bundle-relative path.
* @returns the page's frontmatter and body.
*/
async function readPage(entry, path) {
	const full = resolvePage(entry.root, path);
	if ((await stat(full)).size > 2097152) throw new Error(`The page is larger than ${String(PAGE_BYTES_CAP / 1024 / 1024)} MB.`);
	const { meta, body } = parsePage(await readFile(full, "utf8"));
	return {
		path: path.replace(/\\/g, "/").replace(/^\/+/, ""),
		meta,
		body
	};
}
/**
* Whether a folder is a bundle root.
* @param dir - the folder.
* @returns true when it holds a SCHEMA.md or an index.md declaring okf_version.
*/
async function isBundleRoot(dir) {
	try {
		if ((await stat(join(dir, "SCHEMA.md"))).isFile()) return true;
	} catch {}
	try {
		return declaresOkf(await readFile(join(dir, "index.md"), "utf8"));
	} catch {
		return false;
	}
}
//#endregion
//#region src/host/git.ts
/**
* Run `git` to bring a remote OKF bundle into a local folder.
*
* Authentication is git's own: whatever credential helper the user already
* set up (Git Credential Manager on Windows covers GitHub and Azure DevOps),
* or SSH keys. A token can also come from an environment variable; it is
* handed to git as an `http.extraHeader` through `GIT_CONFIG_*` variables, so
* it never appears in the process arguments, the remote URL, `.git/config`,
* or the library file.
*
* Git never prompts: `GIT_TERMINAL_PROMPT=0` and a null askpass turn a missing
* credential into an error the browser can show, instead of a hung process.
*/
/** A git failure with the part of stderr worth showing. */
var GitError = class extends Error {
	/** A short code the browser maps to a hint. */
	code;
	/**
	* @param code - the failure class.
	* @param message - what git said, credential-free.
	*/
	constructor(code, message) {
		super(message);
		this.name = "GitError";
		this.code = code;
	}
};
/**
* Recognize a remote. Accepts HTTPS and SSH forms of GitHub and Azure DevOps
* (`dev.azure.com/{org}/{project}/_git/{repo}`, `{org}.visualstudio.com/...`,
* `git@ssh.dev.azure.com:v3/{org}/{project}/{repo}`), and any other git URL.
* @param url - the remote as the user typed it.
* @returns what was recognized.
* @throws {Error} when the text is not a git remote, or carries a credential.
*/
function parseRemote(url) {
	const text = url.trim();
	if (text === "" || /\s/.test(text)) throw new Error("The repository URL is empty or contains spaces.");
	if (text.startsWith("-")) throw new Error("The repository URL cannot start with \"-\".");
	const scp = /^([\w.-]+)@([\w.-]+):(.+)$/.exec(text);
	if (scp !== null && !text.includes("://")) {
		const host = (scp[2] ?? "").toLowerCase();
		const parts = (scp[3] ?? "").replace(/\.git$/, "").split("/").filter(Boolean);
		if (host === "ssh.dev.azure.com" || host.endsWith("vs-ssh.visualstudio.com")) {
			const tail = parts[0] === "v3" ? parts.slice(1) : parts;
			return azure(tail[0], tail[1], tail[2], false);
		}
		return {
			provider: host === "github.com" ? "github" : "git",
			repo: parts.at(-1) ?? "repo",
			...parts.length > 1 ? { owner: parts[0] ?? "" } : {},
			http: false
		};
	}
	let parsed;
	try {
		parsed = new URL(text);
	} catch {
		throw new Error("Not a repository URL. Use https://… or git@host:path.");
	}
	if (![
		"https:",
		"http:",
		"ssh:",
		"git:",
		"file:"
	].includes(parsed.protocol)) throw new Error(`Unsupported protocol ${parsed.protocol}`);
	if (parsed.password !== "") throw new Error("Remove the credential from the URL. Use a git credential helper or the token environment variable instead.");
	const http = parsed.protocol === "https:" || parsed.protocol === "http:";
	const host = parsed.hostname.toLowerCase();
	const parts = decodeURIComponent(parsed.pathname).replace(/\.git$/, "").split("/").filter(Boolean);
	if (host === "dev.azure.com") {
		const git = parts.indexOf("_git");
		return git > 0 ? azure(parts[0], parts[git - 1], parts[git + 1], http) : azure(parts[0], parts[1], parts[2], http);
	}
	if (host.endsWith(".visualstudio.com")) {
		const org = host.split(".")[0];
		const git = parts.indexOf("_git");
		if (host.startsWith("vs-ssh.")) return azure(parts[1], parts[2], parts[3], http);
		return azure(org, git > 0 ? parts[git - 1] : parts[0], git >= 0 ? parts[git + 1] : parts[1], http);
	}
	if (host === "ssh.dev.azure.com") {
		const tail = parts[0] === "v3" ? parts.slice(1) : parts;
		return azure(tail[0], tail[1], tail[2], http);
	}
	return {
		provider: host === "github.com" ? "github" : "git",
		repo: parts.at(-1) ?? "repo",
		...parts.length > 1 ? { owner: parts[0] ?? "" } : {},
		http
	};
}
/**
* Build an Azure DevOps remote record.
* @param org - organization.
* @param project - project.
* @param repo - repository; Azure DevOps names the default repo after the project.
* @param http - whether the remote is HTTP(S).
* @returns the record.
*/
function azure(org, project, repo, http) {
	if (org === void 0 || project === void 0) throw new Error("An Azure DevOps URL needs an organization, a project and a repository.");
	return {
		provider: "azure-devops",
		owner: org,
		project,
		repo: repo ?? project,
		http
	};
}
/**
* The environment git runs with: never prompt, and carry the token header
* (if any) through `GIT_CONFIG_*` so it stays out of argv and config files.
* @param options - token and provider.
* @returns the environment.
*/
function gitEnv(options) {
	const env = {
		...process.env,
		GIT_TERMINAL_PROMPT: "0",
		GIT_ASKPASS: "",
		SSH_ASKPASS: "",
		GCM_INTERACTIVE: "never",
		GIT_SSH_COMMAND: process.env.GIT_SSH_COMMAND ?? "ssh -o BatchMode=yes"
	};
	if (options.token !== void 0 && options.token !== "") {
		const header = options.provider === "github" ? `Authorization: Bearer ${options.token}` : `Authorization: Basic ${Buffer.from(`:${options.token}`).toString("base64")}`;
		const index = Number(env.GIT_CONFIG_COUNT ?? "0") || 0;
		env.GIT_CONFIG_COUNT = String(index + 1);
		env[`GIT_CONFIG_KEY_${String(index)}`] = "http.extraHeader";
		env[`GIT_CONFIG_VALUE_${String(index)}`] = header;
	}
	return env;
}
/**
* Remove anything that looks like a credential from git output.
* @param text - stderr or stdout.
* @param token - the token in use, if any.
* @returns the text, safe to show.
*/
function redact(text, token) {
	let out = text.replace(/(https?:\/\/)[^@\s/]+@/g, "$1***@").replace(/(Authorization:\s*\w+\s+)\S+/gi, "$1***");
	if (token !== void 0 && token !== "") out = out.split(token).join("***");
	return out;
}
/**
* Sort a git failure into a class the browser can explain.
* @param stderr - what git printed.
* @returns the class.
*/
function classify(stderr) {
	if (/authentication failed|could not read username|terminal prompts disabled|permission denied \(publickey\)|403|401|access denied|not authorized/i.test(stderr)) return "auth";
	if (/remote branch .* not found|couldn't find remote ref|invalid refspec|did not match any/i.test(stderr)) return "ref";
	if (/repository .* not found|does not appear to be a git repository|not found|TF401019/i.test(stderr)) return "not-found";
	return "failed";
}
/**
* Run one git command.
* @param args - arguments after `git`.
* @param options - cwd, token, deadline.
* @returns stdout, trimmed.
* @throws {GitError} on a non-zero exit, a timeout, or no git on PATH.
*/
function runGit(args, options = {}) {
	return new Promise((resolve, reject) => {
		execFile(options.gitPath ?? "git", [...args], {
			cwd: options.cwd,
			env: gitEnv(options),
			timeout: options.timeoutMs ?? 3e5,
			maxBuffer: 16777216,
			windowsHide: true
		}, (error, stdout, stderr) => {
			if (error === null) {
				resolve(stdout.trim());
				return;
			}
			const err = error;
			if (err.code === "ENOENT") {
				reject(new GitError("missing-git", "git was not found on PATH. Install Git, or set gitPath on the plugin row."));
				return;
			}
			const said = redact(String(stderr || err.message), options.token).trim();
			if (err.killed === true) {
				reject(new GitError("timeout", `git ${args[0] ?? ""} took too long and was stopped.`));
				return;
			}
			reject(new GitError(classify(said), said.split(/\r?\n/).slice(-6).join("\n")));
		});
	});
}
/**
* Shallow, blobless clone with nothing checked out yet. File contents arrive
* only for what is later read or checked out, so finding the bundle in a large
* repository costs one tree listing.
* @param url - the remote.
* @param ref - branch or tag; undefined takes the remote's default branch.
* @param dir - target folder; must not exist yet.
* @param options - token and deadline.
* @returns the commit fetched.
*/
async function cloneNoCheckout(url, ref, dir, options = {}) {
	const args = [
		"clone",
		"--depth",
		"1",
		"--single-branch",
		"--no-tags",
		"--filter=blob:none",
		"--no-checkout"
	];
	if (ref !== void 0) args.push("--branch", ref);
	args.push("--", url, dir);
	await runGit(args, options);
	return runGit(["rev-parse", "HEAD"], {
		...options,
		cwd: dir
	});
}
/**
* The top folder of the git working tree holding `dir`.
* @param dir - any folder.
* @param options - git settings.
* @returns the absolute top level, or undefined when `dir` is not in a working tree.
*/
async function topLevel(dir, options = {}) {
	try {
		const out = await runGit(["rev-parse", "--show-toplevel"], {
			...options,
			cwd: dir
		});
		return out === "" ? void 0 : out;
	} catch {
		return;
	}
}
/**
* List every file path in the fetched commit.
* @param dir - the clone.
* @param options - token and deadline.
* @returns repository-relative paths with forward slashes.
*/
async function listFiles(dir, options = {}) {
	return (await runGit([
		"ls-tree",
		"-r",
		"--name-only",
		"-z",
		"HEAD"
	], {
		...options,
		cwd: dir
	})).split("\0").filter(Boolean);
}
/**
* Read one file of the fetched commit without checking it out.
* @param dir - the clone.
* @param path - repository-relative path.
* @param options - token and deadline.
* @returns the file text.
*/
function showFile(dir, path, options = {}) {
	return runGit(["show", `HEAD:${path}`], {
		...options,
		cwd: dir
	});
}
/**
* Check out only one folder of the fetched commit, or all of it.
* @param dir - the clone.
* @param path - repository subfolder, `''` for the whole repository.
* @param options - token and deadline.
*/
async function checkoutPath(dir, path, options = {}) {
	const local = {
		...options,
		cwd: dir
	};
	if (path !== "") await runGit([
		"sparse-checkout",
		"set",
		"--no-cone",
		`/${path}/`
	], local);
	await runGit(["checkout", "--quiet"], local);
}
/**
* Turn the library's shallow mirror into a normal clone, so the user can
* branch, rebase and push from it. Commits and trees arrive now; file contents
* stay on demand (the clone's blob filter is kept).
* @param dir - the clone.
* @param options - token and deadline.
*/
async function unshallow(dir, options = {}) {
	const local = {
		...options,
		cwd: dir
	};
	if (await runGit(["rev-parse", "--is-shallow-repository"], local) === "true") await runGit([
		"fetch",
		"--unshallow",
		"--no-tags",
		"origin"
	], local);
}
/**
* Describe work in a checkout that a reset or a delete would lose.
* @param dir - the clone.
* @param options - git settings.
* @returns e.g. "uncommitted changes and commits not pushed", or undefined when there is none.
*/
async function unsavedWork(dir, options = {}) {
	const local = {
		...options,
		cwd: dir
	};
	const found = [];
	if (await runGit(["status", "--porcelain"], local) !== "") found.push("uncommitted changes");
	if (await runGit([
		"log",
		"--branches",
		"--not",
		"--remotes",
		"--oneline"
	], local) !== "") found.push("commits not pushed");
	return found.length === 0 ? void 0 : found.join(" and ");
}
/**
* Bring an edited clone to the remote's latest commit without ever discarding
* work: a fast-forward only, refused while anything is uncommitted.
* @param dir - the clone.
* @param options - token and deadline.
* @returns the commit before and after.
* @throws {GitError} `failed` when there are uncommitted changes, or the branch has commits the remote does not.
*/
async function fastForward(dir, options = {}) {
	const local = {
		...options,
		cwd: dir
	};
	const before = await runGit(["rev-parse", "HEAD"], local);
	if (await runGit(["status", "--porcelain"], local) !== "") throw new GitError("failed", "This bundle has uncommitted changes. Commit or discard them in its workspace, then update.");
	await runGit([
		"fetch",
		"--no-tags",
		"origin"
	], local);
	try {
		await runGit([
			"merge",
			"--ff-only",
			"FETCH_HEAD"
		], local);
	} catch {
		throw new GitError("failed", "This bundle has commits the remote does not have. Push or rebase them in its workspace, then update.");
	}
	return {
		before,
		after: await runGit(["rev-parse", "HEAD"], local)
	};
}
/**
* Bring an existing shallow clone to the remote's latest commit of its branch.
* Local edits are refused rather than overwritten.
* @param dir - the clone.
* @param options - token and deadline.
* @param force - discard local edits.
* @returns the commit before and after.
* @throws {GitError} `failed` when the checkout has local changes and `force` is off.
*/
async function pull(dir, options = {}, force = false) {
	const local = {
		...options,
		cwd: dir
	};
	const before = await runGit(["rev-parse", "HEAD"], local);
	if (!force) {
		if (await runGit([
			"status",
			"--porcelain",
			"--untracked-files=no"
		], local) !== "") throw new GitError("failed", "The local copy has edits. Commit or discard them, or update with force to overwrite.");
	}
	await runGit([
		"fetch",
		"--depth",
		"1",
		"--no-tags",
		"origin"
	], local);
	await runGit([
		"reset",
		"--hard",
		"FETCH_HEAD"
	], local);
	return {
		before,
		after: await runGit(["rev-parse", "HEAD"], local)
	};
}
//#endregion
//#region src/host/library.ts
/**
* The local bundle library: one folder on disk, one JSON file describing it.
*
*     <libraryDir>/
*       library.json        entries + per-session selections
*       repos/<id>/         one shallow, sparse git checkout per fetched bundle
*
* Bundles added from a local path stay where they are; the library only
* records the path.
*
* A bundle made editable (`editWorkspace`) is edited where it is: a git
* entry's own checkout becomes a normal clone and a DSH Workspace. From then on
* Update only fast-forwards it, and Remove deletes it only when nothing would
* be lost. Every change to `library.json` goes through one queue and
* is written whole (temp file, then rename), so two requests never interleave
* and a reader never sees half a file.
*/
/** A failure the routes turn into a 4xx with a code. */
var LibraryError = class extends Error {
	code;
	status;
	/** Extra data for the browser, e.g. candidate bundle paths. */
	detail;
	/**
	* @param code - short machine code.
	* @param message - what to show.
	* @param status - HTTP status.
	* @param detail - extra data.
	*/
	constructor(code, message, status = 400, detail) {
		super(message);
		this.name = "LibraryError";
		this.code = code;
		this.status = status;
		if (detail !== void 0) this.detail = detail;
	}
};
/**
* Whether a path is a folder.
* @param path - the path.
* @returns true for an existing folder.
*/
async function isDirectory(path) {
	try {
		return (await stat(path)).isDirectory();
	} catch {
		return false;
	}
}
/** Environment variables a token is read from, most specific first. */
const TOKEN_ENV = {
	"azure-devops": ["DSH_OKF_AZURE_TOKEN", "DSH_OKF_GIT_TOKEN"],
	github: ["DSH_OKF_GITHUB_TOKEN", "DSH_OKF_GIT_TOKEN"],
	git: ["DSH_OKF_GIT_TOKEN"]
};
/**
* Turn any text into a library id.
* @param value - a name, repository or path.
* @returns lowercase letters, digits and dashes, at most 64 characters.
*/
function slug(value) {
	return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64) || "bundle";
}
/**
* Normalize a repository subfolder.
* @param path - as typed.
* @returns forward slashes, no leading or trailing slash.
* @throws {LibraryError} when it climbs out of the repository.
*/
function cleanRepoPath(path) {
	if (path === void 0) return void 0;
	const clean = path.trim().replace(/\\/g, "/").replace(/^\.?\/+|\/+$/g, "");
	if (clean.split("/").some((part) => part === ".." || part === ".git")) throw new LibraryError("bad-path", "The bundle path must stay inside the repository.");
	return clean === "." ? "" : clean;
}
/**
* Whether `child` is `parent` or lies inside it. Windows paths compare
* case-insensitively, as the file system does.
* @param parent - a folder.
* @param child - a path.
* @returns true when inside or equal.
*/
function contains(parent, child) {
	const fold = (path) => process.platform === "win32" ? resolve(path).toLowerCase() : resolve(path);
	const rel = relative(fold(parent), fold(child));
	return rel === "" || rel.split(sep)[0] !== ".." && !isAbsolute(rel);
}
/**
* The path the file system itself reports: symlinks resolved and, on Windows,
* 8.3 short names expanded, so it compares equal to what git and DSH report.
* @param path - an existing path.
* @returns the canonical path, or the resolved spelling when it cannot be read.
*/
function canonical(path) {
	try {
		return realpathSync.native(path);
	} catch {
		return resolve(path);
	}
}
/**
* Open (and lazily create) the library.
* @param options - folder and git settings.
* @returns the library.
*/
function openLibrary(options) {
	const dir = resolve(options.dir);
	const file = join(dir, "library.json");
	const repos = join(dir, "repos");
	const env = options.env ?? process.env;
	let queue = Promise.resolve();
	let cache = {
		v: 1,
		entries: [],
		sessions: {}
	};
	const listeners = /* @__PURE__ */ new Set();
	/** Run one change after every change before it. */
	const serial = (work) => {
		const next = queue.then(work, work);
		queue = next.catch(() => void 0);
		return next;
	};
	const load = async () => {
		try {
			const parsed = JSON.parse(await readFile(file, "utf8"));
			if (parsed.v === 1 && Array.isArray(parsed.entries)) {
				cache = {
					v: 1,
					entries: parsed.entries,
					sessions: parsed.sessions ?? {}
				};
				return structuredClone(cache);
			}
		} catch (error) {
			if (error.code !== "ENOENT" && !(error instanceof SyntaxError)) throw error;
		}
		cache = {
			v: 1,
			entries: [],
			sessions: {}
		};
		return structuredClone(cache);
	};
	const save = async (data) => {
		await mkdir(dir, { recursive: true });
		const temp = `${file}.${randomBytes(4).toString("hex")}.tmp`;
		await writeFile(temp, `${JSON.stringify(data, null, 2)}\n`);
		for (let attempt = 0;; attempt += 1) try {
			await rename(temp, file);
			cache = structuredClone(data);
			for (const listener of [...listeners]) try {
				listener();
			} catch {}
			return;
		} catch (error) {
			if (attempt >= 4 || ![
				"EPERM",
				"EBUSY",
				"EACCES"
			].includes(String(error.code))) throw error;
			await new Promise((done) => {
				setTimeout(done, 40);
			});
		}
	};
	const find = (data, id) => {
		const entry = data.entries.find((candidate) => candidate.id === id);
		if (entry === void 0) throw new LibraryError("unknown-bundle", `No bundle with id "${id}" in the library.`, 404);
		return entry;
	};
	const gitOptions = (provider) => {
		const token = TOKEN_ENV[provider].map((name) => env[name]).find((value) => value !== void 0 && value !== "");
		return {
			provider,
			...token === void 0 ? {} : { token },
			...options.gitPath === void 0 ? {} : { gitPath: options.gitPath },
			...options.gitTimeoutMs === void 0 ? {} : { timeoutMs: options.gitTimeoutMs }
		};
	};
	const uniqueId = (data, wanted, fallback) => {
		const id = slug(wanted ?? fallback);
		if (data.entries.some((entry) => entry.id === id)) throw new LibraryError("exists", `The library already has a bundle "${id}". Update it, remove it, or choose another id.`, 409, { id });
		return id;
	};
	return {
		dir,
		list: async () => (await load()).entries,
		get: async (id) => find(await load(), id),
		fetch: (request) => serial(async () => {
			let remote;
			try {
				remote = parseRemote(request.url);
			} catch (error) {
				throw new LibraryError("bad-url", error.message);
			}
			const wantedPath = cleanRepoPath(request.path);
			const ref = request.ref?.trim() || void 0;
			if (ref !== void 0 && (ref.startsWith("-") || /\s|\.\./.test(ref))) throw new LibraryError("bad-ref", "Not a valid branch or tag name.");
			const data = await load();
			const fallbackId = wantedPath === void 0 || wantedPath === "" ? remote.repo : `${remote.repo}-${wantedPath.split("/").pop() ?? ""}`;
			const id = uniqueId(data, request.id, fallbackId);
			const git = gitOptions(remote.provider);
			await mkdir(repos, { recursive: true });
			const target = join(repos, id);
			const temp = join(repos, `.tmp-${id}-${randomBytes(4).toString("hex")}`);
			try {
				const commit = await cloneNoCheckout(request.url.trim(), ref, temp, git);
				const files = await listFiles(temp, git);
				let path = wantedPath;
				if (path === void 0) {
					const roots = await findBundleRoots(files, (file) => showFile(temp, file, git));
					if (roots.length === 0) throw new LibraryError("no-bundle", "No OKF bundle in this repository: no folder holds a SCHEMA.md or an index.md with okf_version. Give the bundle path.", 422);
					if (roots.length > 1) throw new LibraryError("many-bundles", `This repository holds ${String(roots.length)} bundles. Choose one path.`, 422, { candidates: roots });
					path = roots[0] ?? "";
				} else if (!files.some((file) => path === "" || file.startsWith(`${path}/`))) throw new LibraryError("bad-path", `The repository has no folder "${path}".`, 422);
				await checkoutPath(temp, path, git);
				const lost = await stat(join(target, ".git")).then(() => true, () => false) ? await unsavedWork(target, git).catch(() => void 0) : void 0;
				if (lost !== void 0) throw new LibraryError("unsaved-work", `${target} is left over from a removed bundle and has ${lost}. Move or discard that work, or choose another id.`, 409, { path: target });
				await rm(target, {
					recursive: true,
					force: true
				});
				await rename(temp, target);
				const root = path === "" ? target : join(target, ...path.split("/"));
				const now = (/* @__PURE__ */ new Date()).toISOString();
				const entry = {
					id,
					name: request.name?.trim() || (path === "" ? remote.repo : `${remote.repo}/${path}`),
					root,
					origin: {
						kind: "git",
						url: request.url.trim(),
						provider: remote.provider,
						...ref === void 0 ? {} : { ref },
						path,
						commit
					},
					addedAt: now,
					fetchedAt: now
				};
				const fresh = await load();
				fresh.entries.push(entry);
				await save(fresh);
				return entry;
			} catch (error) {
				await rm(temp, {
					recursive: true,
					force: true
				}).catch(() => void 0);
				throw error;
			}
		}),
		update: (id, force = false) => serial(async () => {
			const data = await load();
			const entry = find(data, id);
			if (entry.team !== void 0) throw new LibraryError("team-workspace", "This is a Team Wiki maintenance workspace. Its pull request carries the changes; Maintain on the Team Wiki page starts a fresh one after it merges.");
			if (entry.origin.kind !== "git") throw new LibraryError("not-git", "This bundle was added from a local folder; there is nothing to update from.");
			const checkout = join(repos, id);
			if (entry.workspace !== void 0 && force) throw new LibraryError("editing", "This bundle is being edited, so Update never discards changes. Discard them with git in its workspace if that is what you want.", 409);
			const git = gitOptions(entry.origin.provider);
			const { before, after } = entry.workspace === void 0 ? await pull(checkout, git, force) : await fastForward(checkout, git);
			const updated = {
				...entry,
				origin: {
					...entry.origin,
					commit: after
				},
				fetchedAt: (/* @__PURE__ */ new Date()).toISOString()
			};
			data.entries = data.entries.map((candidate) => candidate.id === id ? updated : candidate);
			await save(data);
			return {
				entry: updated,
				changed: before !== after
			};
		}),
		addLocal: (request) => serial(async () => {
			const wanted = resolve(request.path.trim());
			let info;
			try {
				info = await stat(wanted);
			} catch {
				throw new LibraryError("bad-path", `No folder at ${wanted}.`, 422);
			}
			if (!info.isDirectory()) throw new LibraryError("bad-path", `${wanted} is not a folder.`, 422);
			let root = wanted;
			if (!await isBundleRoot(wanted)) {
				const roots = await findLocalBundleRoots(wanted);
				if (roots.length === 0) throw new LibraryError("no-bundle", "No OKF bundle in this folder: nothing holds a SCHEMA.md or an index.md with okf_version.", 422);
				if (roots.length > 1) throw new LibraryError("many-bundles", `This folder holds ${String(roots.length)} bundles. Choose one.`, 422, { candidates: roots });
				root = roots[0] ?? wanted;
			}
			const data = await load();
			const existing = data.entries.find((entry) => resolve(entry.root) === root);
			if (existing !== void 0) throw new LibraryError("exists", `That folder is already in the library as "${existing.id}".`, 409, { id: existing.id });
			const entry = {
				id: uniqueId(data, request.id, basename(root) === "okf" ? `${basename(resolve(root, ".."))}-okf` : basename(root)),
				name: request.name?.trim() || `${basename(resolve(root, ".."))}/${basename(root)}`,
				root,
				origin: { kind: "local" },
				addedAt: (/* @__PURE__ */ new Date()).toISOString()
			};
			data.entries.push(entry);
			await save(data);
			return entry;
		}),
		remove: (id, deleteFiles = false) => serial(async () => {
			const data = await load();
			const entry = find(data, id);
			if (deleteFiles && entry.origin.kind === "git") {
				const lost = await unsavedWork(join(repos, id), gitOptions(entry.origin.provider)).catch(() => void 0);
				if (lost !== void 0) throw new LibraryError("unsaved-work", `This bundle has ${lost}. Push or discard them first, or remove it without deleting its files.`, 409);
			}
			data.entries = data.entries.filter((candidate) => candidate.id !== id);
			for (const [session, selection] of Object.entries(data.sessions)) if (selection.bundleId === id) delete data.sessions[session];
			await save(data);
			if (deleteFiles && entry.origin.kind === "git") {
				const checkout = join(repos, id);
				if (checkout.startsWith(repos + sep)) await rm(checkout, {
					recursive: true,
					force: true
				});
			}
		}),
		editWorkspace: (id) => serial(async () => {
			const data = await load();
			const source = find(data, id);
			if (source.workspace !== void 0) return {
				entry: source,
				workspace: source.workspace,
				created: false
			};
			let workspace;
			if (source.origin.kind === "git") {
				const checkout = join(repos, source.id);
				await unshallow(checkout, gitOptions(source.origin.provider));
				workspace = canonical(checkout);
			} else {
				const top = await topLevel(source.root, gitOptions("git"));
				const root = canonical(source.root);
				workspace = top !== void 0 && contains(canonical(top), root) ? canonical(top) : root;
			}
			const fresh = await load();
			const updated = {
				...find(fresh, id),
				workspace
			};
			fresh.entries = fresh.entries.map((entry) => entry.id === id ? updated : entry);
			await save(fresh);
			return {
				entry: updated,
				workspace,
				created: true
			};
		}),
		put: (entry) => serial(async () => {
			if (!await isDirectory(entry.root)) throw new LibraryError("missing-folder", `${entry.root} is not a folder.`);
			const data = await load();
			data.entries = [...data.entries.filter((candidate) => candidate.id !== entry.id), entry];
			await save(data);
			return entry;
		}),
		getSession: async (sessionId) => {
			const selection = (await load()).sessions[sessionId];
			return selection === void 0 ? null : {
				sessionId,
				...selection
			};
		},
		refresh: async () => {
			await load();
		},
		snapshot: () => cache,
		onChange(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		setSession: (sessionId, bundleId) => serial(async () => {
			if (sessionId.trim() === "" || sessionId.length > 200) throw new LibraryError("bad-session", "A session id is required.");
			const data = await load();
			if (bundleId === null) {
				delete data.sessions[sessionId];
				await save(data);
				return null;
			}
			find(data, bundleId);
			const selection = {
				bundleId,
				selectedAt: (/* @__PURE__ */ new Date()).toISOString()
			};
			data.sessions[sessionId] = selection;
			await save(data);
			return {
				sessionId,
				...selection
			};
		})
	};
}
/**
* Find the bundle for an agent: its own selection, else its parent session's
* (a subagent inherits the bundle of the session that spawned it).
* @param library - the library.
* @param agent - the running agent, if any.
* @returns the entry, or undefined.
*/
function bundleFor(library, agent) {
	if (agent === void 0) return void 0;
	const { entries, sessions } = library.snapshot();
	const header = agent.session?.header;
	for (const id of [agent.id, header?.parentSession]) {
		if (id === void 0) continue;
		const selection = sessions[id];
		if (selection === void 0) continue;
		const entry = entries.find((candidate) => candidate.id === selection.bundleId);
		if (entry !== void 0) return entry;
	}
}
/**
* Keeps each bundle's index.md in memory for the synchronous context, and
* re-reads it when the file changes. An editable bundle's index.md changes
* under the agent's own hands, so a catalog cached at library-change time
* would go stale by the next turn.
*/
var IndexCache = class {
	texts = /* @__PURE__ */ new Map();
	library;
	/** @param library - the library whose bundles to cache. */
	constructor(library) {
		this.library = library;
	}
	/**
	* Read every bundle's index.md ahead of time, so a newly selected bundle has
	* its catalog ready on the very next turn.
	* @returns when done.
	*/
	async refresh() {
		const { entries } = this.library.snapshot();
		const next = /* @__PURE__ */ new Map();
		for (const entry of entries) {
			const path = join(entry.root, "index.md");
			try {
				const [info, text] = await Promise.all([stat(path), readFile(path, "utf8")]);
				next.set(entry.id, {
					path,
					mtimeMs: info.mtimeMs,
					text
				});
			} catch {
				next.set(entry.id, {
					path,
					mtimeMs: -1,
					text: ""
				});
			}
		}
		this.texts.clear();
		for (const [id, cached] of next) this.texts.set(id, cached);
	}
	/**
	* The current index.md of a bundle. One stat per call; the file is read again
	* only when its modification time moved. Synchronous because the context
	* callback is.
	* @param entry - the bundle.
	* @returns the text, `''` when there is none.
	*/
	get(entry) {
		const path = join(entry.root, "index.md");
		const cached = this.texts.get(entry.id);
		let mtimeMs = -1;
		try {
			mtimeMs = statSync(path).mtimeMs;
		} catch {}
		if (cached !== void 0 && cached.path === path && cached.mtimeMs === mtimeMs) return cached.text;
		let text = "";
		if (mtimeMs >= 0) try {
			text = readFileSync(path, "utf8");
		} catch {}
		this.texts.set(entry.id, {
			path,
			mtimeMs,
			text
		});
		return text;
	}
};
/**
* Drop the frontmatter of an index.md for the prompt.
* @param source - the file.
* @returns the body.
*/
function stripFrontmatter(source) {
	return source.replace(/^﻿?---\r?\n[\s\S]*?\r?\n---[ \t]*\r?\n/, "").trim();
}
/** The rules for editing a bundle from its own workspace. */
const EDIT_RULES = [
	"- You may edit this bundle: it is a git working copy inside this session's workspace. Keep it a valid OKF bundle:",
	"  - Read SCHEMA.md, when present, before your first edit, and follow its conventions.",
	"  - Every page keeps its YAML frontmatter with at least type, title and description.",
	"  - A new page gets a line in index.md under the right section. When you rename or remove a page, update index.md and the links that point at it.",
	"  - Add one dated line per change to log.md, following its existing format.",
	"  - Set lifecycle: needs_review on a page you create or substantially change, unless the user says otherwise.",
	"  - Do not commit or push unless the user asks. Leave the changes for the user to review with git diff."
];
/**
* Rules for a Team Wiki maintenance workspace. The review rule is the team's:
* a page is reviewed only when a person stamped it, and any agent edit makes
* it an unreviewed draft again.
* @param actor - the `generated.by` value to write.
* @returns the lines.
*/
function teamEditRules(actor) {
	const date = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
	return [
		"- You may edit this project wiki: it is a team wiki maintenance workspace (its own git clone on a wiki branch) inside this session's workspace. Edit only files under the bundle root. Keep it a valid OKF bundle:",
		"  - Read SCHEMA.md before your first edit, and follow its conventions (types, tags, frontmatter templates).",
		"  - Every page keeps its YAML frontmatter with at least type, title, description, status, lifecycle and updated.",
		`  - Every page you create or change is an unreviewed draft: set status: draft, lifecycle: draft, updated: ${date}, and generated: { by: ${actor}, at: ${date} } (keep created; add created: ${date} on a new page).`,
		"  - Never add or edit a verified entry, never set lifecycle: active, and never write human:… anywhere. Only a person may mark a page reviewed.",
		"  - Never edit files under sources/ that already exist; add a new dated capture instead. Do not change SCHEMA.md unless the user asks.",
		"  - A new page gets a line in index.md under the right section. When you rename or remove a page, update index.md and the links that point at it. Links are bundle-relative (/concepts/foo.md).",
		"  - Do not run git commit or git push. When the user is happy with the changes, tell them to press Open pull request in the session header: it runs okf.py links, index, lint and log, commits, pushes and opens the pull request. A change that only touches unreviewed pages may merge on its own; editing a reviewed page needs a person."
	];
}
/**
* Whether the session may edit the bundle: it is editable, and the session's
* workspace holds its root (DSH confines writes to the session workspace).
* @param entry - the bundle.
* @param cwd - the session's workspace, if known.
* @returns true when edits from this session can land.
*/
function editableHere(entry, cwd) {
	return entry.workspace !== void 0 && cwd !== void 0 && contains(cwd, entry.root);
}
/**
* The context text for one entry.
* @param entry - the selected bundle.
* @param index - its index.md text.
* @param options - size knobs.
* @param cwd - the session's workspace, which decides whether it may edit.
* @returns the text.
*/
function contextText(entry, index, options, cwd) {
	const editable = editableHere(entry, cwd);
	const origin = entry.origin.kind === "git" ? entry.workspace === void 0 ? `a local mirror of ${entry.origin.url}${entry.origin.path === "" ? "" : ` (folder ${entry.origin.path})`}${entry.origin.commit === void 0 ? "" : ` at commit ${entry.origin.commit.slice(0, 12)}`}; edits to it are overwritten by the next update` : `a git clone of ${entry.origin.url}${entry.origin.path === "" ? "" : ` (folder ${entry.origin.path})`}, being edited; its workspace is ${entry.workspace}` : entry.team !== void 0 ? `the project wiki ${entry.team.wiki} in a team wiki maintenance workspace${editable ? " (this session's workspace)" : `, ${entry.workspace ?? ""}`}` : editable ? "a git working copy in this session's workspace" : "a folder on this machine";
	const editing = editable ? entry.team !== void 0 ? teamEditRules(options.agentActor ?? "dsh/agent") : EDIT_RULES : entry.workspace === void 0 ? ["- Do not edit files in the bundle."] : [`- Do not edit the bundle from this session. It is edited from its own workspace, ${entry.workspace}; if the user wants changes, tell them to open that workspace (OKF dialog → Open editing workspace).`];
	const lines = [
		`<okf_bundle id="${entry.id}" name="${entry.name.replace(/"/g, "'")}">`,
		"The user attached an OKF (Open Knowledge Format) knowledge bundle to this session. Treat it as curated knowledge for this work: consult it before answering anything it may cover, and cite the pages you use by bundle path (for example concepts/foo.md).",
		`Bundle root: ${entry.root} (${origin}).`,
		"- Every page is markdown with YAML frontmatter: type, title, description, and usually status/lifecycle. index.md is the catalog; SCHEMA.md, when present, defines the conventions; log.md is the change history.",
		"- Use it like a wiki: start from the catalog, decide which pages bear on the question, and read them with your file tools (paths are under the bundle root). Follow the links between pages as far as the question needs. To find exact terms, grep or glob under the bundle root with patterns you choose.",
		...editing,
		"- When you rely on a page whose lifecycle is needs_review or whose status is deprecated, say so in your answer.",
		"- Links starting with / are relative to the bundle root."
	];
	const body = index === void 0 ? "" : stripFrontmatter(index);
	if (options.indexChars > 0 && body !== "") {
		const cut = body.length > options.indexChars;
		lines.push("", "Catalog (index.md):", cut ? `${body.slice(0, options.indexChars)}\n… (truncated; read index.md under the bundle root for the rest)` : body);
	}
	lines.push("</okf_bundle>");
	return lines.join("\n");
}
/**
* The prompt context.
* @param library - the library.
* @param cache - the index cache.
* @param options - size knobs.
* @returns the context to register.
*/
function sessionContext(library, cache, options) {
	return {
		name: "okf:session-bundle",
		order: 130,
		text: (context) => {
			const entry = bundleFor(library, context.agent);
			return entry === void 0 ? "" : contextText(entry, cache.get(entry), options, context.agent?.session?.header?.cwd);
		}
	};
}
//#endregion
//#region src/host/github.ts
/**
* Recognize a GitHub remote.
* @param url - the `origin` URL.
* @param host - the GitHub host name (github.com, or a GitHub Enterprise host).
* @returns owner and repo, or undefined when the remote is not on that host.
*/
function parseGitHubRemote(url, host) {
	const escaped = host.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const match = new RegExp(`^(?:https?://(?:[^@/]+@)?${escaped}/|git@${escaped}:|ssh://git@${escaped}/)([^/]+)/([^/]+?)(?:\\.git)?/?$`, "i").exec(url.trim());
	if (match === null) return void 0;
	return {
		owner: match[1] ?? "",
		repo: match[2] ?? ""
	};
}
/** A failed GitHub call. */
var GitHubError = class extends Error {
	status;
	/**
	* @param status - HTTP status.
	* @param message - GitHub's message.
	*/
	constructor(status, message) {
		super(message);
		this.name = "GitHubError";
		this.status = status;
	}
};
/** A minimal GitHub client bound to one repository and token. */
var GitHub = class {
	api;
	token;
	target;
	/**
	* @param api - the REST base URL, e.g. https://api.github.com.
	* @param token - a token that may push and open pull requests; undefined reads a public repository anonymously.
	* @param target - the repository.
	*/
	constructor(api, token, target) {
		this.api = api.replace(/\/$/, "");
		this.token = token;
		this.target = target;
	}
	/**
	* One call.
	* @param method - HTTP method.
	* @param path - path under /repos/{owner}/{repo}.
	* @param body - JSON body.
	* @param signal - cancellation.
	* @returns the parsed answer.
	*/
	async call(method, path, body, signal) {
		const response = await fetch(`${this.api}/repos/${encodeURIComponent(this.target.owner)}/${encodeURIComponent(this.target.repo)}${path}`, {
			method,
			headers: {
				accept: "application/vnd.github+json",
				...this.token === void 0 ? {} : { authorization: `Bearer ${this.token}` },
				"x-github-api-version": "2022-11-28",
				"user-agent": "dsh-okf",
				...body === void 0 ? {} : { "content-type": "application/json" }
			},
			...body === void 0 ? {} : { body: JSON.stringify(body) },
			...signal === void 0 ? {} : { signal }
		});
		const text = await response.text();
		const value = text === "" ? null : JSON.parse(text);
		if (!response.ok) {
			const message = typeof value === "object" && value !== null && "message" in value ? String(value.message) : response.statusText;
			const errors = typeof value === "object" && value !== null && "errors" in value ? ` ${JSON.stringify(value.errors)}` : "";
			throw new GitHubError(response.status, `${message}${errors}`);
		}
		return value;
	}
	/**
	* Open a pull request, or return the open one for the same branch.
	* @param input - title, body, head branch and base branch.
	* @param signal - cancellation.
	* @returns the pull request.
	*/
	async openOrUpdate(input, signal) {
		const open = (await this.call("GET", `/pulls?state=open&head=${encodeURIComponent(`${this.target.owner}:${input.head}`)}`, void 0, signal))[0];
		if (open !== void 0) {
			await this.call("PATCH", `/pulls/${String(open.number)}`, {
				title: input.title,
				body: input.body
			}, signal);
			return {
				number: open.number,
				url: open.html_url,
				reused: true
			};
		}
		const created = await this.call("POST", "/pulls", input, signal);
		return {
			number: created.number,
			url: created.html_url,
			reused: false
		};
	}
	/**
	* Add or remove a label.
	* @param number - the pull request.
	* @param label - the label.
	* @param present - add when true, remove when false.
	* @param signal - cancellation.
	*/
	async setLabel(number, label, present, signal) {
		if (present) {
			await this.call("POST", `/issues/${String(number)}/labels`, { labels: [label] }, signal);
			return;
		}
		try {
			await this.call("DELETE", `/issues/${String(number)}/labels/${encodeURIComponent(label)}`, void 0, signal);
		} catch (error) {
			if (!(error instanceof GitHubError && error.status === 404)) throw error;
		}
	}
	/**
	* Open pull requests, newest first (one page of up to 100).
	* @param signal - cancellation.
	* @returns the pull requests.
	*/
	async openPulls(signal) {
		return (await this.call("GET", "/pulls?state=open&per_page=100&sort=updated&direction=desc", void 0, signal)).map((row) => ({
			number: row.number,
			title: row.title,
			url: row.html_url,
			author: row.user?.login ?? "",
			draft: row.draft === true,
			headRef: row.head.ref,
			headSha: row.head.sha,
			baseRef: row.base.ref,
			updatedAt: row.updated_at,
			labels: (row.labels ?? []).map((label) => label.name ?? "").filter((name) => name !== "")
		}));
	}
	/**
	* Whether a pull request is still open, merged or closed.
	* @param number - the pull request.
	* @param signal - cancellation.
	* @returns the state.
	*/
	async pullState(number, signal) {
		const row = await this.call("GET", `/pulls/${String(number)}`, void 0, signal);
		if (row.state === "open") return "open";
		return row.merged === true ? "merged" : "closed";
	}
	/**
	* The combined state of a commit's check runs.
	* @param sha - the commit.
	* @param signal - cancellation.
	* @returns success when every run passed or was skipped, failure when one failed, pending while any runs.
	*/
	async checks(sha, signal) {
		const runs = (await this.call("GET", `/commits/${encodeURIComponent(sha)}/check-runs?per_page=100`, void 0, signal)).check_runs ?? [];
		if (runs.length === 0) return "none";
		if (runs.some((run) => run.status === "completed" && [
			"failure",
			"timed_out",
			"cancelled",
			"action_required",
			"startup_failure"
		].includes(run.conclusion ?? ""))) return "failure";
		if (runs.some((run) => run.status !== "completed")) return "pending";
		return "success";
	}
};
//#endregion
//#region src/host/run.ts
/**
* Run `git` and the OKF toolchain (`python scripts/okf.py`) as child processes.
*
* Git never prompts: `GIT_TERMINAL_PROMPT=0` and a null askpass turn a missing
* credential into an error the model can report, instead of a hung process.
* A push token travels as an `http.extraHeader` through `GIT_CONFIG_*`
* variables, so it never appears in argv, the remote URL, or `.git/config`
* (the same scheme as dsh-okf-plugin).
*/
/** A failed command, with the part of its output worth showing. */
var RunError = class extends Error {
	/** The exit code, when the process exited. */
	exitCode;
	/** stdout, credential-free. */
	stdout;
	/**
	* @param message - what went wrong, credential-free.
	* @param exitCode - the exit code.
	* @param stdout - what the process printed to stdout.
	*/
	constructor(message, exitCode, stdout = "") {
		super(message);
		this.name = "RunError";
		this.exitCode = exitCode;
		this.stdout = stdout;
	}
};
/**
* Remove anything that looks like a credential.
* @param text - command output.
* @param token - the token in use, if any.
* @returns the text, safe to show.
*/
function redact$1(text, token) {
	let out = text.replace(/(https?:\/\/)[^@\s/]+@/g, "$1***@").replace(/(Authorization:\s*\w+\s+)\S+/gi, "$1***");
	if (token !== void 0 && token !== "") out = out.split(token).join("***");
	return out;
}
/**
* The environment a child runs with.
* @param token - a git HTTP token, if any.
* @returns the environment.
*/
function childEnv(token) {
	const env = {
		...process.env,
		GIT_TERMINAL_PROMPT: "0",
		GIT_ASKPASS: "",
		SSH_ASKPASS: "",
		GCM_INTERACTIVE: "never",
		GIT_SSH_COMMAND: process.env.GIT_SSH_COMMAND ?? "ssh -o BatchMode=yes",
		PYTHONIOENCODING: "utf-8",
		PYTHONUTF8: "1"
	};
	if (token !== void 0 && token !== "") {
		const index = Number(env.GIT_CONFIG_COUNT ?? "0") || 0;
		env.GIT_CONFIG_COUNT = String(index + 1);
		env[`GIT_CONFIG_KEY_${String(index)}`] = "http.extraHeader";
		env[`GIT_CONFIG_VALUE_${String(index)}`] = `Authorization: Basic ${Buffer.from(`x-access-token:${token}`).toString("base64")}`;
	}
	return env;
}
/**
* Run one command.
* @param file - the executable.
* @param args - its arguments.
* @param options - cwd, deadline, token.
* @returns stdout, with trailing whitespace trimmed.
* @throws {RunError} on a non-zero exit, a timeout, or a missing executable.
*/
function run(file, args, options) {
	return new Promise((resolve, reject) => {
		execFile(file, [...args], {
			cwd: options.cwd,
			env: childEnv(options.token),
			timeout: options.timeoutMs ?? 12e4,
			maxBuffer: 16777216,
			windowsHide: true,
			...options.signal === void 0 ? {} : { signal: options.signal }
		}, (error, stdout, stderr) => {
			const out = redact$1(String(stdout), options.token).trimEnd();
			if (error === null) {
				resolve(out);
				return;
			}
			const err = error;
			if (err.code === "ENOENT") {
				reject(new RunError(`${file} was not found. Install it, or set its path in the plugin config.`, void 0));
				return;
			}
			if (err.killed === true) {
				reject(new RunError(`${file} ${args[0] ?? ""} took too long and was stopped.`, void 0, out));
				return;
			}
			reject(new RunError(redact$1(String(stderr || err.message), options.token).trim().split(/\r?\n/).slice(-12).join("\n") || `${file} failed`, typeof err.code === "number" ? err.code : void 0, out));
		});
	});
}
//#endregion
//#region src/host/review.ts
/**
* Split a markdown file into its frontmatter lines and body.
* @param source - the file.
* @returns the split, or undefined when the file has no frontmatter.
*/
function splitPage(source) {
	const text = source.replace(/^﻿/, "");
	const eol = text.includes("\r\n") ? "\r\n" : "\n";
	const open = /^---[ \t]*\r?\n/.exec(text);
	if (open === null) return void 0;
	const rest = text.slice(open[0].length);
	const close = /^---[ \t]*(\r?\n|$)/m.exec(rest);
	if (close === null) return void 0;
	const block = rest.slice(0, close.index).replace(/\r?\n$/, "");
	return {
		block: block === "" ? [] : block.split(/\r?\n/),
		body: rest.slice(close.index + close[0].length),
		eol
	};
}
/**
* Put a split page back together.
* @param page - the split.
* @returns the file.
*/
function joinPage(page) {
	return [
		"---",
		...page.block,
		"---",
		""
	].join(page.eol) + page.body;
}
/**
* Group frontmatter lines by top-level key. Comment and blank lines stay with
* the key above them; lines before the first key form a keyless block.
* @param lines - the frontmatter lines.
* @returns the blocks in order.
*/
function blocks(lines) {
	const out = [];
	for (const line of lines) {
		const match = /^([A-Za-z_][\w-]*)\s*:/.exec(line);
		if (match !== null) out.push({
			key: match[1],
			lines: [line]
		});
		else if (out.length === 0) out.push({
			key: void 0,
			lines: [line]
		});
		else out[out.length - 1]?.lines.push(line);
	}
	return out;
}
/**
* The lines of one top-level key.
* @param lines - the frontmatter lines.
* @param key - the key.
* @returns its lines, or undefined when absent.
*/
function keyLines(lines, key) {
	return blocks(lines).find((block) => block.key === key)?.lines;
}
/**
* Replace or add top-level keys.
* @param lines - the frontmatter lines.
* @param values - key → the replacement lines (the first starts with `key:`).
* @returns the new frontmatter lines. New keys go at the end, in the given order.
*/
function setKeys(lines, values) {
	const all = blocks(lines);
	const done = /* @__PURE__ */ new Set();
	const out = [];
	for (const block of all) {
		const replacement = block.key === void 0 ? void 0 : values[block.key];
		if (replacement === void 0 || block.key === void 0) {
			out.push(...block.lines);
			continue;
		}
		if (done.has(block.key)) continue;
		done.add(block.key);
		const trailing = [];
		for (let index = block.lines.length - 1; index > 0; index -= 1) {
			const line = block.lines[index] ?? "";
			if (line.trim() === "" || /^#/.test(line)) trailing.unshift(line);
			else break;
		}
		out.push(...replacement, ...trailing);
	}
	for (const [key, replacement] of Object.entries(values)) if (!done.has(key)) out.push(...replacement);
	return out;
}
/**
* Read a scalar, dropping quotes and a trailing comment.
* @param raw - the text after `key:`.
* @returns the value, or undefined when blank.
*/
function scalar(raw) {
	const text = raw.replace(/\s+#.*$/, "").trim();
	if (text === "" || text === "~" || text === "null") return void 0;
	const quoted = /^(['"])(.*)\1$/.exec(text);
	return quoted === null ? text : quoted[2];
}
/**
* Read `{ by, at }` from either flow style (`{by: x, at: y}`) or block style
* (`by: x` / `at: y` on their own lines).
* @param lines - the lines holding one actor record.
* @returns the fields found.
*/
function actor(lines) {
	const joined = lines.join("\n");
	const out = {};
	for (const field of ["by", "at"]) {
		const match = new RegExp(`(?:^|[\\s{,-])${field}\\s*:\\s*([^,}\\n]+)`).exec(joined);
		const value = match === null ? void 0 : scalar(match[1] ?? "");
		if (value !== void 0) out[field] = value;
	}
	return out;
}
/**
* Read the `verified` list: one actor record per `- ` item.
* @param lines - the key's lines.
* @returns the records in file order.
*/
function verifiedEntries(lines) {
	const head = lines[0] ?? "";
	const inline = /^verified\s*:\s*\[(.*)\]\s*$/.exec(head);
	if (inline !== null) return [...(inline[1] ?? "").matchAll(/\{[^}]*\}/g)].map((match) => actor([match[0]]));
	const items = [];
	for (const line of lines.slice(1)) if (/^\s*-/.test(line)) items.push([line]);
	else if (items.length > 0 && line.trim() !== "") items[items.length - 1]?.push(line);
	return items.map(actor);
}
/**
* Compare two ISO dates (or date-times) as text; both sort lexically.
* @param a - one date.
* @param b - the other.
* @returns true when a is on or after b.
*/
function notBefore(a, b) {
	return a.slice(0, 10) >= b.slice(0, 10);
}
/**
* The review state of a page.
* @param source - the file.
* @returns the state.
*/
function reviewState(source) {
	const page = splitPage(source);
	if (page === void 0) return { state: "unreviewed" };
	const lifecycle = scalar((keyLines(page.block, "lifecycle")?.[0] ?? "").replace(/^lifecycle\s*:/, ""));
	const generatedLines = keyLines(page.block, "generated");
	const generated = generatedLines === void 0 ? {} : actor([generatedLines[0]?.replace(/^generated\s*:/, "") ?? "", ...generatedLines.slice(1)]);
	const verifiedLines = keyLines(page.block, "verified");
	const verified = verifiedLines === void 0 ? [] : verifiedEntries(verifiedLines);
	const last = verified[verified.length - 1];
	const base = {
		...lifecycle === void 0 ? {} : { lifecycle },
		...generated.by === void 0 ? {} : { generatedBy: generated.by },
		...generated.at === void 0 ? {} : { generatedAt: generated.at }
	};
	const human = last?.by?.startsWith("human:") === true && last.at !== void 0;
	const current = human && (generated.at === void 0 || notBefore(last.at ?? "", generated.at));
	if (lifecycle === "active" && human && current) return {
		state: "reviewed",
		...base,
		reviewer: last.by?.slice(6) ?? "",
		reviewedAt: last.at ?? ""
	};
	return {
		state: "unreviewed",
		...base
	};
}
/**
* One line describing a review state, for tool output.
* @param review - the state.
* @returns the line.
*/
function describeReview(review) {
	const life = review.lifecycle === void 0 ? "" : `, lifecycle ${review.lifecycle}`;
	if (review.state === "reviewed") return `reviewed by ${review.reviewer ?? "?"} on ${review.reviewedAt ?? "?"}${life}`;
	return `unreviewed${review.generatedBy === void 0 ? "" : `, written by ${review.generatedBy}${review.generatedAt === void 0 ? "" : ` on ${review.generatedAt}`}`}${life}`;
}
/** Today as `YYYY-MM-DD` in local time. */
function today() {
	const now = /* @__PURE__ */ new Date();
	const pad = (value) => String(value).padStart(2, "0");
	return `${String(now.getFullYear())}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
/**
* Stamp an agent edit: the page becomes an unreviewed draft written by `actor`.
* Keeps `verified` (it is history), `created`, and every other key.
* @param source - the file after the edit.
* @param agent - the `generated.by` actor, e.g. `dsh/deepseek-v4`.
* @param date - today.
* @returns the stamped file.
* @throws {Error} when the file has no frontmatter.
*/
function stampAgentEdit(source, agent, date) {
	const page = splitPage(source);
	if (page === void 0) throw new Error("The page has no YAML frontmatter.");
	const values = {
		status: ["status: draft"],
		lifecycle: ["lifecycle: draft"],
		updated: [`updated: ${date}`],
		generated: [
			"generated:",
			`  by: ${agent}`,
			`  at: ${date}`
		]
	};
	if (keyLines(page.block, "created") === void 0) values.created = [`created: ${date}`];
	return joinPage({
		...page,
		block: setKeys(page.block, values)
	});
}
//#endregion
//#region src/host/eligibility.ts
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
/**
* Judge a change.
* @param bundleDir - the bundle folder in the repository, e.g. `okf`.
* @param files - the changed files.
* @returns the verdict.
*/
function judge(bundleDir, files) {
	const prefix = `${bundleDir.replace(/\\/g, "/").replace(/^\.\/|\/$/g, "")}/`;
	const reasons = [];
	const pages = [];
	if (files.length === 0) reasons.push("the change is empty");
	for (const file of files) {
		if (!file.path.startsWith(prefix)) {
			reasons.push(`changes ${file.path}, which is outside the wiki`);
			continue;
		}
		const rel = file.path.slice(prefix.length);
		if (rel === "index.md" || rel === "log.md") continue;
		if (rel.startsWith("sources/")) {
			if (file.status !== "added") reasons.push(`${file.status === "deleted" ? "deletes" : "modifies"} the capture ${rel}; captures are immutable`);
			continue;
		}
		if (rel === "SCHEMA.md") {
			reasons.push("changes SCHEMA.md, the bundle conventions");
			continue;
		}
		if (rel.startsWith("archive/")) {
			reasons.push(`changes the archived page ${rel}`);
			continue;
		}
		if (!rel.endsWith(".md")) {
			reasons.push(`changes ${rel}, which is not a wiki page`);
			continue;
		}
		const before = file.before === void 0 ? void 0 : reviewState(file.before);
		const after = file.after === void 0 ? void 0 : reviewState(file.after);
		pages.push({
			path: rel,
			status: file.status,
			...before === void 0 ? {} : { before },
			...after === void 0 ? {} : { after }
		});
		if (file.status === "deleted") reasons.push(`deletes the page ${rel}`);
		if (before?.state === "reviewed") reasons.push(`edits ${rel}, which ${before.reviewer ?? "a person"} reviewed on ${before.reviewedAt ?? "?"}`);
		if (after?.state === "reviewed") reasons.push(`${rel} claims a human review; only a person may stamp verified`);
	}
	return {
		eligible: reasons.length === 0,
		reasons,
		pages
	};
}
//#endregion
//#region src/host/team.ts
/**
* The Team Wiki: one git repository whose wiki folder (default `okf`) holds
* the team's project wikis, each a folder with its own SCHEMA.md, sharing the
* repository's `scripts/okf.py`, CI and auto-merge rule.
*
*     <libraryDir>/team/
*       team.json          the connected repository + maintenance workspaces
*       main/              a clone of the base branch, read for the page (never edited)
*       work/<id>/         one clone per maintenance workspace, on its own wiki/… branch
*
* The page lists the project wikis with their review counts (read from
* `main/`), the open pull requests that touch each one (GitHub REST for the
* list and checks; git itself for the files and the auto-merge verdict, the
* same {@link judge} CI runs), and starts two kinds of work:
*
* - **Maintain** clones the repository into `work/<id>` on a new branch and
*   registers the project wiki there as a library entry with `workspace` set,
*   so the session the browser opens in that DSH Workspace may edit it.
* - **New project wiki** does the same, then scaffolds the folder with
*   `okf.py init` and opens the setup as the first pull request.
*
* **Open pull request** runs the repository's own toolchain (`links`, `index`,
* `lint`, `log`) over the workspace, resets any reviewed page that was edited
* without resetting its stamp, commits only the project wiki's folder, pushes
* the branch and opens or updates the pull request, labelled for auto-merge
* when the change only touches unreviewed pages.
*
* Tokens come from the same variables as the library (`DSH_OKF_GITHUB_TOKEN`,
* `DSH_OKF_AZURE_TOKEN`, `DSH_OKF_GIT_TOKEN`) and travel as a git
* `http.extraHeader` through `GIT_CONFIG_*`, never argv, URL or config.
*/
/** Folders inside a bundle that are never project wikis of their own. */
const BUNDLE_PARTS = /* @__PURE__ */ new Set([
	"concepts",
	"entities",
	"comparisons",
	"queries",
	"archive",
	"sources"
]);
/** Top-level folders okf.py never treats as bundles. */
const NON_BUNDLE_DIRS = /* @__PURE__ */ new Set([
	".git",
	".github",
	".claude",
	".agents",
	".cursor",
	"node_modules",
	"scripts",
	"skills",
	"dist",
	"__pycache__"
]);
/** How long a pull request list is served from memory. */
const PULLS_TTL_MS = 6e4;
/** Pages read per wiki, at most. */
const PAGE_CAP = 5e3;
/**
* Whether a path is a file.
* @param path - the path.
* @returns true for an existing file.
*/
async function isFile(path) {
	try {
		return (await stat(path)).isFile();
	} catch {
		return false;
	}
}
/**
* Whether a path exists.
* @param path - the path.
* @returns true when something is there.
*/
async function exists(path) {
	try {
		await stat(path);
		return true;
	} catch {
		return false;
	}
}
/**
* A folder name for a project wiki.
* @param value - a name or folder.
* @returns lowercase ASCII letters, digits and dashes.
*/
function wikiSlug(value) {
	return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}
/**
* `payments-ops` → `Payments Ops`.
* @param value - a folder or repository name.
* @returns a display name.
*/
function humanize(value) {
	return value.split(/[-_\s]+/).filter(Boolean).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}
/**
* A short display name for a remote.
* @param url - the remote.
* @returns e.g. `github.com/acme/team-wiki`.
*/
function remoteName(url) {
	const text = url.trim().replace(/\.git$/, "");
	const scp = /^[\w.-]+@([\w.-]+):(.+)$/.exec(text);
	if (scp !== null && !text.includes("://")) return `${scp[1] ?? ""}/${scp[2] ?? ""}`;
	try {
		const parsed = new URL(text);
		return parsed.protocol === "file:" ? parsed.pathname : `${parsed.hostname}${parsed.pathname}`;
	} catch {
		return text;
	}
}
/** A compact local timestamp for ids and branches: `20261119-0932`. */
function stamp() {
	const now = /* @__PURE__ */ new Date();
	const pad = (value) => String(value).padStart(2, "0");
	return `${String(now.getFullYear())}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
}
/**
* Parse `git diff --name-status -z` output.
* @param output - the raw output.
* @returns paths with their change.
*/
function parseNameStatus(output) {
	const parts = output.split("\0");
	const out = [];
	for (let index = 0; index + 1 < parts.length; index += 2) {
		const code = parts[index] ?? "";
		const path = parts[index + 1] ?? "";
		if (path === "") continue;
		out.push({
			path,
			status: code.startsWith("A") ? "added" : code.startsWith("D") ? "deleted" : "modified"
		});
	}
	return out;
}
/**
* Parse `git status --porcelain=v1 -z` output.
* @param output - the raw output.
* @returns paths with their two status letters.
*/
function parseStatus(output) {
	const out = [];
	const parts = output.split("\0");
	for (let index = 0; index < parts.length; index += 1) {
		const entry = parts[index] ?? "";
		if (entry.length < 4) continue;
		const code = entry.slice(0, 2);
		out.push({
			path: entry.slice(3),
			code
		});
		if (code.includes("R") || code.includes("C")) index += 1;
	}
	return out;
}
/**
* Whether a bundle-relative page path is a wiki page the counts include.
* @param rel - the path.
* @returns false for index.md, log.md, captures and archived pages.
*/
function countsAsPage(rel) {
	if (!rel.endsWith(".md")) return false;
	if (rel === "index.md" || rel === "log.md") return false;
	return !rel.startsWith("sources/") && !rel.startsWith("archive/");
}
/**
* Read every page of a project wiki with its review state.
* @param dir - the wiki folder on disk.
* @returns the pages, sorted by path.
*/
async function readWikiPages(dir) {
	const pages = [];
	const now = today();
	const walk = async (folder, rel) => {
		let entries;
		try {
			entries = await readdir(folder, { withFileTypes: true });
		} catch {
			return;
		}
		for (const entry of entries) {
			if (pages.length >= PAGE_CAP) return;
			if (entry.name.startsWith(".")) continue;
			const path = rel === "" ? entry.name : `${rel}/${entry.name}`;
			const full = join(folder, entry.name);
			if (entry.isDirectory()) {
				if (rel === "" && (entry.name === "sources" || entry.name === "archive")) continue;
				if (rel === "" && !BUNDLE_PARTS.has(entry.name) && await isFile(join(full, "SCHEMA.md"))) continue;
				await walk(full, path);
				continue;
			}
			if (!countsAsPage(path)) continue;
			let source;
			try {
				source = await readFile(full, "utf8");
			} catch {
				continue;
			}
			const meta = parsePage(source).meta;
			const review = reviewState(source);
			const staleAfter = text(meta, "stale_after");
			const overdue = review.lifecycle === "needs_review" || staleAfter !== void 0 && staleAfter.slice(0, 10) < now;
			const type = text(meta, "type");
			pages.push({
				path,
				title: text(meta, "title") ?? path,
				...type === void 0 ? {} : { type },
				...review.lifecycle === void 0 ? {} : { lifecycle: review.lifecycle },
				review: review.state,
				...review.reviewer === void 0 ? {} : { reviewer: review.reviewer },
				...review.reviewedAt === void 0 ? {} : { reviewedAt: review.reviewedAt },
				...review.generatedBy === void 0 ? {} : { generatedBy: review.generatedBy },
				...review.generatedAt === void 0 ? {} : { generatedAt: review.generatedAt },
				...staleAfter === void 0 ? {} : { staleAfter },
				overdue
			});
		}
	};
	await walk(dir, "");
	return pages.sort((a, b) => a.path.localeCompare(b.path));
}
/**
* Count a wiki's pages by review state.
* @param pages - its pages.
* @returns the counts.
*/
function statsOf(pages) {
	return {
		pages: pages.length,
		reviewed: pages.filter((page) => page.review === "reviewed").length,
		unreviewed: pages.filter((page) => page.review === "unreviewed").length,
		overdue: pages.filter((page) => page.overdue).length
	};
}
/**
* Find the project wikis in a checkout: the wiki folder itself when it holds a
* SCHEMA.md, and each folder directly under it that does. With an empty root,
* every top-level folder holding a SCHEMA.md (okf.py's own detection rule).
* @param repo - the checkout.
* @param root - the wiki folder, repository-relative.
* @returns repository-relative folders, sorted.
*/
async function discoverWikis(repo, root) {
	const base = root === "" ? repo : join(repo, root);
	const found = [];
	if (root !== "" && await isFile(join(base, "SCHEMA.md"))) found.push(root);
	let entries;
	try {
		entries = await readdir(base, { withFileTypes: true });
	} catch {
		return found;
	}
	for (const entry of entries) {
		if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
		if (BUNDLE_PARTS.has(entry.name) || root === "" && NON_BUNDLE_DIRS.has(entry.name)) continue;
		if (await isFile(join(base, entry.name, "SCHEMA.md"))) found.push(root === "" ? entry.name : `${root}/${entry.name}`);
	}
	return found.sort();
}
/**
* The display name of a project wiki: SCHEMA.md's `wiki_name` extension key,
* else its folder name, else (for a wiki at the repository's wiki root) the
* repository name.
* @param repo - the checkout.
* @param folder - the wiki folder.
* @param repoName - the repository name.
* @returns the name.
*/
async function wikiName(repo, folder, repoName) {
	try {
		const named = text(parsePage(await readFile(join(repo, folder, "SCHEMA.md"), "utf8")).meta, "wiki_name");
		if (named !== void 0 && named.trim() !== "") return named.trim();
	} catch {}
	const last = folder.split("/").at(-1) ?? folder;
	return humanize(last === "okf" || last === "" ? repoName : last);
}
/**
* Open the Team Wiki service.
* @param options - folders, toolchain and GitHub settings.
* @returns the service.
*/
function openTeam(options) {
	const file = join(options.dir, "team.json");
	const mainDir = join(options.dir, "main");
	const workDir = join(options.dir, "work");
	const env = options.env ?? process.env;
	let queue = Promise.resolve();
	let pullsCache;
	const statsCache = /* @__PURE__ */ new Map();
	/** Run one change after every change before it. */
	const serial = (work) => {
		const next = queue.then(work, work);
		queue = next.catch(() => void 0);
		return next;
	};
	const load = async () => {
		try {
			const parsed = JSON.parse(await readFile(file, "utf8"));
			if (parsed.v === 1) return {
				...parsed,
				v: 1,
				maintains: Array.isArray(parsed.maintains) ? parsed.maintains : []
			};
		} catch (error) {
			if (error.code !== "ENOENT" && !(error instanceof SyntaxError)) throw error;
		}
		return {
			v: 1,
			maintains: []
		};
	};
	const save = async (data) => {
		await mkdir(options.dir, { recursive: true });
		const temp = `${file}.${randomBytes(4).toString("hex")}.tmp`;
		await writeFile(temp, `${JSON.stringify(data, null, 2)}\n`);
		for (let attempt = 0;; attempt += 1) try {
			await rename(temp, file);
			return;
		} catch (error) {
			if (attempt >= 4 || ![
				"EPERM",
				"EBUSY",
				"EACCES"
			].includes(String(error.code))) throw error;
			await new Promise((done) => {
				setTimeout(done, 40);
			});
		}
	};
	const tokenFor = (provider) => TOKEN_ENV[provider].map((name) => env[name]?.trim()).find((value) => value !== void 0 && value !== "");
	const git = (cwd, args, token) => run(options.git, args, {
		cwd,
		timeoutMs: options.timeoutMs,
		...token === void 0 ? {} : { token }
	});
	const needTeam = (data) => {
		if (data.team === void 0) throw new LibraryError("no-team", "Connect the team wiki repository first.", 409);
		return data.team;
	};
	const baseOf = (data) => data.team?.ref ?? data.base ?? "main";
	const repoName = (team) => remoteName(team.url).split("/").at(-1) ?? "wiki";
	/** Every project wiki on the base branch, with counts (cached per commit). */
	const listWikis = async (data) => {
		if (data.team === void 0 || !await exists(mainDir)) return [];
		const team = data.team;
		const commit = data.commit ?? "";
		const folders = await discoverWikis(mainDir, team.root);
		const out = [];
		for (const folder of folders) {
			const open = data.maintains.find((record) => record.wiki === folder && record.closed === void 0);
			const cached = statsCache.get(folder);
			if (cached !== void 0 && cached.commit === commit && commit !== "") {
				out.push({
					wiki: {
						...cached.wiki,
						...open === void 0 ? {} : { maintainId: open.id }
					},
					pages: cached.pages
				});
				continue;
			}
			const pages = await readWikiPages(join(mainDir, folder));
			const base = {
				folder,
				name: await wikiName(mainDir, folder, repoName(team)),
				stats: statsOf(pages)
			};
			statsCache.set(folder, {
				commit,
				wiki: base,
				pages
			});
			out.push({
				wiki: {
					...base,
					...open === void 0 ? {} : { maintainId: open.id }
				},
				pages
			});
		}
		return out;
	};
	const status = async () => {
		let data = await load();
		if (data.team === void 0 && options.preset !== void 0) try {
			return await connect(options.preset);
		} catch (error) {
			console.warn("[okf] team wiki preset could not be connected:", error);
			data = await load();
		}
		const wikis = (await listWikis(data)).map((item) => item.wiki);
		const maintains = data.maintains.filter((record) => record.closed === void 0);
		return {
			...data.team === void 0 ? {} : {
				team: data.team,
				baseBranch: baseOf(data)
			},
			...data.commit === void 0 ? {} : { commit: data.commit },
			...data.refreshedAt === void 0 ? {} : { refreshedAt: data.refreshedAt },
			wikis,
			maintains,
			hasToken: data.team === void 0 ? false : tokenFor(data.team.provider) !== void 0
		};
	};
	/** Bring `main/` to the remote's base branch. */
	const syncMain = async (data) => {
		const team = needTeam(data);
		const token = tokenFor(team.provider);
		const base = baseOf(data);
		await git(mainDir, [
			"fetch",
			"--quiet",
			"--prune",
			"origin",
			`+refs/heads/${base}:refs/remotes/origin/${base}`
		], token);
		await git(mainDir, [
			"checkout",
			"--quiet",
			"--force",
			"--detach",
			`origin/${base}`
		]);
		data.commit = await git(mainDir, ["rev-parse", "HEAD"]);
		data.refreshedAt = (/* @__PURE__ */ new Date()).toISOString();
	};
	const connect = (request) => serial(async () => {
		const remote = (() => {
			try {
				return parseRemote(request.url);
			} catch (error) {
				throw new LibraryError("bad-url", error.message);
			}
		})();
		const ref = request.ref?.trim() || void 0;
		if (ref !== void 0 && (ref.startsWith("-") || /\s|\.\./.test(ref))) throw new LibraryError("bad-ref", "That is not a branch name.");
		const root = cleanRepoPath(request.root ?? "okf") ?? "";
		const token = tokenFor(remote.provider);
		await mkdir(options.dir, { recursive: true });
		const temp = join(options.dir, `main.${randomBytes(3).toString("hex")}.tmp`);
		try {
			await git(options.dir, [
				"clone",
				"--quiet",
				"--filter=blob:none",
				...ref === void 0 ? [] : ["--branch", ref],
				"--",
				request.url.trim(),
				temp
			], token);
		} catch (error) {
			await rm(temp, {
				recursive: true,
				force: true
			});
			throw error;
		}
		await rm(mainDir, {
			recursive: true,
			force: true
		});
		await rename(temp, mainDir);
		const data = await load();
		const base = ref ?? await git(mainDir, [
			"symbolic-ref",
			"--short",
			"refs/remotes/origin/HEAD"
		]).then((value) => value.replace(/^origin\//, ""), () => void 0) ?? await git(mainDir, [
			"rev-parse",
			"--abbrev-ref",
			"HEAD"
		]);
		data.team = {
			url: request.url.trim(),
			provider: remote.provider,
			...ref === void 0 ? {} : { ref },
			root,
			name: remoteName(request.url),
			connectedAt: (/* @__PURE__ */ new Date()).toISOString()
		};
		data.base = base;
		await git(mainDir, [
			"checkout",
			"--quiet",
			"--detach"
		]);
		data.commit = await git(mainDir, ["rev-parse", "HEAD"]);
		data.refreshedAt = (/* @__PURE__ */ new Date()).toISOString();
		statsCache.clear();
		pullsCache = void 0;
		await save(data);
		return status();
	});
	const refresh = () => serial(async () => {
		const data = await load();
		await syncMain(data);
		pullsCache = void 0;
		await save(data);
		return status();
	});
	const wiki = async (folder) => {
		const data = await load();
		const found = (await listWikis(data)).find((item) => item.wiki.folder === folder);
		if (found === void 0) throw new LibraryError("unknown-wiki", `There is no project wiki at ${folder} on the base branch.`, 404);
		return {
			wiki: found.wiki,
			pages: found.pages
		};
	};
	/** Which project wiki a repository path belongs to, if any. */
	const wikiOfPath = (path, known, root) => {
		const match = [...known].sort((a, b) => b.length - a.length).find((folder) => path.startsWith(`${folder}/`));
		if (match !== void 0) return match;
		const prefix = root === "" ? "" : `${root}/`;
		if (!path.startsWith(prefix)) return void 0;
		const rest = path.slice(prefix.length).split("/");
		if (rest.length < 2 || BUNDLE_PARTS.has(rest[0] ?? "")) return known.includes(root) ? root : void 0;
		return `${prefix}${rest[0] ?? ""}`;
	};
	/** Files of a commit range, with the text before and after. */
	const changedFiles = async (repo, from, to, token) => {
		const listing = parseNameStatus(await git(repo, [
			"diff",
			"--name-status",
			"--no-renames",
			"-z",
			from,
			...to === void 0 ? [] : [to]
		], token));
		const files = [];
		for (const change of listing) {
			const before = change.status === "added" ? void 0 : await git(repo, ["show", `${from}:${change.path}`], token).catch(() => void 0);
			const after = change.status === "deleted" ? void 0 : to === void 0 ? await readFile(join(repo, change.path), "utf8").catch(() => void 0) : await git(repo, ["show", `${to}:${change.path}`], token).catch(() => void 0);
			files.push({
				path: change.path,
				status: change.status,
				...before === void 0 ? {} : { before },
				...after === void 0 ? {} : { after }
			});
		}
		return files;
	};
	const pulls = (force = false) => {
		if (!force && pullsCache !== void 0 && Date.now() - pullsCache.at < PULLS_TTL_MS) return Promise.resolve(pullsCache.answer);
		return serial(async () => {
			const data = await load();
			const team = needTeam(data);
			const at = (/* @__PURE__ */ new Date()).toISOString();
			const target = team.provider === "github" ? parseGitHubRemote(team.url, options.githubHost) : void 0;
			if (target === void 0) return {
				pulls: [],
				at,
				note: team.provider === "azure-devops" ? "azure" : "not-github"
			};
			const token = tokenFor(team.provider);
			const github = new GitHub(options.githubApi, token, target);
			const base = baseOf(data);
			const open = (await github.openPulls()).filter((pull) => pull.baseRef === base);
			const known = await discoverWikis(mainDir, team.root);
			let note;
			try {
				await git(mainDir, [
					"fetch",
					"--quiet",
					"origin",
					`+refs/heads/${base}:refs/remotes/origin/${base}`,
					...open.map((pull) => `+refs/pull/${String(pull.number)}/head:refs/okf-pr/${String(pull.number)}`)
				], token);
			} catch (error) {
				note = `fetch-failed: ${error.message}`;
			}
			const views = [];
			for (const pull of open) {
				const ref = `refs/okf-pr/${String(pull.number)}`;
				let files = [];
				let judged = false;
				try {
					const mergeBase = await git(mainDir, [
						"merge-base",
						`origin/${base}`,
						ref
					]);
					files = await changedFiles(mainDir, mergeBase, ref, token);
					judged = true;
				} catch {}
				const wikis = [...new Set(files.map((file) => wikiOfPath(file.path, known, team.root)).filter((folder) => folder !== void 0))];
				const record = data.maintains.find((candidate) => candidate.branch === pull.headRef);
				if (judged && wikis.length === 0 && record === void 0) continue;
				let eligible = false;
				let reasons;
				if (!judged) reasons = ["its changes could not be read"];
				else if (wikis.length > 1) reasons = [`touches ${String(wikis.length)} project wikis: ${wikis.join(", ")}`];
				else {
					const verdict = judge(wikis[0] ?? team.root, files);
					eligible = verdict.eligible;
					reasons = verdict.reasons;
				}
				const checks = await github.checks(pull.headSha).catch(() => "unknown");
				views.push({
					number: pull.number,
					title: pull.title,
					url: pull.url,
					author: pull.author,
					draft: pull.draft,
					branch: pull.headRef,
					updatedAt: pull.updatedAt,
					labels: pull.labels,
					wikis,
					checks,
					eligible,
					reasons,
					files: files.length,
					...record === void 0 ? {} : { maintainId: record.id }
				});
			}
			let changed = false;
			for (const record of data.maintains) {
				if (record.pr === void 0 || record.closed !== void 0 || open.some((pull) => pull.number === record.pr?.number)) continue;
				const state = await github.pullState(record.pr.number).catch(() => "open");
				if (state === "open") continue;
				Object.assign(record, { closed: state });
				changed = true;
			}
			if (changed) await save(data);
			const answer = {
				pulls: views,
				at,
				...note === void 0 ? {} : { note }
			};
			pullsCache = {
				at: Date.now(),
				answer
			};
			return answer;
		});
	};
	/** The library entry that lets a session in the workspace edit the wiki. */
	const entryFor = (record) => ({
		id: record.entryId,
		name: `${record.wikiName} · maintain`,
		root: join(record.workspace, ...record.wiki.split("/")),
		origin: { kind: "local" },
		addedAt: record.createdAt,
		workspace: record.workspace,
		team: {
			maintainId: record.id,
			wiki: record.wiki
		}
	});
	/** Clone the repository into a fresh maintenance workspace on a new branch. */
	const newWorkspace = async (data, folder, name, isNew) => {
		const team = needTeam(data);
		const token = tokenFor(team.provider);
		const base = baseOf(data);
		const seg = wikiSlug(folder.split("/").at(-1) ?? folder) || "wiki";
		const suffix = randomBytes(2).toString("hex");
		const id = `${seg}-${stamp()}-${suffix}`;
		const branch = isNew ? `wiki/new-${seg}-${suffix}` : `wiki/${seg}-${stamp().replace("-", "")}-${suffix}`;
		await mkdir(workDir, { recursive: true });
		const target = join(workDir, id);
		try {
			await git(workDir, [
				"clone",
				"--quiet",
				"--filter=blob:none",
				"--branch",
				base,
				"--",
				team.url,
				target
			], token);
			await git(target, [
				"switch",
				"--quiet",
				"-c",
				branch
			]);
		} catch (error) {
			await rm(target, {
				recursive: true,
				force: true
			});
			throw error;
		}
		const record = {
			id,
			wiki: folder,
			wikiName: name,
			branch,
			workspace: canonical(target),
			entryId: `team-${id}`,
			createdAt: (/* @__PURE__ */ new Date()).toISOString(),
			...isNew ? { isNew: true } : {}
		};
		data.maintains.push(record);
		return record;
	};
	const maintain = (folder) => serial(async () => {
		const data = await load();
		const team = needTeam(data);
		const open = data.maintains.find((record) => record.wiki === folder && record.closed === void 0);
		if (open !== void 0 && await exists(join(open.workspace, ".git"))) return {
			record: open,
			entry: await options.library.put(entryFor(open)),
			workspace: open.workspace,
			created: false
		};
		if (open !== void 0) Object.assign(open, { closed: "closed" });
		if (!(await discoverWikis(mainDir, team.root)).includes(folder)) throw new LibraryError("unknown-wiki", `There is no project wiki at ${folder} on the base branch. Refresh, or create it.`, 404);
		const record = await newWorkspace(data, folder, await wikiName(mainDir, folder, repoName(team)), false);
		await save(data);
		return {
			record,
			entry: await options.library.put(entryFor(record)),
			workspace: record.workspace,
			created: true
		};
	});
	const create = async (request) => {
		const answer = await serial(async () => {
			const data = await load();
			const team = needTeam(data);
			const name = request.name.trim();
			if (name === "" || name.length > 80) throw new LibraryError("bad-name", "Give the project wiki a name (at most 80 characters).");
			const seg = wikiSlug(request.folder?.trim() || name);
			if (seg === "") throw new LibraryError("bad-folder", "The folder name needs at least one letter or digit.");
			const folder = team.root === "" ? seg : `${team.root}/${seg}`;
			if (await exists(join(mainDir, folder))) throw new LibraryError("exists", `${folder} already exists in the team repository.`, 409);
			if (data.maintains.some((record) => record.wiki === folder && record.closed === void 0)) throw new LibraryError("exists", `A workspace for ${folder} is already open. Use Maintain on it.`, 409);
			const template = request.template ?? "default";
			let schemaFrom;
			if (template.startsWith("copy:")) {
				schemaFrom = template.slice(5);
				if (!(await discoverWikis(mainDir, team.root)).includes(schemaFrom)) throw new LibraryError("unknown-wiki", `There is no project wiki at ${schemaFrom} to copy SCHEMA.md from.`, 404);
			}
			const record = await newWorkspace(data, folder, name, true);
			await save(data);
			await scaffold(record.workspace, folder, name, schemaFrom === void 0 ? void 0 : join(mainDir, schemaFrom, "SCHEMA.md"));
			return {
				record,
				entry: await options.library.put(entryFor(record)),
				workspace: record.workspace,
				created: true
			};
		});
		try {
			const pr = await openPr(answer.record.id, {
				title: `Add the ${answer.record.wikiName} project wiki`,
				summary: `Sets up a new project wiki at \`${answer.record.wiki}\`.`
			});
			const fresh = (await load()).maintains.find((record) => record.id === answer.record.id) ?? answer.record;
			return {
				...answer,
				record: fresh,
				pr
			};
		} catch (error) {
			return {
				...answer,
				prError: error.message
			};
		}
	};
	/** Lay out a new project wiki in a workspace. */
	const scaffold = async (repo, folder, name, schemaFrom) => {
		const target = join(repo, ...folder.split("/"));
		await mkdir(target, { recursive: true });
		if (schemaFrom !== void 0) await copyFile(schemaFrom, join(target, "SCHEMA.md"));
		const script = join(repo, options.okfScript);
		if (await isFile(script)) {
			await run(options.python, [
				script,
				"init",
				"--bundle",
				folder
			], {
				cwd: repo,
				timeoutMs: options.timeoutMs
			});
			await git(repo, [
				"checkout",
				"--quiet",
				"--",
				".",
				`:(exclude)${folder}`
			]).catch(() => void 0);
			await git(repo, [
				"clean",
				"-fdq",
				"--",
				".",
				`:(exclude)${folder}`
			]).catch(() => void 0);
		} else {
			const date = today();
			if (!await isFile(join(target, "SCHEMA.md"))) await writeFile(join(target, "SCHEMA.md"), [
				"---",
				"type: Reference",
				`title: ${name} — Schema & Conventions`,
				`description: Conventions for the ${name} project wiki.`,
				"status: draft",
				"lifecycle: draft",
				`created: ${date}`,
				`updated: ${date}`,
				"---",
				"",
				`# ${name} — Schema & Conventions`,
				"",
				"Every page is OKF v0.2 markdown with YAML frontmatter: `type`, `title`, `description`, `status`, `lifecycle`, `updated`.",
				"Pages an agent writes are unreviewed drafts. A person marks a page reviewed by adding `verified: [{ by: human:<id>, at: <date> }]` and setting `lifecycle: active`.",
				""
			].join("\n"));
			await writeFile(join(target, "log.md"), `# Log\n\n## ${date}\n\n- **Creation**: set up the ${name} project wiki.\n`);
		}
		const schemaPath = join(target, "SCHEMA.md");
		const schema = splitPage(await readFile(schemaPath, "utf8"));
		if (schema !== void 0) {
			const values = {
				wiki_name: [`wiki_name: ${JSON.stringify(name)}`],
				updated: [`updated: ${today()}`]
			};
			await writeFile(schemaPath, joinPage({
				...schema,
				block: setKeys(schema.block, values)
			}));
		}
		if (await isFile(script)) await run(options.python, [
			script,
			"index",
			"--bundle",
			folder
		], {
			cwd: repo,
			timeoutMs: options.timeoutMs
		});
		else if (!await isFile(join(target, "index.md"))) await writeFile(join(target, "index.md"), `---\nokf_version: "0.2"\n---\n\n# ${name}\n\n* [Schema & Conventions](SCHEMA.md)\n`);
	};
	const findRecord = (data, id) => {
		const record = data.maintains.find((candidate) => candidate.id === id);
		if (record === void 0) throw new LibraryError("unknown-workspace", `No maintenance workspace "${id}".`, 404);
		return record;
	};
	const changes = async (id) => {
		const data = await load();
		const record = findRecord(data, id);
		const base = `origin/${baseOf(data)}`;
		const mergeBase = await git(record.workspace, [
			"merge-base",
			"HEAD",
			base
		]);
		const tracked = parseNameStatus(await git(record.workspace, [
			"diff",
			"--name-status",
			"--no-renames",
			"-z",
			mergeBase
		]));
		const untracked = (await git(record.workspace, [
			"ls-files",
			"--others",
			"--exclude-standard",
			"-z"
		])).split("\0").filter(Boolean);
		const files = [];
		for (const change of [...tracked, ...untracked.map((path) => ({
			path,
			status: "added"
		}))]) {
			let review;
			if (change.status !== "deleted" && change.path.endsWith(".md")) review = await readFile(join(record.workspace, change.path), "utf8").then((source) => reviewState(source).state, () => void 0);
			files.push({
				path: change.path,
				status: change.status,
				...review === void 0 ? {} : { review }
			});
		}
		const uncommitted = parseStatus(await git(record.workspace, [
			"status",
			"--porcelain=v1",
			"-z",
			"--untracked-files=all"
		])).length;
		return {
			record,
			files: files.sort((a, b) => a.path.localeCompare(b.path)),
			uncommitted
		};
	};
	const openPr = (id, request) => serial(async () => {
		const data = await load();
		const team = needTeam(data);
		const record = findRecord(data, id);
		if (record.closed !== void 0) throw new LibraryError("closed", "This workspace's pull request already merged or closed. Use Maintain to start a fresh one.", 409);
		const repo = record.workspace;
		const token = tokenFor(team.provider);
		const base = baseOf(data);
		const prefix = `${record.wiki}/`;
		const notes = [];
		const title = request.title?.trim() || (record.pr === void 0 ? `Update the ${record.wikiName} wiki` : "");
		const summary = request.summary?.trim() || `Changes to \`${record.wiki}\` made in a DSH maintenance session.`;
		await git(repo, [
			"fetch",
			"--quiet",
			"origin",
			`+refs/heads/${base}:refs/remotes/origin/${base}`
		], token).catch(() => {
			notes.push(`Could not fetch origin/${base}; compared against the local copy.`);
		});
		const mergeBase = await git(repo, [
			"merge-base",
			"HEAD",
			`origin/${base}`
		]).catch(() => void 0);
		const stamped = [];
		if (mergeBase !== void 0) {
			const pending = await changedFiles(repo, mergeBase, void 0, token);
			for (const file of pending) {
				if (!file.path.startsWith(prefix) || file.status !== "modified" || file.before === void 0 || file.after === void 0) continue;
				if (!countsAsPage(file.path.slice(prefix.length)) || file.before === file.after) continue;
				const before = reviewState(file.before);
				const after = reviewState(file.after);
				if (before.state !== "reviewed" || after.state !== "reviewed") continue;
				if (after.reviewer !== before.reviewer || after.reviewedAt !== before.reviewedAt) continue;
				await writeFile(join(repo, file.path), stampAgentEdit(file.after, options.agentActor, today()));
				stamped.push(file.path.slice(prefix.length));
			}
		}
		const changed = parseStatus(await git(repo, [
			"status",
			"--porcelain=v1",
			"-z",
			"--untracked-files=all"
		]));
		const inside = changed.filter((change) => change.path.startsWith(prefix));
		const outside = changed.filter((change) => !change.path.startsWith(prefix));
		if (outside.length > 0) notes.push(`Left out (outside ${record.wiki}): ${outside.map((change) => change.path).slice(0, 20).join(", ")}`);
		const script = join(repo, options.okfScript);
		const hasScript = await isFile(script);
		const okf = (...args) => run(options.python, [
			script,
			...args,
			"--bundle",
			record.wiki
		], {
			cwd: repo,
			timeoutMs: options.timeoutMs
		});
		let lint = "";
		if (hasScript && inside.length > 0) {
			await okf("links");
			await okf("index");
			try {
				lint = await okf("lint");
			} catch (error) {
				if (error instanceof RunError) throw new LibraryError("lint-failed", `okf.py lint failed, so nothing was committed or pushed. Ask the session to fix these, then try again:\n${[error.stdout, error.message].filter(Boolean).join("\n").slice(0, 6e3)}`, 422);
				throw error;
			}
			for (const change of inside) {
				const rel = change.path.slice(prefix.length);
				if (rel === "index.md" || rel === "log.md" || !rel.endsWith(".md")) continue;
				const deleted = change.code.includes("D");
				const added = change.code.includes("?") || change.code.includes("A");
				const verb = rel.startsWith("sources/") ? "Ingestion" : deleted ? "Removal" : added ? "Creation" : "Update";
				let pageTitle = rel;
				if (!deleted) pageTitle = await readFile(join(repo, change.path), "utf8").then((source) => text(parsePage(source).meta, "title") ?? rel, () => rel);
				await okf("log", `**${verb}**: [${pageTitle.replace(/[[\]]/g, "")}](/${rel}) — ${title || record.wikiName}`);
			}
		} else if (!hasScript) notes.push(`${options.okfScript} is not in the repository, so links, index, lint and log were skipped and the pull request needs a person.`);
		await git(repo, [
			"add",
			"-A",
			"--",
			record.wiki
		]);
		if (await git(repo, [
			"diff",
			"--cached",
			"--name-only"
		]) !== "") {
			const identity = await git(repo, ["config", "user.email"]).catch(() => "") === "" ? /^(.*?)\s*<([^>]+)>$/.exec(options.commitAuthor) ?? [] : [];
			const who = identity.length === 3 ? [
				"-c",
				`user.name=${identity[1] ?? ""}`,
				"-c",
				`user.email=${identity[2] ?? ""}`
			] : [];
			await git(repo, [
				...who,
				"commit",
				"--quiet",
				"-m",
				`${title || `Update the ${record.wikiName} wiki`}\n\n${summary}\n\nWiki-Workspace: ${record.id}`
			]);
		}
		if ((mergeBase === void 0 ? "1" : await git(repo, [
			"rev-list",
			"--count",
			`${mergeBase}..HEAD`
		]).catch(() => "0")) === "0") throw new LibraryError("nothing-changed", `Nothing in ${record.wiki} has changed yet. Ask the session to write or edit pages first.`, 409);
		const commit = await git(repo, ["rev-parse", "HEAD"]);
		const files = mergeBase === void 0 ? [] : await changedFiles(repo, mergeBase, "HEAD", token);
		const verdict = judge(record.wiki, files);
		const reasons = [...verdict.reasons];
		if (!hasScript) reasons.push("lint did not run");
		if (mergeBase === void 0) reasons.push(`no common history with origin/${base}`);
		const eligible = reasons.length === 0;
		let pr;
		await git(repo, [
			"push",
			"--quiet",
			"-u",
			"origin",
			`HEAD:refs/heads/${record.branch}`
		], token);
		const target = team.provider === "github" ? parseGitHubRemote(team.url, options.githubHost) : void 0;
		if (target === void 0) notes.push(`The branch ${record.branch} is pushed. Pull requests are opened automatically on GitHub only; open this one in your Git host.`);
		else if (token === void 0) notes.push(`The branch ${record.branch} is pushed, but DSH_OKF_GITHUB_TOKEN is not set, so the pull request was not opened. Set it and press Open pull request again.`);
		else {
			const github = new GitHub(options.githubApi, token, target);
			const body = prBody(summary, verdict.pages.map((page) => ({
				path: page.path,
				status: page.status,
				before: page.before === void 0 ? "new" : describeReview(page.before),
				after: page.after === void 0 ? "deleted" : describeReview(page.after)
			})), eligible, reasons, lint, [...stamped.map((path) => `Reset to an unreviewed draft because it was edited: ${path}`), ...notes], record.id);
			const opened = await github.openOrUpdate({
				title: title || record.wikiName,
				body,
				head: record.branch,
				base
			});
			pr = opened;
			if (options.autoMergeLabel !== "") await github.setLabel(opened.number, options.autoMergeLabel, eligible).catch((error) => {
				notes.push(`Could not ${eligible ? "add" : "remove"} the ${options.autoMergeLabel} label: ${error.message}`);
			});
			Object.assign(record, { pr: {
				number: opened.number,
				url: opened.url
			} });
			await save(data);
		}
		pullsCache = void 0;
		return {
			branch: record.branch,
			commit,
			files: files.map((file) => file.path),
			eligible,
			reasons,
			pushed: true,
			...pr === void 0 ? {} : { pr },
			stamped,
			notes
		};
	});
	const attach = async (folder) => {
		const detail = await wiki(folder);
		const data = await load();
		needTeam(data);
		return options.library.put({
			id: `team-${wikiSlug(folder) || "wiki"}`,
			name: detail.wiki.name,
			root: join(canonical(mainDir), ...folder.split("/")),
			origin: { kind: "local" },
			addedAt: data.team?.connectedAt ?? (/* @__PURE__ */ new Date()).toISOString(),
			fetchedAt: data.refreshedAt ?? (/* @__PURE__ */ new Date()).toISOString()
		});
	};
	return {
		status,
		connect,
		refresh,
		wiki,
		pulls,
		create,
		maintain,
		changes,
		openPr,
		attach
	};
}
/**
* The pull request description.
* @param summary - what changed, in a sentence.
* @param pages - each changed page with its review state before and after.
* @param eligible - the auto-merge verdict.
* @param reasons - why it needs a person.
* @param lint - okf.py lint output.
* @param notes - anything the run noticed.
* @param workspace - the maintenance workspace id.
* @returns markdown.
*/
function prBody(summary, pages, eligible, reasons, lint, notes, workspace) {
	return [
		summary,
		"",
		"### Pages",
		"",
		"| Page | Change | Before | After |",
		"|---|---|---|---|",
		...pages.length === 0 ? ["| (none) | | | |"] : pages.map((page) => `| \`${page.path}\` | ${page.status} | ${page.before} | ${page.after} |`),
		"",
		"### Auto-merge",
		"",
		eligible ? "Eligible: lint passed and every page touched was unreviewed. CI re-checks this before merging." : `Needs a person:\n${reasons.map((reason) => `- ${reason}`).join("\n")}`,
		"",
		"Pages written by the agent are unreviewed drafts. To mark a page reviewed, a person adds `verified: [{ by: human:<you>, at: <date> }]`, sets `lifecycle: active` / `status: stable` and a `stale_after` date.",
		...lint === "" ? [] : [
			"",
			"<details><summary>okf.py lint</summary>",
			"",
			"```",
			lint.slice(0, 4e3),
			"```",
			"</details>"
		],
		...notes.length === 0 ? [] : ["", ...notes.map((note) => `> ${note}`)],
		"",
		`<!-- dsh-okf team-wiki workspace=${workspace} eligible=${String(eligible)} -->`
	].join("\n");
}
//#endregion
//#region src/types/okf.ts
/** Route prefix shared by both halves. */
const API_BASE = "/api/okf";
/** Every exact route the Host registers. */
const ROUTES = {
	/** GET: `{ entries, libraryDir }`. */
	library: `${API_BASE}/library`,
	/** POST `FetchRequest`: clone a remote into the library. */
	fetch: `${API_BASE}/fetch`,
	/** POST `{ id }`: pull the latest commit of a git entry. */
	update: `${API_BASE}/update`,
	/** POST `AddLocalRequest`: register a bundle already on disk. */
	addLocal: `${API_BASE}/add-local`,
	/** POST `{ id }`: make a bundle editable in place, in a workspace of its own. */
	editWorkspace: `${API_BASE}/edit-workspace`,
	/** POST `{ id, deleteFiles? }`: forget an entry. */
	remove: `${API_BASE}/remove`,
	/** GET `?id=`: the bundle summary. */
	bundle: `${API_BASE}/bundle`,
	/** GET `?id=&path=`: one page. */
	page: `${API_BASE}/page`,
	/** GET `?sessionId=`: the selection, or null. POST `{ sessionId, bundleId|null }`: set or clear it. */
	session: `${API_BASE}/session`,
	team: `${API_BASE}/team`,
	teamConnect: `${API_BASE}/team/connect`,
	teamRefresh: `${API_BASE}/team/refresh`,
	teamWiki: `${API_BASE}/team/wiki`,
	teamPulls: `${API_BASE}/team/pulls`,
	teamCreate: `${API_BASE}/team/create`,
	teamMaintain: `${API_BASE}/team/maintain`,
	teamChanges: `${API_BASE}/team/changes`,
	teamOpenPr: `${API_BASE}/team/open-pr`,
	teamAttach: `${API_BASE}/team/attach`
};
//#endregion
//#region src/index.ts
/**
* Host half of the OKF bundle plugin.
*
* - Routes (exact Fetch routes on Connection's `/api` channel, so its Host/Origin
*   fence and browser-cookie check run first): list the library, fetch a bundle
*   from a git or Azure DevOps remote, update it, add a local folder, remove an
*   entry, read a bundle's catalog and pages, and get/set the bundle of a session.
* - Team Wiki routes (`/api/okf/team/*`, see `host/team.ts`): the team wiki
*   repository's project wikis with review counts, their open pull requests and
*   auto-merge verdicts, New project wiki, Maintain (a clone on a wiki branch
*   that becomes a DSH Workspace), and Open pull request.
* - A system-prompt context that tells the model which bundle its session uses,
*   where its folder is, and what its catalog holds. The model reads the pages
*   with the Harness's own file tools; this plugin registers none.
*
* `connection` is the only hard dependency. `systemPrompt` is reached through
* `ctx.inject`, so the library and preview keep working even if a Harness build
* does not expose it to an out-of-tree plugin.
*
* Routes use `connection.fetch.register`, not `connection.rpc.handle`: under
* the Harness's strict injection `rpc.handle` throws for an out-of-tree plugin
* (see dsh-claude-usage's README).
*
* @module @local/dsh-okf
*/
/** The Host service this half cannot work without. */
const inject = ["connection"];
/**
* The DSH home folder, as `@deepseek-ai/dsh-home-paths` resolves it without
* config: `$DSH_HOME` (blank means unset), else `~/.dsh`.
* @returns the folder.
*/
function dshHome() {
	const env = process.env.DSH_HOME?.trim();
	return env === void 0 || env === "" ? join(homedir(), ".dsh") : env;
}
/** Headers every answer carries. */
const JSON_HEADERS = {
	"content-type": "application/json",
	"cache-control": "no-store"
};
/**
* A JSON answer.
* @param value - the body.
* @param status - the HTTP status.
* @returns the response.
*/
function json(value, status = 200) {
	return new Response(JSON.stringify(value), {
		status,
		headers: JSON_HEADERS
	});
}
/**
* Turn any failure into an error answer.
* @param error - what was thrown.
* @returns 4xx for a request the library refused or git rejected, 500 otherwise.
*/
function failure(error) {
	if (error instanceof LibraryError) return json({ error: {
		code: error.code,
		message: error.message,
		...error.detail === void 0 ? {} : { detail: error.detail }
	} }, error.status);
	if (error instanceof GitError) return json({ error: {
		code: `git-${error.code}`,
		message: error.message
	} }, 502);
	if (error instanceof RunError) return json({ error: {
		code: "command-failed",
		message: [error.message, error.stdout].filter(Boolean).join("\n").slice(0, 6e3)
	} }, 502);
	if (error instanceof GitHubError) return json({ error: {
		code: `github-${String(error.status)}`,
		message: `GitHub: ${error.message}`
	} }, 502);
	if (error.code === "ENOENT") return json({ error: {
		code: "not-found",
		message: "No such page or folder."
	} }, 404);
	return json({ error: {
		code: "failed",
		message: error instanceof Error ? error.message : String(error)
	} }, 500);
}
/**
* Read a POST body as a JSON object.
* @param request - the request.
* @returns the object.
* @throws {LibraryError} when the body is not a JSON object.
*/
async function body(request) {
	let value;
	try {
		value = await request.json();
	} catch {
		throw new LibraryError("bad-request", "The request body must be JSON.");
	}
	if (typeof value !== "object" || value === null || Array.isArray(value)) throw new LibraryError("bad-request", "The request body must be a JSON object.");
	return value;
}
/**
* Read an optional string field.
* @param record - the body.
* @param key - the field.
* @returns the string, or undefined when absent or blank.
* @throws {LibraryError} when present but not a string.
*/
function optional(record, key) {
	const value = record[key];
	if (value === void 0 || value === null || value === "") return void 0;
	if (typeof value !== "string") throw new LibraryError("bad-request", `"${key}" must be a string.`);
	return value;
}
/**
* Read a required string field.
* @param record - the body or query.
* @param key - the field.
* @returns the string.
* @throws {LibraryError} when missing.
*/
function required(record, key) {
	const value = optional(record, key);
	if (value === void 0 || value.trim() === "") throw new LibraryError("bad-request", `"${key}" is required.`);
	return value;
}
/**
* Wrap a handler with the method check and the error mapping.
* @param methods - allowed methods.
* @param handler - the handler.
* @returns a Fetch handler bound to the library.
*/
function route(methods, handler) {
	return async (request, services) => {
		if (!methods.includes(request.method)) return new Response(null, {
			status: 405,
			headers: { allow: methods.join(", ") }
		});
		try {
			return await handler(request, services);
		} catch (error) {
			return failure(error);
		}
	};
}
/** Every handler, keyed by route path. Exported for the smoke test. */
const handlers = {
	[ROUTES.library]: {
		methods: ["GET"],
		handle: route(["GET"], async (_request, { library }) => {
			await library.refresh();
			return json({
				entries: await library.list(),
				libraryDir: library.dir
			});
		})
	},
	[ROUTES.fetch]: {
		methods: ["POST"],
		handle: route(["POST"], async (request, { library }) => {
			const record = await body(request);
			const wanted = {
				url: required(record, "url"),
				...optionalFields(record, [
					"ref",
					"path",
					"id",
					"name"
				])
			};
			return json({ entry: await library.fetch(wanted) });
		})
	},
	[ROUTES.update]: {
		methods: ["POST"],
		handle: route(["POST"], async (request, { library }) => {
			const record = await body(request);
			return json(await library.update(required(record, "id"), record.force === true));
		})
	},
	[ROUTES.addLocal]: {
		methods: ["POST"],
		handle: route(["POST"], async (request, { library }) => {
			const record = await body(request);
			const wanted = {
				path: required(record, "path"),
				...optionalFields(record, ["id", "name"])
			};
			return json({ entry: await library.addLocal(wanted) });
		})
	},
	[ROUTES.editWorkspace]: {
		methods: ["POST"],
		handle: route(["POST"], async (request, { library }) => {
			const record = await body(request);
			return json(await library.editWorkspace(required(record, "id")));
		})
	},
	[ROUTES.remove]: {
		methods: ["POST"],
		handle: route(["POST"], async (request, { library }) => {
			const record = await body(request);
			await library.remove(required(record, "id"), record.deleteFiles === true);
			return json({ ok: true });
		})
	},
	[ROUTES.bundle]: {
		methods: ["GET"],
		handle: route(["GET"], async (request, { library }) => {
			const query = Object.fromEntries(new URL(request.url).searchParams);
			return json(await summarize(await library.get(required(query, "id"))));
		})
	},
	[ROUTES.page]: {
		methods: ["GET"],
		handle: route(["GET"], async (request, { library }) => {
			const query = Object.fromEntries(new URL(request.url).searchParams);
			const entry = await library.get(required(query, "id"));
			try {
				return json(await readPage(entry, required(query, "path")));
			} catch (error) {
				if (error instanceof Error && error.message.startsWith("Not a markdown page")) throw new LibraryError("bad-path", error.message);
				throw error;
			}
		})
	},
	[ROUTES.session]: {
		methods: ["GET", "POST"],
		handle: route(["GET", "POST"], async (request, { library }) => {
			if (request.method === "GET") {
				const query = Object.fromEntries(new URL(request.url).searchParams);
				return json(await library.getSession(required(query, "sessionId")));
			}
			const record = await body(request);
			const bundleId = record.bundleId;
			if (bundleId !== null && typeof bundleId !== "string") throw new LibraryError("bad-request", "\"bundleId\" must be a string or null.");
			return json(await library.setSession(required(record, "sessionId"), bundleId));
		})
	},
	[ROUTES.team]: {
		methods: ["GET"],
		handle: route(["GET"], async (_request, { team }) => json(await team.status()))
	},
	[ROUTES.teamConnect]: {
		methods: ["POST"],
		handle: route(["POST"], async (request, { team }) => {
			const record = await body(request);
			return json(await team.connect({
				url: required(record, "url"),
				...optionalFields(record, ["ref", "root"])
			}));
		})
	},
	[ROUTES.teamRefresh]: {
		methods: ["POST"],
		handle: route(["POST"], async (_request, { team }) => json(await team.refresh()))
	},
	[ROUTES.teamWiki]: {
		methods: ["GET"],
		handle: route(["GET"], async (request, { team }) => {
			const query = Object.fromEntries(new URL(request.url).searchParams);
			return json(await team.wiki(required(query, "folder")));
		})
	},
	[ROUTES.teamPulls]: {
		methods: ["GET"],
		handle: route(["GET"], async (request, { team }) => json(await team.pulls(new URL(request.url).searchParams.get("refresh") === "1")))
	},
	[ROUTES.teamCreate]: {
		methods: ["POST"],
		handle: route(["POST"], async (request, { team }) => {
			const record = await body(request);
			return json(await team.create({
				name: required(record, "name"),
				...optionalFields(record, ["folder", "template"])
			}));
		})
	},
	[ROUTES.teamMaintain]: {
		methods: ["POST"],
		handle: route(["POST"], async (request, { team }) => {
			const record = await body(request);
			return json(await team.maintain(required(record, "folder")));
		})
	},
	[ROUTES.teamChanges]: {
		methods: ["GET"],
		handle: route(["GET"], async (request, { team }) => {
			const query = Object.fromEntries(new URL(request.url).searchParams);
			return json(await team.changes(required(query, "id")));
		})
	},
	[ROUTES.teamOpenPr]: {
		methods: ["POST"],
		handle: route(["POST"], async (request, { team }) => {
			const record = await body(request);
			return json(await team.openPr(required(record, "id"), optionalFields(record, ["title", "summary"])));
		})
	},
	[ROUTES.teamAttach]: {
		methods: ["POST"],
		handle: route(["POST"], async (request, { team }) => {
			const record = await body(request);
			return json({ entry: await team.attach(required(record, "folder")) });
		})
	}
};
/**
* Copy the optional string fields that are present.
* @param record - the body.
* @param keys - the fields.
* @returns an object holding only the present fields.
*/
function optionalFields(record, keys) {
	const out = {};
	for (const key of keys) {
		const value = optional(record, key);
		if (value !== void 0) out[key] = value;
	}
	return out;
}
/**
* Read a positive number from config.
* @param value - the configured value.
* @param fallback - the default.
* @param name - the key, for the error.
* @returns the number.
* @throws {Error} when set to something that is not a non-negative finite number.
*/
function count(value, fallback, name) {
	if (value === void 0 || value === null) return fallback;
	if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw new Error(`@local/dsh-okf: config.${name} must be a non-negative number`);
	return Math.floor(value);
}
/**
* Register the routes and the prompt context.
* @param ctx - the Host context.
* @param config - the row config.
*/
function apply(ctx, config = {}) {
	const settings = config ?? {};
	const library = openLibrary({
		dir: settings.libraryDir ?? join(dshHome(), "okf"),
		...settings.gitPath === void 0 ? {} : { gitPath: settings.gitPath },
		gitTimeoutMs: count(settings.gitTimeoutMs, 3e5, "gitTimeoutMs")
	});
	const knowledge = {
		indexChars: count(settings.indexChars, 8e3, "indexChars"),
		agentActor: settings.team?.agentActor ?? "dsh/agent"
	};
	const teamRow = settings.team ?? {};
	const services = {
		library,
		team: openTeam({
			dir: join(library.dir, "team"),
			library,
			git: settings.gitPath ?? "git",
			python: teamRow.python ?? (process.platform === "win32" ? "python" : "python3"),
			okfScript: teamRow.okfScript ?? "scripts/okf.py",
			githubHost: teamRow.githubHost ?? "github.com",
			githubApi: teamRow.githubApi ?? "https://api.github.com",
			autoMergeLabel: teamRow.autoMergeLabel ?? "wiki-auto-merge",
			agentActor: teamRow.agentActor ?? "dsh/agent",
			commitAuthor: teamRow.commitAuthor ?? "DSH Wiki <dsh-wiki@users.noreply.github.com>",
			timeoutMs: count(settings.gitTimeoutMs, 3e5, "gitTimeoutMs"),
			...teamRow.url === void 0 || teamRow.url.trim() === "" ? {} : { preset: {
				url: teamRow.url,
				...teamRow.ref === void 0 ? {} : { ref: teamRow.ref },
				...teamRow.root === void 0 ? {} : { root: teamRow.root }
			} }
		})
	};
	for (const [path, handler] of Object.entries(handlers)) ctx.connection.fetch.register({
		path,
		methods: handler.methods,
		requestBody: "buffered",
		fetch: (request) => handler.handle(request, services)
	});
	const cache = new IndexCache(library);
	const refreshCache = () => {
		cache.refresh().catch((error) => {
			console.warn("[okf] index cache refresh failed:", error);
		});
	};
	library.onChange(refreshCache);
	library.refresh().then(refreshCache, (error) => {
		console.warn("[okf] library read failed:", error);
	});
	if (settings.promptContext !== false) ctx.inject(["systemPrompt"], (scope) => {
		scope.systemPrompt.context(sessionContext(library, cache, knowledge));
	});
}
//#endregion
export { apply, discoverWikis, dshHome, handlers, inject, judge, openLibrary, openTeam, parseRemote, readWikiPages, redact, reviewState, stampAgentEdit };
