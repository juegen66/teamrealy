# Kaneo platform overview

Kaneo is a self-hosted project management platform: boards, tasks, comments, time tracking, and activity history for teams that want Jira-style workflows without Jira-style weight. The project's stated goal is "all you need, nothing you don't," and that shows up in the codebase as a deliberate resistance to unnecessary configuration and moving parts.

## What it does

Teams create workspaces, invite members, and organize work into projects with kanban boards, backlogs, calendars, and Gantt views. Tasks carry statuses, priorities, labels, custom fields, subtasks, comments, and time entries. Activity on a task is recorded as durable history and pushed to connected clients over WebSockets in real time. Integrations connect tasks to GitHub, Gitea, Slack, Discord, Telegram, Mattermost, and generic webhooks, and an MCP server exposes the same task/project/label operations to AI tools like Claude and Cursor.

## Who uses it

Kaneo ships two ways: as [Kaneo Cloud](https://cloud.kaneo.app), a hosted multi-tenant product with billing and trials, and as a self-hosted instance that a team runs on its own infrastructure with Docker Compose, Coolify, or Kubernetes. Both modes run the same codebase; cloud-only behavior (disposable-email blocking, Turnstile captchas, entitlement checks) is gated behind the `KANEO_CLOUD` environment variable rather than living in a separate fork.

## Tech stack

| Layer | Technology |
| --- | --- |
| API | [Hono](https://hono.dev) on Node.js, validated with `@hono/zod-openapi` |
| Auth | [Better Auth](https://www.better-auth.com/) (sessions, OAuth/SSO, device flow, API keys) |
| Database | PostgreSQL via [Drizzle ORM](https://orm.drizzle.team/) |
| Realtime | Native WebSockets, optionally fanned out through Redis Pub/Sub |
| Web app | React + Vite, [TanStack Router](https://tanstack.com/router) and [TanStack Query](https://tanstack.com/query) |
| Monorepo tooling | pnpm workspaces + [Turborepo](https://turbo.build/), [Biome](https://biomejs.dev/) for lint/format |
| Docs site | Next.js (`apps/site`) serving Mintlify-authored content (`apps/docs`) |

## Repository layout

```text
kaneo/
├── apps/
│   ├── api/     # Hono API: routes, controllers, database, auth, integrations, MCP, WebSockets
│   ├── web/     # React/Vite frontend
│   ├── docs/    # Product + API documentation content (openapi.json lives here)
│   └── site/    # Public website and documentation host (Next.js)
├── packages/
│   ├── libs/               # Typed Hono client + URL helpers shared by the web app
│   ├── permissions/        # Canonical permission vocabulary and built-in roles
│   ├── mcp/                 # Published stdio MCP package (@kaneo/mcp)
│   ├── email/                # Shared email templates and send helpers
│   ├── planka-import/        # Importer for migrating from Planka
│   └── typescript-config/    # Shared tsconfig bases
├── tests/
│   ├── api/               # API unit tests
│   └── api-integration/   # PostgreSQL-backed integration tests
└── charts/kaneo/          # Helm chart for Kubernetes deployment
```

## Quick links

- [Architecture](architecture.md) — how the pieces fit together, with diagrams
- [Getting started](getting-started.md) — install, run, and test locally
- [Glossary](glossary.md) — workspace, project, role, activity, and event, defined
- [apps/api](../apps/api/index.md) and [apps/web](../apps/web/index.md) — the two main runtimes
- [Features](../features/index.md) — integrations, billing, realtime, notifications, and automation
- [How to contribute](../how-to-contribute/index.md) — the development loop

## Where the rules live

[`AGENTS.md`](https://github.com/usekaneo/kaneo/blob/main/AGENTS.md) at the repository root is the canonical operating guide for anyone (human or AI) making changes to Kaneo. It defines the project's boundaries — the API owns authorization, workspace-scoped operations go through the shared permission vocabulary, and self-hosting stays single-instance-first. This wiki expands on what the code does; `AGENTS.md` is the source of truth for what changes should and shouldn't do.
