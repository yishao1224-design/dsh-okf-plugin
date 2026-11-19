# dsh-okf

A DeepSeek Harness plugin for **OKF knowledge bundles** ([Open Knowledge Format](https://github.com/GoogleCloudPlatform/open-knowledge-format), v0.2): folders of markdown pages with YAML frontmatter, such as the `okf/` bundle in `knowledgeAgent`.

It does four things:

1. **Fetch** a bundle from a git remote (GitHub, Azure DevOps, or any git host) into a local library folder, and update it later.
2. **Preview** any bundle in the library: stats, a filterable catalog, and a page reader.
3. **Attach a bundle to a chat session**, so the agent in that session gets the bundle's catalog and folder each turn and reads the pages itself.
4. **Run a team wiki** from the **Team Wiki** sidebar page: every project wiki in the team's wiki repository with its review counts and open pull requests, **New project wiki**, and **Maintain** (a session in the wiki's own workspace that ends in a pull request, which merges on its own when it only touches unreviewed pages). See [Team Wiki](#team-wiki).

Like the other `dsh_plugins` bundles it is a **standalone Harness bundle**. Nothing is imported from or written into a DSH source checkout.

```text
 session header:   … [📖 OKF · knowledgeAgent/okf]       <- chip, one per session
                                 │ click
 ┌───────────────────────────────▼──────────────────────────────────────────┐
 │ OKF bundles      This session uses [knowledgeAgent/okf ▾]            ✕ │
 ├──────────────────────┬───────────────────────────────────────────────────┤
 │ LIBRARY              │ knowledgeAgent/okf                                │
 │ ▸ knowledgeAgent/okf │ github.com/…/knowledgeAgent · okf                 │
 │   GitHub · This sess │ 26 pages · OKF 0.2 · Commit 045b394b · active 13 │
 │ ▸ team-kb            │ [Use in this session] [Update] [Remove]           │
 │   Azure DevOps       │ ┌ Filter pages ──────────────────────────────┐   │
 │ [＋ Add bundle]      │ CONCEPTS · 7                                      │
 │                      │   The Knowledge Lifecycle  Concept  active        │
 └──────────────────────┴───────────────────────────────────────────────────┘
```

## Set up

**Install** with the Harness `plugin_manager` tool (needs Full access or approval; Host code runs in the Harness process):

```text
plugin_manager action=install_bundle target=file:F:\project\dsh_plugins\dsh-okf-plugin
```

**Restart `dsh web` after installing**, and after any change to `lib/index.js`. Host code loads only at startup. The browser half hot-loads, so before the restart you will see the OKF chip, but the dialog says the Host does not answer.

`git` must be on the Host's `PATH`, or set `gitPath` (see Config).

## Use

Open a session and click **OKF**. The button sits in two places:

- in the composer's tool row, just left of the model selector. It is always there, including in a blank session before the first message, which is when you usually pick a bundle;
- in the session header, top right. DSH shows the header's utility buttons only after the session has messages.

- **Add bundle → From git:** paste the repository URL, then Fetch. The branch/tag and the bundle folder are optional. Without a folder, the plugin finds the bundle itself: a folder holding a `SCHEMA.md`, or an `index.md` whose frontmatter declares `okf_version`. If the repository holds several bundles it lists them and you pick one.
- **Add bundle → Local folder:** registers a bundle already on disk, for example `F:\project\knowledgeAgent\okf` or the project folder above it. The plugin only records the path; it never modifies or deletes a local folder.
- **Preview:** select a bundle on the left. Filter the catalog by title, path, description or tag, and open a page to read it. Links between pages open in place.
- **Attach to the session:** pick the bundle in **This session uses**, or click **Use in this session**. It takes effect from the next turn. Choose **No bundle** to detach it.
- **Update** pulls the latest commit of a git bundle. If the local copy has edits, it refuses, and offers to overwrite them.
- **Remove** forgets a bundle and detaches it from every session. For a git bundle it can also delete the downloaded checkout.

### Editing a bundle

A bundle is edited **where it already is**. There is no second copy.

- **Edit as workspace** on a git bundle turns the library's own checkout (`<library>/repos/<id>`) into a normal clone: `git fetch --unshallow`, with file contents still fetched on demand and only the bundle's folder checked out. Then it registers that folder as a DSH workspace and opens a session there with the bundle attached.
- On a local bundle, the workspace is the git repository the folder sits in, when there is one, so committing stays inside the workspace too. Otherwise it is the bundle folder.
- **Open editing workspace** appears once a bundle is editable. It opens a session in that workspace again.

In a session whose workspace holds the bundle, the agent edits pages with DSH's own `edit` and `write`, with no approval prompt. The prompt context gives it the OKF rules: keep the frontmatter, follow `SCHEMA.md`, list new pages in `index.md`, add a line to `log.md`, mark changed pages `lifecycle: needs_review`, and do not commit or push unless you ask. Everywhere else the bundle is read-only, and the context says where its workspace is. Other sessions read the same folder, so they see edits as soon as they are saved.

Once a bundle is editable, the library protects the work in it:

- **Update** only fast-forwards (`git merge --ff-only`). It refuses while anything is uncommitted, refuses when the branch has commits the remote does not, and cannot be forced.
- **Remove** with *delete the files* refuses while there are uncommitted changes or unpushed commits. Remove without deleting always works.
- **Fetch** refuses to overwrite a checkout left behind by a removed bundle when that checkout still holds unsaved work.

Commit and push with ordinary git from the workspace (your own credentials are used; a `DSH_OKF_*_TOKEN` is never written into the clone).

If the shell does not provide DSH's `workspaces` / `uiWorkspace` services, Edit as workspace still makes the bundle editable and shows its folder. Add it with **Add workspace…** in the sidebar, then pick the bundle in a session there.

### Supported remotes

| Host | Examples |
|---|---|
| GitHub | `https://github.com/owner/repo`, `git@github.com:owner/repo.git` |
| Azure DevOps | `https://dev.azure.com/org/project/_git/repo`, `https://org.visualstudio.com/project/_git/repo`, `git@ssh.dev.azure.com:v3/org/project/repo` |
| Any git host | any `https://`, `ssh://`, `git@host:path` or `file://` remote |

### Authentication

The plugin uses git's own authentication. Git Credential Manager (bundled with Git for Windows) handles GitHub and Azure DevOps sign-in, and SSH remotes use your SSH keys. Git never prompts from the Host: a missing credential comes back as an error in the dialog instead of a hung request. Sign in once from a terminal (for example `git ls-remote <url>`) and the plugin uses the stored credential.

For a token instead, set one of these **before starting `dsh`**. The most specific one wins:

| Variable | Used for |
|---|---|
| `DSH_OKF_AZURE_TOKEN` | Azure DevOps (a PAT with *Code: Read*) |
| `DSH_OKF_GITHUB_TOKEN` | GitHub |
| `DSH_OKF_GIT_TOKEN` | any host, as a fallback |

The token goes to git as an `http.extraHeader` through `GIT_CONFIG_*` environment variables. It never appears in the process arguments, the remote URL, `.git/config`, `library.json`, or an error message. A URL that embeds a password (`https://user:pat@…`) is refused.

## Team Wiki

The **Team Wiki** entry in the sidebar (under User stories) opens a page in the main column.

```text
 Team Wiki · github.acme.com/acme/team-wiki (main)  [Refresh] [Change repository] [+ New project wiki]
 Project wikis | Local library
 ┌──────────────────────┬────────────────────────────────────────────────────────────────┐
 │ Onboarding           │ Payments  payments/                   [Open workspace] [Preview] │
 │ onboarding/ · @dan   │ Card and wallet payments                                       │
 │ ▸ Payments  Being m… │ Owner @alice · Code repository · Published 2026-11-18          │
 │ payments/ · @alice   │ 16 Pages · 1 Reviewed · 15 Unreviewed · 11 Overdue review      │
 │ Ledger               │ Pull requests (2) | Pages (16) | Needs review (15)             │
 │ Registered, but the… │ ▸ AGENTS.md snippet for the code repository           [Copy]   │
 └──────────────────────┴────────────────────────────────────────────────────────────────┘
```

**The hub repository.** One git repository (GitHub or GitHub Enterprise) holds the knowledge of every project of the team:

```text
team-wiki/
├── AGENTS.md              project registry + rules for agents
├── scripts/okf.py         shared toolchain
├── skills/kb-*            shared skills
├── payments/              one OKF bundle per project (SCHEMA.md, index.md, log.md, concepts/, sources/ …)
├── ledger/
└── published/Projects/    what kb-publish rendered, synced to the Azure DevOps wiki's Projects/ section
    ├── Payments.md
    └── Payments/…
```

The **project registry** is the first Markdown table in `AGENTS.md` with a `Project` and a `Bundle` column. `Repo`, `Summary` and `Owner` are optional; columns are matched by name, in any order, and cells may use backticks and links:

```markdown
## Project registry

| Project | Repo | Summary | Owner | Bundle |
|---|---|---|---|---|
| Payments | https://github.acme.com/pay/payments-service | Card and wallet payments | @alice | `payments/` |
```

The page lists the registered projects in that order, with their summary, owner and code repository. A registered project whose folder is not there yet is shown as such. A bundle with a `SCHEMA.md` that is not registered still appears, marked "Not in the AGENTS.md registry". **Without a registry** the page falls back to folders with a `SCHEMA.md` directly under the wiki folder (`team.root`, blank = the repository root; set `okf` for the older `okf/<project>` layout, or for a single-bundle repository such as knowledgeAgent).

Each project shows whether `published/Projects/<Project>/` exists and when it last changed on the base branch. The detail pane also has the **AGENTS.md snippet for the code repository**: a short section, with Copy, for the project's own code repository so agents there read the bundle in the hub instead of copying pages.

Connect the hub once on the page (URL, optional base branch, wiki folder), or preset it in the row config (`team.url`). The plugin keeps a clone of the base branch in `<library>/team/main` for the page, and never edits it.

**Review state** needs no new field. A page counts as **reviewed** when `lifecycle: active` and its latest `verified` entry is by `human:<id>` and is not older than `generated.at`. Everything else is **unreviewed**. **Overdue review** is `lifecycle: needs_review` or a `stale_after` date in the past.

**Maintain** clones the repository into `<library>/team/work/<id>` on a new branch `wiki/<folder>-<date>-<hex>`, registers that clone as a DSH workspace, and opens a session there with the project wiki attached. The session may edit only that wiki, with DSH's own file tools. Its prompt carries the team rules: every page it writes is an unreviewed draft (`status: draft`, `lifecycle: draft`, `generated: { by: dsh/agent, at: <today> }`), it never writes `verified` or `human:…`, it never edits an existing capture, and it does not commit. Maintain on the same wiki reopens the same workspace until its pull request merges or closes; after that it makes a fresh one.

**Open pull request** is a button in the maintenance session's header and composer (it shows **PR #n** once there is one). Its dialog lists what changed and takes a title and summary. Then the Host:

1. resets any reviewed page that was edited without resetting its stamp to an unreviewed draft (its `verified` history stays);
2. runs the repository's own `scripts/okf.py` over the wiki: `links`, `index`, `lint` (a failure stops here and nothing is committed), and one `log` line per changed page;
3. commits **only the wiki's folder**, its `published/Projects/<Project>/` pages, and (for a new project) `AGENTS.md`; other changes are left out and listed. It pushes the branch with the token, and opens or updates the GitHub pull request;
4. judges the whole branch against the base: it is **auto-merge eligible** only when every changed file is an unreviewed (or new) page, a new capture under `sources/`, `index.md` or `log.md`. Editing a reviewed page, deleting a page, changing `SCHEMA.md` or `archive/`, touching an existing capture, any change under `published/` or to `AGENTS.md`, anything outside the wiki, or a page claiming a human review needs a person. Eligible pull requests get the `wiki-auto-merge` label; the label comes off when that stops being true.

**CI decides, not the label.** `examples/wiki-auto-merge.yml` is a workflow for the hub repository: it re-runs the same eligibility check with `lib/check-pr.js` and `okf.py lint`, both taken **from the base branch** so a pull request cannot weaken the rules that judge it, and only then turns on GitHub auto-merge. Copy `lib/check-pr.js` to `.github/wiki/check-pr.js` in the hub, enable "Allow auto-merge", and require the job in branch protection. The checker maps each changed file to a project through the registry (on either side of the change), so a pull request must touch exactly one project.

**Publishing to the Azure DevOps wiki.** `examples/wiki-publish-to-ado.yml` runs when a merge to `main` changes `published/Projects/**`. It clones the existing ADO wiki repository (`vars.ADO_WIKI_REPO`, branch `vars.ADO_WIKI_BRANCH`, default `wikiMaster`) with `secrets.ADO_WIKI_PAT`, mirrors `published/Projects/` into its `Projects/` folder, and pushes. It refuses to commit if anything outside `Projects/` changed, so hand-written wiki pages are never touched. Since every change under `published/` needs a person, nothing reaches the ADO wiki without a review.

**The pull request list** reads open pull requests from GitHub (title, author, labels, checks), fetches their branches into the clone, and computes the files and the verdict from git with the same rule. A pull request appears under every project wiki it touches; one that touches no wiki is not listed.

**New project wiki** takes a name, a folder, the code repository URL, an owner, a one-line summary and a starting `SCHEMA.md` (copied from an existing wiki, or `okf.py`'s default). It adds the project's row to the `AGENTS.md` registry (creating the section, and listing the bundles already there, when the hub has none yet). It makes a workspace on `wiki/new-<folder>-<hex>`, runs `okf.py init` and `index` for the new folder (and drops what `init` touched outside it), writes `wiki_name: <name>` into `SCHEMA.md`, opens the setup as the first pull request (a new `SCHEMA.md` and the registry change always need a person), and opens a session in the workspace. The wiki joins the list once that pull request merges.

**Preview** adds the wiki as it is on the base branch to the library (read-only) and opens it in the OKF dialog; any session can then attach it from the OKF chip. **Local library** lists every bundle on this machine: fetched, local folders, previews and maintenance workspaces (the same list the OKF chip attaches from).

**Tokens.** Pushing and opening pull requests use `DSH_OKF_GITHUB_TOKEN` (or `DSH_OKF_GIT_TOKEN`), as a git `http.extraHeader` through `GIT_CONFIG_*` and as a `Bearer` header to the REST API, never in argv, a URL or a config file. Without a token the branch is still pushed when git's own credentials allow it, and the page says the pull request could not be opened. For **GitHub Enterprise** set `team.githubHost` (for example `github.acme.com`); the API defaults to `https://<host>/api/v3`. An Azure DevOps hub works for Maintain, New project wiki and pushing, but its pull requests are not listed or opened.

**Still to do in knowledgeAgent** (the plugin only reads and writes the layout above): a `kb-publish` skill that renders a bundle into `published/Projects/<Project>/`; `kb-ingest` finding the bundle through the hub's registry and opening its pull request against the hub; and the hub's own `AGENTS.md` rules.

## How the agent uses the bundle

When a session has a bundle, the Host adds a **system-prompt context** (`okf:session-bundle`) on every turn. The context names the bundle and its folder, explains the OKF conventions, and includes the bundle's `index.md` catalog (first 8000 characters by default). DSH sends contexts after the retained history, so switching bundles does not invalidate the cached system-prompt prefix. The agent loop also logs the context whenever it changes.

**The plugin registers no tools.** An OKF bundle is a wiki: a catalog, pages with a title and description in their frontmatter, and links between pages. The model is better at choosing pages from that catalog than any keyword ranking the plugin could do, so the context tells it to start from the catalog, open the pages it decides on with the Harness's own `read`, follow links, and `grep` / `glob` under the bundle folder when it wants exact terms. It writes those patterns itself, which also handles Chinese text, where words are not separated by spaces.

A **subagent** inherits the bundle of the session that spawned it (`parentSession`).

The context re-reads `index.md` whenever its modification time changes, so the catalog follows the agent's own edits on the next turn.

The selection is stored in the plugin's own `library.json`, keyed by session id, not in the session log. Choosing a bundle therefore never writes an event that another DSH build would refuse to load.

## Config

Optional settings go under the row in `cordis.patch.yml`. A patch replaces the whole `config` block.

| Key | Default | Meaning |
|---|---|---|
| `libraryDir` | `<DSH home>/okf` (`$DSH_HOME`, else `~/.dsh`) | Where `library.json` and fetched checkouts (`repos/<id>/`) live |
| `gitPath` | `git` | The git executable |
| `gitTimeoutMs` | `300000` | Deadline for one git command |
| `indexChars` | `8000` | Characters of `index.md` sent each turn; `0` sends none |
| `promptContext` | `true` | Add the per-session context |
| `team.url` | — | Team wiki repository to connect when none is connected yet |
| `team.ref` | the remote's default branch | Base branch of the team wiki |
| `team.root` | `''` (repository root) | Where to look for bundles when `AGENTS.md` has no registry |
| `team.python` | `python` on Windows, else `python3` | Runs the repository's `scripts/okf.py` |
| `team.okfScript` | `scripts/okf.py` | The toolchain, relative to the repository |
| `team.githubHost` / `team.githubApi` | `github.com` / `https://api.github.com` (`https://<host>/api/v3` for another host) | For GitHub Enterprise |
| `team.autoMergeLabel` | `wiki-auto-merge` | Label on eligible pull requests; `''` sets none |
| `team.agentActor` | `dsh/agent` | `generated.by` the maintenance rules ask for |
| `team.commitAuthor` | `DSH Wiki <dsh-wiki@users.noreply.github.com>` | Committer when git has no identity |

## How fetching works

1. `git clone --depth 1 --filter=blob:none --no-checkout` downloads the latest commit's tree and no file contents.
2. `git ls-tree` lists the paths. Only the candidate `index.md` files are read, to find the bundle.
3. `git sparse-checkout set /<bundle folder>/` and a checkout bring down only the bundle's files.

A large monorepo therefore costs little more than the bundle itself. Update runs `git fetch --depth 1` and `git reset --hard FETCH_HEAD` in the same sparse checkout. A clone goes to a temporary folder first and moves into place only after it succeeds, so a failed fetch leaves nothing behind.

## Layout

```text
dsh-okf-plugin/
├── package.json          # dsh.bundle.patch + dsh.client + exports["./client"]
├── cordis.patch.yml      # inserts the one row, named after this package
├── build.mjs             # emits lib/index.js (Host), lib/client.js (browser), lib/check-pr.js (CI)
├── examples/
│   └── wiki-auto-merge.yml # CI workflow for the team wiki repository
├── src/
│   ├── index.ts          # Host: /api/okf/* routes, prompt context
│   ├── host/
│   │   ├── git.ts        # remote parsing (GitHub / Azure DevOps), git runner, clone/pull
│   │   ├── library.ts    # library.json, fetch/update/add/remove, session selections
│   │   ├── bundle.ts     # bundle detection, catalog summary, safe page reads
│   │   ├── frontmatter.ts# small YAML frontmatter reader (no dependencies)
│   │   ├── knowledge.ts  # the per-session prompt context (team rules in maintenance sessions)
│   │   ├── team.ts       # Team Wiki: project wikis, PR list, Maintain, New project wiki, Open pull request
│   │   ├── review.ts     # reviewed/unreviewed from frontmatter; the agent-edit stamp
│   │   ├── eligibility.ts# the auto-merge rule (shared with lib/check-pr.js)
│   │   ├── github.ts     # the few GitHub REST calls
│   │   └── run.ts        # git / python child processes with the token header
│   ├── check-pr.ts       # CI checker -> lib/check-pr.js
│   ├── types/
│   │   ├── okf.ts        # records and routes shared by both halves
│   │   └── contract.ts   # vendored copy of the Harness contract faces used
│   └── client/
│       ├── index.ts      # apply(): dictionaries + the two slot entries
│       ├── store.ts      # the one store: library, selections, dialog state
│       ├── components.tsx# session chip, dialog, add form, preview, page reader
│       ├── team.tsx      # Team Wiki page, sidebar glyph, Open pull request button + dialog
│       ├── markdown.tsx  # markdown → React elements (no innerHTML)
│       ├── styles.ts     # inline style table on the shell's --dsw-* tokens
│       └── locales.ts    # the `okf` namespace copy (zh source of truth, en)
└── scripts/
    ├── smoke.mjs         # both halves end to end, no Harness needed
    ├── team-smoke.mjs    # the Team Wiki end to end against a bare repo + a fake GitHub API
    ├── harness-check.mjs # against DSH's real SystemPrompt + ToolRuntime (needs a checkout)
    └── preview-server.mjs# a dev page that mounts the built UI against the real Host routes
```

## Build and test

```sh
npm install
npm run typecheck
npm run build      # -> lib/index.js + lib/client.js + lib/check-pr.js
npm run smoke      # smoke.mjs, team-smoke.mjs, hub-smoke.mjs
```

`lib/` is committed on purpose. The profile installs the package as it is, with no build toolchain. The Host artifact may import only Node built-ins, and `build.mjs` fails if it imports anything else.

**`npm run smoke`** creates two throwaway git repositories as `file://` remotes and drives both halves through the built artifacts. It covers:

- **Fetching:** a sparse fetch of a nested bundle, auto-detection, the many-bundles choice, duplicate ids, refused URLs, refs and paths (credentials, option injection, `..`), and cleanup after a failed fetch.
- **Preview:** the catalog summary, page reads, and path-traversal refusal.
- **Session use:** select and read back, the prompt context (including subagent inheritance), and that no tools are registered.
- **Updating:** a clean update, a new commit, a refused overwrite of local edits, and a forced update.
- **Library changes:** add-local and remove (a local folder is never deleted).
- **Editing:** Edit as workspace unshallows the library checkout in place and is idempotent; edit rules reach only a session whose workspace holds the bundle; the catalog follows an edited `index.md`; Update refuses uncommitted changes, refuses to force, fast-forwards a clean bundle, and keeps diverged local commits; Remove refuses to delete unpushed work; Fetch refuses to overwrite a leftover checkout with unsaved work; a local bundle is edited at its git top level. The browser flow runs against stand-ins for `workspaces` and `uiWorkspace`: register, wait for the new row, connect, attach the bundle, open the session, and the fallback when registration fails.
- **Remote parsing:** GitHub and Azure DevOps URL forms, and redaction.
- **Browser half:** the registrations, the shared store, the chip and dialog markup, the offline state, and the markdown safety rules (raw HTML renders as text, no `javascript:` hrefs, external links open with `noopener`).

**`scripts/team-smoke.mjs`** needs a knowledgeAgent checkout (`WIKI_FIXTURE`, else `../knowledgeAgent`) and Python. A bare repository with `okf/payments` (knowledgeAgent's bundle, one page stamped reviewed by `alice`) plays the team wiki; git reaches it under a GitHub URL through `url.<file>.insteadOf`, and a local HTTP server stands in for the GitHub API. It covers connect, review counts, Preview, Maintain (and reuse), the team rules in the prompt context, Open pull request (an eligible new page with its `index.md`/`log.md` lines and a stray change left out; then a reviewed page edited without reset, which is reset and needs a person; then a lint failure that commits nothing), the PR list and its verdicts, `lib/check-pr.js` agreeing in both cases, New project wiki with its setup pull request, and a merge that closes the workspace so Maintain starts fresh.

**`scripts/hub-smoke.mjs`** covers the hub layout on a GitHub Enterprise host (`github.acme.com`, API under `/api/v3`): the registry drives the project list (summary, owner, repo link, a registered but missing folder, publish status), a new page is eligible, a change under `published/Projects/Payments/` goes in the same pull request and needs a person while another project's published page is left out, New project wiki adds a registry row (with `|` escaped) in the same pull request, a registered name is refused, and `lib/check-pr.js` maps every case through the registry.

**`scripts/harness-check.mjs`** applies the built Host module next to DSH's real `SystemPrompt` and `ToolRuntime`, provided by sibling plugins as in the Harness. It checks that the module applies under strict injection, that `assemble({ agent })` carries the bundle for the right session only, and that no `okf_*` tool reaches the real registry. It also checks that disposal removes everything.

```sh
DSH_ROOT=D:/project/dsh node --import file:///D:/project/dsh/node_modules/tsx/dist/esm/index.mjs scripts/harness-check.mjs
```

**`scripts/preview-server.mjs`** serves the built UI at `http://127.0.0.1:4317/`, backed by the real Host routes and real git, with a stand-in sidebar that holds the Team Wiki entry. Add `?panel=okf-team-wiki` to open the Team Wiki page, `?dark` for the dark theme and `?lang=zh` for Chinese; `--github-api <url>` points the Team Wiki at another GitHub API. With `DSH_ROOT` set it uses DSH's own theme CSS.

## Not verified yet

- **The Team Wiki page has not run in the live Harness yet.** The `main` + `sidebar.panellist` registration is the one dsh-ado-stories uses for User stories; `layout.selectPanel(null)` before `openSession` is meant to leave the page for the new session. Against a real GitHub repository only the stand-in API was used: opening a pull request, labels, check runs and `refs/pull/<n>/head` fetches are untested live. The GitHub REST calls use `Bearer`; the git push uses Basic `x-access-token`, which GitHub accepts for both classic and fine-grained tokens.

- **Editing in place has not run in the live Harness yet.** The workspace services did: an earlier build (which cloned a separate copy) registered the workspace, DSH opened a session in it, and the bundle was attached, all from an out-of-tree bundle. Pushing from an edited bundle has not been tried.

- **Not loaded in a running Harness yet.** The Host routes and prompt context were checked against DSH 0.2.1-alpha.1 source: the smoke test, the harness check, and the preview page. The plugin has not been installed with `plugin_manager`, and the agent has not answered from a bundle in a real session.
- **The button's placement in the real Harness is unconfirmed.** DSH does not render `conversation.session.header.utilities` in a blank session (the "hero" phase), so the first install showed no button there; the composer copy (`conversation.input.right`) was added for that reason. The composer row also needs a session id: in a "New session" view that has not created its session yet, neither button can appear.
- **Azure DevOps was not tested against a live organization.** URL parsing is covered by tests, and the token header follows Azure DevOps' documented Basic-PAT scheme, but no real ADO clone was run. GitHub was tested live with `yishao1224-design/knowledgeAgent`.
- **File access to the bundle folder is unconfirmed.** The agent now reads pages with DSH's own `read` / `grep` / `glob`. DSH's `read` resolves paths without a workspace fence in 0.2.1-alpha.1 source, but a session's sandbox or permission profile may still block or prompt for reads under `~/.dsh/okf/`. Check this in a real session.
- **The vendored contract** (`src/types/contract.ts`) was read from DSH 0.2.1-alpha.1. If a Harness upgrade moves one of these shapes, that file is the one to update.
