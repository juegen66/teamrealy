# Kaneo fun facts

Five findings from digging through the repository that are specific to this project, not generic stats.

## The boot banner predates almost everything

Every page load of the web app prints ASCII art to the browser console:

```text
  All you need. Nothing you don't.
```

The tagline in `apps/web/src/main.tsx` is the product slogan, rendered as a console easter egg, and the code has survived since the December 2024 scaffold — it is one of the oldest pieces of source in the tree. Twenty months and 3,000 commits later, a new contributor's first interaction with the app is still this message.

## Two TODO comments in ~147,000 lines

The entire `.ts`/`.tsx` source tree contains exactly two TODO/FIXME/HACK comments, both in the team-invite UI (`invite-team-member-modal.tsx` and `members-table.tsx`). For a codebase this size — 1,304 files, about 147,000 lines — that is unusual. It suggests the project's PR culture either refuses to merge in-progress code or cleans it up immediately. Either way, "search for TODOs" is not a useful way to find weak spots here.

## A release every four days

The repository started December 30, 2024. The first release tag, v0.1.0, came February 22, 2025; the version in `package.json` at snapshot time is v2.25.0 (September 2026). That's 144 `vX.Y.Z` tags in about 21 months — one release every ~4 days on average, and faster since v1.0.0. August 2026 alone produced 24 releases. There are also 6 `mcp-v0.1.x` tags because the MCP package gets its own release stream. For context, v2.0.0 shipped four months after v1.0.0, and the cadence after v2 was weekly-or-better, with several months of near-daily releases (16 in January 2026, 21 in March 2026).

## Dependency security is pinned by policy, not just practice

`pnpm-workspace.yaml` contains ~29 `overrides` that force transitive dependencies to minimum-secure versions — for example `hono: '>=4.12.25'`, `path-to-regexp: '>=8.4.0'`, `ws: '>=8.20.1'`, `valibot: '>=1.4.2'`, and `undici: '>=7.29.0 <8'`. These are the supply-chain equivalent of "we saw the CVE, we're not waiting for the next release." It is backed by volume: 616 commits from `dependabot[bot]` (20% of all commits), and the changelog names specific fixes like "npm: fixing CVE-2026-75604". A repo this young pinning its entire transitive graph this tightly is a deliberate choice, not an accident.

## The January 2025 core is still the core

The task, project, and workspace API modules, the kanban board, and WebSocket-driven task updates were all built in the first six weeks (January 2025) — and after 3,000 commits, 46 database migrations, a SQLite-to-PostgreSQL swap, a v1-to-v2 restructure, and a component-library migration, they are still the product. `apps/api/src/task/index.ts`, `project/index.ts`, and `workspace/index.ts` each date from January 2025 and still serve the same purpose. The features that replaced things along the way (see [lore](lore.md)) are almost all outer layers — auth, routing, UI libraries, integrations — while the original three-resource model survived untouched in shape.

For the underlying numbers, see [by-the-numbers](by-the-numbers.md). For how the app fits together today, see [overview/architecture](overview/architecture.md), and for how to work on it, [how-to-contribute/index](how-to-contribute/index.md).
