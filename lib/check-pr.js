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
//#region src/check-pr.ts
/**
* CI check for an agent's team wiki pull request: may it auto-merge?
*
* Runs in the wiki repository's workflow (examples/wiki-auto-merge.yml):
*
*     node check-pr.js <base-ref> [head-ref=HEAD] [wiki-root=okf]
*
* `wiki-root` is the folder holding the project wikis. The project wiki a
* change belongs to is the folder directly under it that holds a SCHEMA.md
* (on either side of the change), or the root itself when it is a bundle.
* A pull request must touch exactly one project wiki.
*
* Exit 0: eligible (only unreviewed pages, new captures, index.md/log.md).
* Exit 1: needs a person; the reasons are printed. Exit 2: usage or git error.
* When `GITHUB_OUTPUT` is set, writes `wiki=<folder>` there so the workflow
* lints that project wiki. The verdict is recomputed from git here, never read
* from the label the agent set. Node built-ins only.
*/
const [baseRef, headRef = "HEAD", rootArg = "okf"] = process.argv.slice(2);
if (baseRef === void 0) {
	console.error("usage: node check-pr.js <base-ref> [head-ref=HEAD] [wiki-root=okf]");
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
	const rootIsWiki = existsAt(refs, `${prefix}SCHEMA.md`);
	const wikiOf = (path) => {
		if (!path.startsWith(prefix)) return void 0;
		const first = path.slice(prefix.length).split("/");
		if (first.length > 1 && existsAt(refs, `${prefix}${first[0] ?? ""}/SCHEMA.md`)) return `${prefix}${first[0] ?? ""}`;
		return rootIsWiki ? root : void 0;
	};
	const wikis = [...new Set(files.map((file) => wikiOf(file.path)).filter((wiki) => wiki !== void 0))];
	const wiki = wikis.length === 1 ? wikis[0] ?? root : root;
	if (process.env.GITHUB_OUTPUT !== void 0 && process.env.GITHUB_OUTPUT !== "") appendFileSync(process.env.GITHUB_OUTPUT, `wiki=${wiki}\n`);
	const verdict = judge(wiki, files);
	if (wikis.length === 0) verdict.reasons.push(`touches no project wiki under ${root || "the repository root"}`);
	if (wikis.length > 1) verdict.reasons.push(`touches ${String(wikis.length)} project wikis: ${wikis.join(", ")}`);
	console.log(`project wiki: ${wiki}`);
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
