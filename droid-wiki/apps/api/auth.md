# apps/api/auth

Active contributors: Andrej Acevski, Tin Sever

Authentication in `apps/api` is Better Auth configured in `apps/api/src/auth.ts`, mounted at `/api/auth`. Better Auth owns sessions, email/password, magic links, email OTP, social and generic OAuth providers, the organization (workspace) plugin, the device authorization flow, and API keys. The API layer then consumes the resulting identity through `authenticateApiRequest()` and its helpers.

## Purpose

One `betterAuth({...})` instance (`apps/api/src/auth.ts`) is the single source of truth for identity. It maps Better Auth's schema onto Kaneo's Drizzle tables, enables a curated set of plugins, and hooks into Better Auth's database and request lifecycle for Kaneo-specific rules: first-user instance-admin bootstrap, registration gating, workspace role seeding, and billing seat reconciliation. The Hono side (`apps/api/src/index.ts`) routes `/auth/*` requests to `auth.handler`, and an app-wide middleware resolves credentials for every other `/api/*` route.

## How it works

### Better Auth setup

`apps/api/src/auth.ts` wires `betterAuth` to the Drizzle adapter with an explicit schema mapping: Better Auth's `organization`, `member`, `invitation`, `organizationRole`, `team`, `teamMember`, `apikey`, and `deviceCode` models map to Kaneo's `workspace`, `workspace_member`, `invitation`, `workspace_role`, `team`, `team_member`, `apikey`, and `device_code` tables (see [apps/api/database.md](database.md)). Key configuration:

- **basePath** is `/api/auth`; `baseURL` is derived from `KANEO_API_URL` with its path stripped. `AUTH_SECRET` must be at least 32 characters or the server refuses to start.
- **Email and password**: bcrypt hashing, auto sign-in.
- **Magic link and email OTP**: email delivery goes through `@kaneo/email`, with locale-aware subjects (en/de/vi/ja) resolved from the user's stored locale.
- **Anonymous (guest) users**: the `anonymous()` plugin is enabled unless `DISABLE_GUEST_ACCESS=true`; guests get generated demo names and an `@kaneo.app` email domain.
- **Organization plugin**: `ac` comes from `@kaneo/permissions`, so the access-control vocabulary is the same one `requireWorkspacePermission()` checks. `owner` is the only static role (its permissions can never be edited away); `viewer`/`member`/`admin` are seeded per workspace into `workspace_role` and resolved through Better Auth's dynamic access control, capped at 25 roles and 10 teams per workspace. Workspace creation is gated by `DISABLE_WORKSPACE_CREATION` (instance admins only).
- **Organization hooks**: workspace-name validation on create; seeding default roles plus a `workspace.created` event on create; a billing conflict check on delete; seat re-sync on member add/remove; and invitation emails through `@kaneo/email` (warns, does not fail, when SMTP is not configured).
- **Generic OAuth**: a `custom` provider configured from `CUSTOM_OAUTH_*` environment variables, with profile mapping in `apps/api/src/utils/custom-oauth-profile.ts`. Its stored `id_token` is exposed through `GET /api/oauth/id-token` (`apps/api/src/oauth/`).
- **Account linking**: OAuth sign-ins from `github`, `google`, `discord`, and `custom` link to an existing account with the same verified email; linking to an unverified local account is refused.
- **Rate limiting**: enabled only when `isCloud()` (`KANEO_CLOUD`); tighter custom rules for password signup and invite-member.
- **Session cookie cache**: sessions are served from a cookie cache for up to 5 minutes to cut database round-trips.

### Registration gates and the first admin

`databaseHooks.user.create` and the global `hooks` in `apps/api/src/auth.ts` enforce Kaneo's signup policy, including the instance-admin bootstrap:

- The very first user is always allowed to sign up — that is how a fresh instance gets its admin — and is promoted to `role: "admin"` atomically in the `after` hook inside a transaction guarded by `pg_advisory_xact_lock(2026)`, so two concurrent first signups cannot both become admins. Anonymous guests are never promoted.
- When `DISABLE_REGISTRATION=true` (or `DISABLE_PASSWORD_REGISTRATION` / `DISABLE_LOGIN_FORM` / `DISABLE_EMAIL_OTP_SIGN_IN`), signups are blocked unless the caller presents a valid `invitationId` (via body, query, or `x-invitation-id` header). OAuth callback paths allow email matching an invitation.
- On cloud (`KANEO_CLOUD`), signup blocks disposable emails and requires a Cloudflare Turnstile token, and `invite-member` is blocked for anonymous users and disposable-email addresses.
- After a successful sign-up or sign-in, the session's `activeOrganizationId` is set to the user's first workspace so workspace-scoped requests have a sensible default.

### Auth routes on the Hono side

`apps/api/src/index.ts` handles the Better Auth surface:

- `GET /api/auth/get-session` is an OpenAPI-declared route that proxies to `auth.handler`, so the typed client can call it like any other route.
- `api.on(["POST","GET","PUT","PATCH","DELETE"], "/auth/*")` passes every other auth call to `auth.handler(c.req.raw)`. A `Bearer` token that is actually a Better Auth session token is preserved by converting it to an `x-api-key` header (Better Auth's API-key plugin validates that header by default); the API key plugin's own `x-api-key` header passes through unchanged.
- `GET /api/auth/device` serves the device authorization payload as JSON, but redirects a full-document browser navigation (or requests with `ui=1`) to `KANEO_CLIENT_URL/device?user_code=...` so opening the URL by hand shows the web app's device screen instead of a JSON blob.

### Device authorization flow

The `deviceAuthorization()` plugin implements RFC 8628. `validateClient` accepts only client ids listed in `DEVICE_AUTH_CLIENT_IDS` (default: `kaneo-cli`, `kaneo-mcp`), so the CLI and MCP clients can authenticate without a browser redirect back to a local port. The verification URI is `KANEO_CLIENT_URL/device`, and the web app's device screen resolves the pending authorization. Authorization state lives in the `device_code` table.

### API keys

API keys are Better Auth's `apiKey` plugin backed by the `apikey` table:

- Keys are sent as the `x-api-key` header, or as a `Bearer` token that is not a session token. `apps/api/src/utils/verify-api-key.ts` looks up the key by its SHA-256 hash, requires `enabled = true`, and honors `expiresAt`.
- `authenticateApiRequest()` in `apps/api/src/utils/authenticate-api-request.ts` resolves credentials in order: malformed Bearer → 401; `x-api-key` (no Bearer) → API key; Bearer → try as API key, then as a session token from bearer-only headers; otherwise session cookie. On success it sets `userId`, `user`, `session`, and the `ApiKey` shape (`id`, `userId`, `enabled`, `permissions`) on the Hono context.
- `apiKey.permissions` narrows what the key can do: `requireWorkspacePermission()` in `apps/api/src/utils/require-workspace-permission.ts` rejects early when the key's stored permission statements do not satisfy the route's requirements, and `workspaceAccess` middleware refuses to use a key that does not belong to the acting user (see `apps/api/src/utils/validate-workspace-access.ts`).
- The `apikey` table is aligned with Better Auth's expectations at startup by `apps/api/src/utils/migrate-apikey-reference-id.ts` (`reference_id` populated, `config_id` defaulted, `user_id` nullable) — see [apps/api/database.md](database.md).

### Asset authorization

`GET /api/asset/{id}` does not go through the app-wide middleware. `apps/api/src/utils/authorize-asset-access.ts` skips credential checks entirely for assets on public projects (the public case must stay reachable anonymously), and otherwise uses `resolveAssetBearerOrCookie()` (`apps/api/src/utils/authenticate-api-request.ts`) to get a `userId` plus optional `apiKeyId` and then `validateWorkspaceAccess()` to confirm workspace membership.

### MCP OAuth

The MCP HTTP endpoint exposes its own OAuth 2.1 authorization server (dynamic client registration per RFC 7591, authorization code + PKCE, explicit consent page). It lives in `apps/api/src/mcp/`, not `apps/api/src/oauth/`:

- `apps/api/src/mcp/index.ts` defines `POST /mcp/register`, `GET /mcp/authorize`, `GET|POST /mcp/authorize/request/{requestId}`, `POST /mcp/token`, the OAuth discovery documents under `/api/.well-known/`, and the `/mcp` tool endpoint itself.
- `apps/api/src/mcp/oauth.ts` implements the client registry, PKCE-verified auth codes, and `exchangeCode()`, which mints a session-token row usable as a Bearer credential on the MCP endpoint.
- `apps/api/src/mcp/oauth-store.ts` persists OAuth state (`client`, `code`, `request` kinds) in the `mcp_oauth_state` table with TTLs, single-use consumption via `DELETE ... RETURNING`, and a row cap per kind.
- `apps/api/src/mcp/schemas.ts` validates registration and authorization input, including a strict redirect-URI validator (loopback-only `http`, no fragments or embedded credentials).
- `apps/api/src/mcp/controllers/oauth-consent.ts` backs the consent page: it checks the request origin against `KANEO_CLIENT_URL`, requires a session, issues the auth code, and publishes a `mcp.authorization_code_issued` event.

The MCP tool surface itself (what tools are registered and how they call the API) is documented in the [MCP feature page](../../packages/mcp.md).

### Organization management routes

Better Auth serves `/api/auth/organization/*` from its own handler, so those operations have no route definitions of ours to hang documentation off. `apps/api/src/auth-openapi.ts` registers the ~28 organization-management operations (create, invite, accept/reject invitation, roles, teams, members, active-organization switching, and so on) directly on the OpenAPI registry. The file is generated from Better Auth's `generateOpenAPISchema()` output and hand-reviewed; regenerate and diff it when upgrading Better Auth rather than editing by hand.

## Integration points

- The permission vocabulary and role payloads enforced around auth come from `@kaneo/permissions`; see [Permission model](../../packages/permissions.md) and [Security](../../security.md).
- Workspace membership and roles resolve from the `workspace`, `workspace_member`, and `workspace_role` tables; see [apps/api/database.md](database.md) and [Data models](../../reference/data-models.md).
- Session identity is what the app-wide middleware turns into `userId` on every route context; see [apps/api/index.md](index.md) for the request lifecycle.
- Billing hooks (seat sync, workspace-delete conflicts) live in `apps/api/src/billing/`; see [Billing](../../features/billing.md).
- Invitation emails and sign-in emails go through `@kaneo/email`; see the [packages/email](../../packages/email.md) page if present.

## Entry points for modification

- Add or change a sign-in method: edit the plugin list in `apps/api/src/auth.ts` (social providers, generic OAuth, magic link, OTP) and any matching UI in `apps/web`.
- Change signup or invite policy: edit the `databaseHooks` and `hooks` blocks in `apps/api/src/auth.ts` and the gates in `apps/api/src/utils/check-registration-allowed.ts`.
- Add a credential type: extend `apps/api/src/utils/authenticate-api-request.ts` and the `ApiKey` type in `apps/api/src/openapi.ts`.
- Change the MCP OAuth behavior: edit `apps/api/src/mcp/` (routes, `oauth.ts`, `oauth-store.ts`, `schemas.ts`).
- Upgrade Better Auth: regenerate and diff `apps/api/src/auth-openapi.ts`.

## Key source files

| File | What it contains |
| --- | --- |
| `apps/api/src/auth.ts` | The `betterAuth()` configuration: plugins, schema mapping, hooks, rate limits, first-admin bootstrap |
| `apps/api/src/auth-openapi.ts` | Organization-management operations registered on the OpenAPI registry |
| `apps/api/src/utils/authenticate-api-request.ts` | Credential resolution (cookie / Bearer / API key) for app middleware and assets |
| `apps/api/src/utils/verify-api-key.ts` | API-key lookup by SHA-256 hash with enabled/expiry checks |
| `apps/api/src/utils/authorize-asset-access.ts` | Public-project exemption and workspace access for asset downloads |
| `apps/api/src/utils/require-workspace-permission.ts` | Permission enforcement that also applies API-key scopes |
| `apps/api/src/utils/migrate-apikey-reference-id.ts` | Startup alignment of the `apikey` table with Better Auth |
| `apps/api/src/mcp/index.ts` | MCP OAuth routes, token endpoint, discovery documents |
| `apps/api/src/mcp/oauth.ts`, `apps/api/src/mcp/oauth-store.ts`, `apps/api/src/mcp/schemas.ts` | MCP authorization-code + PKCE flow and DB-backed OAuth state |
| `apps/api/src/oauth/index.ts` | `GET /oauth/id-token` for the custom OAuth provider |

## Related pages

- [apps/api/index.md](index.md) — request lifecycle and route mounting
- [Security](../../security.md) — the authorization boundary auth feeds into
- [MCP](../../packages/mcp.md) — the MCP tool surface that uses this OAuth flow
