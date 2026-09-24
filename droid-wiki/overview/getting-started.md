# Getting started

## Prerequisites

- Node.js 24 or newer (root `package.json` sets `"engines": { "node": ">=24.0.0" }`; `ENVIRONMENT_SETUP.md` and CI use 20.19+/24.19 interchangeably, but 24 is the tested baseline)
- pnpm 10.32.1 (`packageManager` field in `package.json`; enable via `corepack enable` or install directly)
- Git
- Docker, optional, for a full containerized run or for `pnpm test:integration`'s PostgreSQL dependency

## Clone and install

```bash
git clone https://github.com/usekaneo/kaneo.git
cd kaneo
pnpm install
```

pnpm workspaces cover everything under `apps/**` and `packages/**` (`pnpm-workspace.yaml`). `pnpm install` resolves all of them in one pass.

## Configure environment variables

Kaneo reads server configuration from a single `.env` file at the repository root, shared by the API and web dev servers. Create one with at minimum:

```bash
KANEO_CLIENT_URL=http://localhost:5173
KANEO_API_URL=http://localhost:1337
AUTH_SECRET=<32+ character random string, e.g. `openssl rand -hex 32`>
DATABASE_URL=postgresql://kaneo:kaneo@localhost:5432/kaneo
POSTGRES_DB=kaneo
POSTGRES_USER=kaneo
POSTGRES_PASSWORD=kaneo
```

Vite-only overrides for local development (`VITE_API_URL`, `VITE_TURNSTILE_SITE_KEY`, `VITE_SENTRY_DSN`) belong in `apps/web/.env.local`, not the root `.env`. The full variable reference, including optional SSO, SMTP, Redis, and cloud-abuse-gate settings, is in [`ENVIRONMENT_SETUP.md`](https://github.com/usekaneo/kaneo/blob/main/ENVIRONMENT_SETUP.md) and mirrored in [Configuration reference](../reference/configuration.md).

## Run PostgreSQL

Any local Postgres 16 works. The fastest path is the Postgres service from `compose.yml`:

```bash
docker compose -f compose.yml up postgres -d
```

or `compose.local.yml` if you want a lighter dev-only compose file.

## Start the dev servers

```bash
pnpm dev
```

This runs `turbo dev`, which starts the API on port 1337 and the web app on port 5173 in parallel, both with hot reload. Open [http://localhost:5173](http://localhost:5173); the web app talks to the API using `VITE_API_URL` (defaults to `http://localhost:1337`).

## Build

```bash
pnpm build
```

Runs `turbo build` across every app and package, respecting the dependency graph declared in `turbo.json` (a package's build only reruns when its own inputs, or a package it depends on, change).

## Test

```bash
pnpm test              # unit tests, all packages (turbo test)
pnpm test:integration   # PostgreSQL-backed API integration tests (turbo test:integration)
pnpm typecheck          # TypeScript project-references typecheck across the monorepo
```

`tests/api` holds fast unit tests that don't touch a real database; `tests/api-integration` spins up against a real PostgreSQL instance and exercises routing, auth, and RBAC end to end (see the `integration` job in `.github/workflows/ci.yml` for the exact environment variables CI uses, including `DISABLE_GUEST_ACCESS=false` and a throwaway `AUTH_SECRET`).

## Lint and format

```bash
pnpm lint
```

Runs Biome with `--write` and can reformat files across the repo, not just the ones you touched. Prefer `pnpm exec biome check <path>` while iterating on a specific change, and inspect the diff before committing a full `pnpm lint` run.

## Where to go next

- [Architecture](architecture.md) for how the API and web app fit together
- [How to contribute](../how-to-contribute/index.md) for the day-to-day development loop, branch naming, and PR process
- [Testing](../how-to-contribute/testing.md) for test patterns and how to add coverage
- [Debugging](../how-to-contribute/debugging.md) for common local-dev failure modes
