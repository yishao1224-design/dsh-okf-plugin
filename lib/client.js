window.__ModuleLoader__.load({
	id: "@local/dsh-okf",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/styles.ts
		const feedback = "background-color 120ms ease, border-color 120ms ease, color 120ms ease, transform 90ms ease";
		const mono = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
		const table = {
			chip: {
				display: "inline-flex",
				alignItems: "center",
				gap: 5,
				height: 26,
				maxWidth: 200,
				padding: "0 9px",
				borderWidth: .5,
				borderStyle: "solid",
				borderColor: "var(--dsw-alias-border-l3)",
				borderRadius: 7,
				background: "transparent",
				color: "var(--dsw-alias-label-secondary)",
				font: "inherit",
				fontSize: 12,
				lineHeight: 1,
				whiteSpace: "nowrap",
				cursor: "pointer",
				userSelect: "none",
				transition: feedback
			},
			chipActive: {
				color: "var(--dsw-alias-label-primary)",
				borderColor: "var(--dsw-alias-brand-primary)"
			},
			chipCompact: {
				height: 28,
				maxWidth: 160,
				borderColor: "transparent",
				borderRadius: 8,
				padding: "0 8px"
			},
			chipText: {
				overflow: "hidden",
				textOverflow: "ellipsis"
			},
			hover: {
				background: "var(--dsw-alias-interactive-bg-hover)",
				color: "var(--dsw-alias-label-primary)"
			},
			pressed: {
				background: "var(--dsw-alias-interactive-bg-active)",
				transform: "scale(0.97)"
			},
			backdrop: {
				position: "fixed",
				inset: 0,
				zIndex: 1e3,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				padding: 16,
				background: "rgb(0 0 0 / 0.36)",
				pointerEvents: "auto",
				fontFamily: "inherit"
			},
			dialog: {
				display: "flex",
				flexDirection: "column",
				width: "min(1180px, 100%)",
				height: "min(820px, 100%)",
				border: "0.5px solid var(--dsw-alias-border-l3)",
				borderRadius: 14,
				overflow: "hidden",
				background: "var(--dsw-alias-bg-base)",
				color: "var(--dsw-alias-label-primary)",
				boxShadow: "0 16px 48px rgb(0 0 0 / 0.28)",
				fontSize: 13
			},
			header: {
				display: "flex",
				alignItems: "center",
				gap: 12,
				flexWrap: "wrap",
				padding: "12px 16px",
				borderBottom: "0.5px solid var(--dsw-alias-border-l3)"
			},
			title: {
				margin: 0,
				fontSize: 15,
				fontWeight: 600,
				flex: "none"
			},
			sessionBar: {
				display: "flex",
				alignItems: "center",
				gap: 8,
				flex: 1,
				minWidth: 240,
				flexWrap: "wrap"
			},
			muted: {
				color: "var(--dsw-alias-label-tertiary)",
				fontSize: 12
			},
			secondary: { color: "var(--dsw-alias-label-secondary)" },
			body: {
				display: "flex",
				flex: 1,
				minHeight: 0
			},
			side: {
				display: "flex",
				flexDirection: "column",
				width: 300,
				flex: "none",
				minHeight: 0,
				borderRight: "0.5px solid var(--dsw-alias-border-l3)",
				background: "var(--dsw-alias-bg-layer-1, transparent)"
			},
			sideScroll: {
				flex: 1,
				overflowY: "auto",
				padding: 10
			},
			sectionTitle: {
				margin: "4px 4px 8px",
				fontSize: 11,
				fontWeight: 600,
				letterSpacing: .4,
				textTransform: "uppercase",
				color: "var(--dsw-alias-label-tertiary)"
			},
			main: {
				flex: 1,
				minWidth: 0,
				display: "flex",
				flexDirection: "column",
				minHeight: 0
			},
			mainScroll: {
				flex: 1,
				overflowY: "auto",
				padding: "14px 18px 24px"
			},
			entry: {
				display: "block",
				width: "100%",
				textAlign: "left",
				padding: "8px 10px",
				marginBottom: 4,
				borderWidth: .5,
				borderStyle: "solid",
				borderColor: "transparent",
				borderRadius: 8,
				background: "transparent",
				color: "inherit",
				font: "inherit",
				cursor: "pointer",
				transition: feedback
			},
			entrySelected: {
				borderColor: "var(--dsw-alias-border-l2)",
				background: "var(--dsw-alias-interactive-bg-active)"
			},
			entryName: {
				display: "flex",
				alignItems: "center",
				gap: 6,
				fontWeight: 600,
				overflow: "hidden",
				textOverflow: "ellipsis",
				whiteSpace: "nowrap"
			},
			entryMeta: {
				marginTop: 3,
				fontSize: 11,
				color: "var(--dsw-alias-label-tertiary)",
				overflow: "hidden",
				textOverflow: "ellipsis",
				whiteSpace: "nowrap"
			},
			badge: {
				display: "inline-block",
				flex: "none",
				padding: "1px 6px",
				borderRadius: 9,
				fontSize: 10,
				fontWeight: 500,
				border: "0.5px solid var(--dsw-alias-border-l3)",
				color: "var(--dsw-alias-label-secondary)"
			},
			badgeBrand: {
				borderColor: "var(--dsw-alias-brand-primary)",
				color: "var(--dsw-alias-brand-primary)"
			},
			badgeWarn: {
				borderColor: "var(--dsw-alias-state-warn-primary)",
				color: "var(--dsw-alias-state-warn-primary)"
			},
			badgeError: {
				borderColor: "var(--dsw-alias-state-error-primary)",
				color: "var(--dsw-alias-state-error-primary)"
			},
			badgeOk: {
				borderColor: "var(--dsw-alias-state-success-primary)",
				color: "var(--dsw-alias-state-success-primary)"
			},
			button: {
				display: "inline-flex",
				alignItems: "center",
				justifyContent: "center",
				gap: 4,
				minHeight: 28,
				padding: "3px 10px",
				borderWidth: .5,
				borderStyle: "solid",
				borderColor: "var(--dsw-alias-border-l3)",
				borderRadius: 7,
				background: "transparent",
				color: "var(--dsw-alias-label-primary)",
				font: "inherit",
				fontSize: 12,
				whiteSpace: "nowrap",
				cursor: "pointer",
				userSelect: "none",
				transition: feedback
			},
			buttonPrimary: {
				background: "var(--dsw-alias-brand-primary)",
				borderColor: "var(--dsw-alias-brand-primary)",
				color: "var(--dsw-alias-bg-base)"
			},
			buttonDanger: { color: "var(--dsw-alias-state-error-primary)" },
			disabled: {
				opacity: .45,
				cursor: "not-allowed",
				transform: "none"
			},
			iconButton: {
				minWidth: 28,
				padding: "3px 6px"
			},
			row: {
				display: "flex",
				alignItems: "center",
				gap: 6,
				flexWrap: "wrap"
			},
			input: {
				width: "100%",
				boxSizing: "border-box",
				minHeight: 30,
				padding: "5px 9px",
				border: "0.5px solid var(--dsw-alias-border-l2)",
				borderRadius: 7,
				outline: "none",
				background: "var(--dsw-alias-bg-base)",
				color: "var(--dsw-alias-label-primary)",
				font: "inherit",
				fontSize: 12
			},
			select: {
				minHeight: 28,
				maxWidth: 320,
				padding: "3px 8px",
				border: "0.5px solid var(--dsw-alias-border-l2)",
				borderRadius: 7,
				background: "var(--dsw-alias-bg-base)",
				color: "var(--dsw-alias-label-primary)",
				font: "inherit",
				fontSize: 12
			},
			label: {
				display: "block",
				margin: "8px 0 4px",
				fontSize: 11,
				color: "var(--dsw-alias-label-secondary)"
			},
			form: {
				marginTop: 10,
				padding: 10,
				border: "0.5px solid var(--dsw-alias-border-l3)",
				borderRadius: 10
			},
			tabs: {
				display: "flex",
				gap: 4,
				marginBottom: 4
			},
			tab: { flex: 1 },
			tabActive: {
				borderColor: "var(--dsw-alias-brand-primary)",
				color: "var(--dsw-alias-brand-primary)"
			},
			note: {
				margin: "6px 0 0",
				fontSize: 11,
				lineHeight: 1.45,
				color: "var(--dsw-alias-label-tertiary)",
				overflowWrap: "anywhere"
			},
			error: {
				margin: "8px 0 0",
				padding: "6px 8px",
				borderRadius: 7,
				fontSize: 12,
				whiteSpace: "pre-wrap",
				overflowWrap: "anywhere",
				color: "var(--dsw-alias-state-error-primary)",
				border: "0.5px solid var(--dsw-alias-state-error-primary)"
			},
			success: {
				margin: "8px 0 0",
				fontSize: 12,
				color: "var(--dsw-alias-state-success-primary)"
			},
			candidate: {
				fontFamily: mono,
				fontSize: 11
			},
			previewHead: {
				display: "flex",
				flexDirection: "column",
				gap: 6,
				paddingBottom: 12,
				marginBottom: 12,
				borderBottom: "0.5px solid var(--dsw-alias-border-l3)"
			},
			previewTitle: {
				margin: 0,
				fontSize: 17,
				fontWeight: 600,
				overflowWrap: "anywhere"
			},
			stats: {
				display: "flex",
				gap: 6,
				flexWrap: "wrap"
			},
			group: {
				margin: "14px 0 6px",
				fontSize: 11,
				fontWeight: 600,
				letterSpacing: .4,
				textTransform: "uppercase",
				color: "var(--dsw-alias-label-tertiary)"
			},
			pageRow: {
				display: "block",
				width: "100%",
				textAlign: "left",
				padding: "7px 9px",
				borderRadius: 7,
				border: "none",
				background: "transparent",
				color: "inherit",
				font: "inherit",
				cursor: "pointer",
				transition: feedback
			},
			pageTitle: {
				display: "flex",
				alignItems: "center",
				gap: 6,
				flexWrap: "wrap",
				fontWeight: 500
			},
			pageDesc: {
				marginTop: 2,
				fontSize: 12,
				color: "var(--dsw-alias-label-secondary)",
				lineHeight: 1.4
			},
			pagePath: {
				fontFamily: mono,
				fontSize: 11,
				color: "var(--dsw-alias-label-tertiary)"
			},
			metaTable: {
				width: "100%",
				borderCollapse: "collapse",
				margin: "8px 0 16px",
				fontSize: 12
			},
			metaKey: {
				width: 140,
				padding: "3px 8px 3px 0",
				verticalAlign: "top",
				color: "var(--dsw-alias-label-tertiary)",
				fontFamily: mono,
				fontSize: 11
			},
			metaValue: {
				padding: "3px 0",
				verticalAlign: "top",
				overflowWrap: "anywhere",
				fontFamily: mono,
				fontSize: 11,
				whiteSpace: "pre-wrap"
			},
			empty: {
				padding: "40px 12px",
				textAlign: "center",
				color: "var(--dsw-alias-label-tertiary)"
			},
			markdown: {
				lineHeight: 1.6,
				fontSize: 13.5,
				overflowWrap: "anywhere"
			},
			mdHeading: {
				margin: "18px 0 8px",
				fontWeight: 600,
				lineHeight: 1.3
			},
			mdParagraph: { margin: "0 0 10px" },
			mdCode: {
				padding: "1px 5px",
				borderRadius: 4,
				background: "var(--dsw-alias-interactive-bg-hover)",
				fontFamily: mono,
				fontSize: "0.9em"
			},
			mdPre: {
				margin: "0 0 12px",
				padding: "10px 12px",
				borderRadius: 8,
				overflowX: "auto",
				background: "var(--dsw-alias-interactive-bg-hover)",
				fontFamily: mono,
				fontSize: 12,
				lineHeight: 1.5
			},
			mdQuote: {
				margin: "0 0 12px",
				padding: "2px 12px",
				borderLeft: "3px solid var(--dsw-alias-border-l2)",
				color: "var(--dsw-alias-label-secondary)"
			},
			mdList: {
				margin: "0 0 10px",
				paddingLeft: 22
			},
			mdItem: { margin: "2px 0" },
			mdRule: {
				margin: "16px 0",
				border: "none",
				borderTop: "0.5px solid var(--dsw-alias-border-l3)"
			},
			mdLink: {
				color: "var(--dsw-alias-link)",
				textDecoration: "none",
				cursor: "pointer"
			},
			mdTableWrap: {
				margin: "0 0 12px",
				overflowX: "auto"
			},
			mdTable: {
				borderCollapse: "collapse",
				fontSize: 12.5
			},
			mdCell: {
				padding: "5px 9px",
				border: "0.5px solid var(--dsw-alias-border-l3)",
				verticalAlign: "top"
			},
			mdHeadCell: {
				fontWeight: 600,
				background: "var(--dsw-alias-interactive-bg-hover)"
			}
		};
		/**
		* Read one style by name.
		* @param name - a key of this module's table.
		* @returns the style object.
		* @throws {Error} when the name is missing, which is a build-time mistake.
		*/
		function st(name) {
			const style = table[name];
			if (style === void 0) throw new Error(`okf: no style named ${JSON.stringify(name)}`);
			return style;
		}
		/**
		* Merge several named styles, skipping falsy names.
		* @param names - style names, or false/undefined to skip.
		* @returns the merged style.
		*/
		function sx(...names) {
			return Object.assign({}, ...names.filter((name) => typeof name === "string").map(st));
		}
		//#endregion
		//#region src/client/markdown.tsx
		/**
		* A small markdown renderer that builds React elements directly.
		*
		* Bundles come from remote repositories, so their text is untrusted. Building
		* elements (never `innerHTML`) means raw HTML in a page renders as text and
		* cannot run script. Links are limited to http(s) and mailto; any other href
		* is shown as text. Bundle links (`/concepts/foo.md`, `../entities/bar.md`)
		* are handed to `onBundleLink` so the preview can open the page in place.
		*
		* Covers what OKF pages use: ATX headings, paragraphs, emphasis, inline code,
		* fenced code, block quotes, nested lists, GFM tables, rules, links, images
		* (shown as links: the preview loads no remote content).
		*/
		/**
		* Resolve a link found in a page to a bundle-relative path.
		* @param href - the link target.
		* @param pagePath - the page holding the link.
		* @returns the bundle path, or undefined when the link leaves the bundle or is not a page.
		*/
		function bundleTarget(href, pagePath) {
			if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("//") || href.startsWith("#")) return void 0;
			const target = href.split("#")[0]?.split("?")[0] ?? "";
			if (!target.toLowerCase().endsWith(".md")) return void 0;
			const base = target.startsWith("/") ? [] : pagePath.split("/").slice(0, -1);
			for (const part of target.split("/")) {
				if (part === "" || part === ".") continue;
				if (part === "..") {
					if (base.length === 0) return void 0;
					base.pop();
				} else base.push(decodeURIComponent(part));
			}
			return base.join("/");
		}
		/**
		* Whether an external href is safe to open.
		* @param href - the target.
		* @returns true for http(s) and mailto.
		*/
		function safeExternal(href) {
			return /^(https?:|mailto:)/i.test(href);
		}
		let keySeed = 0;
		/** @returns a fresh element key. */
		const key = () => `m${String(keySeed += 1)}`;
		/**
		* Render inline markdown.
		* @param text - one paragraph's text.
		* @param options - link handling.
		* @returns the nodes.
		*/
		function inline(text, options) {
			const nodes = [];
			const pattern = /(`+)([\s\S]*?[^`])\1(?!`)|!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)|\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)|<(https?:\/\/[^>\s]+)>|\*\*([^*]+?)\*\*|__([^_]+?)__|\*([^*\s][^*]*?)\*|(?<![\w])_([^_\s][^_]*?)_(?![\w])|~~([^~]+?)~~/g;
			let last = 0;
			for (const match of text.matchAll(pattern)) {
				const at = match.index ?? 0;
				if (at > last) nodes.push(text.slice(last, at));
				last = at + match[0].length;
				if (match[2] !== void 0) nodes.push((0, react.createElement)("code", {
					key: key(),
					style: st("mdCode")
				}, match[2].trim()));
				else if (match[4] !== void 0) nodes.push(link(match[4], `🖼 ${match[3] || match[4]}`, options));
				else if (match[6] !== void 0) nodes.push(link(match[6], inline(match[5] ?? "", options), options));
				else if (match[7] !== void 0) nodes.push(link(match[7], match[7], options));
				else if (match[8] !== void 0 || match[9] !== void 0) nodes.push((0, react.createElement)("strong", { key: key() }, inline(match[8] ?? match[9] ?? "", options)));
				else if (match[10] !== void 0 || match[11] !== void 0) nodes.push((0, react.createElement)("em", { key: key() }, inline(match[10] ?? match[11] ?? "", options)));
				else if (match[12] !== void 0) nodes.push((0, react.createElement)("del", { key: key() }, inline(match[12], options)));
			}
			if (last < text.length) nodes.push(text.slice(last));
			return nodes;
		}
		/**
		* One link.
		* @param href - the target.
		* @param label - what to show.
		* @param options - link handling.
		* @returns a bundle link, an external link, or plain text.
		*/
		function link(href, label, options) {
			const target = bundleTarget(href, options.pagePath);
			if (target !== void 0) return (0, react.createElement)("a", {
				key: key(),
				href: "#",
				style: st("mdLink"),
				title: target,
				onClick: (event) => {
					event.preventDefault();
					options.onBundleLink(target);
				}
			}, label);
			if (safeExternal(href)) return (0, react.createElement)("a", {
				key: key(),
				href,
				target: "_blank",
				rel: "noopener noreferrer",
				style: st("mdLink")
			}, label);
			return (0, react.createElement)("span", {
				key: key(),
				title: href
			}, label);
		}
		/**
		* Split a table row into cells.
		* @param line - `| a | b |`.
		* @returns the cell texts.
		*/
		function cells(line) {
			return line.trim().replace(/^\|/, "").replace(/\|$/, "").split(/(?<!\\)\|/).map((cell) => cell.trim().replace(/\\\|/g, "|"));
		}
		/**
		* Render block markdown.
		* @param source - the markdown.
		* @param options - link handling.
		* @returns the nodes.
		*/
		function renderMarkdown(source, options) {
			const lines = source.replace(/\r\n?/g, "\n").split("\n");
			const out = [];
			let index = 0;
			const isBlank = (line) => line === void 0 || line.trim() === "";
			const listMarker = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/;
			while (index < lines.length) {
				const line = lines[index] ?? "";
				if (isBlank(line)) {
					index += 1;
					continue;
				}
				const fence = /^\s*(```+|~~~+)\s*([\w+-]*)/.exec(line);
				if (fence !== null) {
					const close = fence[1] ?? "```";
					const code = [];
					index += 1;
					while (index < lines.length && !(lines[index] ?? "").trim().startsWith(close)) {
						code.push(lines[index] ?? "");
						index += 1;
					}
					index += 1;
					out.push((0, react.createElement)("pre", {
						key: key(),
						style: st("mdPre")
					}, (0, react.createElement)("code", null, code.join("\n"))));
					continue;
				}
				const heading = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
				if (heading !== null) {
					const level = (heading[1] ?? "#").length;
					const style = {
						...st("mdHeading"),
						fontSize: [
							20,
							17,
							15,
							14,
							13,
							13
						][level - 1]
					};
					out.push((0, react.createElement)(`h${String(level)}`, {
						key: key(),
						style
					}, inline(heading[2] ?? "", options)));
					index += 1;
					continue;
				}
				if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
					out.push((0, react.createElement)("hr", {
						key: key(),
						style: st("mdRule")
					}));
					index += 1;
					continue;
				}
				if (/^\s*>/.test(line)) {
					const quote = [];
					while (index < lines.length && /^\s*>/.test(lines[index] ?? "")) {
						quote.push((lines[index] ?? "").replace(/^\s*>\s?/, ""));
						index += 1;
					}
					out.push((0, react.createElement)("blockquote", {
						key: key(),
						style: st("mdQuote")
					}, renderMarkdown(quote.join("\n"), options)));
					continue;
				}
				if (line.includes("|") && /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(lines[index + 1] ?? "")) {
					const head = cells(line);
					const align = cells(lines[index + 1] ?? "").map((cell) => cell.endsWith(":") ? cell.startsWith(":") ? "center" : "right" : "left");
					index += 2;
					const rows = [];
					while (index < lines.length && !isBlank(lines[index]) && (lines[index] ?? "").includes("|")) {
						rows.push(cells(lines[index] ?? ""));
						index += 1;
					}
					out.push((0, react.createElement)("div", {
						key: key(),
						style: st("mdTableWrap")
					}, (0, react.createElement)("table", { style: st("mdTable") }, (0, react.createElement)("thead", null, (0, react.createElement)("tr", null, head.map((cell, column) => (0, react.createElement)("th", {
						key: String(column),
						style: {
							...st("mdCell"),
							...st("mdHeadCell"),
							textAlign: align[column]
						}
					}, inline(cell, options))))), (0, react.createElement)("tbody", null, rows.map((row, rowIndex) => (0, react.createElement)("tr", { key: String(rowIndex) }, head.map((_, column) => (0, react.createElement)("td", {
						key: String(column),
						style: {
							...st("mdCell"),
							textAlign: align[column]
						}
					}, inline(row[column] ?? "", options)))))))));
					continue;
				}
				const first = listMarker.exec(line);
				if (first !== null) {
					const indent = (first[1] ?? "").length;
					const ordered = /\d/.test(first[2] ?? "");
					const items = [];
					while (index < lines.length) {
						const current = lines[index] ?? "";
						const marker = listMarker.exec(current);
						if (marker !== null && (marker[1] ?? "").length === indent) {
							items.push({ lines: [marker[3] ?? ""] });
							index += 1;
							continue;
						}
						const item = items.at(-1);
						if (item === void 0) break;
						if (isBlank(current)) {
							const next = lines[index + 1];
							const nextMarker = next === void 0 ? null : listMarker.exec(next);
							if (next !== void 0 && (nextMarker !== null && (nextMarker[1] ?? "").length >= indent || /^\s{2,}\S/.test(next))) {
								item.lines.push("");
								index += 1;
								continue;
							}
							break;
						}
						if (/^\s+\S/.test(current) && current.length - current.trimStart().length > indent) {
							item.lines.push(current.slice(Math.min(indent + 2, current.length - current.trimStart().length)));
							index += 1;
							continue;
						}
						if (marker !== null) break;
						item.lines.push(current.trim());
						index += 1;
					}
					out.push((0, react.createElement)(ordered ? "ol" : "ul", {
						key: key(),
						style: st("mdList")
					}, items.map((item) => {
						const text = item.lines.join("\n");
						const task = /^\[([ xX])\]\s+/.exec(text);
						const content = task === null ? text : text.slice(task[0].length);
						const parts = content.split("\n");
						const nestedAt = parts.findIndex((part) => listMarker.test(part) || /^\s*(```|>|#)/.test(part));
						const headLines = nestedAt < 0 ? parts : parts.slice(0, nestedAt);
						const tight = !headLines.some((part) => part.trim() === "");
						const body = tight && nestedAt < 0 ? inline(content.replace(/\n/g, " "), options) : tight && nestedAt > 0 ? [...inline(headLines.join(" "), options), ...renderMarkdown(parts.slice(nestedAt).join("\n"), options)] : renderMarkdown(content, options);
						return (0, react.createElement)("li", {
							key: key(),
							style: st("mdItem")
						}, task === null ? body : (0, react.createElement)(react.Fragment, null, (0, react.createElement)("span", { "aria-hidden": true }, task[1] === " " ? "☐ " : "☑ "), body));
					})));
					continue;
				}
				const paragraph = [];
				while (index < lines.length && !isBlank(lines[index])) {
					const current = lines[index] ?? "";
					if (paragraph.length > 0 && (/^(#{1,6}\s|```|~~~|\s*>)/.test(current) || listMarker.test(current))) break;
					paragraph.push(current.trim());
					index += 1;
				}
				out.push((0, react.createElement)("p", {
					key: key(),
					style: st("mdParagraph")
				}, inline(paragraph.join(" "), options)));
			}
			return out;
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
		/**
		* The document-relative form of a route, which is what the browser fetches.
		* @param route - an absolute route from {@link ROUTES}.
		* @returns the route without its leading slash.
		*/
		function relative(route) {
			return route.replace(/^\//, "");
		}
		/** Deadline for a clone or update, which can take a while on a big repository. */
		const GIT_TIMEOUT_MS = 33e4;
		/** An error answer from the Host, or a transport failure. */
		var ApiFailure = class extends Error {
			code;
			status;
			detail;
			/**
			* @param code - machine code (`offline` for a transport failure).
			* @param message - what to show.
			* @param status - HTTP status, 0 when there was no answer.
			* @param detail - extra data, e.g. candidate paths.
			*/
			constructor(code, message, status, detail) {
				super(message);
				this.name = "ApiFailure";
				this.code = code;
				this.status = status;
				if (detail !== void 0) this.detail = detail;
			}
		};
		/**
		* Call one route.
		* @param fetcher - the fetch to use.
		* @param route - an absolute route from ROUTES.
		* @param options - method, query, body, deadline.
		* @returns the parsed JSON body.
		* @throws {ApiFailure} for an error answer, a non-JSON answer, or no answer.
		*/
		async function call(fetcher, route, options = {}) {
			const query = options.query === void 0 ? "" : `?${new URLSearchParams(options.query).toString()}`;
			let response;
			try {
				response = await fetcher(`${relative(route)}${query}`, {
					method: options.method ?? "GET",
					cache: "no-store",
					credentials: "same-origin",
					signal: AbortSignal.timeout(options.timeoutMs ?? 15e3),
					...options.body === void 0 ? {} : {
						body: JSON.stringify(options.body),
						headers: { "content-type": "application/json" }
					}
				});
			} catch (error) {
				const timeout = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
				throw new ApiFailure(timeout ? "timeout" : "offline", timeout ? "The DSH Host did not answer in time." : "The DSH Host does not answer.", 0);
			}
			let parsed;
			try {
				parsed = await response.json();
			} catch {
				throw new ApiFailure("offline", "The OKF Host half is not answering. Restart dsh web after installing the plugin.", response.status);
			}
			if (!response.ok) {
				const error = parsed?.error;
				throw new ApiFailure(error?.code ?? "failed", error?.message ?? `HTTP ${String(response.status)}`, response.status, error?.detail);
			}
			return parsed;
		}
		/** How long to wait for a just-created Workspace to appear in the list snapshot. */
		const WORKSPACE_WAIT_MS = 1e4;
		/**
		* Wait until the Workspace list snapshot holds an id: `create` answers before
		* the list feed delivers the new row, and `connectWorkspace` reads the list.
		* @param workspaces - the service.
		* @param workspaceId - the id to wait for.
		* @param timeoutMs - how long to wait.
		* @returns when the row is there.
		* @throws {Error} when it does not appear in time.
		*/
		function waitForWorkspace(workspaces, workspaceId, timeoutMs = WORKSPACE_WAIT_MS) {
			const present = () => workspaces.list.getSnapshot().items.some((item) => item.workspaceId === workspaceId);
			if (present()) return Promise.resolve();
			return new Promise((resolve, reject) => {
				const timer = setTimeout(() => {
					stop();
					reject(/* @__PURE__ */ new Error("The new workspace did not appear in DSH in time."));
				}, timeoutMs);
				const stop = workspaces.list.subscribe(() => {
					if (!present()) return;
					clearTimeout(timer);
					stop();
					resolve();
				});
			});
		}
		/**
		* Create the store.
		* @param fetcher - the fetch to use; defaults to the page's global one.
		* @param navigation - DSH's Workspace services when reachable; read at call time, since they can arrive after the store.
		* @returns the store; the caller must dispose it.
		*/
		function createOkfStore(fetcher = (input, init) => globalThis.fetch(input, init), navigation = () => void 0) {
			const listeners = /* @__PURE__ */ new Set();
			let state = {
				library: {
					status: "loading",
					entries: []
				},
				selections: {},
				dialog: { open: false }
			};
			let disposed = false;
			let libraryInflight;
			const selectionInflight = /* @__PURE__ */ new Map();
			const set = (next) => {
				if (disposed) return;
				state = {
					...state,
					...next
				};
				for (const listener of [...listeners]) listener();
			};
			const setSelection = (sessionId, selection) => {
				set({ selections: {
					...state.selections,
					[sessionId]: selection
				} });
			};
			const refreshLibrary = () => {
				libraryInflight ??= (async () => {
					try {
						const answer = await call(fetcher, ROUTES.library);
						set({ library: {
							status: "ready",
							entries: answer.entries,
							libraryDir: answer.libraryDir
						} });
					} catch (error) {
						set({ library: {
							...state.library,
							status: "offline",
							error: error.message
						} });
					}
				})().finally(() => {
					libraryInflight = void 0;
				});
				return libraryInflight;
			};
			const loadSelection = (sessionId) => {
				let inflight = selectionInflight.get(sessionId);
				if (inflight === void 0) {
					inflight = (async () => {
						try {
							const answer = await call(fetcher, ROUTES.session, { query: { sessionId } });
							setSelection(sessionId, {
								loaded: true,
								bundleId: answer?.bundleId ?? null
							});
						} catch (error) {
							setSelection(sessionId, {
								loaded: true,
								bundleId: state.selections[sessionId]?.bundleId ?? null,
								error: error.message
							});
						}
					})().finally(() => {
						selectionInflight.delete(sessionId);
					});
					selectionInflight.set(sessionId, inflight);
				}
				return inflight;
			};
			/** Drop selections that point at a removed bundle. */
			const forget = (id) => {
				const selections = {};
				for (const [session, selection] of Object.entries(state.selections)) selections[session] = selection.bundleId === id ? {
					loaded: true,
					bundleId: null
				} : selection;
				set({
					selections,
					dialog: state.dialog.bundleId === id ? {
						open: state.dialog.open,
						...state.dialog.sessionId === void 0 ? {} : { sessionId: state.dialog.sessionId }
					} : state.dialog
				});
			};
			const select = async (sessionId, bundleId) => {
				const before = state.selections[sessionId];
				setSelection(sessionId, {
					loaded: true,
					bundleId
				});
				try {
					await call(fetcher, ROUTES.session, {
						method: "POST",
						body: {
							sessionId,
							bundleId
						}
					});
				} catch (error) {
					setSelection(sessionId, {
						loaded: true,
						bundleId: before?.bundleId ?? null,
						error: error.message
					});
					throw error;
				}
			};
			refreshLibrary();
			return {
				getSnapshot: () => state,
				subscribe(listener) {
					listeners.add(listener);
					return () => {
						listeners.delete(listener);
					};
				},
				refreshLibrary,
				loadSelection,
				select,
				openDialog(options = {}) {
					const bundleId = options.bundleId ?? (options.sessionId === void 0 ? void 0 : state.selections[options.sessionId]?.bundleId ?? void 0) ?? state.library.entries[0]?.id;
					set({ dialog: {
						open: true,
						...options.sessionId === void 0 ? {} : { sessionId: options.sessionId },
						...bundleId === void 0 ? {} : { bundleId }
					} });
					refreshLibrary();
				},
				closeDialog() {
					set({ dialog: { open: false } });
				},
				preview(bundleId) {
					const { pagePath: _drop, bundleId: _old, ...rest } = state.dialog;
					set({ dialog: {
						...rest,
						...bundleId === void 0 ? {} : { bundleId }
					} });
				},
				openPage(pagePath) {
					const { pagePath: _drop, ...rest } = state.dialog;
					set({ dialog: {
						...rest,
						...pagePath === void 0 ? {} : { pagePath }
					} });
				},
				async fetchBundle(request) {
					const answer = await call(fetcher, ROUTES.fetch, {
						method: "POST",
						body: request,
						timeoutMs: GIT_TIMEOUT_MS
					});
					await refreshLibrary();
					return answer.entry;
				},
				async addLocal(path, id) {
					const answer = await call(fetcher, ROUTES.addLocal, {
						method: "POST",
						body: {
							path,
							...id === void 0 ? {} : { id }
						}
					});
					await refreshLibrary();
					return answer.entry;
				},
				async update(id, force = false) {
					const answer = await call(fetcher, ROUTES.update, {
						method: "POST",
						body: {
							id,
							force
						},
						timeoutMs: GIT_TIMEOUT_MS
					});
					await refreshLibrary();
					return answer;
				},
				async remove(id, deleteFiles) {
					await call(fetcher, ROUTES.remove, {
						method: "POST",
						body: {
							id,
							deleteFiles
						}
					});
					forget(id);
					await refreshLibrary();
				},
				async editAsWorkspace(id) {
					const answer = await call(fetcher, ROUTES.editWorkspace, {
						method: "POST",
						body: { id },
						timeoutMs: GIT_TIMEOUT_MS
					});
					await refreshLibrary();
					const services = navigation();
					if (services === void 0) return {
						entry: answer.entry,
						workspace: answer.workspace,
						opened: false,
						reason: "unavailable"
					};
					try {
						const workspace = await services.workspaces.create({ path: answer.workspace });
						await waitForWorkspace(services.workspaces, workspace.workspaceId);
						const sessionId = await services.uiWorkspace.connectWorkspace(workspace.workspaceId);
						await select(sessionId, answer.entry.id);
						services.uiWorkspace.openSession(sessionId);
						set({ dialog: { open: false } });
						return {
							entry: answer.entry,
							workspace: answer.workspace,
							opened: true
						};
					} catch (error) {
						return {
							entry: answer.entry,
							workspace: answer.workspace,
							opened: false,
							reason: error.message
						};
					}
				},
				summary: (id) => call(fetcher, ROUTES.bundle, { query: { id } }),
				page: (id, path) => call(fetcher, ROUTES.page, { query: {
					id,
					path
				} }),
				dispose() {
					disposed = true;
					listeners.clear();
				}
			};
		}
		//#endregion
		//#region src/client/components.tsx
		/**
		* The OKF browser UI: a chip in each session's header, and one dialog (rendered
		* in the frame's overlay layer) holding the library, the add form, the bundle
		* preview and the page reader.
		*
		* The chip shows which bundle the session uses and opens the dialog for that
		* session. The dialog's header carries the session's bundle selector, so the
		* one surface covers all three jobs: fetch, preview, select.
		*/
		/**
		* Read the whole store.
		* @param store - the store.
		* @returns the current state, re-rendering on change.
		*/
		function useOkf(store) {
			const subscribe = (0, react.useCallback)((listener) => store.subscribe(listener), [store]);
			const get = (0, react.useCallback)(() => store.getSnapshot(), [store]);
			return (0, react.useSyncExternalStore)(subscribe, get, get);
		}
		/**
		* A pressable control with hover and pressed states.
		* @param props - handler, label, variant.
		* @returns the button.
		*/
		function Button({ onClick, children, variant, disabled = false, title, style, type = "button", ariaLabel }) {
			const [hover, setHover] = (0, react.useState)(false);
			const [press, setPress] = (0, react.useState)(false);
			const merged = {
				...sx("button", variant === "primary" && "buttonPrimary", variant === "danger" && "buttonDanger"),
				...!disabled && variant !== "primary" && hover ? st("hover") : {},
				...!disabled && press ? st("pressed") : {},
				...disabled ? st("disabled") : {},
				...style
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type,
				style: merged,
				disabled,
				title,
				"aria-label": ariaLabel,
				onClick,
				onPointerEnter: () => {
					setHover(true);
				},
				onPointerLeave: () => {
					setHover(false);
					setPress(false);
				},
				onPointerDown: () => {
					setPress(true);
				},
				onPointerUp: () => {
					setPress(false);
				},
				onPointerCancel: () => {
					setPress(false);
				},
				children
			});
		}
		/**
		* A small book glyph.
		* @returns the icon.
		*/
		function BookIcon() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				width: "13",
				height: "13",
				viewBox: "0 0 16 16",
				"aria-hidden": "true",
				style: { flex: "none" },
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M2.5 2.5h4a2 2 0 0 1 2 2v9a1.5 1.5 0 0 0-1.5-1.5h-4.5zM13.5 2.5h-4a2 2 0 0 0-2 2v9a1.5 1.5 0 0 1 1.5-1.5h4.5z",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "1.2",
					strokeLinejoin: "round"
				})
			});
		}
		/**
		* The session chip. It sits in the session header and in the composer's tool
		* row: DSH hides the header utilities while a session is still blank, which is
		* exactly when a bundle is usually chosen, so the composer copy is the one that
		* is always reachable. `compact` drops the border to match the composer controls.
		* @param props - store, session id, translate seat, and the compact flag.
		* @returns the chip.
		*/
		function SessionChip({ store, sessionId, t, compact = false }) {
			const state = useOkf(store);
			const [hover, setHover] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				store.loadSelection(sessionId);
			}, [store, sessionId]);
			const selection = state.selections[sessionId];
			const name = (selection?.bundleId === null || selection === void 0 ? void 0 : state.library.entries.find((candidate) => candidate.id === selection.bundleId))?.name ?? selection?.bundleId ?? void 0;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				style: {
					...sx("chip", name !== void 0 && "chipActive", compact && "chipCompact"),
					...hover ? st("hover") : {}
				},
				title: name === void 0 ? t("chip.title") : t("chip.titleSelected", { name }),
				"aria-label": name === void 0 ? t("chip.title") : t("chip.titleSelected", { name }),
				onPointerEnter: () => {
					setHover(true);
				},
				onPointerLeave: () => {
					setHover(false);
				},
				onClick: () => {
					store.openDialog({ sessionId });
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(BookIcon, {}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					style: st("chipText"),
					children: name === void 0 ? t("chip.none") : `OKF · ${name}`
				})]
			});
		}
		/**
		* The overlay entry: renders the dialog while it is open, nothing otherwise.
		* @param props - store and translate seat.
		* @returns the dialog or null.
		*/
		function OkfDialog({ store, t }) {
			const state = useOkf(store);
			const { dialog } = state;
			(0, react.useEffect)(() => {
				if (!dialog.open) return void 0;
				const onKey = (event) => {
					if (event.key === "Escape") store.closeDialog();
				};
				document.addEventListener("keydown", onKey);
				return () => {
					document.removeEventListener("keydown", onKey);
				};
			}, [dialog.open, store]);
			if (!dialog.open) return null;
			const entry = state.library.entries.find((candidate) => candidate.id === dialog.bundleId);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: st("backdrop"),
				onPointerDown: (event) => {
					if (event.target === event.currentTarget) store.closeDialog();
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: st("dialog"),
					role: "dialog",
					"aria-modal": "true",
					"aria-label": t("dialog.title"),
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: st("header"),
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
								style: st("title"),
								children: t("dialog.title")
							}),
							dialog.sessionId === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: { flex: 1 } }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionBar, {
								store,
								state,
								sessionId: dialog.sessionId,
								t
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								onClick: () => {
									store.closeDialog();
								},
								ariaLabel: t("dialog.close"),
								style: st("iconButton"),
								children: "✕"
							})
						]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: st("body"),
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(LibraryPane, {
							store,
							state,
							t
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: st("main"),
							children: entry === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: st("empty"),
								children: t("preview.pick")
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Preview, {
								store,
								entry,
								pagePath: dialog.pagePath,
								sessionId: dialog.sessionId,
								selected: dialog.sessionId !== void 0 && state.selections[dialog.sessionId]?.bundleId === entry.id,
								t
							}, `${entry.id}:${entry.fetchedAt ?? ""}:${entry.origin.kind === "git" ? entry.origin.commit ?? "" : ""}`)
						})]
					})]
				})
			});
		}
		/**
		* The header's "this session uses" selector.
		* @param props - store, state, session id, translate seat.
		* @returns the selector.
		*/
		function SessionBar({ store, state, sessionId, t }) {
			const selection = state.selections[sessionId];
			const [saved, setSaved] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)(void 0);
			const choose = (bundleId) => {
				setSaved(false);
				setError(void 0);
				store.select(sessionId, bundleId).then(() => {
					setSaved(true);
				}, (failure) => {
					setError(failure.message);
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: st("sessionBar"),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
						style: st("secondary"),
						htmlFor: "okf-session-select",
						children: t("session.label")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
						id: "okf-session-select",
						style: st("select"),
						value: selection?.bundleId ?? "",
						disabled: selection?.loaded !== true,
						onChange: (event) => {
							choose(event.target.value === "" ? null : event.target.value);
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: "",
								children: t("session.none")
							}),
							state.library.entries.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: entry.id,
								children: entry.name
							}, entry.id)),
							selection?.bundleId != null && !state.library.entries.some((entry) => entry.id === selection.bundleId) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: selection.bundleId,
								children: selection.bundleId
							})
						]
					}),
					saved && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: st("success"),
						children: t("session.saved")
					}),
					error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: {
							...st("muted"),
							color: "var(--dsw-alias-state-error-primary)"
						},
						children: error
					}),
					!saved && error === void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: st("muted"),
						children: t("session.hint")
					})
				]
			});
		}
		/**
		* The library column: entries, then the add form.
		* @param props - store, state, translate seat.
		* @returns the column.
		*/
		function LibraryPane({ store, state, t }) {
			const [adding, setAdding] = (0, react.useState)(false);
			const { library, dialog } = state;
			const sessionBundle = dialog.sessionId === void 0 ? void 0 : state.selections[dialog.sessionId]?.bundleId;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: st("side"),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: st("sideScroll"),
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							style: st("sectionTitle"),
							children: t("library.title")
						}),
						library.status === "offline" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: st("error"),
							children: [t("library.offline"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: { marginTop: 6 },
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
									onClick: () => {
										store.refreshLibrary();
									},
									children: t("action.retry")
								})
							})]
						}),
						library.status === "ready" && library.entries.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							style: st("note"),
							children: t("library.empty")
						}),
						library.entries.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EntryRow, {
							entry,
							selected: dialog.bundleId === entry.id,
							inSession: sessionBundle === entry.id,
							onClick: () => {
								store.preview(entry.id);
							},
							t
						}, entry.id)),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: { marginTop: 8 },
							children: adding ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AddForm, {
								store,
								t,
								onDone: (entry) => {
									setAdding(false);
									if (entry !== void 0) store.preview(entry.id);
								}
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								onClick: () => {
									setAdding(true);
								},
								style: { width: "100%" },
								children: `＋ ${t("add.open")}`
							})
						}),
						library.libraryDir !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							style: st("note"),
							children: t("library.dir", { dir: library.libraryDir })
						})
					]
				})
			});
		}
		/**
		* One library entry.
		* @param props - the entry and its flags.
		* @returns the row.
		*/
		function EntryRow({ entry, selected, inSession, onClick, t }) {
			const [hover, setHover] = (0, react.useState)(false);
			const where = entry.origin.kind === "git" ? `${entry.origin.url}${entry.origin.path === "" ? "" : ` · ${entry.origin.path}`}` : entry.root;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				style: {
					...sx("entry", selected && "entrySelected"),
					...!selected && hover ? st("hover") : {}
				},
				onClick,
				onPointerEnter: () => {
					setHover(true);
				},
				onPointerLeave: () => {
					setHover(false);
				},
				title: where,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					style: st("entryName"),
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: {
								overflow: "hidden",
								textOverflow: "ellipsis"
							},
							children: entry.name
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: st("badge"),
							children: entry.origin.kind === "git" ? providerLabel(entry) : t("origin.local")
						}),
						entry.workspace !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: sx("badge", "badgeOk"),
							children: t("badge.editable")
						}),
						inSession && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: sx("badge", "badgeBrand"),
							children: t("library.inSession")
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					style: {
						...st("entryMeta"),
						display: "block"
					},
					children: where
				})]
			});
		}
		/**
		* The provider label of a git entry.
		* @param entry - a git entry.
		* @returns e.g. "GitHub".
		*/
		function providerLabel(entry) {
			if (entry.origin.kind !== "git") return "";
			return entry.origin.provider === "github" ? "GitHub" : entry.origin.provider === "azure-devops" ? "Azure DevOps" : "Git";
		}
		/**
		* The add form: fetch from git, or add a local folder.
		* @param props - store, translate seat, and the done callback.
		* @returns the form.
		*/
		function AddForm({ store, t, onDone }) {
			const [tab, setTab] = (0, react.useState)("git");
			const [url, setUrl] = (0, react.useState)("");
			const [ref, setRef] = (0, react.useState)("");
			const [path, setPath] = (0, react.useState)("");
			const [id, setId] = (0, react.useState)("");
			const [local, setLocal] = (0, react.useState)("");
			const [busy, setBusy] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)(void 0);
			const submit = (override) => {
				setBusy(true);
				setError(void 0);
				(tab === "git" ? store.fetchBundle({
					url,
					...ref.trim() === "" ? {} : { ref: ref.trim() },
					...(override ?? path).trim() === "" ? {} : { path: (override ?? path).trim() },
					...id.trim() === "" ? {} : { id: id.trim() }
				}) : store.addLocal(override ?? local, id.trim() === "" ? void 0 : id.trim())).then((entry) => {
					setBusy(false);
					onDone(entry);
				}, (failure) => {
					setBusy(false);
					setError(failure);
				});
			};
			const candidates = error instanceof ApiFailure && error.code === "many-bundles" ? error.detail?.candidates ?? [] : [];
			const canSubmit = !busy && (tab === "git" ? url.trim() !== "" : local.trim() !== "");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("form", {
				style: st("form"),
				onSubmit: (event) => {
					event.preventDefault();
					if (canSubmit) submit();
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: st("tabs"),
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
							style: {
								...st("tab"),
								...tab === "git" ? st("tabActive") : {}
							},
							onClick: () => {
								setTab("git");
								setError(void 0);
							},
							children: t("add.tabGit")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
							style: {
								...st("tab"),
								...tab === "local" ? st("tabActive") : {}
							},
							onClick: () => {
								setTab("local");
								setError(void 0);
							},
							children: t("add.tabLocal")
						})]
					}),
					tab === "git" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
							style: st("label"),
							htmlFor: "okf-url",
							children: t("add.url")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							id: "okf-url",
							style: st("input"),
							value: url,
							onChange: (event) => {
								setUrl(event.target.value);
							},
							placeholder: "https://dev.azure.com/org/project/_git/repo",
							spellCheck: false,
							autoFocus: true
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							style: st("note"),
							children: t("add.urlHint")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
							style: st("label"),
							htmlFor: "okf-ref",
							children: t("add.ref")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							id: "okf-ref",
							style: st("input"),
							value: ref,
							onChange: (event) => {
								setRef(event.target.value);
							},
							placeholder: "e.g. main",
							spellCheck: false
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
							style: st("label"),
							htmlFor: "okf-path",
							children: t("add.path")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							id: "okf-path",
							style: st("input"),
							value: path,
							onChange: (event) => {
								setPath(event.target.value);
							},
							placeholder: "e.g. okf",
							spellCheck: false
						})
					] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
						style: st("label"),
						htmlFor: "okf-local",
						children: t("add.localPath")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						id: "okf-local",
						style: st("input"),
						value: local,
						onChange: (event) => {
							setLocal(event.target.value);
						},
						placeholder: "D:\\\\repos\\\\project\\\\okf",
						spellCheck: false,
						autoFocus: true
					})] }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
						style: st("label"),
						htmlFor: "okf-id",
						children: t("add.id")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						id: "okf-id",
						style: st("input"),
						value: id,
						onChange: (event) => {
							setId(event.target.value);
						},
						spellCheck: false
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							...st("row"),
							marginTop: 10
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
							type: "submit",
							variant: "primary",
							disabled: !canSubmit,
							children: busy ? t("add.busy") : tab === "git" ? t("add.submit") : t("add.submitLocal")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
							onClick: () => {
								onDone();
							},
							disabled: busy,
							children: t("add.cancel")
						})]
					}),
					error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: st("error"),
						children: error.message
					}),
					candidates.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: { marginTop: 8 },
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							style: st("note"),
							children: t("add.pick")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								...st("row"),
								marginTop: 4
							},
							children: candidates.map((candidate) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								style: st("candidate"),
								onClick: () => {
									if (tab === "git") setPath(candidate);
									else setLocal(candidate);
									submit(candidate);
								},
								children: candidate === "" ? "/" : candidate
							}, candidate))
						})]
					}),
					tab === "git" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						style: st("note"),
						children: t("add.auth")
					})
				]
			});
		}
		/**
		* The bundle preview: header, actions, catalog, or one page.
		* @param props - the entry, the page being read, the session context.
		* @returns the preview.
		*/
		function Preview({ store, entry, pagePath, sessionId, selected, t }) {
			const [summary, setSummary] = (0, react.useState)({ status: "loading" });
			const [reload, setReload] = (0, react.useState)(0);
			(0, react.useEffect)(() => {
				let live = true;
				setSummary({ status: "loading" });
				store.summary(entry.id).then((value) => {
					if (live) setSummary({
						status: "ready",
						value
					});
				}, (failure) => {
					if (live) setSummary({
						status: "error",
						message: failure.message
					});
				});
				return () => {
					live = false;
				};
			}, [
				store,
				entry.id,
				reload
			]);
			const scroller = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				scroller.current?.scrollTo?.({ top: 0 });
			}, [pagePath]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: st("mainScroll"),
				ref: scroller,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PreviewHeader, {
						store,
						entry,
						summary: summary.status === "ready" ? summary.value : void 0,
						sessionId,
						selected,
						t,
						onChanged: () => {
							setReload((value) => value + 1);
						}
					}),
					summary.status === "loading" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: st("empty"),
						children: t("preview.loading")
					}),
					summary.status === "error" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: st("error"),
						children: t("error.generic", { message: summary.message })
					}),
					summary.status === "ready" && (pagePath === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Catalog, {
						summary: summary.value,
						onOpen: (path) => {
							store.openPage(path);
						},
						t
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PageView, {
						store,
						entry,
						path: pagePath,
						summary: summary.value,
						t
					}))
				]
			});
		}
		/**
		* The preview's head: name, origin, stats and the entry's actions.
		* @param props - the entry, its summary when loaded, and the session context.
		* @returns the head.
		*/
		function PreviewHeader({ store, entry, summary, sessionId, selected, t, onChanged }) {
			const [busy, setBusy] = (0, react.useState)(false);
			const [message, setMessage] = (0, react.useState)(void 0);
			const [confirming, setConfirming] = (0, react.useState)(false);
			const [deleteFiles, setDeleteFiles] = (0, react.useState)(true);
			const origin = entry.origin;
			const update = (force) => {
				setBusy(true);
				setMessage(void 0);
				store.update(entry.id, force).then(({ entry: next, changed }) => {
					setBusy(false);
					const commit = next.origin.kind === "git" ? (next.origin.commit ?? "").slice(0, 8) : "";
					setMessage({
						kind: "ok",
						text: changed ? t("action.updatedNew", { commit }) : t("action.updated", { commit })
					});
					onChanged();
				}, (failure) => {
					setBusy(false);
					setMessage({
						kind: "error",
						text: failure.message,
						dirty: /local copy has edits/i.test(failure.message)
					});
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: st("previewHead"),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
						style: st("previewTitle"),
						children: entry.name
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							...st("muted"),
							overflowWrap: "anywhere"
						},
						children: [origin.kind === "git" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
							origin.url,
							origin.ref === void 0 ? "" : ` @ ${origin.ref}`,
							origin.path === "" ? "" : ` · ${origin.path}`
						] }) : entry.root, entry.workspace !== void 0 && entry.workspace !== entry.root && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: entry.workspace })]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: st("stats"),
						children: [
							summary !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: st("badge"),
								children: t("preview.pages", { count: String(summary.pages.length) })
							}),
							summary !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: sx("badge", summary.okfVersion === void 0 ? "badgeWarn" : "badgeOk"),
								children: summary.okfVersion === void 0 ? t("preview.noVersion") : t("preview.version", { version: summary.okfVersion })
							}),
							origin.kind === "git" && origin.commit !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: st("badge"),
								children: t("preview.commit", { commit: origin.commit.slice(0, 8) })
							}),
							entry.fetchedAt !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: st("badge"),
								children: t("preview.fetched", { at: new Date(entry.fetchedAt).toLocaleString() })
							}),
							entry.workspace !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: sx("badge", "badgeOk"),
								title: entry.workspace,
								children: t("badge.editable")
							}),
							summary !== void 0 && Object.entries(summary.types).sort((a, b) => b[1] - a[1]).map(([type, n]) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: st("badge"),
								children: `${type} ${String(n)}`
							}, `t-${type}`)),
							summary !== void 0 && Object.entries(summary.states).sort((a, b) => b[1] - a[1]).map(([state, n]) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: sx("badge", stateTone(state)),
								children: `${state} ${String(n)}`
							}, `s-${state}`))
						]
					}),
					summary !== void 0 && summary.untyped.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: {
							...st("muted"),
							color: "var(--dsw-alias-state-warn-primary)"
						},
						title: summary.untyped.join("\n"),
						children: t("preview.untyped", { count: String(summary.untyped.length) })
					}),
					summary?.truncated === true && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: st("muted"),
						children: t("preview.truncated", { count: String(summary.pages.length) })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							...st("row"),
							marginTop: 4
						},
						children: [
							sessionId !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								variant: selected ? void 0 : "primary",
								disabled: selected,
								onClick: () => {
									store.select(sessionId, entry.id).catch(() => void 0);
								},
								children: selected ? `✓ ${t("action.using")}` : t("action.use")
							}),
							origin.kind === "git" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								disabled: busy,
								onClick: () => {
									update(false);
								},
								children: busy ? t("action.updating") : t("action.update")
							}),
							!confirming && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								variant: "danger",
								disabled: busy,
								onClick: () => {
									setConfirming(true);
								},
								children: t("action.remove")
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(EditWorkspace, {
						store,
						entry,
						t
					}),
					confirming && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							...st("form"),
							marginTop: 4
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: t("action.removeConfirm", { name: entry.name }) }),
							origin.kind === "git" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: {
									...st("row"),
									marginTop: 6,
									fontSize: 12
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "checkbox",
									checked: deleteFiles,
									onChange: (event) => {
										setDeleteFiles(event.target.checked);
									}
								}), t("action.removeFiles")]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									...st("row"),
									marginTop: 8
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
									variant: "danger",
									onClick: () => {
										store.remove(entry.id, origin.kind === "git" && deleteFiles).catch((failure) => {
											setMessage({
												kind: "error",
												text: failure.message
											});
										});
									},
									children: t("action.removeYes")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
									onClick: () => {
										setConfirming(false);
									},
									children: t("add.cancel")
								})]
							})
						]
					}),
					message?.kind === "ok" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: st("success"),
						children: message.text
					}),
					message?.kind === "error" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: st("error"),
						children: [message.text, message.dirty === true && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: { marginTop: 6 },
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								variant: "danger",
								onClick: () => {
									update(true);
								},
								children: t("action.forceUpdate")
							})
						})]
					})
				]
			});
		}
		/**
		* Edit as workspace: one button that makes the bundle editable where it is (a
		* git bundle's own checkout, a local bundle's folder) and opens a session in
		* that folder with the bundle attached. On an editable bundle it reopens it.
		* @param props - the entry.
		* @returns the control.
		*/
		function EditWorkspace({ store, entry, t }) {
			const [busy, setBusy] = (0, react.useState)(false);
			const [result, setResult] = (0, react.useState)(void 0);
			const editable = entry.workspace !== void 0;
			const run = () => {
				setBusy(true);
				setResult(void 0);
				store.editAsWorkspace(entry.id).then((outcome) => {
					setBusy(false);
					if (outcome.opened) return;
					setResult({
						kind: "manual",
						path: outcome.workspace,
						name: outcome.entry.name,
						...outcome.reason === void 0 || outcome.reason === "unavailable" ? {} : { reason: outcome.reason }
					});
				}, (failure) => {
					setBusy(false);
					setResult({
						kind: "error",
						text: failure.message
					});
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						...st("row"),
						marginTop: 4
					},
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
						disabled: busy,
						title: editable ? entry.workspace ?? "" : t("edit.hint"),
						onClick: run,
						children: busy ? t("edit.busy") : editable ? t("edit.openExisting") : t("edit.open")
					})
				}),
				result?.kind === "manual" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						...st("note"),
						marginTop: 6
					},
					children: [t("edit.manual", {
						path: result.path,
						name: result.name
					}), result.reason !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: t("edit.manualReason", { reason: result.reason }) })]
				}),
				result?.kind === "error" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: st("error"),
					children: result.text
				})
			] });
		}
		/**
		* The badge tone of a lifecycle or status value.
		* @param state - the value.
		* @returns a badge style name.
		*/
		function stateTone(state) {
			if (state === void 0) return void 0;
			if (state === "needs_review" || state === "draft") return "badgeWarn";
			if (state === "deprecated" || state === "archived") return "badgeError";
			if (state === "active" || state === "stable") return "badgeOk";
		}
		/**
		* The catalog: a filter and the pages grouped by top folder.
		* @param props - the summary, the open handler, the translate seat.
		* @returns the catalog.
		*/
		function Catalog({ summary, onOpen, t }) {
			const [filter, setFilter] = (0, react.useState)("");
			const groups = (0, react.useMemo)(() => {
				const words = filter.toLowerCase().split(/\s+/).filter(Boolean);
				const matched = summary.pages.filter((page) => {
					if (words.length === 0) return true;
					const hay = `${page.title} ${page.path} ${page.description ?? ""} ${page.tags.join(" ")} ${page.type ?? ""} ${page.lifecycle ?? ""}`.toLowerCase();
					return words.every((word) => hay.includes(word));
				});
				const byGroup = /* @__PURE__ */ new Map();
				for (const page of matched) {
					const group = page.path.includes("/") ? page.path.split("/")[0] ?? "" : "";
					byGroup.set(group, [...byGroup.get(group) ?? [], page]);
				}
				return [...byGroup.entries()].sort((a, b) => a[0] === "" ? -1 : b[0] === "" ? 1 : a[0].localeCompare(b[0]));
			}, [summary, filter]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
					style: st("input"),
					value: filter,
					onChange: (event) => {
						setFilter(event.target.value);
					},
					placeholder: t("preview.filter"),
					"aria-label": t("preview.filter"),
					spellCheck: false
				}),
				groups.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: st("empty"),
					children: t("preview.noMatch")
				}),
				groups.map(([group, pages]) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					style: st("group"),
					children: `${group === "" ? t("preview.root") : group} · ${String(pages.length)}`
				}), pages.map((page) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PageRow, {
					page,
					onOpen
				}, page.path))] }, group))
			] });
		}
		/**
		* One catalog row.
		* @param props - the page and the open handler.
		* @returns the row.
		*/
		function PageRow({ page, onOpen }) {
			const [hover, setHover] = (0, react.useState)(false);
			const state = page.lifecycle ?? page.status;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				style: {
					...st("pageRow"),
					...hover ? st("hover") : {}
				},
				onClick: () => {
					onOpen(page.path);
				},
				onPointerEnter: () => {
					setHover(true);
				},
				onPointerLeave: () => {
					setHover(false);
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					style: st("pageTitle"),
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: page.title }),
						page.type !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: st("badge"),
							children: page.type
						}),
						state !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: sx("badge", stateTone(state)),
							children: state
						}),
						page.tags.map((tag) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: st("badge"),
							children: `#${tag}`
						}, tag)),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: st("pagePath"),
							children: page.path
						})
					]
				}), page.description !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					style: {
						...st("pageDesc"),
						display: "block"
					},
					children: page.description
				})]
			});
		}
		/**
		* One page: back link, frontmatter, rendered body.
		* @param props - the entry and page path.
		* @returns the page.
		*/
		function PageView({ store, entry, path, summary, t }) {
			const [page, setPage] = (0, react.useState)({ status: "loading" });
			(0, react.useEffect)(() => {
				let live = true;
				setPage({ status: "loading" });
				store.page(entry.id, path).then((value) => {
					if (live) setPage({
						status: "ready",
						value
					});
				}, (failure) => {
					if (live) setPage({
						status: "error",
						message: failure.message
					});
				});
				return () => {
					live = false;
				};
			}, [
				store,
				entry.id,
				path
			]);
			const known = summary.pages.find((candidate) => candidate.path === path);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						...st("row"),
						marginBottom: 10
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
						onClick: () => {
							store.openPage(void 0);
						},
						children: `← ${t("action.back")}`
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: st("pagePath"),
						children: path
					})]
				}),
				page.status === "loading" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: st("empty"),
					children: t("preview.loading")
				}),
				page.status === "error" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: st("error"),
					children: t("error.generic", { message: page.message })
				}),
				page.status === "ready" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
					!/^\s*#\s/.test(page.value.body) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
						style: st("previewTitle"),
						children: known?.title ?? path
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							...st("stats"),
							marginBottom: 6
						},
						children: [
							known?.type !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: st("badge"),
								children: known.type
							}),
							(known?.lifecycle ?? known?.status) !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: sx("badge", stateTone(known?.lifecycle ?? known?.status)),
								children: known?.lifecycle ?? known?.status
							}),
							known?.updated !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: st("badge"),
								children: known.updated
							})
						]
					}),
					Object.keys(page.value.meta).length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
						style: { margin: "0 0 14px" },
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("summary", {
							style: {
								...st("muted"),
								cursor: "pointer"
							},
							children: `${t("page.meta")} · ${String(Object.keys(page.value.meta).length)}`
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("table", {
							style: st("metaTable"),
							"aria-label": t("page.meta"),
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: Object.entries(page.value.meta).map(([key, value]) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
								style: st("metaKey"),
								children: key
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
								style: st("metaValue"),
								children: Array.isArray(value) ? value.join(", ") : String(value)
							})] }, key)) })
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: st("markdown"),
						children: page.value.body.trim() === "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							style: st("muted"),
							children: t("page.empty")
						}) : renderMarkdown(page.value.body, {
							pagePath: path,
							onBundleLink: (target) => {
								store.openPage(target);
							}
						})
					})
				] })
			] });
		}
		//#endregion
		//#region src/client/locales.ts
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"chip.none": "OKF",
			"chip.title": "选择本会话使用的 OKF 知识包，或浏览知识库",
			"chip.titleSelected": "本会话使用知识包 {name}。点击更改或预览",
			"dialog.title": "OKF 知识包",
			"dialog.close": "关闭",
			"session.label": "本会话使用",
			"session.none": "不使用知识包",
			"session.saved": "已保存。从下一轮对话起生效。",
			"session.hint": "智能体会在每轮对话中收到所选知识包的目录和文件夹位置，并用自己的文件工具阅读页面。只有在知识包自己的编辑工作区里，它才能修改页面。",
			"library.title": "知识库",
			"library.empty": "还没有知识包。从 Git 仓库获取一个，或添加本地文件夹。",
			"library.offline": "无法连接 OKF 主机端。安装插件后需要重启 dsh web。",
			"library.dir": "存放位置：{dir}",
			"library.inSession": "本会话",
			"origin.git": "Git",
			"origin.local": "本地",
			"add.open": "添加知识包",
			"add.cancel": "取消",
			"add.tabGit": "从 Git 仓库",
			"add.tabLocal": "本地文件夹",
			"add.url": "仓库地址",
			"add.urlHint": "GitHub、Azure DevOps（dev.azure.com/组织/项目/_git/仓库）或任意 Git 地址；HTTPS 或 SSH。",
			"add.ref": "分支或标签（可选）",
			"add.path": "知识包所在目录（可选，自动查找）",
			"add.id": "库内 ID（可选）",
			"add.localPath": "本地文件夹的绝对路径",
			"add.submit": "获取",
			"add.submitLocal": "添加",
			"add.busy": "正在获取…",
			"add.auth": "认证使用 Git 自身的凭据管理器或 SSH 密钥。也可以在启动 dsh 前设置环境变量 DSH_OKF_AZURE_TOKEN、DSH_OKF_GITHUB_TOKEN 或 DSH_OKF_GIT_TOKEN。",
			"add.pick": "此位置包含多个知识包，请选择一个：",
			"action.update": "更新",
			"action.updating": "正在更新…",
			"action.updated": "已是最新的 {commit}",
			"action.updatedNew": "已更新到 {commit}",
			"action.remove": "移除",
			"action.removeConfirm": "从知识库移除 {name}？",
			"action.removeFiles": "同时删除下载的文件",
			"action.removeYes": "移除",
			"action.use": "在本会话使用",
			"action.using": "本会话正在使用",
			"action.retry": "重试",
			"action.back": "返回目录",
			"action.forceUpdate": "覆盖本地修改并更新",
			"preview.pick": "选择左侧的知识包进行预览。",
			"preview.loading": "正在读取…",
			"preview.pages": "{count} 个页面",
			"preview.version": "OKF {version}",
			"preview.noVersion": "未声明 OKF 版本",
			"preview.fetched": "获取于 {at}",
			"preview.commit": "提交 {commit}",
			"preview.filter": "筛选页面（标题、路径、描述、标签）",
			"preview.untyped": "{count} 个页面缺少 OKF 必需的 type 字段",
			"preview.truncated": "页面过多，仅列出前 {count} 个。",
			"preview.noMatch": "没有匹配的页面。",
			"preview.root": "根目录",
			"page.meta": "元数据",
			"page.empty": "此页面没有正文。",
			"error.generic": "出错了：{message}",
			"edit.open": "作为工作区编辑",
			"edit.openExisting": "打开编辑工作区",
			"edit.hint": "把知识包所在的文件夹注册为 DSH 工作区，并在其中打开一个已附加此知识包的会话。智能体只能在该工作区的会话中修改知识包。之后“更新”只做快进合并，不会丢弃你的修改。",
			"edit.busy": "正在准备…",
			"edit.manual": "{name} 现在可以编辑了，文件夹：{path}。在侧边栏用“添加工作区…”添加这个文件夹，然后在那里的会话中选择 {name}。",
			"edit.manualReason": "无法自动打开工作区：{reason}",
			"badge.editable": "可编辑"
		};
		/** English dictionary, key-identical to the Chinese source of truth. */
		const en = {
			"chip.none": "OKF",
			"chip.title": "Choose an OKF knowledge bundle for this session, or browse the library",
			"chip.titleSelected": "This session uses the bundle {name}. Click to change or preview it",
			"dialog.title": "OKF bundles",
			"dialog.close": "Close",
			"session.label": "This session uses",
			"session.none": "No bundle",
			"session.saved": "Saved. It applies from the next turn.",
			"session.hint": "Each turn, the agent receives the selected bundle’s catalog and folder, and reads the pages with its own file tools. It can edit pages only in the bundle’s own editing workspace.",
			"library.title": "Library",
			"library.empty": "No bundles yet. Fetch one from a git repository, or add a local folder.",
			"library.offline": "The OKF Host half does not answer. Restart dsh web after installing the plugin.",
			"library.dir": "Stored in {dir}",
			"library.inSession": "This session",
			"origin.git": "Git",
			"origin.local": "Local",
			"add.open": "Add bundle",
			"add.cancel": "Cancel",
			"add.tabGit": "From git",
			"add.tabLocal": "Local folder",
			"add.url": "Repository URL",
			"add.urlHint": "GitHub, Azure DevOps (dev.azure.com/org/project/_git/repo) or any git remote; HTTPS or SSH.",
			"add.ref": "Branch or tag (optional)",
			"add.path": "Bundle folder in the repository (optional, found automatically)",
			"add.id": "Library id (optional)",
			"add.localPath": "Absolute path of a local folder",
			"add.submit": "Fetch",
			"add.submitLocal": "Add",
			"add.busy": "Fetching…",
			"add.auth": "Authentication uses git’s own credential manager or SSH keys. You can also set DSH_OKF_AZURE_TOKEN, DSH_OKF_GITHUB_TOKEN or DSH_OKF_GIT_TOKEN before starting dsh.",
			"add.pick": "This location holds several bundles. Choose one:",
			"action.update": "Update",
			"action.updating": "Updating…",
			"action.updated": "Already at {commit}",
			"action.updatedNew": "Updated to {commit}",
			"action.remove": "Remove",
			"action.removeConfirm": "Remove {name} from the library?",
			"action.removeFiles": "Also delete the downloaded files",
			"action.removeYes": "Remove",
			"action.use": "Use in this session",
			"action.using": "Used by this session",
			"action.retry": "Retry",
			"action.back": "Back to the catalog",
			"action.forceUpdate": "Overwrite local edits and update",
			"preview.pick": "Choose a bundle on the left to preview it.",
			"preview.loading": "Reading…",
			"preview.pages": "{count} pages",
			"preview.version": "OKF {version}",
			"preview.noVersion": "No OKF version declared",
			"preview.fetched": "Fetched {at}",
			"preview.commit": "Commit {commit}",
			"preview.filter": "Filter pages (title, path, description, tags)",
			"preview.untyped": "{count} pages lack the type field OKF requires",
			"preview.truncated": "Too many pages; only the first {count} are listed.",
			"preview.noMatch": "No page matches.",
			"preview.root": "Root",
			"page.meta": "Metadata",
			"page.empty": "This page has no body.",
			"error.generic": "Something went wrong: {message}",
			"edit.open": "Edit as workspace",
			"edit.openExisting": "Open editing workspace",
			"edit.hint": "Registers the bundle’s own folder as a DSH workspace and opens a session there with the bundle attached. The agent can edit the bundle only from sessions in that workspace. From then on, Update only fast-forwards and never discards your changes.",
			"edit.busy": "Preparing…",
			"edit.manual": "{name} is now editable in {path}. Add that folder with Add workspace… in the sidebar, then pick {name} in a session there.",
			"edit.manualReason": "Could not open the workspace automatically: {reason}",
			"badge.editable": "Editable"
		};
		//#endregion
		//#region src/client/index.ts
		/** Required services: the slot registry and dictionaries. */
		const inject = ["slots", "locale"];
		/**
		* Client plugin body.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register("okf", {
				zh,
				en
			}), "okf: dictionaries");
			let navigation;
			ctx.inject(["workspaces", "uiWorkspace"], (scope) => {
				scope.effect(() => {
					navigation = {
						workspaces: scope.workspaces,
						uiWorkspace: scope.uiWorkspace
					};
					return () => {
						navigation = void 0;
					};
				}, "okf: workspace services");
			});
			ctx.effect(() => {
				const store = createOkfStore(void 0, () => navigation);
				const injected = () => ({ store });
				const disposeDialog = ctx.slots.inject("shell.overlay", () => ctx.slots.register({
					name: "shell.overlay",
					id: "okf-dialog",
					locale: "okf",
					inject: injected
				}, OkfDialog));
				const disposeChip = ctx.slots.inject("conversation.session.header.utilities", () => ctx.slots.register({
					name: "conversation.session.header.utilities",
					id: "okf-bundle",
					order: -20,
					locale: "okf",
					inject: injected
				}, SessionChip));
				const disposeComposer = ctx.slots.inject("conversation.input.right", () => ctx.slots.register({
					name: "conversation.input.right",
					id: "okf-bundle",
					order: -20,
					locale: "okf",
					inject: () => ({
						store,
						compact: true
					})
				}, SessionChip));
				return () => {
					disposeComposer();
					disposeChip();
					disposeDialog();
					store.dispose();
				};
			}, "okf: session chip and dialog");
		}
		//#endregion
		exports.apply = apply;
		exports.bundleTarget = bundleTarget;
		exports.inject = inject;
		exports.renderMarkdown = renderMarkdown;
		return module.exports;
	}
});
