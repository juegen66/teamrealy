# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Canonical guidance lives in [AGENTS.md](./AGENTS.md) (principles, boundaries, conventions, release flow). This file adds commands and the cross-file architecture; it does not repeat AGENTS.md.

@AGENTS.md

Domain vocabulary (Task, Assignee, Agent, Initiator, Activity, Comment, and which terms to avoid) is defined in `CONTEXT.md`. Use those terms in code and copy.

## Commands

pnpm monorepo driven by Turborepo. `package.json` engines require Node.js 24+.

```bash
pnpm install
docker compose -f compose.dev-db.yml up -d   # local Postgres 16 + Redis for host-native dev
pnpm dev                                      # API on :1337, web on :5173

pnpm typecheck
pnpm test                    # unit tests (API + web + packages)
pnpm test:integration        # API integration tests against real PostgreSQL
pnpm build
pnpm exec biome ci .         # read-only lint/format check (what CI runs); `pnpm lint` rewrites files
pnpm i18n:check              # i18n key check (CI); i18n:check:fix to repair
pnpm openapi:check           # apps/docs/openapi.json drift check (CI); openapi:check:fix to regenerate
```

Single test file (vitest filter matches path substrings):

```bash
pnpm --filter @kaneo/api test:unit mcp-tools          # tests/api/**/*.test.ts
pnpm --filter @kaneo/api test:integration task.test   # tests/api-integration/**/*.test.ts
pnpm --filter @kaneo/web test cn.test                 # apps/web/src/**/*.test.{ts,tsx}
pnpm --filter @kaneo/api test:watch
```

Database:

```bash
pnpm --filter @kaneo/api db:generate   # after editing apps/api/src/database/schema.ts
pnpm --filter @kaneo/api db:studio
```

Integration test notes: `tests/api-integration/setup.ts` sets all env vars itself, ignores the root `.env` (except to read `DATABASE_URL`), and rewrites the database name to end in `_test`; it refuses to run against a non-`_test` database. Tests run serially (one worker). `@kaneo/email` is aliased to a mock. Shared helpers are in `tests/api-integration/helpers/`.

## Architecture

### API (`apps/api`)

- `src/index.ts` is the composition root: it builds the `/api` router, mounts every feature router (`api.route("/task", task)` etc.), applies the app-wide auth/workspace-access middleware, and exports `AppType`. Adding a feature router means mounting it here so it appears in `AppType` and the OpenAPI document.
- Feature folders (`task/`, `project/`, `agent/`, ...) each have `index.ts` (routes via `createRoute` on `apiRouter()` from `src/openapi.ts`), `controllers/`, `schema.ts` (request Zod), and `response.ts` (response Zod).
- Startup order in `index.ts`: wait for DB, run a few pre-migration fixups, apply Drizzle migrations from `apps/api/drizzle/`, then post-migration data fixups (`src/migrations/`, `src/utils/migrate-*.ts`, `plugins/github/migration.ts`), seed default workspace roles, fail interrupted agent runs, then start plugins, the scheduler, and the WebSocket adapter. Migrations run on every boot, so they must be safe against existing installations.
- Event bus (`src/events/index.ts`) is an in-process `EventEmitter`. `publishEvent()` attaches the `initiatorId` from `eventContext` (AsyncLocalStorage). Subscribers via `subscribeToEvent()` live in `activity/`, `notification/`, `plugins/registry.ts` (integrations), and `ws/`.
- Realtime (`src/ws/`): the WS layer subscribes to events and broadcasts per-project and per-user through a `BroadcastAdapter`: in-memory by default, Redis (`redis-broadcast-adapter.ts`, `src/redis/`) when configured for multi-instance.
- Integrations (`src/plugins/`): GitHub, Gitea, Discord, Slack, Mattermost, Telegram, generic webhooks are `IntegrationPlugin`s registered in `plugins/registry.ts`, which fans task events out to each workspace's enabled integrations. The `*-integration/` feature folders hold their HTTP routes.
- AI agents (`src/agent/`): agents can be assigned to tasks; `runner/` executes runs with Mastra, triggered by assignment or comments (`comment-trigger.ts`), using task context and tools.
- MCP over HTTP is in `src/mcp/` (OAuth in `src/oauth/`); the stdio MCP package is `packages/mcp`.

### Web (`apps/web`)

- TanStack Router file routes in `src/routes/` (`routeTree.gen.ts` is generated). Fetchers in `src/fetchers/<feature>/` call the typed `client` from `@kaneo/libs`; queries and mutations in `src/hooks/queries` and `src/hooks/mutations`.
- Realtime: `hooks/use-project-websocket.ts` and `hooks/use-user-websocket.ts` receive WS messages and invalidate TanStack Query caches. Requests send `X-Kaneo-Window-Id` so a tab can recognize its own changes.
- Path aliases: `@` maps to `src/`, `@i18n` maps to the root `i18n/` directory.

### Shared packages

- `packages/libs/src/hono.ts` creates `hc<AppType>` from `@kaneo/api`, so API route/schema changes flow into web types. Typecheck the web app after changing API contracts.
- `packages/permissions`: permission vocabulary and built-in roles used by both API enforcement and UI capability checks.

## Notes

- `.cursor/rules/` predates the move to `@hono/zod-openapi` and still shows `hono-openapi` + Valibot route patterns. Follow AGENTS.md and the existing code instead.
- Husky hooks: `pre-commit` runs `biome ci .`, and `commit-msg` runs commitlint (Conventional Commits).
