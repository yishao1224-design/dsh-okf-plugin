import { homedir } from "node:os";
import { basename, isAbsolute, join, relative, resolve, sep } from "node:path";
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { readFileSync, realpathSync, statSync } from "node:fs";
import { randomBytes } from "node:crypto";
//#region src/host/frontmatter.ts
/**
* Read a YAML scalar.
* @param raw - the text after `key:`, trimmed.
* @returns the scalar value.
*/
function scalar(raw) {
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
	return inner.split(",").map((item) => String(scalar(item.trim()) ?? "")).filter((item) => item !== "");
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
			meta[key] = scalar(value);
			continue;
		}
		const items = [];
		let nested = false;
		while (index + 1 < lines.length && /^(\s+|-\s|-$)/.test(lines[index + 1] ?? "")) {
			index += 1;
			const child = lines[index] ?? "";
			const item = /^\s*-\s+(.*)$/.exec(child);
			if (item !== null && !/^[A-Za-z_][\w-]*\s*:/.test(item[1] ?? "") && !/^\s{4,}/.test(child)) items.push(String(scalar(item[1] ?? "") ?? ""));
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
	const origin = entry.origin.kind === "git" ? entry.workspace === void 0 ? `a local mirror of ${entry.origin.url}${entry.origin.path === "" ? "" : ` (folder ${entry.origin.path})`}${entry.origin.commit === void 0 ? "" : ` at commit ${entry.origin.commit.slice(0, 12)}`}; edits to it are overwritten by the next update` : `a git clone of ${entry.origin.url}${entry.origin.path === "" ? "" : ` (folder ${entry.origin.path})`}, being edited; its workspace is ${entry.workspace}` : editable ? "a git working copy in this session's workspace" : "a folder on this machine";
	const editing = editable ? EDIT_RULES : entry.workspace === void 0 ? ["- Do not edit files in the bundle."] : [`- Do not edit the bundle from this session. It is edited from its own workspace, ${entry.workspace}; if the user wants changes, tell them to open that workspace (OKF dialog → Open editing workspace).`];
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
	session: `${API_BASE}/session`
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
	return async (request, library) => {
		if (!methods.includes(request.method)) return new Response(null, {
			status: 405,
			headers: { allow: methods.join(", ") }
		});
		try {
			return await handler(request, library);
		} catch (error) {
			return failure(error);
		}
	};
}
/** Every handler, keyed by route path. Exported for the smoke test. */
const handlers = {
	[ROUTES.library]: {
		methods: ["GET"],
		handle: route(["GET"], async (_request, library) => {
			await library.refresh();
			return json({
				entries: await library.list(),
				libraryDir: library.dir
			});
		})
	},
	[ROUTES.fetch]: {
		methods: ["POST"],
		handle: route(["POST"], async (request, library) => {
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
		handle: route(["POST"], async (request, library) => {
			const record = await body(request);
			return json(await library.update(required(record, "id"), record.force === true));
		})
	},
	[ROUTES.addLocal]: {
		methods: ["POST"],
		handle: route(["POST"], async (request, library) => {
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
		handle: route(["POST"], async (request, library) => {
			const record = await body(request);
			return json(await library.editWorkspace(required(record, "id")));
		})
	},
	[ROUTES.remove]: {
		methods: ["POST"],
		handle: route(["POST"], async (request, library) => {
			const record = await body(request);
			await library.remove(required(record, "id"), record.deleteFiles === true);
			return json({ ok: true });
		})
	},
	[ROUTES.bundle]: {
		methods: ["GET"],
		handle: route(["GET"], async (request, library) => {
			const query = Object.fromEntries(new URL(request.url).searchParams);
			return json(await summarize(await library.get(required(query, "id"))));
		})
	},
	[ROUTES.page]: {
		methods: ["GET"],
		handle: route(["GET"], async (request, library) => {
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
		handle: route(["GET", "POST"], async (request, library) => {
			if (request.method === "GET") {
				const query = Object.fromEntries(new URL(request.url).searchParams);
				return json(await library.getSession(required(query, "sessionId")));
			}
			const record = await body(request);
			const bundleId = record.bundleId;
			if (bundleId !== null && typeof bundleId !== "string") throw new LibraryError("bad-request", "\"bundleId\" must be a string or null.");
			return json(await library.setSession(required(record, "sessionId"), bundleId));
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
	const knowledge = { indexChars: count(settings.indexChars, 8e3, "indexChars") };
	for (const [path, handler] of Object.entries(handlers)) ctx.connection.fetch.register({
		path,
		methods: handler.methods,
		requestBody: "buffered",
		fetch: (request) => handler.handle(request, library)
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
export { apply, dshHome, handlers, inject, parseRemote, redact };
