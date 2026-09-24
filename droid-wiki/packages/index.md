# Packages

**Active contributors:** Andrej, Tin

The `packages/` directory holds the shared libraries and published tools the two apps (and external consumers) depend on. Unlike `apps/api` and `apps/web`, these are small, single-purpose modules. Two are internal contract packages the apps import directly (`libs`, `permissions`); two support the API or the build (`email`, `typescript-config`); and two are standalone npm packages that run outside the monorepo's runtimes (`mcp`, `planka-import`).

| Package | Purpose | Page |
| --- | --- | --- |
| `email` | React email templates and nodemailer send helpers for workspace invitations, magic links, OTPs, password resets, notifications, and trial reminders | [email.md](email.md) |
| `libs` | Typed Hono client plus URL resolution helpers that `apps/web` imports instead of hand-writing `fetch` calls | [libs.md](libs.md) |
| `mcp` | Published stdio MCP server (`@kaneo/mcp`) that lets Claude Desktop, Cursor, and other MCP clients talk to a Kaneo instance | [mcp.md](mcp.md) |
| `permissions` | Canonical permission vocabulary and built-in roles (viewer/member/admin/owner) enforced by the API and mirrored by the web UI | [permissions.md](permissions.md) |
| `planka-import` | CLI that migrates Planka boards into Kaneo over both public APIs | [planka-import.md](planka-import.md) |
| `typescript-config` | Shared tsconfig bases extended by the other packages | (described below) |

## typescript-config

`packages/typescript-config` has no runtime code — it exports two tsconfig bases that other workspaces extend. `base.json` sets the shared strict compilation defaults (`target`/`module`/`moduleResolution` `NodeNext`, `strict`, `declaration` with declaration maps, `noUncheckedIndexedAccess`, `resolveJsonModule`). `react-library.json` extends `base.json` and adds `"jsx": "react-jsx"` for packages whose sources include JSX. Workspace packages reference them with `"extends": "@kaneo/typescript-config/base.json"` (or `react-library.json`), so a TypeScript setting change here propagates to every package in the monorepo.

## How the packages fit

- `libs` and `permissions` are the two contract packages: `libs` carries the API's typed surface to the web app, and `permissions` carries the authorization vocabulary to both API enforcement and UI capability checks.
- `email` is the API's mail layer; its SMTP configuration lives entirely in the API's environment variables.
- `mcp` and `planka-import` are published, externally usable tools — the MCP HTTP endpoint inside the API is a separate surface (see [apps/api](../apps/api/index.md)).
- `typescript-config` is build tooling only and never appears at runtime.

## Related pages

- [apps/api](../apps/api/index.md) for the server that consumes `permissions` and `email`
- [apps/web](../apps/web/index.md) for the client that consumes `libs` and `permissions`
- [Architecture](../overview/architecture.md) for how the typed client and the permission vocabulary fit the request lifecycle
- [Patterns and conventions](../how-to-contribute/patterns-and-conventions.md) for how changes to these packages ripple through the apps
