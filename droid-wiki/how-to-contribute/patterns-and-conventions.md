# Patterns and conventions

## API feature module shape

Every API feature under `apps/api/src/<feature>/` follows the same four-file shape, visible in `apps/api/src/task/`:

| File | Purpose |
| --- | --- |
| `index.ts` | Mounts the feature's `createRoute()` definitions on an `apiRouter()` and wires each route to its controller, middleware, request schema, and response schema. |
| `schema.ts` | Zod request schemas (params, query, body) for the feature's routes. |
| `response.ts` | Zod response schemas, each tagged with `.openapi("Name")` so they become reusable OpenAPI components. |
| `controllers/<verb-noun>.ts` | One file per operation (`create-task.ts`, `move-task.ts`, `update-task-status.ts`), containing the actual domain logic and Drizzle queries. |

`apps/api/src/openapi.ts` defines the shared `apiRouter()` factory, `createRoute` re-export, `jsonResponse()`/`errorResponse()` helpers, and a `defaultHook` that turns the first Zod validation issue into an `HTTPException(400, ...)` with a field-scoped message. New features mount onto this factory rather than instantiating their own `OpenAPIHono`.

**Route middleware ordering.** `createRoute({ middleware })` runs *before* Zod validates the request, so middleware must read the raw Hono request (`c.req.param()`, `c.req.query()`) rather than the validated `c.req.valid()` output, which isn't populated yet. This is called out explicitly in `apps/api/src/openapi.ts` because it is easy to get backwards.

## Authorization: `requireWorkspacePermission`

Workspace-scoped mutations call `requireWorkspacePermission()` (`apps/api/src/utils/require-workspace-permission.ts`) rather than re-implementing role checks inline. The permission strings and built-in roles it checks against are defined once in `packages/permissions`, imported by both the API (for enforcement) and the web app (for UI capability checks only — hiding a button is never treated as an authorization boundary). See [Permission model](../primitives/index.md) and [Security](../security.md).

## Events, not direct side effects

A mutation that should show up in activity history, trigger a notification, fire an integration, or push a realtime update calls `publishEvent(eventType, data)` (`apps/api/src/events/index.ts`) instead of calling the activity/notification/integration code directly. Listeners subscribe with `subscribeToEvent()`. This keeps controllers focused on the mutation itself and lets multiple concerns (activity logging, Slack notification, WebSocket push) react to the same event independently. When adding a new mutation that matters for any of those concerns, publish an event rather than importing the consumer.

## Web app: fetchers, hooks, and cache invalidation

- `apps/web/src/fetchers/<feature>/` holds one function per API call, using the typed client from `@kaneo/libs` — never a parallel hand-rolled `fetch` layer.
- `apps/web/src/hooks/queries/` and `apps/web/src/hooks/mutations/` wrap those fetchers in TanStack Query hooks. Mutations invalidate the relevant query keys on success so the UI reflects the change without a manual refetch.
- Realtime updates arrive through `use-project-websocket.ts` / `use-user-websocket.ts`, which patch the TanStack Query cache directly when a WebSocket event lands, rather than waiting for the next poll.

## Validation and OpenAPI

Request and response shapes are Zod schemas passed through `@hono/zod-openapi`'s `createRoute()`. Response schemas are named with `.openapi("Name")` so they render as reusable components in the generated spec rather than being inlined everywhere they're used. `apps/docs/openapi.json` is a **committed artifact** — it is not generated at build time — so any change to a route, request schema, or response schema must be followed by `pnpm openapi:check:fix`, and CI's `openapi` job fails the build if the checked-in file has drifted from the routes.

Valibot is used only for internal, non-HTTP configuration validation (`plugins/`, `ws/`); it is not a second HTTP validation library competing with Zod.

## Formatting and linting

Biome (`biome.json`) is configured for tab indentation, double quotes, and automatic import organization. `pnpm lint` runs Biome with `--write` at the repo root and can reformat files you didn't intend to touch — prefer `pnpm exec biome check <path>` for a targeted check while iterating, and review the diff before running the unscoped `lint` script.

## Types over interfaces

The codebase prefers inferred TypeScript types and the `type` keyword over `interface`, reserving `interface` for the rare case that needs extension or declaration merging (for example the `BroadcastAdapter` interface in `apps/api/src/ws/broadcast-adapter.ts`, which has two concrete implementations).

## Comments explain constraints, not code

Comments in this codebase are reserved for non-obvious constraints — why route middleware must read the raw request, why a webhook destination check exists, why a migration runs in a particular order — not for narrating what a line of code already says.

## Related pages

- [Development workflow](development-workflow.md) for the branch → PR → merge cycle
- [Testing](testing.md) for how these patterns show up in test structure
- [apps/api](../apps/api/index.md) and [apps/web](../apps/web/index.md) for where these conventions are applied at scale
- [Security](../security.md) for the authorization boundary these conventions protect
