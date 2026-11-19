import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
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
* In a team wiki hub, `published/` (pages rendered for people and synced to
* the Azure DevOps wiki) and `AGENTS.md` (the project registry) always need a
* person too.
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
	const published = files.filter((file) => file.path.startsWith("published/")).map((file) => file.path);
	if (published.length > 0) {
		const shown = published.slice(0, 3).join(", ");
		reasons.push(`changes ${published.length === 1 ? "the published page" : `${String(published.length)} published pages`} (${shown}${published.length > 3 ? ", …" : ""}); pages published for people are reviewed by a person`);
	}
	for (const file of files) {
		if (file.path.startsWith("published/")) continue;
		if (file.path === "AGENTS.md") {
			reasons.push("changes AGENTS.md, the project registry");
			continue;
		}
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
//#region src/host/publish.ts
/**
* A page or folder name as an Azure DevOps wiki file name.
* @param title - the title shown in the wiki.
* @returns the name (without `.md`).
*/
function adoName(title) {
	return (title.replace(/[\\/#\r\n\t]/g, " ").replace(/\s+/g, " ").trim().replace(/^\.+/, "") || "Untitled").replace(/%/g, "%25").replace(/[:<>*?|"-]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`).replace(/ /g, "-");
}
/**
* The project a `published/Projects/…` path belongs to, as its file name.
* @param path - hub-relative.
* @returns the encoded project name, or undefined.
*/
function publishedProject(path) {
	return /^published\/Projects\/([^/]+?)(?:\.md$|\/)/.exec(path)?.[1];
}
//#endregion
//#region src/host/registry.ts
const COLUMNS = {
	project: /^(project|name|project name)$/,
	bundle: /^(bundle|bundle dir|bundle directory|bundle folder|directory|folder|path|wiki)$/,
	repo: /^(repo|repository|repo url|code|code repo)$/,
	summary: /^(summary|description|about)$/,
	owner: /^(owner|owners|maintainer|contact)$/
};
/**
* Split a table row into cells.
* @param line - `| a | b |`.
* @returns the trimmed cells.
*/
function cells(line) {
	return line.trim().replace(/^\|/, "").replace(/\|$/, "").split(/(?<!\\)\|/).map((cell) => cell.trim().replace(/\\\|/g, "|"));
}
/**
* A cell as plain text: backticks dropped, a link reduced to its target or text.
* @param cell - the cell.
* @param preferUrl - take a link's URL rather than its text.
* @returns the text.
*/
function plain(cell, preferUrl = false) {
	const link = /\[([^\]]*)\]\(([^)\s]+)\)/.exec(cell);
	return (link === null ? cell : preferUrl ? link[2] ?? "" : cell.replace(link[0], link[1] ?? "")).replace(/`/g, "").replace(/<([^>]+)>/g, "$1").trim();
}
/**
* Normalize a bundle folder.
* @param value - as written.
* @returns `a/b`, or '' when it names the repository root or is unsafe.
*/
function cleanBundle(value) {
	const path = value.replace(/\\/g, "/").replace(/^\.?\//, "").replace(/\/+$/, "").trim();
	if (path === "." || path.split("/").some((part) => part === ".." || part === "")) return "";
	return path;
}
/**
* Parse the registry out of AGENTS.md.
* @param source - the file.
* @returns the registry, or undefined when the file has no registry table.
*/
function parseRegistry(source) {
	const lines = source.split(/\r?\n/);
	for (let index = 0; index + 1 < lines.length; index += 1) {
		const header = lines[index] ?? "";
		const rule = lines[index + 1] ?? "";
		if (!header.trim().startsWith("|") || !/^\s*\|?\s*:?-{3,}/.test(rule)) continue;
		const names = cells(header).map((name) => plain(name).toLowerCase());
		const column = (key) => names.findIndex((name) => COLUMNS[key].test(name));
		const at = {
			project: column("project"),
			bundle: column("bundle"),
			repo: column("repo"),
			summary: column("summary"),
			owner: column("owner")
		};
		if (at.project < 0 || at.bundle < 0) continue;
		const entries = [];
		let line = index + 2;
		for (; line < lines.length && (lines[line] ?? "").trim().startsWith("|"); line += 1) {
			const row = cells(lines[line] ?? "");
			const project = plain(row[at.project] ?? "");
			const bundle = cleanBundle(plain(row[at.bundle] ?? ""));
			if (project === "" || bundle === "") continue;
			const optional = (key) => {
				const value = at[key] < 0 ? "" : plain(row[at[key]] ?? "", key === "repo");
				return value === "" || value === "-" || value === "—" ? void 0 : value;
			};
			const repo = optional("repo");
			const summary = optional("summary");
			const owner = optional("owner");
			entries.push({
				project,
				bundle,
				...repo === void 0 ? {} : { repo },
				...summary === void 0 ? {} : { summary },
				...owner === void 0 ? {} : { owner }
			});
		}
		return {
			entries,
			endLine: line
		};
	}
}
//#endregion
//#region src/check-pr.ts
/**
* CI check for an agent's team wiki pull request: may it auto-merge?
*
* Runs in the wiki repository's workflow (examples/wiki-auto-merge.yml):
*
*     node check-pr.js <base-ref> [head-ref=HEAD] [wiki-root]
*
* The project a change belongs to comes from the hub's AGENTS.md registry
* (its Bundle column; `published/Projects/<Project>/` belongs to that project
* too), on either side of the change. Without a registry, it is the folder
* directly under `wiki-root` (default: the repository root) that holds a
* SCHEMA.md, or `wiki-root` itself when it is a bundle. A pull request must
* touch exactly one project. Changes to `published/` and `AGENTS.md` always
* need a person.
*
* Exit 0: eligible (only unreviewed pages, new captures, index.md/log.md).
* Exit 1: needs a person; the reasons are printed. Exit 2: usage or git error.
* When `GITHUB_OUTPUT` is set, writes `wiki=<folder>` there so the workflow
* lints that project wiki. The verdict is recomputed from git here, never read
* from the label the agent set. Node built-ins only.
*/
const [baseRef, headRef = "HEAD", rootArg = ""] = process.argv.slice(2);
if (baseRef === void 0) {
	console.error("usage: node check-pr.js <base-ref> [head-ref=HEAD] [wiki-root]");
	process.exit(2);
}
const root = rootArg.replace(/\\/g, "/").replace(/^\.\/|\/$/g, "");
/**
* Run git.
* @param args - arguments.
* @returns stdout.
*/
function git(...args) {
	return execFileSync("git", args, {
		encoding: "utf8",
		maxBuffer: 67108864,
		stdio: [
			"ignore",
			"pipe",
			"pipe"
		]
	});
}
/**
* A file at a ref, or undefined.
* @param ref - the commit.
* @param path - the path.
* @returns the text.
*/
function show(ref, path) {
	try {
		return git("show", `${ref}:${path}`);
	} catch {
		return;
	}
}
/**
* Whether a file exists at either ref.
* @param refs - the commits.
* @param path - the path.
* @returns true when one has it.
*/
function existsAt(refs, path) {
	return refs.some((ref) => {
		try {
			git("cat-file", "-e", `${ref}:${path}`);
			return true;
		} catch {
			return false;
		}
	});
}
try {
	const mergeBase = git("merge-base", baseRef, headRef).trim();
	const parts = git("diff", "--name-status", "--no-renames", "-z", mergeBase, headRef).split("\0");
	const files = [];
	for (let index = 0; index + 1 < parts.length; index += 2) {
		const code = parts[index] ?? "";
		const path = parts[index + 1] ?? "";
		const status = code.startsWith("A") ? "added" : code.startsWith("D") ? "deleted" : "modified";
		const before = status === "added" ? void 0 : show(mergeBase, path);
		const after = status === "deleted" ? void 0 : show(headRef, path);
		files.push({
			path,
			status,
			...before === void 0 ? {} : { before },
			...after === void 0 ? {} : { after }
		});
	}
	const refs = [mergeBase, headRef];
	const prefix = root === "" ? "" : `${root}/`;
	const registry = [...parseRegistry(show(mergeBase, "AGENTS.md") ?? "")?.entries ?? [], ...parseRegistry(show(headRef, "AGENTS.md") ?? "")?.entries ?? []];
	const added = files.filter((file) => file.status === "added" && file.path.endsWith("/SCHEMA.md")).map((file) => file.path.slice(0, -10));
	const rootIsWiki = registry.length === 0 && existsAt(refs, `${prefix}SCHEMA.md`);
	const slug = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
	const wikiOf = (path) => {
		const published = publishedProject(path);
		if (published !== void 0) return registry.find((entry) => adoName(entry.project) === published || slug(entry.project) === slug(published))?.bundle;
		const match = [...registry.map((entry) => entry.bundle), ...added].sort((a, b) => b.length - a.length).find((folder) => path.startsWith(`${folder}/`));
		if (match !== void 0 || registry.length > 0) return match;
		if (!path.startsWith(prefix)) return void 0;
		const first = path.slice(prefix.length).split("/");
		if (first.length > 1 && existsAt(refs, `${prefix}${first[0] ?? ""}/SCHEMA.md`)) return `${prefix}${first[0] ?? ""}`;
		return rootIsWiki ? root : void 0;
	};
	const wikis = [...new Set(files.map((file) => wikiOf(file.path)).filter((wiki) => wiki !== void 0))];
	const wiki = wikis.length === 1 ? wikis[0] ?? "" : "";
	if (process.env.GITHUB_OUTPUT !== void 0 && process.env.GITHUB_OUTPUT !== "") appendFileSync(process.env.GITHUB_OUTPUT, `wiki=${wiki}\n`);
	const verdict = judge(wiki, files);
	if (wikis.length === 0) verdict.reasons.push(`touches no project wiki under ${root || "the repository root"}`);
	if (wikis.length > 1) verdict.reasons.push(`touches ${String(wikis.length)} project wikis: ${wikis.join(", ")}`);
	console.log(`project wiki: ${wiki || "(none)"}`);
	for (const page of verdict.pages) console.log(`${page.status.padEnd(8)} ${page.path}  [${page.before === void 0 ? "new" : describeReview(page.before)} → ${page.after === void 0 ? "deleted" : describeReview(page.after)}]`);
	if (verdict.reasons.length === 0) {
		console.log("eligible for auto-merge");
		process.exit(0);
	}
	console.log("needs a human review:");
	for (const reason of verdict.reasons) console.log(`- ${reason}`);
	process.exit(1);
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(2);
}
//#endregion
export {};
