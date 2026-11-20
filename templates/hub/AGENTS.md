# Team wiki hub

This repository holds the team's knowledge: one OKF bundle per project,
registered in the table below. Agents working in a project's code repository
are pointed here by that repository's own AGENTS.md.

## How to use it

1. Find the project in the registry, then read `<Bundle>/index.md` and the pages it lists.
2. Follow `<Bundle>/SCHEMA.md` when writing pages. Every page an agent writes
   is an unreviewed draft (`status: draft`, `lifecycle: draft`, `generated: { by, at }`).
   Never write `verified` entries or `human:` reviewers; a person adds those.
3. Never edit anything under a bundle's `sources/`; capture a new dated file instead.
4. Run `python scripts/okf.py lint --bundle <Bundle>` before proposing a change.
5. Propose changes as a pull request that touches one project only.
   A pull request that only adds or edits unreviewed pages may merge automatically;
   anything else waits for a person.
6. `published/Projects/` is generated (the Publish button in DSH's Team Wiki page)
   and synced to the Azure DevOps wiki after merge. Do not edit it by hand.

## Project registry

One row per project. Agents read this table to find a project's OKF bundle in this repository.

| Project | Repo | Summary | Owner | Bundle |
|---|---|---|---|---|
