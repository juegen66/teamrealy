# apps/docs

Active contributors: Andrej, Tin, Tiran, Randoneering, Morteza.

`apps/docs` is the documentation content package for Kaneo, authored in Mintlify format and served as the `/docs` reader on kaneo.app. It is not an app runtime; it is markdown/MDX content, site configuration, and the committed OpenAPI artifact that documents the public API.

## Purpose

Product and API documentation, organized into Mintlify's "Guides" and "API Reference" tabs. `apps/docs/docs.json` is the Mintlify site config: it defines the theme, fonts, logo, redirects, navigation groups, and the API Reference tab that points at `apps/docs/openapi.json`. `apps/docs/index.mdx` is the docs landing page ("Why Kaneo"), and `apps/docs/core/index.mdx` is the Quick Start that walks through installation.

## Directory layout

- `apps/docs/docs.json` — Mintlify navigation config: "Guides" groups (Overview, Functional Guides, Installation, integrations, Authentication Providers, Deployment & Operations, Migration) and an "API Reference" tab backed by the OpenAPI file. Also sets theme, fonts, redirects, and SEO metadata.
- `apps/docs/core/` — the product and operations guides: `functional/` (workspaces, tasks, labels, workflows), `installation/` (drim, Docker Compose, storage, environment variables), `integrations/` (GitHub, Gitea, MCP, Discord, Slack, Telegram, webhooks), `social-providers/` (OAuth/SSO providers), `reverse-proxy/`, `deployments/`, and `migrations/`.
- `apps/docs/api-reference/` — hand-written API overview pages: `introduction.mdx` (base URL, auth summary) and `authentication.mdx` (API keys and device flow). The `endpoints/` subdirectories (tasks, projects, labels, activity, notifications, and so on) are endpoint pages generated from `apps/docs/openapi.json` by Mintlify, not edited by hand.
- `apps/docs/openapi.json` — the committed OpenAPI specification (see below).
- `apps/docs/index.mdx`, `apps/docs/favicon.svg`, `apps/docs/fonts/`, `apps/docs/images/`, `apps/docs/logo/` — landing page and Mintlify theme assets.
- `apps/docs/.mintignore` — draft-content exclusions for Mintlify's build.
- `apps/docs/README.md` and `apps/docs/CONTRIBUTING.md` — local preview instructions (`mint dev` from this directory) and writing guidelines.

## The OpenAPI spec relationship

`apps/docs/openapi.json` is a committed artifact, not something generated at request time or at docs build time. It is produced from the API's `createRoute()` definitions by `apps/api`'s `scripts/export-openapi.ts`, and the docs site's API Reference tab renders against it. Every change to a route, request schema, or response schema in `apps/api` must land here too; the workflow is documented in [Patterns and conventions](../how-to-contribute/patterns-and-conventions.md), and the committed `apps/docs/openapi.json` is what [apps/site](site.md) and the `/docs` reader serve.

## Checking and regenerating the spec

The root `package.json` wires two scripts to `scripts/openapi/check.mjs`:

- `pnpm openapi:check` — builds `@kaneo/api` and its dependencies, runs `scripts/export-openapi.ts` into a temp directory, and compares the result byte-for-byte (after CRLF normalization) with `apps/docs/openapi.json`. Exits 0 when they match; otherwise it prints that the committed file is missing or out of date and fails.
- `pnpm openapi:check:fix` — the same check, but copies the freshly generated spec over `apps/docs/openapi.json` instead of failing.

CI's `openapi` job in `.github/workflows/ci.yml` runs `pnpm openapi:check`, so a schema change that does not also update the committed spec fails the build.

## Integration points

- The spec comes from `apps/api` routes and is consumed by the `/docs` API Reference reader on kaneo.app.
- The docs content is referenced by `apps/site`'s marketing pages and by `apps/site/app/sitemap.xml/route.ts` (the sitemap index lists `/docs/sitemap.xml`).
- See the external [API reference](../api/index.md) page for what the documented endpoints cover.
