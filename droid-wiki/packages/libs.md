# libs

**Active contributors:** Andrej, Tin

## Purpose

`packages/libs` (`@kaneo/libs`) is the typed Hono client plus URL helpers that `apps/web` imports instead of hand-writing `fetch` calls. Every web fetcher goes through this client, so a route's Zod schemas in the API double as the frontend's request and response types.

## Key abstractions

| Export | Source | What it is |
| --- | --- | --- |
| `client` | `packages/libs/src/hono.ts` | Typed Hono client created with `hc<AppType>(...)` from `hono/client` |
| `windowId` | `packages/libs/src/hono.ts` | Random per-tab id generated once per tab load, sent as the `X-Kaneo-Window-Id` header |
| `resolveApiBaseUrl` | `packages/libs/src/api-url.ts` | Resolves the client base URL from `VITE_API_URL` |

## How it works

The client derives its types from the API itself. `apps/api` exports `AppType` — the type of its `OpenAPIHono` app — and `packages/libs/src/hono.ts` passes it to `hc<AppType>`. Each `createRoute()` definition in `apps/api/src/openapi.ts` becomes a typed endpoint on the client, so the route's request and response schemas are the types the caller sees. A fetcher like `apps/web/src/fetchers/task/create-task.ts` calls `client.task[":projectId"].$post({ json, param })`, with `InferRequestType` providing the typed payload, and gets a typed response back.

`resolveApiBaseUrl` turns `VITE_API_URL` into the base URL: it strips trailing slashes and appends `/api` unless the value already ends with it, defaulting to `http://localhost:1337`. `hono.ts` also sets `credentials: "include"` so session cookies travel with every request, sends `Content-Type: application/json` and the `windowId` header, and rewrites `fetch` network failures into an error hinting at CORS configuration or a missing server.

## Integration points

- `apps/web/src/fetchers/**` — every fetcher imports `client` from `@kaneo/libs`
- `apps/web/src/hooks/use-project-websocket.ts` and `use-user-websocket.ts` — import `windowId` so the WebSocket URL matches the client's window id
- `apps/web/src/types/*` — response types re-derived from the client's routes

## Entry points for modification

- `packages/libs/src/hono.ts` — the client and its fetch configuration
- `packages/libs/src/api-url.ts` — base-URL resolution
- `packages/libs/src/index.ts` — the public surface (the only exports)

## Key source files

| File | Purpose |
| --- | --- |
| `packages/libs/src/hono.ts` | Client construction, headers, credentials, error mapping |
| `packages/libs/src/api-url.ts` | `VITE_API_URL` → base URL with `/api` normalization |
| `packages/libs/src/index.ts` | Re-exports `client`, `windowId`, `resolveApiBaseUrl` |

## Related pages

- [Architecture](../overview/architecture.md) for the typed client contract
- [apps/web/routing-and-state](../apps/web/routing-and-state.md) for how the web app consumes the client
- [Patterns and conventions](../how-to-contribute/patterns-and-conventions.md) for the fetcher/hooks/cache-invalidation pattern
