# Testing

Kaneo splits tests into fast unit tests and PostgreSQL-backed integration tests. The split is visible in the two vitest configs under `apps/api/`, and it maps directly onto two root commands.

## The two tiers

- **Unit tests** (`pnpm test`) — no real database. API unit tests live under `tests/api/` and are picked up by `apps/api/vitest.config.ts`, which includes `../../tests/api/**/*.test.ts` and runs in the `node` environment. Web unit and component tests live next to the code under `apps/web/src/` and are picked up by `apps/web/vitest.config.ts`, which includes `src/**/*.test.{ts,tsx}` in a `jsdom` environment with `src/test/setup.ts` (`@testing-library/jest-dom`) and path aliases `@` → `./src` and `@i18n` → `../../i18n`.
- **Integration tests** (`pnpm test:integration`) — boot the Hono app against a real PostgreSQL database. They live under `tests/api-integration/` and are picked up by `apps/api/vitest.integration.config.ts`.

## Running tests

```bash
pnpm test              # all unit tests, via turbo
pnpm test:integration  # PostgreSQL-backed API integration tests
```

The root scripts delegate to turbo, which runs each package's own test script. To scope a run while iterating:

```bash
pnpm --filter @kaneo/api test:unit
pnpm --filter @kaneo/api test:watch    # vitest watch for API unit tests
pnpm --filter @kaneo/web test
pnpm --filter @kaneo/web test:watch
```

## What integration tests need

A real PostgreSQL instance and a `DATABASE_URL` whose database name ends in `_test`. `tests/api-integration/setup.ts` refuses anything else: if the database name doesn't already end in `_test`, it derives `kaneo_test` from your connection string, then asserts the requirement again. It also sets `NODE_ENV=test`, a throwaway `AUTH_SECRET`, and mocks `dotenv-mono` so your local `.env` never leaks into a test run. The CI `integration` job in `.github/workflows/ci.yml` runs the same command against a Postgres 16 service container with `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/kaneo_test`, `NODE_ENV=test`, `DISABLE_GUEST_ACCESS=false`, and a throwaway `AUTH_SECRET`. The integration config runs files serially (`fileParallelism: false`, one worker) with 60-second hook and test timeouts, and aliases `@kaneo/email` to the mock in `tests/api-integration/mocks/email.ts` so tests never send real mail.

## Test patterns

Integration tests boot the app and drive routes through the framework — this is the shape in `tests/api-integration/project.test.ts`:

- `const { app } = createApp()` from `apps/api/src/index.ts`, then `app.request("/api/project", { method: "POST", ... })`.
- `beforeEach(async () => { await resetTestDatabase(); })` from `tests/api-integration/helpers/database.ts` truncates every public table between tests.
- Sessions are mocked, not logged in: `mockAuthenticatedSession(user)` and `mockAnonymousSession()` from `tests/api-integration/helpers/auth.ts` spy on `auth.api.getSession`.
- Fixtures seed rows directly through Drizzle: `createWorkspaceMember()` from `tests/api-integration/helpers/fixtures.ts` creates a user, workspace, and membership, and `createProjectFixture(...)` seeds a project plus its default columns.
- Assertions mix HTTP status and JSON (`toMatchObject`) with direct database queries (`db.query...`) to verify persistence and side effects. Cross-cutting behaviors like RBAC and auth boundaries have dedicated files (`workspace-rbac.test.ts`, `authorization-boundaries.test.ts`, `cors.test.ts`).

Unit tests import the function under test and stub its inputs. `tests/api/utils/generate-demo-name.test.ts` is a minimal example: `vi.spyOn(Math, "random")` for determinism and `vi.restoreAllMocks()` in `afterEach`. Web hook and component tests follow the shape in `apps/web/src/hooks/use-workspace-permission.test.tsx`: `vi.mock(...)` replaces modules such as the auth client, `vi.hoisted` holds mock functions shared with those mocks, a `QueryClientProvider` wrapper (queries with `retry: false`) wraps `renderHook`, and assertions run under `waitFor`.

## Adding a new test

- Name it `<something>.test.ts` (or `.test.tsx` for components and hooks) and put it where its config picks it up: under `tests/api/` for API unit tests, under `tests/api-integration/` for integration tests, or next to the file it tests under `apps/web/src/` — the web convention is co-location, as in `apps/web/src/lib/cn.test.ts`.
- For integration tests, reuse the existing helpers rather than inventing new setup. `tests/api-integration/README.md` states the intent: coverage is intentionally incremental, so add new files for additional routes or behaviors using `helpers/fixtures.ts`, `helpers/database.ts`, and `helpers/auth.ts`.
- Behavior changes should come with a meaningful regression test, not just a happy path. For UI changes, that usually means a component test asserting on what a user sees or can do.
