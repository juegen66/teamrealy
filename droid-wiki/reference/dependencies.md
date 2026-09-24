# Dependencies

The dependencies that define Kaneo's architecture, read from `package.json`, `apps/api/package.json`, `apps/web/package.json`, and `pnpm-workspace.yaml`. The point here is what each library does and where it is used, not a version listing — pinned versions move constantly, so treat any number you see in the manifests as current, not contractual.

## Core dependencies

| Library | Used for | Where |
| --- | --- | --- |
| [Hono](https://hono.dev) + `@hono/zod-openapi` | The API framework. Every route is declared with `createRoute()` from `@hono/zod-openapi` and mounted on the `apiRouter()` factory in `apps/api/src/openapi.ts`, which returns an `OpenAPIHono` instance. The route declarations double as the OpenAPI document — `apps/docs/openapi.json` is generated from them with `pnpm openapi:check:fix` — and the request/response schemas feed the shared typed client. | `apps/api` |
| [Better Auth](https://www.better-auth.com/) | Authentication: email/password, magic links, email OTP, OAuth/SSO (GitHub, Google, Discord, custom OAuth/OIDC), anonymous guest users, organizations, teams, invitations, API keys, bearer tokens, device authorization, an instance admin plugin, and an OpenAPI surface. It maps its models onto the Kaneo schema through the Drizzle adapter in `apps/api/src/auth.ts`; the `organization` plugin is wired to the `workspace`, `workspace_member`, and `workspace_role` tables with dynamic access control. | `apps/api`, and `@kaneo/permissions` depends on its types |
| [Drizzle ORM](https://orm.drizzle.team/) | The database layer. `apps/api/src/database/schema.ts` defines all `pgTable`s, `apps/api/src/database/relations.ts` the relation graph, and controllers query through a single lazy Drizzle instance in `apps/api/src/database/index.ts`. Schema changes ship as generated migrations (`pnpm --filter @kaneo/api db:generate`) applied by `drizzle-kit migrate()` at startup. | `apps/api` |
| [TanStack Router](https://tanstack.com/router) + [TanStack Query](https://tanstack.com/query) | Frontend routing and server state. The router owns the file-based route tree in `apps/web/src/routes` (with a code-generation plugin at build time); Query owns all data fetching, caching, and cache invalidation, which is how realtime WebSocket updates get reflected in the UI. | `apps/web` |
| [Vite](https://vite.dev) | The web build tool and dev server. `apps/web` builds with `vite build` and type-checks with `tsc`; the build uses `@vitejs/plugin-react` with the React Compiler and `@tailwindcss/vite`. The API, by contrast, bundles with esbuild. | `apps/web` |
| [Turborepo](https://turbo.build/) | Monorepo orchestration. The root scripts (`build`, `dev`, `lint`, `test`, `typecheck`) all run through `turbo`, which fans them out to every app and package and caches results. | repository root |
| [Biome](https://biomejs.dev/) | Linting and formatting for the whole repo, run through the `lint` scripts. Biome's `--write` mode is used, so a root lint can reformat files — useful for cleanup, but a reason to run targeted checks while iterating. | repository root, every app and package |
| [Zod](https://zod.dev) | Schema validation. The API validates inputs with Zod through `@hono/zod-openapi`; the same schemas produce the OpenAPI spec and, through `hc<AppType>()` in `packages/libs/src/hono.ts`, the fully typed client that the web app calls. The MCP package also uses Zod for its tool input schemas. | `apps/api`, `packages/libs`, `packages/mcp` |

## Secondary dependencies worth knowing

| Library | Role |
| --- | --- |
| [React 19](https://react.dev) | The UI runtime for `apps/web`, with the React Compiler enabled for automatic memoization. |
| `@base-ui/react` and `radix-ui` | The headless component primitives under the web app's UI (the coss/Base UI migration of February 2026). |
| `@dnd-kit/*` | Drag-and-drop for the kanban board and sortable lists. |
| Tiptap (`@tiptap/*`) | The task description and comment editors, including markdown import/export and table, list, and code extensions. |
| `react-use-websocket` | Client-side WebSocket connection to the API's realtime layer. |
| `ioredis` | The Redis client behind the optional WebSocket Pub/Sub fan-out (`apps/api/src/redis/index.ts`). |
| `@aws-sdk/client-s3` + `s3-request-presigner` | Presigned S3 uploads for task images (`apps/api/src/storage/s3.ts`). |
| `octokit` + `@octokit/webhooks` | The GitHub App integration: API calls and webhook verification. |
| `nodemailer` | Outbound email behind `@kaneo/email`, whose templates are built with React Email. |
| `@sentry/node`, `@sentry/react`, `@sentry/profiling-node`, `@sentry/vite-plugin` | Opt-in error tracking for the API and web app. |
| `creem` | The Creem billing SDK used only in cloud mode. |
| `@modelcontextprotocol/sdk` | The MCP server implementation in `packages/mcp` and the API's HTTP MCP endpoint. |
| `croner` | Scheduled jobs such as trial reminders (`apps/api/src/scheduler/`). |
| `@paralleldrive/cuid2` | CUID generation for every database primary key. |
| `valibot` | Used only for internal, non-HTTP config validation under `plugins/` and `ws/`; HTTP validation is Zod. |

## The `overrides` security-pinning pattern

`pnpm-workspace.yaml` carries roughly thirty `overrides` that force transitive dependencies to minimum-secure versions — for example `hono: '>=4.12.25'`, `path-to-regexp: '>=8.4.0'`, `ws: '>=8.20.1'`, `valibot: '>=1.4.2'`, and `undici: '>=7.29.0 <8'`. This is the supply-chain equivalent of fixing a CVE without waiting for every upstream to bump; it is reinforced by heavy `dependabot[bot]` activity (616 commits, see [by-the-numbers](../by-the-numbers.md)). The full list and how the pins map to advisories are covered in [cleanup-opportunities](../cleanup-opportunities.md); the short version is that a new transitive dep cannot quietly drag in a known-vulnerable version.

One caveat when reading the manifests: `better-auth` is pinned in the `overrides` (`1.6.25` at snapshot time) while `apps/api/package.json` requests `^1.6.26`, so the effective installed version is what the override says, not what the range suggests.
