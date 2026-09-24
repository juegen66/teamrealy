# Search

> Active contributors: Andrej, Tin, Luan

## Purpose

Global search finds tasks, projects, workspaces, comments, and activity entries inside one workspace and returns them as one flat, relevance-ranked list. It is deliberately simple under the hood: no Postgres full-text index (`tsvector`/`tsquery`), no separate search service — one route in `apps/api/src/search/` runs case-insensitive `ILIKE` queries across the relevant columns and scores hits with a `CASE` expression. The web app surfaces it through the command-palette search dialog.

## Key abstractions

| Abstraction | Source | What it is |
| --- | --- | --- |
| `GET /api/search` | `apps/api/src/search/index.ts` | One route, workspace-scoped via `workspaceAccess.fromQuery()`. Query params: `q`, `type`, `workspaceId`, `projectId`, `limit` (default 20, max 50), optional `userEmail`. |
| `globalSearch()` | `apps/api/src/search/controllers/global-search.ts` | Runs the per-type `ILIKE` queries, scores, merges, sorts, slices. |
| `escapeLikePattern()` | `apps/api/src/search/like-pattern.ts` | Escapes `\`, `%`, `_` in user input so they are treated literally, not as `ILIKE` wildcards. |
| `TASK_SHORT_ID_PATTERN` | `apps/api/src/search/task-short-id.ts` | Unicode-aware `KEY-<number>` pattern (e.g. `DEP-23`), supporting non-ASCII project keys. |
| `useGlobalSearch` | `apps/web/src/hooks/queries/search/use-global-search.ts` | TanStack Query hook with 30 s `staleTime`. |
| `SearchCommandMenu` | `apps/web/src/components/search-command-menu/index.tsx` | The command dialog: input, grouped results, keyboard navigation, route on select. |

## How it works

### What is searchable and how

The controller first resolves the caller's workspace set (from `workspaceUserTable`), then runs one query per selected `type` (`all`, `tasks`, `projects`, `workspaces`, `comments`, `activities`), always scoped to those workspaces and optionally narrowed by `projectId`:

| Type | Matched columns | Notes |
| --- | --- | --- |
| Task | `title`, `description` | Also special-cases the short-id pattern. |
| Project | `name`, `description` | |
| Workspace | `name`, `description` | Scoped to the caller's memberships. |
| Comments | `activity.content` (type `comment`) | |
| Activities | `activity.content` or rendered `eventData` | Non-comment activities get a generated summary such as `changed status from Todo to In Progress`. |

Matching is `LOWER(col) LIKE '%<query>%'` (via Drizzle `ilike`) — substring, not word-boundary or stemming — so `q` of three characters or more in the UI already finds plenty. Relevance is a per-row `CASE` score: title/name match = 3, description/content match = 2, else 1 (tasks additionally match their title for activity rows at 1). All results merge into one array, sorted by score descending then `createdAt` descending, sliced to `limit`, and returned with `totalCount` (pre-slice count) so a caller can tell more matches exist.

The one exception to plain substring matching is the task short id. If `q` matches `KEY-<number>` (the regex in `apps/api/src/search/task-short-id.ts` is Unicode-aware because project keys can be `ПА` or `测试项`, and the query is NFKC-normalized to match the stored normalized slug), the controller runs an exact lookup on project slug + task number and scores it 10 — the "type DEP-23 to jump straight to the task" path. The slug is compared with `ilike` but the user-supplied key is passed through `escapeLikePattern` so a project key containing `_` or `%` cannot widen the match.

### Web app surface

`apps/web/src/components/search.tsx` renders the sidebar search button with the keyboard shortcut hint; `SearchCommandMenu` opens a command dialog on that shortcut. It requires at least 3 characters (`searchEnabled = query.trim().length >= 3`), calls `useGlobalSearch` with the active workspace id and `limit: 20`, groups results by type with translated group labels, and navigates on select — tasks/comments/activities to the task detail route, projects to the board, workspaces to the workspace dashboard. Results are cached 30 seconds by TanStack Query, so repeated typing does not hammer the API.

## Integration points

- `apps/api/src/search/` is self-contained: the controller, the pattern helpers, and the OpenAPI route live together; nothing else publishes into search.
- Authorization: `workspaceAccess.fromQuery()` requires `workspaceId` and enforces membership; the controller re-scopes every query to the caller's workspace set as a second net.
- Web: `apps/web/src/fetchers/search/global-search.ts` (typed client), the hook, and the two components.

## Entry points for modification

- Add a searchable entity or column: extend `globalSearch` with a new type block, the `SearchResult` union, `searchResponseSchema`'s `type` enum, and the web group rendering.
- Tune ranking: the `CASE` scores and the final sort in `apps/api/src/search/controllers/global-search.ts`.
- Add a search index (e.g. Postgres FTS or a service): the current design is a deliberate no-index tradeoff; replacing it means changing the query layer while keeping the route contract.

## Key source files

| File | Purpose |
| --- | --- |
| `apps/api/src/search/index.ts` | The route and query schema wiring |
| `apps/api/src/search/controllers/global-search.ts` | All per-type queries, scoring, merge, and slice |
| `apps/api/src/search/schema.ts` | Query validation (`q`, `type`, `workspaceId`, `projectId`, `limit`) |
| `apps/api/src/search/response.ts` | `SearchResult` / `SearchResponse` OpenAPI schemas |
| `apps/api/src/search/like-pattern.ts` | `ILIKE` wildcard escaping |
| `apps/api/src/search/task-short-id.ts` | The Unicode-aware `KEY-<number>` pattern |
| `apps/web/src/hooks/queries/search/use-global-search.ts` | Query hook with 30 s staleness |
| `apps/web/src/components/search-command-menu/index.tsx` | The command dialog UI |
| `apps/web/src/components/search.tsx` | The sidebar search button |

## Related pages

- [Apps/web routing and state](../apps/web/routing-and-state.md) for the navigation targets search results link to
- [Primitives](../primitives/index.md) for the tables being searched
- [Realtime](realtime.md) for how the searched data stays fresh elsewhere in the UI
