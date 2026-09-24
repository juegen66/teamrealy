# API

The Kaneo API is the external surface of a Kaneo instance: the HTTP endpoints that scripts, integrations, CLIs, and MCP clients call. This page covers using that surface. For the server's internals — request lifecycle, route mounting, the `createRoute()` conventions — see [apps/api](../apps/api/index.md).

## Base URL and versioning

Every API route hangs off the `/api` prefix; there is no version segment like `/api/v1`. The app mounts all feature routers under `app.route("/api", api)` in `apps/api/src/index.ts`, so a request looks like `POST https://your-instance.com/api/task/:projectId`. The OpenAPI document's `servers` entry is derived from `KANEO_API_URL`, and the docs site uses `https://your-kaneo-instance.com/api` as the canonical base.

Breaking changes are handled by evolving routes in place rather than introducing a new URL prefix. Request and response schemas are Zod-validated, the typed client in `packages/libs` is generated from the same route types, and `apps/docs/openapi.json` is regenerated with `pnpm openapi:check:fix` — so a schema change lands as one coordinated change across API, client, and docs.

## Authentication

Three ways an external client authenticates, all resolved by the app-wide middleware in `apps/api/src/index.ts` (credential resolution order is documented in [apps/api/auth](../apps/api/auth.md)):

| Method | How it works | Used by |
| --- | --- | --- |
| Session cookie | Better Auth sets a signed session cookie that browser requests carry automatically. | the web app |
| API key | Sent as the `x-api-key` header or as a `Bearer` token. Created in Account settings → API Keys; shown in full exactly once. | scripts, services, long-lived integrations |
| Device flow | RFC 8628: `POST /api/auth/device/code`, the user approves at `KANEO_CLIENT_URL/device`, the client polls `/api/auth/device/token` and receives a Bearer token. Client ids are allowlisted via `DEVICE_AUTH_CLIENT_IDS` (defaults `kaneo-cli` and `kaneo-mcp`). | the CLI and MCP clients |

The MCP HTTP endpoint adds its own OAuth 2.1 authorization server (dynamic client registration, PKCE) for Streamable-HTTP clients. The practical how-to for keys and the device flow lives in `apps/docs/api-reference/authentication.mdx` on the docs site; the mechanics are in [apps/api/auth](../apps/api/auth.md).

## The OpenAPI spec

The OpenAPI 3.1 document is generated live at `GET /api/openapi` on a running instance — every `createRoute()` definition, the shared `bearerAuth` security scheme, and an injected `401` response on authenticated operations. The same document is committed at `apps/docs/openapi.json` and regenerated with `pnpm openapi:check:fix`; CI fails when it drifts. Three ways to browse it:

- Live instance: `GET <KANEO_API_URL>/openapi` (for example `https://cloud.kaneo.app/api/openapi`).
- The Mintlify-hosted docs site: `apps/docs/docs.json` mounts the spec in its "API Reference" tab, and Mintlify renders every operation as a page under `apps/docs/api-reference/endpoints/`.
- The raw committed artifact: `apps/docs/openapi.json`.

The single security scheme is `bearerAuth` (`type: http`, `scheme: bearer`). API keys, device-flow tokens, and MCP OAuth tokens all arrive as Bearer credentials, so one "Authorize" mechanism covers every programmatic client.

## Webhooks Kaneo receives (inbound)

GitHub and Gitea post to Kaneo so external activity turns into task changes:

- `POST /api/github-integration/webhook` — GitHub App events, verified with the `x-hub-signature-256` HMAC.
- `POST /api/gitea-integration/webhook/:integrationId` — verified with the `X-Gitea-Signature` header.

These routes are deliberately unauthenticated so GitHub and Gitea can reach them; authenticity comes from the signature, not a session. See [Integrations](../features/integrations.md).

## Webhooks Kaneo sends (outbound)

- The generic webhook integration (`/api/generic-webhook-integration`) POSTs task events to an arbitrary HTTPS endpoint, HMAC-signed with `X-Kaneo-Signature` when a secret is configured.
- The notification webhook channel — a user's personal webhook in notification preferences — delivers notification payloads the same way.

Both go through `assertPublicDestination()`, the SSRF guard described in [Security](../security.md).

## The MCP HTTP endpoint

The API also exposes a built-in MCP server at `/api/mcp` (`apps/api/src/mcp/`) — a third way to interact with the API. Streamable-HTTP MCP clients connect over OAuth 2.1: dynamic registration at `/api/mcp/register`, authorization at `/api/mcp/authorize`, tokens at `/api/mcp/token`, and discovery documents under `/.well-known/`. The tool server calls the API through `KANEO_INTERNAL_API_URL` (default `http://127.0.0.1:1337`) rather than the public URL, so it works even when the API sits behind a proxy.

For MCP clients that speak stdio only, the published `@kaneo/mcp` npm package runs the same tool surface over stdio with device-flow or API-key auth — see [packages/mcp](../packages/mcp.md).

## Key source files

| File | What it contains |
| --- | --- |
| `apps/api/src/index.ts` | App assembly, `/api` mounting, app-wide auth middleware, inbound webhook routes |
| `apps/api/src/auth.ts` | Better Auth configuration: sessions, API keys, device flow, MCP OAuth |
| `apps/api/src/utils/authenticate-api-request.ts` | Cookie / Bearer / API-key resolution |
| `apps/api/src/utils/verify-api-key.ts` | API-key lookup by SHA-256 hash |
| `apps/api/src/mcp/index.ts` | MCP OAuth + Streamable-HTTP tool endpoint |
| `apps/docs/openapi.json` | Committed OpenAPI artifact, regenerated by `pnpm openapi:check:fix` |
| `apps/docs/docs.json` | Mintlify config that mounts the spec as the API Reference tab |
| `apps/docs/api-reference/` | Hand-written overview and authentication pages framing the generated endpoints |

## Related pages

- [apps/api](../apps/api/index.md) — the server internals behind this surface
- [apps/api/auth](../apps/api/auth.md) — authentication in depth
- [packages/mcp](../packages/mcp.md) — the stdio MCP client alternative
- [Integrations](../features/integrations.md) — inbound and outbound webhooks
- [Security](../security.md) — the authorization boundary and SSRF guard
- [Deployment](../deployment.md) — where the API runs and how clients reach it
- [Reference configuration](../reference/configuration.md) — env vars (`KANEO_API_URL`, `CORS_ORIGINS`, `DEVICE_AUTH_CLIENT_IDS`, …)
