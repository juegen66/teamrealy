# Glossary

## Domain vocabulary

| Term | Meaning |
| --- | --- |
| **Instance** | One deployed Kaneo installation, self-hosted or cloud. |
| **Workspace** | The top-level collaboration and authorization boundary. Users are members of a workspace with a role; almost every permission check is scoped to a workspace. |
| **Project** | A task container inside a workspace. Projects hold columns, labels, custom fields, and the tasks themselves. |
| **Task** | The unit of work: a title, description, status, priority, assignee, due date, labels, custom field values, comments, time entries, and relations to other tasks. |
| **Column** | A status lane on a project's kanban board (for example "To Do", "In Progress", "Done"). Tasks belong to a column. |
| **Role** | A workspace-scoped set of permission statements. Built-in roles (owner, admin, member, guest) live in `packages/permissions`; workspaces can also define custom roles. |
| **Permission** | A single capability string (for example `task:create`) checked by `requireWorkspacePermission()` before a workspace-scoped mutation runs. |
| **Activity** | Durable, user-visible history attached to a task or project (status changes, comments, assignment changes). |
| **Event** | An internal notification, published via `publishEvent()`, that drives activity recording, notifications, integrations, or realtime WebSocket updates. Not the same thing as activity — an event is the signal, activity is one of its consumers. |
| **Custom field** | A workspace- or project-defined extra attribute on a task (text, number, select, date, etc.), beyond the built-in fields. |
| **Task relation** | A typed link between two tasks (blocks, is blocked by, relates to, duplicates). |
| **Workflow rule** | An automation that reacts to a task or column change and performs an action (for example, moving a task to another column when a linked PR merges). |
| **Time entry** | A logged duration of work against a task, used for time tracking and reporting. |
| **Invitation** | A pending request for a user to join a workspace, sent by email or link. |
| **Notification** | A user-facing alert (in-app, email, or push) triggered by an event, subject to per-user notification preferences. |
| **Entitlement** | A billing-derived capability flag (seat count, feature access) checked by `require-entitlement-middleware.ts` on cloud/paid routes. |
| **Trial** | A time-boxed period of full entitlements before a workspace must subscribe, tracked in `apps/api/src/billing`. |
| **Seat** | A billable workspace membership slot, reconciled against the billing provider by the `seat-reconciliation` scheduled job. |
| **Device flow** | An OAuth device authorization flow (RFC 8628) used by the CLI and MCP clients to authenticate without a browser redirect back to a local port. |
| **Integration** | A connection to an external service (GitHub, Gitea, Slack, Discord, Telegram, Mattermost, or a generic webhook) that turns Kaneo events into outbound notifications or lets external events (like a merged PR) act on tasks. |
| **MCP (Model Context Protocol)** | The protocol Kaneo exposes over HTTP (`/api/mcp`) and via the published `@kaneo/mcp` stdio package, letting AI tools call task/project/label operations as MCP tools. |

## Technical vocabulary

| Term | Meaning |
| --- | --- |
| **Hono** | The web framework the API is built on (`apps/api`), chosen for its speed and first-class OpenAPI integration via `@hono/zod-openapi`. |
| **Better Auth** | The authentication library backing sessions, OAuth/SSO providers, device flow, and API keys (`apps/api/src/auth.ts`). |
| **Drizzle ORM** | The TypeScript ORM used for all PostgreSQL access; schema lives in `apps/api/src/database/schema.ts`, relations in `apps/api/src/database/relations.ts`. |
| **OpenAPI** | The API's machine-readable contract, generated from `createRoute()` definitions and checked against `apps/docs/openapi.json` in CI (`pnpm openapi:check`). |
| **TanStack Router / Query** | The web app's routing (file-based, `apps/web/src/routes`) and server-state (queries/mutations, cache invalidation) libraries. |
| **Turborepo** | The monorepo task runner (`turbo.json`) that caches and parallelizes `build`, `dev`, `lint`, `test`, and `typecheck` across every workspace package. |
| **Biome** | The formatter/linter used instead of ESLint + Prettier; `pnpm lint` runs `biome ci`/`--write` across the repo. |
| **i18next** | The localization library for the web app; `i18n/en-US.json` is the source-of-truth key set, mirrored into 20+ locale files. |
| **Redis Pub/Sub** | The optional fan-out mechanism that lets multiple API instances relay WebSocket broadcasts to each other; absent, WebSocket delivery falls back to an in-memory adapter (single instance only). |

## Related pages

- [Primitives](../primitives/index.md) for how workspace/project/task map to database tables
- [Features](../features/index.md) for integrations, billing, and workflow automation in depth
- [AGENTS.md glossary](https://github.com/usekaneo/kaneo/blob/main/AGENTS.md#glossary) for the canonical short-form definitions this page expands on
