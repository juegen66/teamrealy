# Apps

Active contributors: Andrej, Tin, Justin.

The `apps/` directory holds the four deployable or published units of the Kaneo monorepo. Two are runtimes that make up a running instance, and two are the published web surface: product and API documentation plus the public marketing site.

| App | Purpose |
| --- | --- |
| [`apps/api`](api/index.md) | Hono backend: routes, controllers, authentication, database access, integrations, MCP HTTP routes, and WebSockets. |
| [`apps/web`](web/index.md) | React/Vite frontend: the boards, tasks, and workspace UI backed by TanStack Router and Query. |
| `apps/docs` | Mintlify-authored product and API documentation content, including the committed `apps/docs/openapi.json` API spec. |
| `apps/site` | Public Next.js website (kaneo.app): marketing pages plus the documentation host for the Mintlify content. |

`apps/api` and `apps/web` run the product and share a typed contract through `@kaneo/libs` and `apps/docs/openapi.json`. `apps/docs` and `apps/site` are content and hosting layers: the docs content lives in Mintlify format under `apps/docs/`, and `apps/site` serves the marketing site while linking into the `/docs` reader on the same domain.

## Related pages

- [apps/api](api/index.md) and [apps/web](web/index.md) — the two runtimes, documented in depth elsewhere.
- [apps/docs](docs.md) — what the docs content covers and how the OpenAPI spec stays in sync with the API.
- [apps/site](site.md) — the public website, its content model, and its GitHub Pages deployment.
