# Security

Kaneo treats the API as the authority for authentication and authorization. This page covers where trust is enforced, what the SSRF guard actually checks, what the cloud abuse gates do, and how secrets are stored.

## The authorization boundary

Workspace-scoped operations are authorized in the API, never in the UI. The web app imports the same permission vocabulary from `packages/permissions` for capability checks, but those only decide whether a button renders. Every route enforces access through `requireWorkspacePermission()` (`apps/api/src/utils/require-workspace-permission.ts`) and answers `HTTPException(403)` when the caller's role or API-key scope does not satisfy the route's requirements. Hiding an action in the UI is not an authorization check — an attacker calls the route directly and the API still refuses. See [apps/api/auth](apps/api/auth.md) for credential resolution and [packages/permissions](packages/permissions.md) for the vocabulary.

## SSRF protection on outbound destinations

Every outbound destination URL — generic-webhook integration configs and the ntfy/Gotify/webhook notification channels — must pass `assertPublicDestination()` (`apps/api/src/utils/assert-public-destination.ts`). It enforces:

- Only `http:` and `https:` protocols.
- No literal private hostnames or addresses: `localhost`, `0.x`, loopback (`127/8`), RFC 1918 (`10/8`, `172.16/12`, `192.168/16`), RFC 6598 carrier-grade NAT (`100.64/10`), link-local (`169.254/16`), and the IPv6 equivalents including `::1`, `::`, `fc00::/7`, and `fe80::/10` — with `::ffff:` IPv4-mapped addresses unwrapped first so they cannot slip past as "IPv6".
- DNS answers: the hostname is resolved with `node:dns` (`all: true, verbatim: true`), and any answer pointing at a disallowed address rejects the destination. Combined with the outbound clients' no-redirect policy, this is the practical answer to DNS rebinding — a hostname that flips to a private address after validation cannot be followed.

`KANEO_ALLOW_PRIVATE_WEBHOOK_DESTINATIONS=true` (or `=1`) disables the check entirely for deployments that deliberately webhook into their own network. The default — unset — keeps the guard on.

## Cloud-mode abuse mitigations

`KANEO_CLOUD=true` (`apps/api/src/utils/is-cloud.ts`) enables a set of abuse gates that hosted multi-tenant instances should turn on and self-hosted installs can leave unset:

- **Turnstile captcha on password signup**: when `TURNSTILE_SECRET_KEY` is set, `/sign-up/email` verifies the client's Cloudflare Turnstile token (`apps/api/src/utils/verify-turnstile.ts`), read from the request body or the `x-turnstile-token` header, with the caller IP taken from `cf-connecting-ip`/`x-forwarded-for`. With no secret configured, verification is skipped — self-hosting stays friction-free.
- **Disposable-email block**: `isDisposableEmail()` (`apps/api/src/utils/is-disposable-email.ts`) matches the domain against the seed list in `apps/api/src/utils/disposable-email-domains.ts`, including subdomains. On cloud it blocks disposable-email signups (except the first admin) and disposable-email invitations.
- **Guest-account invite block**: `/organization/invite-member` refuses anonymous (guest) users on cloud — guests cannot send workspace invitations. The gate exists because a 2026-05-28 incident saw roughly 14k phishing invites from disposable-email guest signups.
- **Tightened rate limits**: Better Auth's rate limiter is enabled only on cloud (global window 10s, max 100) with stricter custom rules: `/sign-up/email` 60s/3 and `/organization/invite-member` 60s/5. The API-key plugin separately rate-limits every key at 100 requests/60s regardless of cloud mode.

`ENVIRONMENT_SETUP.md` documents the same gates from the operator's side under "Cloud-mode abuse mitigations".

## Secrets handling

- `AUTH_SECRET` must be at least 32 characters; `apps/api/src/auth.ts` prints an error and exits otherwise. The bundled-image entrypoint auto-generates a random secret when unset, but that secret changes on every restart — production deployments set a real one.
- API keys are stored as SHA-256 hashes in the `apikey` table (`apps/api/src/utils/verify-api-key.ts`), never in plaintext, and are shown in full exactly once at creation. Lookup requires `enabled = true` and a non-expired key, and the key's stored permission statements are enforced by `requireWorkspacePermission()`.
- Notification webhook secrets (ntfy/Gotify/webhook channels) are encrypted at rest with AES-256-GCM under `NOTIFICATION_SECRET_ENCRYPTION_KEY` and never returned in full — see [Notifications](features/notifications.md).
- Inbound webhooks are authenticated by signature, not session: GitHub App payloads via `x-hub-signature-256`, Gitea via `X-Gitea-Signature`, and Creem billing events via `CREEM_WEBHOOK_SECRET` (see [Billing](features/billing.md)).

## CORS

CORS is configured in `apps/api/src/index.ts` from `CORS_ORIGINS` (comma-separated) or, failing that, `KANEO_CLIENT_URL`. With `credentials: true`, the server reflects only the configured origins. When neither variable is set and `NODE_ENV=production`, cross-origin requests are refused with a boot-time warning — same-origin deployments (the bundled image) are unaffected, and the development server reflects any origin. Match `CORS_ORIGINS` to the real web origin and serve both the web app and the API over HTTPS.

## Key source files

| File | What it contains |
| --- | --- |
| `apps/api/src/utils/require-workspace-permission.ts` | Route-level authorization against roles and API-key scopes |
| `apps/api/src/utils/assert-public-destination.ts` | SSRF guard: protocol, literal-private-address, and DNS-answer checks |
| `apps/api/src/utils/verify-api-key.ts` | SHA-256-hashed API-key lookup with enabled/expiry checks |
| `apps/api/src/auth.ts` | `AUTH_SECRET` length gate, cloud gates, rate-limit rules |
| `apps/api/src/utils/is-cloud.ts` | The `KANEO_CLOUD` switch |
| `apps/api/src/utils/verify-turnstile.ts` | Cloudflare Turnstile server-side verification |
| `apps/api/src/utils/is-disposable-email.ts` | Disposable-domain matching (seed list in `apps/api/src/utils/disposable-email-domains.ts`) |
| `apps/api/src/index.ts` | CORS policy and the app-wide authentication middleware |

## Related pages

- [apps/api/auth](apps/api/auth.md) — how credentials are resolved and enforced
- [packages/permissions](packages/permissions.md) — the permission vocabulary
- [Integrations](features/integrations.md) — the SSRF guard in context
- [Notifications](features/notifications.md) — secret encryption and the same SSRF guard
- [API](api/index.md) — the external surface this boundary protects
- [Reference configuration](reference/configuration.md) — the env vars (`KANEO_CLOUD`, `CORS_ORIGINS`, `AUTH_SECRET`, `KANEO_ALLOW_PRIVATE_WEBHOOK_DESTINATIONS`, …)
