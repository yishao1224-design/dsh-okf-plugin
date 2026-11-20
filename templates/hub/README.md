# Team wiki hub

The team's knowledge, one [OKF](https://github.com/yishao1224-design/knowledgeAgent) bundle per project.

| Path | What it is |
|---|---|
| `AGENTS.md` | Rules for agents and the **project registry** |
| `<project>/` | One OKF bundle per project (`SCHEMA.md`, `index.md`, `log.md`, pages, `sources/`) |
| `scripts/okf.py` | The shared toolchain: `lint`, `index`, `links`, `log` |
| `published/Projects/` | Pages rendered for the Azure DevOps wiki; generated, reviewed in pull requests |
| `.github/wiki/` | The auto-merge checker and the workflows to enable |

Maintain it from DSH's **Team Wiki** page: New project wiki, Maintain, Open pull request, Publish.

## Turning on the workflows

The workflows are in `.github/wiki/workflows/` so that setting up the hub needs
no `workflow` token permission. To turn them on, move them to `.github/workflows/`:

- `wiki-auto-merge.yml` re-checks each pull request with `.github/wiki/check-pr.js`
  and lets eligible ones (only unreviewed pages) merge themselves. Enable
  "Allow auto-merge" in the repository settings and require the job in branch protection.
- `wiki-publish-to-ado.yml` syncs `published/Projects/` into the Azure DevOps wiki's
  `Projects/` section after a merge. Set `vars.ADO_WIKI_REPO`, optionally
  `vars.ADO_WIKI_BRANCH`, and `secrets.ADO_WIKI_PAT` first.
