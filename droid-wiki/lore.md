# Kaneo lore: how the project got here

A dated history of the repository's evolution, reconstructed from commit history, release tags, and the changelog. Where the "why" isn't explicit in commit messages, it's hedged with "appears" or "likely".

## Eras

### December 2024 – January 2025: scaffold and first board

The repository began on December 30, 2024 with three `create-turbo` scaffold commits, followed by a 70-file "initial" commit on December 31 that replaced the scaffold with the real app skeleton. Authentication arrived on January 3, 2025, and by January 5 the app had switched to sessions, file-based routes, and an auth provider. The core domain followed within three weeks: workspace CRUD on January 15, the first kanban board and projects on January 18, and WebSocket-driven task updates by January 26. The `task`, `project`, and `workspace` API modules all date from January 2025. January was the busiest month of the first year at 208 commits.

### February – May 2025: teams, invites, and the first releases

February 2025 brought the Teams refactor (PR #70) on February 22 — the same day as the first release tag, v0.1.0 — plus invites, pending-member screens, project slugs and icons, and a demo setup. The project shipped 0.2.0 (March 24), 0.3.0 (March 26), and 0.4.0 (May 10), and the API runtime moved to Node.js on April 20 (PR #138). Commit volume cooled from the January peak to the 80s per month. This was the "single app" era: `apps/api`, `apps/web`, `apps/docs`, and `packages/libs` were the whole monorepo.

### June – September 2025: v1.0.0, PostgreSQL, and a design pass

The database migrated from SQLite to PostgreSQL on June 14 (PR #315), and v1.0.0 was tagged on June 20, roughly six months after the first commit. July 2025 saw a repository-wide design-system sweep (PR #363, 141 files, +10,775 lines) that gave the web app a consistent component look, and August brought the Better Auth integration (PR #466) plus a routing restructure to pathless, protected authenticated routes (PR #467). Then activity nearly stopped: two commits in September 2025. The calm precedes the storm below.

### October – November 2025: Version 2

"Version 2" (PR #570) landed October 23, 2025 and was tagged v2.0.0 the same day. The changelog shows the beta train ran first (2.0.1-beta.x releases from October 1), and the diff touched everything: database schema, auth, activity, labels, onboarding flow, and routing. The `packages/email` package was born with this commit. A v1 migration guide existed for a while and was removed in August 2026 — evidence that v2 was a genuine restructuring, not a renumbering. October had only 9 commits total, so most of the work happened on branches. November resumed releases at a modest 37 commits and 3 tags.

### December 2025 – February 2026: the cadence changes

December 2025 jumped to 271 commits and 10 releases — though more than 120 of those commits were dependabot churn, the release train had clearly shifted into high gear, with 16 releases in January 2026. The docs grew an OpenAPI specification file in December 2025, switched to Mintlify in February 2026, and a new landing-page app (`apps/site`) appeared in February 2026. The same month, the web app went through a component-library migration to coss/Base UI (162 files, +7,123 lines), replacing the earlier design-system components. This era looks like the pivot from a side project to a maintained product with real docs and marketing surface.

### March – September 2026: platform expansion

The last era is the busiest. March 2026 hit 364 commits and 21 releases. April added the MCP server (first as `apps/mcp`, moved to `packages/mcp` the same month). May introduced workspace RBAC with custom roles and instance admin, and a new `packages/permissions` package to own the permission vocabulary. July tightened MCP OAuth. August 2026 was the all-time peak — 554 commits, 24 releases, and a remarkable breadth: custom fields, the Planka import CLI (`packages/planka-import`), the MCP package published to the official MCP Registry, a refactor that generates the OpenAPI spec from Zod (94 files, +17,558 lines), a Node 24 runtime migration, and the first Peekareq/Peekareview AI code-review bots (a 3,028-line addition). The current version at snapshot time is v2.25.0 (September 2026).

## Longest-standing features

The core of the product has been stable since the first six weeks:

- **Workspaces, projects, tasks**: the `apps/api/src/workspace`, `apps/api/src/project`, and `apps/api/src/task` modules all first appeared in January 2025 and remain the backbone of the API.
- **The kanban board**: first committed January 18, 2025 ("adding initial kanban board"); it is still the main screen.
- **Realtime task updates**: WebSocket communication for tasks landed January 26, 2025; the architecture (events, WebSockets, client cache updates) survives in the same conceptual form today.
- **The boot banner**: `apps/web/src/main.tsx` has printed a console-art logo since the December 2024 scaffold. The files `main.tsx` and `App.tsx` are the oldest surviving sources in the tree.

## Deprecated or replaced features

- **SQLite (better-sqlite3) → PostgreSQL**: the original database, in use from January 2025, was replaced by PostgreSQL on June 14, 2025. Drizzle migrations 0000–0045 tell the story: the schema evolved through 46 migrations since.
- **Custom auth stack → Better Auth**: the API refactored its own auth at least twice in early 2025 ("refactoring auth again…", January 2025), then adopted Better Auth in August 2025 and cleaned up the org plugin in September 2025.
- **Early frontend state and routing**: `apps/web/src/store/workspace.ts` and `store/hash.ts` were deleted as state moved to server-state libraries; the file-route tree was twice restructured (a major route refactor in February 2025, then the pathless protected-route layout in August 2025), and the old `pages/` and `routes/index.ts`/`routes/dashboard.tsx` layouts are gone.
- **Demo seeding**: a `set-demo-user.ts` utility was deleted after the demo setup feature (added February 2025) was reworked.
- **The v1 migration guide**: explicitly removed in August 2026 once v2 had been out long enough.
- **The original MCP placement**: MCP began as `apps/mcp` in April 2026 and was moved into `packages/mcp` within the same month so it could be published independently.
- **Pre-Mintlify docs**: the docs app went through a metadata/OG-image phase in April 2025 and a Mintlify restructure in February 2026; the current `docs.json` layout dates from that switch.

## Major rewrites

The largest diffstat commits, by inserted lines, with what actually changed:

- **"initial"** (December 2024, 70 files, +2,243): replaced the `create-turbo` scaffold with the real project skeleton. The commit message undersells it; nearly everything traces back here.
- **"refactor: adding workspace schemas, refactoring auth again…"** (January 2025, 28 files, +2,954): the first auth restructuring, a sign of how much churn early auth caused.
- **"style: use a consistent design system (#363)"** (July 2025, 141 files, +10,775): a repository-wide component and styling sweep that made the UI consistent ahead of v1.0.0.
- **"refactor: moves to pathless, protected authenticated routes and beforeLoad dashboard routing (#467)"** (August 2025, 33 files, +1,013): the web app's routing restructured around route guards.
- **"Version 2 (#570)"** (October 2025): the v2.0.0 restructure — schema, auth, onboarding, routing — touching nearly every API module.
- **"style: adds coss ui & base ui"** (February 2026, 162 files, +7,123): the component-library migration to coss/Base UI.
- **"refactor(api): generate the OpenAPI spec from Zod instead of rewriting it"** (August 2026, 94 files, +17,558): the API's documentation generation rebuilt around Zod schemas; this is the largest single commit in history.
- **Custom fields migration churn** (August 2026, +4,822): the biggest database-schema change, delivered with the custom-fields feature.

## Growth trajectory

When each app and package first appeared (first added file, per `git log --diff-filter=A`):

| Path | First appearance |
|---|---|
| `apps/api`, `apps/web`, `apps/docs` | December 2024 (scaffold) |
| `packages/libs` | December 2024 ("initial") |
| Real `apps/docs` content (OG image generation, fonts) | April 2025 |
| `packages/email` | October 2025 (born with Version 2) |
| OpenAPI spec file in docs | December 2025 |
| `apps/site` (landing page) | February 2026 |
| MCP (`apps/mcp`, then `packages/mcp`) | April 2026 |
| `packages/permissions` | May 2026 (with RBAC) |
| `packages/planka-import` | August 2026 |

The integration surface grew along the way: the API now ships github, gitea, slack, telegram, discord, mattermost, and generic-webhook integrations under `apps/api/src/integrations`, added incrementally through 2025 and 2026.

Numbers behind all of this are on [by-the-numbers](by-the-numbers.md); the human side of the story is on [maintainers](maintainers.md). For what the system looks like today, see [overview/architecture](overview/architecture.md).
