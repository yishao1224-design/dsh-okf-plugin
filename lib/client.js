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
			},
			twPage: {
				display: "flex",
				flexDirection: "column",
				height: "100%",
				minHeight: 0,
				background: "var(--dsw-alias-bg-base)",
				color: "var(--dsw-alias-label-primary)",
				fontSize: 13
			},
			twHeader: {
				display: "flex",
				alignItems: "center",
				gap: 10,
				flexWrap: "wrap",
				padding: "14px 22px",
				borderBottom: "0.5px solid var(--dsw-alias-border-l3)"
			},
			twTitle: {
				margin: 0,
				fontSize: 16,
				fontWeight: 600
			},
			twRepo: {
				fontFamily: mono,
				fontSize: 12,
				color: "var(--dsw-alias-label-tertiary)",
				overflow: "hidden",
				textOverflow: "ellipsis",
				whiteSpace: "nowrap",
				minWidth: 0
			},
			twSpacer: { flex: 1 },
			twTabs: {
				display: "flex",
				gap: 2,
				padding: "0 22px",
				borderBottom: "0.5px solid var(--dsw-alias-border-l3)"
			},
			twTab: {
				padding: "9px 12px",
				border: "none",
				borderBottom: "2px solid transparent",
				background: "transparent",
				color: "var(--dsw-alias-label-secondary)",
				font: "inherit",
				fontSize: 13,
				cursor: "pointer",
				marginBottom: -.5
			},
			twTabActive: {
				color: "var(--dsw-alias-label-primary)",
				borderBottomColor: "var(--dsw-alias-brand-primary)",
				fontWeight: 500
			},
			twBody: {
				display: "flex",
				flex: 1,
				minHeight: 0,
				flexWrap: "wrap"
			},
			twList: {
				flex: "1 1 260px",
				maxWidth: 340,
				minHeight: 0,
				overflowY: "auto",
				padding: 12,
				borderRight: "0.5px solid var(--dsw-alias-border-l3)",
				boxSizing: "border-box"
			},
			twDetail: {
				flex: "999 1 420px",
				minWidth: 0,
				minHeight: 0,
				overflowY: "auto",
				padding: "18px 22px 28px",
				boxSizing: "border-box"
			},
			twCard: {
				display: "block",
				width: "100%",
				textAlign: "left",
				padding: "10px 12px",
				marginBottom: 6,
				boxSizing: "border-box",
				border: "0.5px solid var(--dsw-alias-border-l3)",
				borderRadius: 10,
				background: "transparent",
				color: "inherit",
				font: "inherit",
				cursor: "pointer",
				transition: feedback
			},
			twCardActive: {
				borderColor: "var(--dsw-alias-brand-primary)",
				background: "var(--dsw-alias-interactive-bg-active)"
			},
			twCardName: {
				display: "flex",
				alignItems: "center",
				gap: 6,
				fontWeight: 600,
				flexWrap: "wrap"
			},
			twMono: {
				fontFamily: mono,
				fontSize: 11,
				color: "var(--dsw-alias-label-tertiary)",
				overflowWrap: "anywhere"
			},
			twMeta: {
				marginTop: 4,
				fontSize: 12,
				color: "var(--dsw-alias-label-secondary)"
			},
			twDetailHead: {
				display: "flex",
				alignItems: "flex-start",
				gap: 12,
				flexWrap: "wrap",
				marginBottom: 14
			},
			twDetailName: {
				margin: 0,
				fontSize: 18,
				fontWeight: 600
			},
			twStats: {
				display: "grid",
				gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
				gap: 8,
				marginBottom: 16
			},
			twStat: {
				padding: "10px 12px",
				border: "0.5px solid var(--dsw-alias-border-l3)",
				borderRadius: 10
			},
			twStatValue: {
				fontSize: 20,
				fontWeight: 600,
				lineHeight: 1.2
			},
			twStatLabel: {
				fontSize: 11,
				color: "var(--dsw-alias-label-tertiary)"
			},
			twRow: {
				display: "flex",
				alignItems: "flex-start",
				gap: 10,
				flexWrap: "wrap",
				padding: "10px 2px",
				borderBottom: "0.5px solid var(--dsw-alias-border-l3)"
			},
			twRowMain: {
				flex: "1 1 260px",
				minWidth: 0
			},
			twRowTitle: {
				display: "flex",
				alignItems: "center",
				gap: 6,
				flexWrap: "wrap",
				fontWeight: 500
			},
			twReasons: {
				margin: "4px 0 0",
				paddingLeft: 18,
				fontSize: 12,
				color: "var(--dsw-alias-label-secondary)"
			},
			twLink: {
				color: "var(--dsw-alias-link)",
				textDecoration: "none"
			},
			twForm: {
				maxWidth: 560,
				margin: "28px auto",
				padding: "0 22px",
				display: "flex",
				flexDirection: "column",
				gap: 4
			},
			twModal: {
				display: "flex",
				flexDirection: "column",
				width: "min(620px, 100%)",
				maxHeight: "100%",
				overflow: "hidden",
				border: "0.5px solid var(--dsw-alias-border-l3)",
				borderRadius: 14,
				background: "var(--dsw-alias-bg-base)",
				color: "var(--dsw-alias-label-primary)",
				boxShadow: "0 16px 48px rgb(0 0 0 / 0.28)",
				fontSize: 13
			},
			twModalBody: {
				padding: "14px 18px",
				overflowY: "auto",
				display: "flex",
				flexDirection: "column",
				gap: 4
			},
			twModalFoot: {
				display: "flex",
				justifyContent: "flex-end",
				gap: 8,
				padding: "12px 18px",
				borderTop: "0.5px solid var(--dsw-alias-border-l3)"
			},
			twSteps: {
				margin: "10px 0 0",
				padding: "10px 12px 10px 30px",
				borderRadius: 10,
				background: "var(--dsw-alias-interactive-bg-hover)",
				fontSize: 12,
				lineHeight: 1.6,
				color: "var(--dsw-alias-label-secondary)"
			},
			twTextarea: {
				minHeight: 70,
				resize: "vertical",
				fontFamily: "inherit"
			},
			twNotice: {
				margin: "10px 22px 0",
				padding: "8px 10px",
				borderRadius: 8,
				fontSize: 12,
				display: "flex",
				gap: 8,
				alignItems: "flex-start"
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
			session: `${API_BASE}/session`,
			team: `${API_BASE}/team`,
			teamConnect: `${API_BASE}/team/connect`,
			teamRefresh: `${API_BASE}/team/refresh`,
			teamWiki: `${API_BASE}/team/wiki`,
			teamPulls: `${API_BASE}/team/pulls`,
			teamCreate: `${API_BASE}/team/create`,
			teamMaintain: `${API_BASE}/team/maintain`,
			teamPublish: `${API_BASE}/team/publish`,
			teamSetup: `${API_BASE}/team/setup`,
			teamInitialize: `${API_BASE}/team/initialize`,
			teamSync: `${API_BASE}/team/sync`,
			teamChanges: `${API_BASE}/team/changes`,
			teamOpenPr: `${API_BASE}/team/open-pr`,
			teamAttach: `${API_BASE}/team/attach`
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
				dialog: { open: false },
				team: {
					status: { status: "idle" },
					pulls: { status: "idle" },
					wikis: {},
					changes: {}
				}
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
			const setTeam = (next) => {
				set({ team: {
					...state.team,
					...next
				} });
			};
			const failed = (before, error) => ({
				...before,
				status: "failed",
				error: error.message
			});
			const loadTeam = async () => {
				setTeam({ status: {
					...state.team.status,
					status: "loading"
				} });
				try {
					setTeam({ status: {
						status: "ready",
						data: await call(fetcher, ROUTES.team, { timeoutMs: GIT_TIMEOUT_MS })
					} });
				} catch (error) {
					setTeam({ status: failed(state.team.status, error) });
				}
			};
			const loadPulls = async (force = false) => {
				setTeam({ pulls: {
					...state.team.pulls,
					status: "loading"
				} });
				try {
					const data = await call(fetcher, ROUTES.teamPulls, {
						...force ? { query: { refresh: "1" } } : {},
						timeoutMs: GIT_TIMEOUT_MS
					});
					setTeam({ pulls: {
						status: "ready",
						data
					} });
					if (data.statusChanged === true) {
						setTeam({ wikis: {} });
						await loadTeam();
					}
				} catch (error) {
					setTeam({ pulls: failed(state.team.pulls, error) });
				}
			};
			/** Register the workspace, open a session there with the entry attached, and show it. */
			const openWorkspace = async (entry, path, prompt) => {
				const services = navigation();
				if (services === void 0) return {
					opened: false,
					reason: "unavailable"
				};
				try {
					const workspace = await services.workspaces.create({ path });
					await waitForWorkspace(services.workspaces, workspace.workspaceId);
					const sessionId = await services.uiWorkspace.connectWorkspace(workspace.workspaceId);
					await select(sessionId, entry.id);
					services.layout?.selectPanel(null);
					if (prompt !== void 0 && services.uiWorkspace.startSession !== void 0) {
						services.uiWorkspace.startSession(workspace.workspaceId, {
							prompt,
							clearPreviousDraft: true
						});
						return {
							opened: true,
							prefilled: true
						};
					}
					services.uiWorkspace.openSession(sessionId);
					return {
						opened: true,
						prefilled: false
					};
				} catch (error) {
					return {
						opened: false,
						reason: error.message
					};
				}
			};
			const afterMaintain = async (answer) => {
				await Promise.all([refreshLibrary(), loadTeam()]);
				return {
					answer,
					...await openWorkspace(answer.entry, answer.workspace, answer.initialize?.prompt)
				};
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
				loadTeam,
				async connectTeam(request) {
					const data = await call(fetcher, ROUTES.teamConnect, {
						method: "POST",
						body: request,
						timeoutMs: GIT_TIMEOUT_MS
					});
					setTeam({
						status: {
							status: "ready",
							data
						},
						wikis: {},
						pulls: { status: "idle" }
					});
					loadPulls();
				},
				async refreshTeam() {
					setTeam({ status: {
						...state.team.status,
						status: "loading"
					} });
					try {
						const data = await call(fetcher, ROUTES.teamRefresh, {
							method: "POST",
							body: {},
							timeoutMs: GIT_TIMEOUT_MS
						});
						setTeam({
							status: {
								status: "ready",
								data
							},
							wikis: {}
						});
					} catch (error) {
						setTeam({ status: failed(state.team.status, error) });
					}
					await loadPulls(true);
				},
				async setupHub() {
					const data = await call(fetcher, ROUTES.teamSetup, {
						method: "POST",
						body: {},
						timeoutMs: GIT_TIMEOUT_MS
					});
					setTeam({
						status: {
							status: "ready",
							data
						},
						wikis: {}
					});
				},
				async loadWiki(folder) {
					const before = state.team.wikis[folder] ?? { status: "idle" };
					setTeam({ wikis: {
						...state.team.wikis,
						[folder]: {
							...before,
							status: "loading"
						}
					} });
					try {
						const data = await call(fetcher, ROUTES.teamWiki, { query: { folder } });
						setTeam({ wikis: {
							...state.team.wikis,
							[folder]: {
								status: "ready",
								data
							}
						} });
					} catch (error) {
						setTeam({ wikis: {
							...state.team.wikis,
							[folder]: failed(before, error)
						} });
					}
				},
				loadPulls,
				async createWiki(request) {
					const answer = await call(fetcher, ROUTES.teamCreate, {
						method: "POST",
						body: request,
						timeoutMs: GIT_TIMEOUT_MS * 2
					});
					return afterMaintain(answer);
				},
				async initializeWiki(folder) {
					const answer = await call(fetcher, ROUTES.teamInitialize, {
						method: "POST",
						body: { folder },
						timeoutMs: GIT_TIMEOUT_MS * 2
					});
					return afterMaintain(answer);
				},
				async syncWiki(folder) {
					const answer = await call(fetcher, ROUTES.teamSync, {
						method: "POST",
						body: { folder },
						timeoutMs: GIT_TIMEOUT_MS * 2
					});
					if ("upToDate" in answer) return answer;
					return afterMaintain(answer);
				},
				async maintainWiki(folder) {
					const answer = await call(fetcher, ROUTES.teamMaintain, {
						method: "POST",
						body: { folder },
						timeoutMs: GIT_TIMEOUT_MS
					});
					return afterMaintain(answer);
				},
				async publishWiki(folder) {
					const answer = await call(fetcher, ROUTES.teamPublish, {
						method: "POST",
						body: { folder },
						timeoutMs: GIT_TIMEOUT_MS * 2
					});
					loadTeam();
					loadPulls(true);
					return answer;
				},
				async loadChanges(maintainId) {
					const before = state.team.changes[maintainId] ?? { status: "idle" };
					setTeam({ changes: {
						...state.team.changes,
						[maintainId]: {
							...before,
							status: "loading"
						}
					} });
					try {
						const data = await call(fetcher, ROUTES.teamChanges, {
							query: { id: maintainId },
							timeoutMs: GIT_TIMEOUT_MS
						});
						setTeam({ changes: {
							...state.team.changes,
							[maintainId]: {
								status: "ready",
								data
							}
						} });
					} catch (error) {
						setTeam({ changes: {
							...state.team.changes,
							[maintainId]: failed(before, error)
						} });
					}
				},
				async openPr(maintainId, request) {
					const answer = await call(fetcher, ROUTES.teamOpenPr, {
						method: "POST",
						body: {
							id: maintainId,
							...request
						},
						timeoutMs: GIT_TIMEOUT_MS * 2
					});
					loadTeam();
					loadPulls(true);
					return answer;
				},
				async previewWiki(folder) {
					const answer = await call(fetcher, ROUTES.teamAttach, {
						method: "POST",
						body: { folder }
					});
					await refreshLibrary();
					set({ dialog: {
						open: true,
						bundleId: answer.entry.id
					} });
				},
				openPrDialog(maintainId) {
					const { prDialog: _drop, ...rest } = state.team;
					set({ team: {
						...rest,
						...maintainId === void 0 ? {} : { prDialog: { maintainId } }
					} });
				},
				setNotice(notice) {
					const { notice: _drop, ...rest } = state.team;
					set({ team: {
						...rest,
						...notice === void 0 ? {} : { notice }
					} });
				},
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
			"badge.editable": "可编辑",
			"panel": "团队 Wiki",
			"team.title": "团队 Wiki",
			"team.loading": "正在读取团队 Wiki…",
			"team.refresh": "刷新",
			"team.refreshing": "正在刷新…",
			"team.refreshedAt": "基准分支读取于 {at}",
			"team.changeRepo": "更换仓库",
			"team.new": "+ 新建项目 Wiki",
			"team.tabWikis": "项目 Wiki",
			"team.tabBundles": "本机知识库",
			"team.noToken": "DSH 主机端没有设置 DSH_OKF_GITHUB_TOKEN，无法创建 PR，列表也可能触发 GitHub 匿名访问限额。请在启动 dsh 前设置。",
			"team.connectTitle": "连接团队 Wiki 仓库",
			"team.connectHint": "一个 hub 仓库存放团队所有项目的 OKF bundle，在 AGENTS.md 的登记表里注册，共用 scripts/okf.py、CI 和自动合并规则。可以连一个空仓库，连上后一键初始化。",
			"team.branch": "基准分支（可选，默认用远端默认分支）",
			"team.root": "项目 Wiki 所在文件夹（只在没有 AGENTS.md 登记表时使用）",
			"team.connect": "连接",
			"team.connecting": "正在克隆…",
			"team.noWikis": "还没有项目 Wiki。用「新建项目 Wiki」建一个，它会登记到 AGENTS.md。（没有登记表时，{root} 下带 SCHEMA.md 的文件夹也算。）",
			"team.beingMaintained": "维护中",
			"team.cardMeta": "{pages} 页 · {unreviewed} 页未审阅",
			"team.cardPrs": "{count} 个未合并 PR",
			"team.pendingWiki": "新建，未合并",
			"team.pendingNoPr": "还没有 PR",
			"team.pickWiki": "在左侧选择一个项目 Wiki。",
			"team.maintaining": "维护工作区，分支 {branch}",
			"team.prNumber": "PR #{number}",
			"team.maintain": "维护",
			"team.maintainOpen": "打开工作区",
			"team.maintainHint": "打开这个 Wiki 的维护工作区（独立克隆，在 wiki/… 分支上），并在其中打开可编辑它的会话。修改通过“创建 PR”提交给团队。",
			"team.opening": "正在打开…",
			"team.preview": "预览",
			"team.previewHint": "把基准分支上的这个 Wiki 以只读方式加入知识库，并在 OKF 对话框中打开。可以通过 OKF 按钮附加到任意会话。",
			"team.statPages": "页面",
			"team.statReviewed": "已审阅",
			"team.statUnreviewed": "未审阅",
			"team.statOverdue": "审阅过期",
			"team.tabPulls": "PR（{count}）",
			"team.tabPages": "页面（{count}）",
			"team.tabReview": "待审阅（{count}）",
			"team.noPages": "这个 Wiki 还没有页面。",
			"team.noReview": "所有页面都已审阅且未过期。",
			"team.pullsAt": "检查于 {at}",
			"team.refreshPulls": "刷新 PR",
			"team.pullsAzure": "目前只列出 GitHub 仓库的 PR，暂不支持 Azure DevOps；“创建 PR”仍会推送分支。",
			"team.pullsNotGithub": "目前只列出 GitHub 仓库的 PR。",
			"team.pullsFetchFailed": "无法获取 PR 分支，部分判定缺失。",
			"team.noPulls": "没有涉及这个 Wiki 的未合并 PR。",
			"team.draft": "草稿",
			"team.pullMeta": "{author} · {branch} · {files} 个文件 · 更新于 {at}",
			"team.openSession": "打开会话",
			"team.reviewOnGithub": "在 GitHub 审阅",
			"team.checksFailed": "检查失败",
			"team.needsHuman": "需要人工审阅",
			"team.eligibleRunning": "可自动合并 · CI 运行中",
			"team.eligible": "可自动合并",
			"team.filterPages": "筛选页面",
			"team.reviewedBy": "已审阅 · {who} · {at}",
			"team.unreviewed": "未审阅",
			"team.unreviewedBy": "未审阅 · {who} · {at}",
			"team.stale": "{at} 起过期",
			"team.bundlesHint": "OKF 知识库中的所有知识包，包括你预览或维护过的项目 Wiki。",
			"team.maintainBadge": "维护",
			"team.openInDialog": "打开",
			"team.newTitle": "新建项目 Wiki",
			"team.newName": "名称",
			"team.newFolder": "文件夹",
			"team.newWhere": "放在 {repo} 的 {path}，与其他项目 Wiki 并列。",
			"team.newTemplate": "起始模板",
			"team.templateCopy": "团队 SCHEMA（复制自 {name}）",
			"team.templateDefault": "okf.py 默认 SCHEMA",
			"team.newStep1": "在新分支 {branch} 上创建工作区，并运行 okf.py init 生成 SCHEMA.md、index.md 和 log.md",
			"team.newStep2": "注册为 DSH 工作区，并在其中打开维护会话",
			"team.newStep3": "在 AGENTS.md 登记表里加一行，和初始化内容一起作为第一个 PR 提交；合并后出现在列表中",
			"team.create": "创建并打开工作区",
			"team.creating": "正在创建…",
			"team.created": "已在分支 {branch} 上创建 {name}。",
			"team.createdPr": "初始化 PR 是 #{number}。",
			"team.createdNoPr": "初始化 PR 没有创建：{reason}",
			"team.openPr": "创建 PR",
			"team.updatePr": "更新 PR #{number}",
			"team.updatePrShort": "更新 PR",
			"team.prButtonHint": "对这个 Wiki 运行 okf.py links、index、lint 和 log，提交、推送分支，并创建或更新 PR",
			"team.prBranch": "分支 {branch} · 只提交 {folder}",
			"team.changedFiles": "改动（{count}）",
			"team.noChanges": "还没有改动。",
			"team.reviewedEdited": "已审阅页面：将重置为未审阅",
			"team.outsideFiles": "Wiki 之外的 {count} 个改动不会提交。",
			"team.prTitle": "标题",
			"team.prTitleDefault": "更新 {name} Wiki",
			"team.prTitleKeep": "保留当前标题",
			"team.prSummary": "说明（按改动自动填好，可以改）",
			"team.prExplain": "lint 必须通过。只涉及未审阅页面、新增来源、index.md 和 log.md 的改动会打上自动合并标签，CI 会再检查一次。修改已审阅页面、删除页面或改 SCHEMA.md 需要人工审阅。",
			"team.prBusy": "正在运行 okf.py 并推送…",
			"team.pushed": "已推送 {branch}",
			"team.prOpened": "已创建 PR #{number}",
			"team.prUpdated": "已更新 PR #{number}",
			"team.stamped": "因为被修改而重置为未审阅草稿：{pages}",
			"team.rootPlaceholder": "留空 = 仓库根目录",
			"team.missing": "登记表里有，但仓库里还没有这个文件夹",
			"team.owner": "负责人 {owner}",
			"team.codeRepo": "代码仓库",
			"team.notPublished": "还没有发布到 ADO Wiki",
			"team.published": "已发布",
			"team.publishedAt": "{at} 发布",
			"team.notRegistered": "不在 AGENTS.md 登记表里",
			"team.pointerTitle": "给代码仓库的 AGENTS.md 片段",
			"team.pointerHint": "把这段放进项目代码仓库的 AGENTS.md，那里的 agent 就知道去 hub 找这个项目的知识。",
			"team.copy": "复制",
			"team.copied": "已复制",
			"team.newRepo": "代码仓库 URL",
			"team.newOwner": "负责人",
			"team.newSummary": "一句话简介",
			"team.emptyTitle": "这个仓库还是空的",
			"team.emptyText": "{name} 里还没有任何提交。要把它设成团队 Wiki hub，会生成下面这些文件，作为第一个提交直接推到 {branch} 分支（空仓库没法开 PR）。之后的改动都走 PR。",
			"team.setUp": "初始化 hub",
			"team.settingUp": "初始化中…",
			"team.initialize": "从代码初始化",
			"team.initializing": "准备中…",
			"team.initHint": "把代码仓库只读 clone 到工作区的 .code/ 下，打开 session 并预填通读任务",
			"team.initNoRepo": "AGENTS.md 登记表里没有这个项目的代码仓库 URL",
			"team.initPrefilled": "代码已 clone 到 {code}/。通读任务已经填进 session 的输入框，检查一下就按发送。",
			"team.initCopied": "代码已 clone 到 {code}/。这个版本的 dsh 不支持预填，任务已复制到剪贴板，粘贴到 session 里发送：",
			"team.initFailed": "没能准备代码：{reason}",
			"team.sync": "从代码同步",
			"team.syncing": "对比代码中…",
			"team.syncHint": "拉取代码仓库的最新提交，打开 session 并预填任务：wiki 还没对应过代码时通读代码写页面，之后只更新上次以来改动影响到的页面",
			"team.syncUpToDate": "代码没有新提交，wiki 已经对应 {commit}。",
			"team.syncFound": "代码从 {from} 到 {to} 改了 {files} 个文件，{pages} 个页面引用了这些文件。",
			"team.syncFallback": "wiki 还没有对应过代码，这次先通读代码写页面。",
			"team.codeUpdated": "代码有更新",
			"team.codeRecorded": "wiki 对应代码提交 {commit}",
			"team.codeNotRecorded": "wiki 还没有记录对应的代码提交",
			"team.codeHead": "代码仓库最新是 {commit}（{at} 检查）",
			"team.codeCheckFailed": "检查代码仓库失败：{reason}",
			"team.newInitialize": "读代码仓库，起草第一批页面",
			"team.newInitializeHint": "把代码只读 clone 到 .code/（不会进 PR），并在 session 里预填通读任务。需要填代码仓库 URL。",
			"team.publish": "发布",
			"team.publishHint": "把这个 Wiki 渲染到 published/Projects/，供 Azure DevOps Wiki 使用，并开一个 PR 等人审",
			"team.publishing": "发布中…",
			"team.publishDone": "已把 {pages} 个页面渲染到 {dir}。PR #{number} 等人审核，合并后同步到 Azure DevOps Wiki。",
			"team.publishPushed": "已把 {pages} 个页面渲染到 {dir}，推送到分支 {branch}。",
			"team.publishUnchanged": "{dir} 里的发布页面已经和 bundle 一致，没有要提交的。",
			"team.publishFailed": "已把 {pages} 个页面渲染到 {dir}，但 PR 没开成：",
			"team.publishSkipped": "（{count} 个页面没发布：源文件、已废弃或记录类页面）"
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
			"badge.editable": "Editable",
			"panel": "Team Wiki",
			"team.title": "Team Wiki",
			"team.loading": "Loading the team wiki…",
			"team.refresh": "Refresh",
			"team.refreshing": "Refreshing…",
			"team.refreshedAt": "Base branch read at {at}",
			"team.changeRepo": "Change repository",
			"team.new": "+ New project wiki",
			"team.tabWikis": "Project wikis",
			"team.tabBundles": "Local library",
			"team.noToken": "DSH_OKF_GITHUB_TOKEN is not set for the DSH Host, so pull requests cannot be opened and the list may hit GitHub’s anonymous rate limit. Set it before starting dsh.",
			"team.connectTitle": "Connect the team wiki repository",
			"team.connectHint": "One hub repository holds every project's OKF bundle, registered in its AGENTS.md, sharing scripts/okf.py, CI and the auto-merge rule. An empty repository works too: set it up after connecting.",
			"team.branch": "Base branch (optional, defaults to the remote’s default branch)",
			"team.root": "Folder holding the project wikis (used only without an AGENTS.md registry)",
			"team.connect": "Connect",
			"team.connecting": "Cloning…",
			"team.noWikis": "No project wikis yet. Add one with New project wiki; it is registered in AGENTS.md. (Without a registry, any folder under {root} with a SCHEMA.md counts too.)",
			"team.beingMaintained": "Being maintained",
			"team.cardMeta": "{pages} pages · {unreviewed} unreviewed",
			"team.cardPrs": "{count} open PRs",
			"team.pendingWiki": "New, not merged",
			"team.pendingNoPr": "No pull request yet",
			"team.pickWiki": "Pick a project wiki on the left.",
			"team.maintaining": "Maintenance workspace on branch {branch}",
			"team.prNumber": "PR #{number}",
			"team.maintain": "Maintain",
			"team.maintainOpen": "Open workspace",
			"team.maintainHint": "Opens this wiki’s maintenance workspace (its own clone on a wiki/… branch) and a session there that may edit it. Changes reach the team through Open pull request.",
			"team.opening": "Opening…",
			"team.preview": "Preview",
			"team.previewHint": "Adds the wiki as it is on the base branch to your library (read-only) and opens it in the OKF dialog. Attach it to any session from the OKF chip.",
			"team.statPages": "Pages",
			"team.statReviewed": "Reviewed",
			"team.statUnreviewed": "Unreviewed",
			"team.statOverdue": "Overdue review",
			"team.tabPulls": "Pull requests ({count})",
			"team.tabPages": "Pages ({count})",
			"team.tabReview": "Needs review ({count})",
			"team.noPages": "This wiki has no pages yet.",
			"team.noReview": "Every page is reviewed and current.",
			"team.pullsAt": "Checked at {at}",
			"team.refreshPulls": "Refresh PRs",
			"team.pullsAzure": "Pull requests are listed for GitHub repositories only. Azure DevOps listing is not supported yet; Open pull request still pushes the branch.",
			"team.pullsNotGithub": "Pull requests are listed for GitHub repositories only.",
			"team.pullsFetchFailed": "Could not fetch the pull request branches, so some verdicts are missing.",
			"team.noPulls": "No open pull requests touch this wiki.",
			"team.draft": "Draft",
			"team.pullMeta": "{author} · {branch} · {files} files · updated {at}",
			"team.openSession": "Open session",
			"team.reviewOnGithub": "Review on GitHub",
			"team.checksFailed": "Checks failed",
			"team.needsHuman": "Needs human review",
			"team.eligibleRunning": "Auto-merge eligible · CI running",
			"team.eligible": "Auto-merge eligible",
			"team.filterPages": "Filter pages",
			"team.reviewedBy": "Reviewed · {who} · {at}",
			"team.unreviewed": "Unreviewed",
			"team.unreviewedBy": "Unreviewed · {who} · {at}",
			"team.stale": "Stale since {at}",
			"team.bundlesHint": "Every bundle in your OKF library, including project wikis you previewed or maintain.",
			"team.maintainBadge": "Maintenance",
			"team.openInDialog": "Open",
			"team.newTitle": "New project wiki",
			"team.newName": "Name",
			"team.newFolder": "Folder",
			"team.newWhere": "Lives in {repo} at {path}, next to the other project wikis.",
			"team.newTemplate": "Start from",
			"team.templateCopy": "Team SCHEMA (copied from {name})",
			"team.templateDefault": "okf.py default SCHEMA",
			"team.newStep1": "Makes a workspace on a new branch {branch} and runs okf.py init for SCHEMA.md, index.md and log.md",
			"team.newStep2": "Registers it as a DSH workspace and opens a session there to maintain the wiki",
			"team.newStep3": "Adds a row to the AGENTS.md registry and opens it with the setup as the first pull request; once merged, the wiki shows in the list",
			"team.create": "Create and open workspace",
			"team.creating": "Creating…",
			"team.created": "Created {name} on branch {branch}.",
			"team.createdPr": "Its setup pull request is PR #{number}.",
			"team.createdNoPr": "The setup pull request was not opened: {reason}",
			"team.openPr": "Open pull request",
			"team.updatePr": "Update PR #{number}",
			"team.updatePrShort": "Update pull request",
			"team.prButtonHint": "Run okf.py links, index, lint and log over this wiki, commit it, push the branch and open or update its pull request",
			"team.prBranch": "Branch {branch} · only {folder} is committed",
			"team.changedFiles": "Changed ({count})",
			"team.noChanges": "Nothing changed yet.",
			"team.reviewedEdited": "Reviewed page: resets to unreviewed",
			"team.outsideFiles": "{count} changed files outside the wiki are left out.",
			"team.prTitle": "Title",
			"team.prTitleDefault": "Update the {name} wiki",
			"team.prTitleKeep": "Keep the current title",
			"team.prSummary": "Summary (filled in from the changes; edit as you like)",
			"team.prExplain": "Lint must pass. A change that only touches unreviewed pages, new captures, index.md and log.md is labelled for auto-merge; CI re-checks it. Editing a reviewed page, deleting a page or changing SCHEMA.md needs a person.",
			"team.prBusy": "Running okf.py and pushing…",
			"team.pushed": "Pushed {branch}",
			"team.prOpened": "Opened PR #{number}",
			"team.prUpdated": "Updated PR #{number}",
			"team.stamped": "Reset to unreviewed drafts because they were edited: {pages}",
			"team.rootPlaceholder": "blank = repository root",
			"team.missing": "Registered, but the folder is not in the repository yet",
			"team.owner": "Owner {owner}",
			"team.codeRepo": "Code repository",
			"team.notPublished": "Not published to the ADO wiki yet",
			"team.published": "Published",
			"team.publishedAt": "Published {at}",
			"team.notRegistered": "Not in the AGENTS.md registry",
			"team.pointerTitle": "AGENTS.md snippet for the code repository",
			"team.pointerHint": "Put this in the project's code repository AGENTS.md so agents there know where its knowledge lives.",
			"team.copy": "Copy",
			"team.copied": "Copied",
			"team.newRepo": "Code repository URL",
			"team.newOwner": "Owner",
			"team.newSummary": "One-line summary",
			"team.emptyTitle": "This repository is empty",
			"team.emptyText": "{name} has no commits yet. Setting it up as the team wiki hub writes the files below and pushes them as the first commit of {branch} (an empty repository has no branch to open a pull request against). Every change after that goes through pull requests.",
			"team.setUp": "Set up the hub",
			"team.settingUp": "Setting up…",
			"team.initialize": "Initialize from code",
			"team.initializing": "Preparing…",
			"team.initHint": "Clone the code repository read-only into .code/ in the workspace and open a session with the read-through task prefilled",
			"team.initNoRepo": "The AGENTS.md registry has no code repository URL for this project",
			"team.initPrefilled": "The code is checked out at {code}/. The read-through task is in the session's message box: check it and press send.",
			"team.initCopied": "The code is checked out at {code}/. This dsh cannot prefill the message box, so the task is on the clipboard; paste it into the session:",
			"team.initFailed": "Could not prepare the code: {reason}",
			"team.sync": "Sync from code",
			"team.syncing": "Comparing…",
			"team.syncHint": "Fetch the code repository's latest commit and open a session with the task prefilled: a full read-through the first time, then only the pages the changes since the last sync affect",
			"team.syncUpToDate": "The code has no new commits; the wiki reflects {commit}.",
			"team.syncFound": "{files} files changed in the code from {from} to {to}; {pages} pages cite them.",
			"team.syncFallback": "The wiki has not been synced with the code yet, so this round reads the code through.",
			"team.codeUpdated": "Code updated",
			"team.codeRecorded": "The wiki reflects code commit {commit}",
			"team.codeNotRecorded": "The wiki records no code commit yet",
			"team.codeHead": "The code repository is at {commit} (checked {at})",
			"team.codeCheckFailed": "Could not check the code repository: {reason}",
			"team.newInitialize": "Read the code repository and draft the first pages",
			"team.newInitializeHint": "Clones the code read-only into .code/ (never part of a pull request) and prefills the read-through task in the session. Needs the code repository URL.",
			"team.publish": "Publish",
			"team.publishHint": "Render this wiki into published/Projects/ for the Azure DevOps wiki and open a pull request for a person to review",
			"team.publishing": "Publishing…",
			"team.publishDone": "Rendered {pages} pages into {dir}. Pull request #{number} waits for a person's review; once merged they sync to the Azure DevOps wiki.",
			"team.publishPushed": "Rendered {pages} pages into {dir} and pushed them on {branch}.",
			"team.publishUnchanged": "The published pages in {dir} already match the bundle; nothing to propose.",
			"team.publishFailed": "Rendered {pages} pages into {dir}, but the pull request was not opened:",
			"team.publishSkipped": "({count} files not published: source captures, deprecated pages and bookkeeping.)"
		};
		//#endregion
		//#region src/client/team.tsx
		/**
		* The Team Wiki page: a sidebar entry (`sidebar.panellist`) that shows a
		* `main` panel listing the team wiki repository's project wikis, their review
		* counts and open pull requests, with New project wiki and Maintain (each opens
		* a session in its own maintenance workspace). The All bundles tab is the
		* plugin's existing library.
		*
		* Two helpers ride along in a maintenance session: a header button that opens
		* the Open pull request dialog, and that dialog itself (in `shell.overlay`).
		*/
		/** How often an open workspace pull request is checked for a merge. */
		const PR_POLL_MS = 18e4;
		/**
		* The sidebar glyph.
		* @param props - the size the sidebar asks for.
		* @returns the icon.
		*/
		function TeamWikiIcon({ size }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 16 16",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M2.5 3.5h4a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 0-1.5-1.5h-4zM13.5 3.5h-4A1.5 1.5 0 0 0 8 5v8a1.5 1.5 0 0 1 1.5-1.5h4z",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "1.3",
					strokeLinejoin: "round"
				})
			});
		}
		/**
		* The page.
		* @param props - store and translate seat.
		* @returns the page.
		*/
		function TeamWikiPage({ store, t }) {
			const state = useOkf(store);
			const team = state.team;
			const [tab, setTab] = (0, react.useState)("wikis");
			const [creating, setCreating] = (0, react.useState)(false);
			const [changingRepo, setChangingRepo] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				if (team.status.status === "idle") store.loadTeam();
			}, [store, team.status.status]);
			const data = team.status.data;
			(0, react.useEffect)(() => {
				if (data?.team !== void 0 && team.pulls.status === "idle") store.loadPulls();
			}, [
				store,
				data?.team,
				team.pulls.status
			]);
			const waiting = data?.maintains.some((record) => record.pr !== void 0) === true;
			(0, react.useEffect)(() => {
				if (!waiting) return;
				const check = () => {
					if (store.getSnapshot().team.pulls.status !== "loading") store.loadPulls();
				};
				const onFocus = () => {
					check();
				};
				window.addEventListener("focus", onFocus);
				const timer = window.setInterval(check, PR_POLL_MS);
				return () => {
					window.removeEventListener("focus", onFocus);
					window.clearInterval(timer);
				};
			}, [store, waiting]);
			if (data === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: st("twPage"),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PageHeader, { t }), team.status.status === "failed" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: st("twForm"),
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: st("error"),
						children: team.status.error
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
						onClick: () => {
							store.loadTeam();
						},
						children: t("action.retry")
					}) })]
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: st("empty"),
					children: t("team.loading")
				})]
			});
			if (data.team === void 0 || changingRepo) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: st("twPage"),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PageHeader, { t }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConnectForm, {
					store,
					t,
					current: data.team,
					onDone: () => {
						setChangingRepo(false);
					},
					onCancel: data.team === void 0 ? void 0 : () => {
						setChangingRepo(false);
					}
				})]
			});
			const busy = team.status.status === "loading";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: st("twPage"),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(PageHeader, {
						t,
						repo: data.team.name,
						branch: data.baseBranch,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								disabled: busy,
								title: data.refreshedAt === void 0 ? void 0 : t("team.refreshedAt", { at: new Date(data.refreshedAt).toLocaleString() }),
								onClick: () => {
									store.refreshTeam();
								},
								children: busy ? t("team.refreshing") : t("team.refresh")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								onClick: () => {
									setChangingRepo(true);
								},
								children: t("team.changeRepo")
							}),
							data.empty !== true && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								variant: "primary",
								onClick: () => {
									setCreating(true);
								},
								children: t("team.new")
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: st("twTabs"),
						role: "tablist",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							role: "tab",
							"aria-selected": tab === "wikis",
							style: sx("twTab", tab === "wikis" && "twTabActive"),
							onClick: () => {
								setTab("wikis");
							},
							children: t("team.tabWikis")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							role: "tab",
							"aria-selected": tab === "bundles",
							style: sx("twTab", tab === "bundles" && "twTabActive"),
							onClick: () => {
								setTab("bundles");
							},
							children: t("team.tabBundles")
						})]
					}),
					team.notice !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							...st("twNotice"),
							...team.notice.kind === "error" ? st("error") : { border: "0.5px solid var(--dsw-alias-state-success-primary)" }
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: {
								flex: 1,
								whiteSpace: "pre-wrap"
							},
							children: team.notice.text
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
							onClick: () => {
								store.setNotice(void 0);
							},
							ariaLabel: t("dialog.close"),
							children: "×"
						})]
					}),
					!data.hasToken && data.team.provider === "github" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							...st("note"),
							margin: "8px 22px 0"
						},
						children: t("team.noToken")
					}),
					tab === "wikis" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WikisTab, {
						store,
						state,
						data,
						t,
						onCreate: () => {
							setCreating(true);
						}
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BundlesTab, {
						store,
						entries: state.library.entries,
						t
					}),
					creating && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(NewWikiDialog, {
						store,
						data,
						t,
						onClose: () => {
							setCreating(false);
						}
					})
				]
			});
		}
		/**
		* The page header.
		* @param props - repository name, base branch, header actions.
		* @returns the header.
		*/
		function PageHeader({ t, repo, branch, children }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: st("twHeader"),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h1", {
						style: st("twTitle"),
						children: t("team.title")
					}),
					repo !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						style: st("twRepo"),
						title: repo,
						children: [
							"· ",
							repo,
							branch === void 0 ? "" : ` (${branch})`
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: st("twSpacer") }),
					children
				]
			});
		}
		/**
		* Connect (or change) the team wiki repository.
		* @param props - store, the current repository, callbacks.
		* @returns the form.
		*/
		function ConnectForm({ store, t, current, onDone, onCancel }) {
			const [url, setUrl] = (0, react.useState)(current?.url ?? "");
			const [ref, setRef] = (0, react.useState)(current?.ref ?? "");
			const [root, setRoot] = (0, react.useState)(current?.root ?? "");
			const [busy, setBusy] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)(void 0);
			const submit = () => {
				setBusy(true);
				setError(void 0);
				store.connectTeam({
					url: url.trim(),
					...ref.trim() === "" ? {} : { ref: ref.trim() },
					root: root.trim()
				}).then(() => {
					setBusy(false);
					onDone();
				}, (failure) => {
					setBusy(false);
					setError(failure.message);
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("form", {
				style: st("twForm"),
				onSubmit: (event) => {
					event.preventDefault();
					submit();
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
						style: {
							...st("twDetailName"),
							fontSize: 16
						},
						children: t("team.connectTitle")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						style: st("note"),
						children: t("team.connectHint")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
						style: st("label"),
						htmlFor: "okf-team-url",
						children: t("add.url")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						id: "okf-team-url",
						style: st("input"),
						value: url,
						placeholder: "https://github.com/acme/team-wiki",
						onChange: (event) => {
							setUrl(event.target.value);
						}
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
						style: st("label"),
						htmlFor: "okf-team-ref",
						children: t("team.branch")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						id: "okf-team-ref",
						style: st("input"),
						value: ref,
						placeholder: "main",
						onChange: (event) => {
							setRef(event.target.value);
						}
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
						style: st("label"),
						htmlFor: "okf-team-root",
						children: t("team.root")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						id: "okf-team-root",
						style: st("input"),
						value: root,
						placeholder: t("team.rootPlaceholder"),
						onChange: (event) => {
							setRoot(event.target.value);
						}
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						style: st("note"),
						children: t("add.auth")
					}),
					error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: st("error"),
						children: error
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							...st("row"),
							marginTop: 10
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
							type: "submit",
							variant: "primary",
							disabled: busy || url.trim() === "",
							children: busy ? t("team.connecting") : t("team.connect")
						}), onCancel !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
							onClick: onCancel,
							children: t("add.cancel")
						})]
					})
				]
			});
		}
		/**
		* Open pull requests that touch a project wiki.
		* @param pulls - all listed pull requests.
		* @param folder - the wiki.
		* @returns its pull requests.
		*/
		function pullsOf(pulls, folder) {
			return (pulls ?? []).filter((pull) => pull.wikis.includes(folder));
		}
		/**
		* The Project wikis tab: list on the left, the selected wiki on the right.
		* @param props - store, state, status.
		* @returns the tab.
		*/
		function WikisTab({ store, state, data, t, onCreate }) {
			const [selected, setSelected] = (0, react.useState)(void 0);
			const pulls = state.team.pulls.data?.pulls;
			const pending = data.maintains.filter((record) => record.isNew === true && !data.wikis.some((wiki) => wiki.folder === record.wiki));
			const current = data.wikis.find((wiki) => wiki.folder === selected) ?? data.wikis.find((wiki) => wiki.maintainId !== void 0 || pullsOf(pulls, wiki.folder).length > 0) ?? data.wikis[0];
			if (data.empty === true) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyHub, {
				store,
				data,
				t
			});
			if (data.wikis.length === 0 && pending.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: st("empty"),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: t("team.noWikis", { root: data.team?.root || "/" }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
					variant: "primary",
					onClick: onCreate,
					children: t("team.new")
				})]
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: st("twBody"),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: st("twList"),
					children: [data.wikis.map((wiki) => {
						const open = pullsOf(pulls, wiki.folder).length;
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							style: sx("twCard", current?.folder === wiki.folder && "twCardActive"),
							onClick: () => {
								setSelected(wiki.folder);
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: st("twCardName"),
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: wiki.name }),
										wiki.maintainId !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: sx("badge", "badgeBrand"),
											children: t("team.beingMaintained")
										}),
										wiki.code?.behind === true && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: sx("badge", "badgeWarn"),
											title: codeTitle(wiki, t),
											children: t("team.codeUpdated")
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: st("twMono"),
									children: [
										wiki.folder,
										"/",
										wiki.owner === void 0 ? "" : ` · ${wiki.owner}`
									]
								}),
								wiki.summary !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										...st("twMeta"),
										overflow: "hidden",
										textOverflow: "ellipsis",
										whiteSpace: "nowrap"
									},
									title: wiki.summary,
									children: wiki.summary
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: st("twMeta"),
									children: [wiki.missing === true ? t("team.missing") : t("team.cardMeta", {
										pages: wiki.stats.pages,
										unreviewed: wiki.stats.unreviewed
									}), open > 0 && ` · ${t("team.cardPrs", { count: open })}`]
								})
							]
						}, wiki.folder);
					}), pending.map((record) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							...st("twCard"),
							cursor: "default"
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: st("twCardName"),
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: record.wikiName }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: sx("badge", "badgeWarn"),
									children: t("team.pendingWiki")
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: st("twMono"),
								children: record.wiki
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: st("twMeta"),
								children: record.pr === void 0 ? t("team.pendingNoPr") : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
									style: st("twLink"),
									href: record.pr.url,
									target: "_blank",
									rel: "noreferrer",
									children: t("team.prNumber", { number: record.pr.number })
								})
							})
						]
					}, record.id))]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: st("twDetail"),
					children: current === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: st("empty"),
						children: t("team.pickWiki")
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WikiDetailPane, {
						store,
						state,
						data,
						wiki: current,
						t
					}, current.folder)
				})]
			});
		}
		/**
		* One project wiki: actions, counts, and its pull requests and pages.
		* @param props - store, state, the wiki.
		* @returns the pane.
		*/
		function WikiDetailPane({ store, state, data, wiki, t }) {
			const [tab, setTab] = (0, react.useState)("pulls");
			const [busy, setBusy] = (0, react.useState)(void 0);
			const [error, setError] = (0, react.useState)(void 0);
			const detail = state.team.wikis[wiki.folder];
			(0, react.useEffect)(() => {
				if (detail === void 0 || detail.status === "idle") store.loadWiki(wiki.folder);
			}, [
				store,
				wiki.folder,
				detail
			]);
			const pulls = pullsOf(state.team.pulls.data?.pulls, wiki.folder);
			const record = data.maintains.find((candidate) => candidate.id === wiki.maintainId);
			const maintain = () => {
				setBusy("maintain");
				setError(void 0);
				store.maintainWiki(wiki.folder).then((outcome) => {
					setBusy(void 0);
					if (!outcome.opened) setError(manualText(outcome, t));
				}, (failure) => {
					setBusy(void 0);
					setError(failure.message);
				});
			};
			const syncCode = () => {
				setBusy("sync");
				setError(void 0);
				store.syncWiki(wiki.folder).then((outcome) => {
					setBusy(void 0);
					if ("upToDate" in outcome) {
						store.setNotice({
							kind: "ok",
							text: t("team.syncUpToDate", { commit: outcome.commit.slice(0, 10) })
						});
						return;
					}
					if (!outcome.opened) setError(manualText(outcome, t));
					const sync = outcome.answer.sync;
					const lead = sync === void 0 ? "" : sync.upToDate === true ? t("team.syncUpToDate", { commit: sync.to.slice(0, 10) }) : sync.fallback === true ? t("team.syncFallback") : t("team.syncFound", {
						files: sync.files,
						pages: sync.pages,
						from: (sync.from ?? "").slice(0, 10),
						to: sync.to.slice(0, 10)
					});
					const notice = initText(outcome, t);
					store.setNotice({
						kind: notice?.kind ?? "ok",
						text: [lead, notice?.text].filter((part) => part !== void 0 && part !== "").join("\n")
					});
				}, (failure) => {
					setBusy(void 0);
					setError(failure.message);
				});
			};
			const publish = () => {
				setBusy("publish");
				setError(void 0);
				store.publishWiki(wiki.folder).then((answer) => {
					setBusy(void 0);
					const skipped = answer.skipped.length === 0 ? "" : ` ${t("team.publishSkipped", { count: answer.skipped.length })}`;
					if (answer.prError !== void 0) store.setNotice({
						kind: "error",
						text: `${t("team.publishFailed", {
							pages: answer.pages,
							dir: answer.dir
						})}\n${answer.prError}`
					});
					else if (answer.unchanged === true) store.setNotice({
						kind: "ok",
						text: t("team.publishUnchanged", { dir: answer.dir })
					});
					else if (answer.pr?.pr !== void 0) store.setNotice({
						kind: "ok",
						text: `${t("team.publishDone", {
							pages: answer.pages,
							dir: answer.dir,
							number: answer.pr.pr.number
						})}${skipped}`
					});
					else store.setNotice({
						kind: "ok",
						text: `${t("team.publishPushed", {
							pages: answer.pages,
							dir: answer.dir,
							branch: answer.record.branch
						})}${skipped}${answer.pr?.notes.length ? `\n${answer.pr.notes.join("\n")}` : ""}`
					});
				}, (failure) => {
					setBusy(void 0);
					setError(failure.message);
				});
			};
			const preview = () => {
				setBusy("preview");
				setError(void 0);
				store.previewWiki(wiki.folder).then(() => {
					setBusy(void 0);
				}, (failure) => {
					setBusy(void 0);
					setError(failure.message);
				});
			};
			const pages = detail?.data?.pages ?? [];
			const needsReview = pages.filter((page) => page.review === "unreviewed" || page.overdue);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: st("twDetailHead"),
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							flex: "1 1 240px",
							minWidth: 0
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
								style: st("twDetailName"),
								children: wiki.name
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: st("twMono"),
								children: [wiki.folder, "/"]
							}),
							wiki.summary !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									...st("twMeta"),
									marginTop: 4
								},
								children: wiki.summary
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									...st("note"),
									marginTop: 4
								},
								children: [
									wiki.owner !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [t("team.owner", { owner: wiki.owner }), " · "] }),
									wiki.repo !== void 0 && (/^https?:\/\//.test(wiki.repo) ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
										style: st("twLink"),
										href: wiki.repo,
										target: "_blank",
										rel: "noreferrer",
										children: t("team.codeRepo")
									}), " · "] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [wiki.repo, " · "] })),
									wiki.published === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("team.notPublished") }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										title: wiki.published.path,
										children: wiki.published.updated === void 0 ? t("team.published") : t("team.publishedAt", { at: wiki.published.updated })
									}),
									!wiki.registered && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [" · ", t("team.notRegistered")] })
								]
							}),
							record !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									...st("note"),
									marginTop: 4
								},
								children: [t("team.maintaining", { branch: record.branch }), record.pr !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [" · ", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
									style: st("twLink"),
									href: record.pr.url,
									target: "_blank",
									rel: "noreferrer",
									children: t("team.prNumber", { number: record.pr.number })
								})] })]
							})
						]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: st("row"),
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								variant: "primary",
								disabled: busy !== void 0 || wiki.missing === true,
								title: t("team.maintainHint"),
								onClick: maintain,
								children: busy === "maintain" ? t("team.opening") : record === void 0 ? t("team.maintain") : t("team.maintainOpen")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								disabled: busy !== void 0 || wiki.missing === true || wiki.repo === void 0,
								title: wiki.repo === void 0 ? t("team.initNoRepo") : codeTitle(wiki, t),
								onClick: syncCode,
								children: busy === "sync" ? t("team.syncing") : t("team.sync")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								disabled: busy !== void 0 || wiki.missing === true,
								title: t("team.publishHint"),
								onClick: publish,
								children: busy === "publish" ? t("team.publishing") : t("team.publish")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								disabled: busy !== void 0 || wiki.missing === true,
								title: t("team.previewHint"),
								onClick: preview,
								children: busy === "preview" ? t("preview.loading") : t("team.preview")
							})
						]
					})]
				}),
				error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						...st("error"),
						marginBottom: 12
					},
					children: error
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: st("twStats"),
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Stat, {
							label: t("team.statPages"),
							value: wiki.stats.pages
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Stat, {
							label: t("team.statReviewed"),
							value: wiki.stats.reviewed
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Stat, {
							label: t("team.statUnreviewed"),
							value: wiki.stats.unreviewed
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Stat, {
							label: t("team.statOverdue"),
							value: wiki.stats.overdue
						})
					]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						...st("twTabs"),
						padding: 0,
						marginBottom: 6
					},
					role: "tablist",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							role: "tab",
							"aria-selected": tab === "pulls",
							style: sx("twTab", tab === "pulls" && "twTabActive"),
							onClick: () => {
								setTab("pulls");
							},
							children: t("team.tabPulls", { count: pulls.length })
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							role: "tab",
							"aria-selected": tab === "pages",
							style: sx("twTab", tab === "pages" && "twTabActive"),
							onClick: () => {
								setTab("pages");
							},
							children: t("team.tabPages", { count: pages.length })
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							role: "tab",
							"aria-selected": tab === "review",
							style: sx("twTab", tab === "review" && "twTabActive"),
							onClick: () => {
								setTab("review");
							},
							children: t("team.tabReview", { count: needsReview.length })
						})
					]
				}),
				tab === "pulls" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PullList, {
					store,
					state,
					pulls,
					folder: wiki.folder,
					t
				}),
				tab !== "pulls" && detail?.status === "failed" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: st("error"),
					children: detail.error
				}),
				tab !== "pulls" && detail?.data === void 0 && detail?.status !== "failed" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: st("empty"),
					children: t("preview.loading")
				}),
				tab === "pages" && detail?.data !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PageList, {
					pages,
					t,
					empty: t("team.noPages")
				}),
				tab === "review" && detail?.data !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PageList, {
					pages: needsReview,
					t,
					empty: t("team.noReview")
				}),
				data.team !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Pointer, {
					hub: data.team.url,
					wiki,
					t
				})
			] });
		}
		/**
		* A connected repository with no commits: offer to lay out the hub.
		* @param props - store, status, translator.
		* @returns the panel.
		*/
		function EmptyHub({ store, data, t }) {
			const [busy, setBusy] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)(void 0);
			const setup = () => {
				setBusy(true);
				setError(void 0);
				store.setupHub().then(() => {
					setBusy(false);
				}, (failure) => {
					setBusy(false);
					setError(failure.message);
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					maxWidth: 640,
					margin: "32px auto",
					padding: "0 24px"
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
						style: st("twDetailName"),
						children: t("team.emptyTitle")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						style: st("note"),
						children: t("team.emptyText", {
							name: data.team?.name ?? "",
							branch: data.baseBranch ?? "main"
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
						style: {
							...st("mdPre"),
							whiteSpace: "pre-wrap"
						},
						children: [
							"AGENTS.md                     rules for agents + empty project registry",
							"README.md",
							"scripts/okf.py                shared OKF toolchain",
							"published/Projects/           pages for the Azure DevOps wiki (generated)",
							".github/wiki/check-pr.js      auto-merge checker",
							".github/wiki/workflows/*.yml  auto-merge and ADO sync (move to .github/workflows to enable)"
						].join("\n")
					}),
					error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							...st("error"),
							marginBottom: 10,
							whiteSpace: "pre-wrap"
						},
						children: error
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
						variant: "primary",
						disabled: busy,
						onClick: setup,
						children: busy ? t("team.settingUp") : t("team.setUp")
					})
				]
			});
		}
		/**
		* A browsable URL for a git remote.
		* @param url - https or scp-style ssh.
		* @returns the web URL.
		*/
		function webUrl(url) {
			const scp = /^[\w.-]+@([\w.-]+):(.+)$/.exec(url.trim());
			return (scp !== null && !url.includes("://") ? `https://${scp[1] ?? ""}/${scp[2] ?? ""}` : url.trim().replace(/^ssh:\/\/[^@/]+@/, "https://").replace(/\/\/[^@/]+@/, "//")).replace(/\.git$/, "").replace(/\/$/, "");
		}
		/**
		* The lines a project's code repository puts in its own AGENTS.md so agents
		* there find its bundle in the hub.
		* @param hub - the hub's remote.
		* @param wiki - the project.
		* @returns markdown.
		*/
		function pointerText(hub, wiki) {
			return [
				"## Team wiki",
				"",
				`Knowledge about this project lives in the team wiki hub ${webUrl(hub)}, in the OKF bundle \`${wiki.folder}/\` (registered in its AGENTS.md as "${wiki.name}").`,
				"",
				`- Before answering questions about this project's architecture, access or conventions, read \`${wiki.folder}/index.md\` in the hub and the pages it lists.`,
				"- To add or correct knowledge, run kb-ingest against the hub; it opens a pull request there. Do not copy wiki pages into this repository.",
				""
			].join("\n");
		}
		/**
		* The AGENTS.md pointer for the project's code repository, with Copy.
		* @param props - hub remote and project.
		* @returns the section.
		*/
		function Pointer({ hub, wiki, t }) {
			const [copied, setCopied] = (0, react.useState)(false);
			const text = pointerText(hub, wiki);
			const copy = () => {
				navigator.clipboard?.writeText(text).then(() => {
					setCopied(true);
				}, () => {
					setCopied(false);
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
				style: { marginTop: 18 },
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("summary", {
						style: {
							cursor: "pointer",
							fontWeight: 500
						},
						children: t("team.pointerTitle")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						style: st("note"),
						children: t("team.pointerHint")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
						style: {
							...st("mdPre"),
							whiteSpace: "pre-wrap",
							marginTop: 6
						},
						children: text
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
						onClick: copy,
						children: copied ? t("team.copied") : t("team.copy")
					})
				]
			});
		}
		/**
		* Explain an outcome that did not open a session.
		* @param outcome - what happened.
		* @param t - translate seat.
		* @returns the text.
		*/
		/**
		* Where a project's code stands against its wiki, for a tooltip.
		* @param wiki - the project wiki.
		* @param t - translate.
		* @returns the text.
		*/
		function codeTitle(wiki, t) {
			const code = wiki.code;
			const parts = [t("team.syncHint")];
			if (code?.recorded !== void 0) parts.push(t("team.codeRecorded", { commit: code.recorded.slice(0, 10) }));
			else parts.push(t("team.codeNotRecorded"));
			if (code?.head !== void 0) parts.push(t("team.codeHead", {
				commit: code.head.slice(0, 10),
				at: new Date(code.checkedAt ?? "").toLocaleString()
			}));
			if (code?.error !== void 0) parts.push(t("team.codeCheckFailed", { reason: code.error }));
			return parts.join("\n");
		}
		/**
		* What to tell the user after Initialize from code.
		* @param outcome - the open outcome.
		* @param t - translator.
		* @returns the notice, or undefined when nothing was initialized.
		*/
		function initText(outcome, t) {
			const answer = outcome.answer;
			if (answer.initializeError !== void 0) return {
				kind: "error",
				text: t("team.initFailed", { reason: answer.initializeError })
			};
			if (answer.initialize === void 0) return void 0;
			if (outcome.prefilled === true) return {
				kind: "ok",
				text: t("team.initPrefilled", { code: answer.initialize.code })
			};
			navigator.clipboard?.writeText(answer.initialize.prompt).catch(() => void 0);
			return {
				kind: "ok",
				text: `${t("team.initCopied", { code: answer.initialize.code })}\n\n${answer.initialize.prompt}`
			};
		}
		function manualText(outcome, t) {
			const base = t("edit.manual", {
				path: outcome.answer.workspace,
				name: outcome.answer.entry.name
			});
			return outcome.reason === void 0 || outcome.reason === "unavailable" ? base : `${base}\n${t("edit.manualReason", { reason: outcome.reason })}`;
		}
		/**
		* One count tile.
		* @param props - label and value.
		* @returns the tile.
		*/
		function Stat({ label, value }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: st("twStat"),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: st("twStatValue"),
					children: value
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: st("twStatLabel"),
					children: label
				})]
			});
		}
		/**
		* The pull requests of a wiki.
		* @param props - store, state, the list.
		* @returns the list.
		*/
		function PullList({ store, state, pulls, folder, t }) {
			const answer = state.team.pulls;
			const [opening, setOpening] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)(void 0);
			const note = answer.data?.note;
			const openSession = () => {
				setOpening(true);
				setError(void 0);
				store.maintainWiki(folder).then((outcome) => {
					setOpening(false);
					if (!outcome.opened) setError(manualText(outcome, t));
				}, (failure) => {
					setOpening(false);
					setError(failure.message);
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						...st("row"),
						justifyContent: "space-between",
						margin: "6px 0"
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: st("muted"),
						children: answer.data === void 0 ? "" : t("team.pullsAt", { at: new Date(answer.data.at).toLocaleTimeString() })
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
						disabled: answer.status === "loading",
						onClick: () => {
							store.loadPulls(true);
						},
						children: answer.status === "loading" ? t("team.refreshing") : t("team.refreshPulls")
					})]
				}),
				answer.status === "failed" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: st("error"),
					children: answer.error
				}),
				note === "azure" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: st("note"),
					children: t("team.pullsAzure")
				}),
				note === "not-github" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: st("note"),
					children: t("team.pullsNotGithub")
				}),
				note?.startsWith("fetch-failed") === true && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: st("note"),
					children: t("team.pullsFetchFailed")
				}),
				error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: st("error"),
					children: error
				}),
				answer.data !== void 0 && pulls.length === 0 && note === void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: st("empty"),
					children: t("team.noPulls")
				}),
				pulls.map((pull) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: st("twRow"),
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: st("twRowMain"),
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: st("twRowTitle"),
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: pull.title }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										style: st("muted"),
										children: ["#", pull.number]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PullBadge, {
										pull,
										t
									}),
									pull.draft && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: st("badge"),
										children: t("team.draft")
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: st("twMeta"),
								children: t("team.pullMeta", {
									author: pull.author || "?",
									branch: pull.branch,
									files: pull.files,
									at: new Date(pull.updatedAt).toLocaleString()
								})
							}),
							!pull.eligible && pull.reasons.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
								style: st("twReasons"),
								children: pull.reasons.slice(0, 6).map((reason) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: reason }, reason))
							})
						]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: st("row"),
						children: [pull.maintainId !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
							disabled: opening,
							onClick: openSession,
							children: opening ? t("team.opening") : t("team.openSession")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
							style: {
								...st("button"),
								textDecoration: "none"
							},
							href: pull.url,
							target: "_blank",
							rel: "noreferrer",
							children: t("team.reviewOnGithub")
						})]
					})]
				}, pull.number))
			] });
		}
		/**
		* The verdict badge of a pull request.
		* @param props - the pull request.
		* @returns the badge.
		*/
		function PullBadge({ pull, t }) {
			if (pull.checks === "failure") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				style: sx("badge", "badgeError"),
				children: t("team.checksFailed")
			});
			if (!pull.eligible) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				style: sx("badge", "badgeWarn"),
				children: t("team.needsHuman")
			});
			if (pull.checks === "pending") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				style: sx("badge", "badgeOk"),
				children: t("team.eligibleRunning")
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				style: sx("badge", "badgeOk"),
				children: t("team.eligible")
			});
		}
		/**
		* Pages with their review state.
		* @param props - the pages.
		* @returns the list.
		*/
		function PageList({ pages, t, empty }) {
			const [filter, setFilter] = (0, react.useState)("");
			const shown = (0, react.useMemo)(() => {
				const needle = filter.trim().toLowerCase();
				return needle === "" ? pages : pages.filter((page) => `${page.title} ${page.path}`.toLowerCase().includes(needle));
			}, [pages, filter]);
			if (pages.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: st("empty"),
				children: empty
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
				style: {
					...st("input"),
					margin: "6px 0"
				},
				value: filter,
				placeholder: t("team.filterPages"),
				onChange: (event) => {
					setFilter(event.target.value);
				}
			}), shown.map((page) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: st("twRow"),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: st("twRowMain"),
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: st("twRowTitle"),
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: page.title }),
							page.review === "reviewed" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: sx("badge", "badgeOk"),
								children: t("team.reviewedBy", {
									who: page.reviewer ?? "?",
									at: page.reviewedAt ?? "?"
								})
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: sx("badge", "badgeWarn"),
								children: page.generatedBy === void 0 ? t("team.unreviewed") : t("team.unreviewedBy", {
									who: page.generatedBy,
									at: page.generatedAt ?? "?"
								})
							}),
							page.overdue && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: sx("badge", "badgeError"),
								children: page.lifecycle === "needs_review" ? "needs_review" : t("team.stale", { at: page.staleAfter ?? "?" })
							})
						]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: st("twMono"),
						children: [page.path, page.type === void 0 ? "" : ` · ${page.type}`]
					})]
				})
			}, page.path))] });
		}
		/**
		* The All bundles tab: the plugin's library.
		* @param props - store and entries.
		* @returns the tab.
		*/
		function BundlesTab({ store, entries, t }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					...st("twDetail"),
					flex: 1
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							...st("row"),
							justifyContent: "space-between",
							marginBottom: 8
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: st("note"),
							children: t("team.bundlesHint")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
							onClick: () => {
								store.openDialog();
							},
							children: t("add.open")
						})]
					}),
					entries.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: st("empty"),
						children: t("library.empty")
					}),
					entries.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: st("twRow"),
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: st("twRowMain"),
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: st("twRowTitle"),
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: entry.name }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: st("badge"),
										children: entry.origin.kind === "git" ? t("origin.git") : t("origin.local")
									}),
									entry.team !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: sx("badge", "badgeBrand"),
										children: t("team.maintainBadge")
									}),
									entry.workspace !== void 0 && entry.team === void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: sx("badge", "badgeBrand"),
										children: t("badge.editable")
									})
								]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: st("twMono"),
								children: entry.origin.kind === "git" ? entry.origin.url : entry.root
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
							onClick: () => {
								store.openDialog({ bundleId: entry.id });
							},
							children: t("team.openInDialog")
						})]
					}, entry.id))
				]
			});
		}
		/**
		* New project wiki.
		* @param props - store, status, close.
		* @returns the modal.
		*/
		function NewWikiDialog({ store, data, t, onClose }) {
			const [name, setName] = (0, react.useState)("");
			const [folder, setFolder] = (0, react.useState)("");
			const [folderTouched, setFolderTouched] = (0, react.useState)(false);
			const [repo, setRepo] = (0, react.useState)("");
			const [owner, setOwner] = (0, react.useState)("");
			const [summary, setSummary] = (0, react.useState)("");
			const [initialize, setInitialize] = (0, react.useState)(true);
			const firstWiki = data.wikis[0]?.folder;
			const [template, setTemplate] = (0, react.useState)(firstWiki === void 0 ? "default" : `copy:${firstWiki}`);
			const [busy, setBusy] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)(void 0);
			const shownFolder = folderTouched ? folder : slugify(name);
			const root = data.team?.root ?? "okf";
			const path = root === "" ? shownFolder : `${root}/${shownFolder}`;
			const submit = () => {
				setBusy(true);
				setError(void 0);
				store.createWiki({
					name: name.trim(),
					folder: shownFolder,
					template,
					...repo.trim() === "" ? {} : { repo: repo.trim() },
					...owner.trim() === "" ? {} : { owner: owner.trim() },
					...summary.trim() === "" ? {} : { summary: summary.trim() },
					...initialize && repo.trim() !== "" ? { initialize: true } : {}
				}).then((outcome) => {
					setBusy(false);
					const init = initText(outcome, t);
					const prText = outcome.answer.pr?.pr !== void 0 ? t("team.createdPr", { number: outcome.answer.pr.pr.number }) : outcome.answer.prError !== void 0 ? t("team.createdNoPr", { reason: outcome.answer.prError }) : "";
					store.setNotice({
						kind: outcome.answer.prError === void 0 ? "ok" : "error",
						text: `${t("team.created", {
							name: outcome.answer.record.wikiName,
							branch: outcome.answer.record.branch
						})} ${prText}${outcome.opened ? "" : `\n${manualText(outcome, t)}`}${init === void 0 ? "" : `\n${init.text}`}`
					});
					onClose();
				}, (failure) => {
					setBusy(false);
					setError(failure.message);
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: st("backdrop"),
				role: "presentation",
				onClick: (event) => {
					if (event.target === event.currentTarget && !busy) onClose();
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("form", {
					style: st("twModal"),
					role: "dialog",
					"aria-label": t("team.newTitle"),
					onSubmit: (event) => {
						event.preventDefault();
						submit();
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: st("header"),
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
									style: st("title"),
									children: t("team.newTitle")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: st("twSpacer") }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
									disabled: busy,
									ariaLabel: t("dialog.close"),
									onClick: onClose,
									children: "×"
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: st("twModalBody"),
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
									style: st("label"),
									htmlFor: "okf-new-name",
									children: t("team.newName")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									id: "okf-new-name",
									style: st("input"),
									value: name,
									placeholder: "Settlement Wiki",
									onChange: (event) => {
										setName(event.target.value);
									}
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
									style: st("label"),
									htmlFor: "okf-new-folder",
									children: t("team.newFolder")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									id: "okf-new-folder",
									style: {
										...st("input"),
										fontFamily: "ui-monospace, monospace"
									},
									value: shownFolder,
									onChange: (event) => {
										setFolderTouched(true);
										setFolder(event.target.value);
									}
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: st("note"),
									children: t("team.newWhere", {
										repo: data.team?.name ?? "",
										path
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
									style: st("label"),
									htmlFor: "okf-new-repo",
									children: t("team.newRepo")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									id: "okf-new-repo",
									style: st("input"),
									value: repo,
									placeholder: "https://github.acme.com/payments/payments-service",
									onChange: (event) => {
										setRepo(event.target.value);
									}
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										display: "grid",
										gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
										gap: 10
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
										style: st("label"),
										htmlFor: "okf-new-owner",
										children: t("team.newOwner")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										id: "okf-new-owner",
										style: st("input"),
										value: owner,
										placeholder: "@alice",
										onChange: (event) => {
											setOwner(event.target.value);
										}
									})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
										style: st("label"),
										htmlFor: "okf-new-summary",
										children: t("team.newSummary")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										id: "okf-new-summary",
										style: st("input"),
										value: summary,
										onChange: (event) => {
											setSummary(event.target.value);
										}
									})] })]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									style: {
										display: "flex",
										gap: 8,
										alignItems: "flex-start",
										marginTop: 10,
										fontSize: 13,
										opacity: repo.trim() === "" ? .5 : 1
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										type: "checkbox",
										checked: initialize && repo.trim() !== "",
										disabled: repo.trim() === "",
										onChange: (event) => {
											setInitialize(event.target.checked);
										}
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
										t("team.newInitialize"),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: st("note"),
											children: t("team.newInitializeHint")
										})
									] })]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
									style: st("label"),
									htmlFor: "okf-new-template",
									children: t("team.newTemplate")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
									id: "okf-new-template",
									style: {
										...st("select"),
										maxWidth: "100%"
									},
									value: template,
									onChange: (event) => {
										setTemplate(event.target.value);
									},
									children: [data.wikis.map((wiki) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: `copy:${wiki.folder}`,
										children: t("team.templateCopy", { name: wiki.name })
									}, wiki.folder)), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "default",
										children: t("team.templateDefault")
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("ol", {
									style: st("twSteps"),
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: t("team.newStep1", { branch: `wiki/new-${shownFolder || "…"}-…` }) }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: t("team.newStep2") }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: t("team.newStep3") })
									]
								}),
								error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: st("error"),
									children: error
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: st("twModalFoot"),
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								disabled: busy,
								onClick: onClose,
								children: t("add.cancel")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								type: "submit",
								variant: "primary",
								disabled: busy || name.trim() === "" || shownFolder === "",
								children: busy ? t("team.creating") : t("team.create")
							})]
						})
					]
				})
			});
		}
		/**
		* The folder a name suggests.
		* @param name - the wiki name.
		* @returns lowercase ASCII with dashes; a trailing "wiki" is dropped.
		*/
		function slugify(name) {
			return name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").replace(/-?wiki$/, "").slice(0, 40);
		}
		/**
		* The maintenance record a session works in, if any.
		* @param state - the store state.
		* @param sessionId - the session.
		* @returns the library entry and its record.
		*/
		function maintenanceOf(state, sessionId) {
			const bundleId = state.selections[sessionId]?.bundleId;
			if (bundleId === void 0 || bundleId === null) return void 0;
			const entry = state.library.entries.find((candidate) => candidate.id === bundleId);
			if (entry?.team === void 0) return void 0;
			return {
				entry,
				record: state.team.status.data?.maintains.find((candidate) => candidate.id === entry.team?.maintainId)
			};
		}
		/**
		* In a maintenance session: Open pull request (or the pull request's number).
		* @param props - store, session id, translate seat.
		* @returns the button, or nothing outside a maintenance session.
		*/
		function MaintainButton({ store, sessionId, t, compact = false }) {
			const state = useOkf(store);
			(0, react.useEffect)(() => {
				store.loadSelection(sessionId);
			}, [store, sessionId]);
			const found = maintenanceOf(state, sessionId);
			(0, react.useEffect)(() => {
				if (found !== void 0 && state.team.status.status === "idle") store.loadTeam();
			}, [
				store,
				found,
				state.team.status.status
			]);
			if (found === void 0) return null;
			const pr = found.record?.pr;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
				variant: compact ? void 0 : "primary",
				style: compact ? {
					minHeight: 26,
					borderColor: "transparent"
				} : { minHeight: 26 },
				title: t("team.prButtonHint"),
				onClick: () => {
					store.openPrDialog(found.entry.team?.maintainId);
				},
				children: pr === void 0 ? t("team.openPr") : t("team.prNumber", { number: pr.number })
			});
		}
		/**
		* The Open pull request dialog for one maintenance workspace.
		* @param props - store and translate seat.
		* @returns the dialog while open, else nothing.
		*/
		function OpenPrDialog({ store, t }) {
			const state = useOkf(store);
			const maintainId = state.team.prDialog?.maintainId;
			if (maintainId === void 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(OpenPrBody, {
				store,
				state,
				maintainId,
				t
			}, maintainId);
		}
		/**
		* The dialog's body.
		* @param props - store, state, the workspace.
		* @returns the dialog.
		*/
		function OpenPrBody({ store, state, maintainId, t }) {
			const record = state.team.status.data?.maintains.find((candidate) => candidate.id === maintainId);
			const changes = state.team.changes[maintainId];
			const [title, setTitle] = (0, react.useState)("");
			const [summary, setSummary] = (0, react.useState)("");
			const [busy, setBusy] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)(void 0);
			const [result, setResult] = (0, react.useState)(void 0);
			const [prefilled, setPrefilled] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				store.loadChanges(maintainId);
			}, [store, maintainId]);
			const suggested = changes?.data?.suggested;
			(0, react.useEffect)(() => {
				if (prefilled || suggested === void 0) return;
				setPrefilled(true);
				setSummary((current) => current.trim() === "" ? suggested.summary : current);
				if (record?.pr === void 0) setTitle((current) => current.trim() === "" ? suggested.title : current);
			}, [
				prefilled,
				suggested,
				record?.pr
			]);
			const close = () => {
				if (!busy) store.openPrDialog(void 0);
			};
			const submit = () => {
				setBusy(true);
				setError(void 0);
				store.openPr(maintainId, {
					...title.trim() === "" ? {} : { title: title.trim() },
					...summary.trim() === "" ? {} : { summary: summary.trim() }
				}).then((answer) => {
					setBusy(false);
					setResult(answer);
					store.loadChanges(maintainId);
				}, (failure) => {
					setBusy(false);
					setError(failure.message);
				});
			};
			const files = changes?.data?.files ?? [];
			const inside = record === void 0 ? files : files.filter((file) => file.path.startsWith(`${record.wiki}/`));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: st("backdrop"),
				role: "presentation",
				onClick: (event) => {
					if (event.target === event.currentTarget) close();
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: st("twModal"),
					role: "dialog",
					"aria-label": t("team.openPr"),
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: st("header"),
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(BookIcon, {}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
									style: st("title"),
									children: record?.pr === void 0 ? t("team.openPr") : t("team.updatePr", { number: record.pr.number })
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: st("twRepo"),
									children: record?.wikiName ?? ""
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: st("twSpacer") }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
									disabled: busy,
									ariaLabel: t("dialog.close"),
									onClick: close,
									children: "×"
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: st("twModalBody"),
							children: [
								record !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: st("note"),
									children: t("team.prBranch", {
										branch: record.branch,
										folder: record.wiki
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										...st("group"),
										marginTop: 8
									},
									children: t("team.changedFiles", { count: inside.length })
								}),
								changes?.status === "loading" && changes.data === void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: st("muted"),
									children: t("preview.loading")
								}),
								changes?.status === "failed" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: st("error"),
									children: changes.error
								}),
								changes?.data !== void 0 && inside.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: st("muted"),
									children: t("team.noChanges")
								}),
								inside.slice(0, 40).map((file) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										...st("row"),
										fontSize: 12
									},
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: sx("badge", file.status === "deleted" ? "badgeError" : file.status === "added" ? "badgeOk" : void 0),
											children: file.status
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: st("twMono"),
											children: record === void 0 ? file.path : file.path.slice(record.wiki.length + 1)
										}),
										file.review === "reviewed" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: sx("badge", "badgeWarn"),
											children: t("team.reviewedEdited")
										})
									]
								}, file.path)),
								files.length > inside.length && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: st("note"),
									children: t("team.outsideFiles", { count: files.length - inside.length })
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
									style: st("label"),
									htmlFor: "okf-pr-title",
									children: t("team.prTitle")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									id: "okf-pr-title",
									style: st("input"),
									value: title,
									placeholder: record?.pr === void 0 ? t("team.prTitleDefault", { name: record?.wikiName ?? "" }) : t("team.prTitleKeep"),
									onChange: (event) => {
										setTitle(event.target.value);
									}
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
									style: st("label"),
									htmlFor: "okf-pr-summary",
									children: t("team.prSummary")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
									id: "okf-pr-summary",
									style: {
										...sx("input", "twTextarea"),
										minHeight: 160
									},
									value: summary,
									onChange: (event) => {
										setSummary(event.target.value);
									}
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									style: st("note"),
									children: t("team.prExplain")
								}),
								error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: st("error"),
									children: error
								}),
								result !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PrResult, {
									result,
									t
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: st("twModalFoot"),
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								disabled: busy,
								onClick: close,
								children: result === void 0 ? t("add.cancel") : t("dialog.close")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								variant: "primary",
								disabled: busy,
								onClick: submit,
								children: busy ? t("team.prBusy") : record?.pr === void 0 ? t("team.openPr") : t("team.updatePrShort")
							})]
						})
					]
				})
			});
		}
		/**
		* What Open pull request did.
		* @param props - the answer.
		* @returns the summary.
		*/
		function PrResult({ result, t }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					...st("form"),
					marginTop: 10
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: st("row"),
						children: [result.pr === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: st("success"),
							children: t("team.pushed", { branch: result.branch })
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
							style: st("twLink"),
							href: result.pr.url,
							target: "_blank",
							rel: "noreferrer",
							children: result.pr.reused ? t("team.prUpdated", { number: result.pr.number }) : t("team.prOpened", { number: result.pr.number })
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: sx("badge", result.eligible ? "badgeOk" : "badgeWarn"),
							children: result.eligible ? t("team.eligible") : t("team.needsHuman")
						})]
					}),
					!result.eligible && result.reasons.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
						style: st("twReasons"),
						children: result.reasons.map((reason) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: reason }, reason))
					}),
					result.stamped.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: st("note"),
						children: t("team.stamped", { pages: result.stamped.join(", ") })
					}),
					result.notes.map((note) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: st("note"),
						children: note
					}, note))
				]
			});
		}
		//#endregion
		//#region src/client/index.ts
		/** The `main` key of the Team Wiki page and the id of its sidebar entry. */
		const PANEL_ID = "okf-team-wiki";
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
			const t = ctx.locale.bind("okf");
			let navigation;
			let layout;
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
			ctx.inject(["layout"], (scope) => {
				scope.effect(() => {
					layout = scope.layout;
					return () => {
						layout = void 0;
					};
				}, "okf: layout service");
			});
			const current = () => navigation === void 0 ? void 0 : {
				...navigation,
				...layout === void 0 ? {} : { layout }
			};
			ctx.effect(() => {
				const store = createOkfStore(void 0, current);
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
				const disposeTeam = [
					ctx.slots.inject("main", () => ctx.slots.register({
						name: "main",
						key: PANEL_ID,
						locale: "okf",
						inject: injected
					}, TeamWikiPage)),
					ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
						name: "sidebar.panellist",
						id: PANEL_ID,
						order: 30,
						locale: "okf",
						label: () => t("panel")
					}, TeamWikiIcon)),
					ctx.slots.inject("shell.overlay", () => ctx.slots.register({
						name: "shell.overlay",
						id: "okf-team-pr",
						locale: "okf",
						inject: injected
					}, OpenPrDialog)),
					ctx.slots.inject("conversation.session.header.utilities", () => ctx.slots.register({
						name: "conversation.session.header.utilities",
						id: "okf-team-pr",
						order: -21,
						locale: "okf",
						inject: injected
					}, MaintainButton)),
					ctx.slots.inject("conversation.input.right", () => ctx.slots.register({
						name: "conversation.input.right",
						id: "okf-team-pr",
						order: -21,
						locale: "okf",
						inject: () => ({
							store,
							compact: true
						})
					}, MaintainButton))
				];
				return () => {
					for (const dispose of disposeTeam.reverse()) dispose();
					disposeComposer();
					disposeChip();
					disposeDialog();
					store.dispose();
				};
			}, "okf: session chip, dialog and Team Wiki page");
		}
		//#endregion
		exports.PANEL_ID = PANEL_ID;
		exports.apply = apply;
		exports.bundleTarget = bundleTarget;
		exports.inject = inject;
		exports.renderMarkdown = renderMarkdown;
		exports.slugify = slugify;
		return module.exports;
	}
});
