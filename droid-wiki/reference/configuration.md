# Configuration

Kaneo reads all configuration from a **single `.env` file at the repo root**, shared by the API and the web app. The API loads it with `dotenv-mono` (its modules call `config()` at import time, so the variable must be present before the process starts). In development, Vite-specific `VITE_*` overrides live in `apps/web/.env`.

In production images the split is asymmetric:

- The **API container** reads environment variables directly from the process environment.
- The **web container** bakes literal placeholder strings (`KANEO_API_URL`, `KANEO_CLIENT_URL`, `KANEO_TURNSTILE_SITE_KEY`, `KANEO_SENTRY_DSN`) into the JavaScript bundle, and `apps/web/env.sh` substitutes the real values from the environment at container start. Any other `KANEO_*` variable is swept up by the same loop, so future web-side knobs work without image changes.

The authoritative lists are `ENVIRONMENT_SETUP.md` and `.env.sample` at the repo root, plus `apps/docs/core/installation/environment-variables.mdx` in the docs app. The tables below are the exhaustive view, organized by category.

## Core URLs

| Variable | Purpose | Notes / default |
| --- | --- | --- |
| `KANEO_CLIENT_URL` | The public URL of the web app. | Required in production. Used as a trusted origin, as the base for invitation and magic-link URLs, and as input to cookie attributes. e.g. `https://kaneo.example.com`. |
| `KANEO_API_URL` | The public URL of the API. | Optional in development (the API falls back to `http://localhost:1337`); set it explicitly in production. The web bundle is rewritten against this value at container start by `apps/web/env.sh`. |
| `KANEO_INTERNAL_API_URL` | API origin used only for server-side requests from the built-in HTTP MCP endpoint. | Default `http://127.0.0.1:1337`. Override only if the API cannot reach itself at loopback. |
| `CORS_ORIGINS` | Comma-separated browser origins allowed to call the API cross-origin. | Defaults to `KANEO_CLIENT_URL`. In development, leave empty to allow all origins. Should match `KANEO_CLIENT_URL` for authentication to work. |

## Database

| Variable | Purpose | Notes / default |
| --- | --- | --- |
| `DATABASE_URL` | Full PostgreSQL connection string. | Takes precedence over the derived form. Example: `postgresql://kaneo:kaneo@localhost:5432/kaneo`. Resolution order lives in `apps/api/src/database/resolve-database-url.ts`. |
| `POSTGRES_DB` | Database name. | Used only as part of a derived connection string, never alone. |
| `POSTGRES_USER` | Database user. | Same derivation rule. |
| `POSTGRES_PASSWORD` | Database password. | Derivation from `POSTGRES_*` activates only when this (or an explicit host/port) is set. |
| `POSTGRES_HOST` | Database hostname. | Compose default `postgres`; use `localhost` when the API runs on the host. |
| `POSTGRES_PORT` | Database port. | Default `5432`. |

If neither `DATABASE_URL` nor a derivable `POSTGRES_*` set is present, the API falls back to `postgresql://localhost:5432/kaneo`.

## Authentication and device auth

| Variable | Purpose | Notes / default |
| --- | --- | --- |
| `AUTH_SECRET` | Secret for signing sessions and JWTs. | **Must be at least 32 characters**; the API refuses to start if set and shorter. Generate with `openssl rand -hex 32`. If unset, a random secret is generated at startup and sessions do not survive restarts. |
| `DEVICE_AUTH_CLIENT_IDS` | Comma-separated allowlist of device-flow OAuth client IDs. | When unset, defaults to `kaneo-cli,kaneo-mcp` — the CLI and MCP work with no configuration. Set the full list (including the defaults you still need) to trust extra clients, e.g. `kaneo-cli,kaneo-mcp,my-desktop-app`. |
| `TRUSTED_PROXIES` | Comma-separated IPs/CIDR ranges of the reverse proxies in front of the API. | Default covers loopback and private ranges (`127.0.0.0/8, ::1/128, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16`). The client IP feeds rate limiting and session records, so only list addresses you control. |
| `COOKIE_DOMAIN` | Overrides the session cookie `Domain` attribute. | Optional; useful when API and web share a parent domain. |

### Access control toggles

| Variable | Purpose | Notes / default |
| --- | --- | --- |
| `DISABLE_REGISTRATION` | Blocks public registration, including via SSO. | `false`. Users with a valid workspace invitation can still register, and the very first signup (the instance-admin bootstrap) is always allowed. |
| `DISABLE_PASSWORD_REGISTRATION` | Blocks email/password sign-up only. | `false`. Social/OIDC registration remains available. |
| `DISABLE_EMAIL_OTP_SIGN_IN` | When SMTP is configured, sign-in uses emailed verification codes by default; set `true` to force email/password sign-in. | `false`. Workspace invitation emails still use SMTP. |
| `DISABLE_LOGIN_FORM` | Hides the email/password login form, leaving only SSO/OAuth buttons. | `false`. Use with an external IdP. |
| `DISABLE_WORKSPACE_CREATION` | Restricts workspace creation to instance admins. | `false`. |
| `DISABLE_GUEST_ACCESS` | Disables anonymous/guest sign-in. | `false`. The guest button disappears from the sign-in and sign-up pages. |
| `DEMO_MODE` | Enables demo mode. | `false`. |

## GitHub SSO (sign-in) vs GitHub App integration (repo sync)

These are two separate GitHub features with separate credentials. The SSO path signs users in; the App path syncs repositories and receives webhooks. Configuring one does not enable the other.

### GitHub SSO — OAuth App

| Variable | Purpose |
| --- | --- |
| `GITHUB_OAUTH_CLIENT_ID` | OAuth App client ID for "Sign in with GitHub". |
| `GITHUB_OAUTH_CLIENT_SECRET` | OAuth App client secret for GitHub sign-in. |
| `GITHUB_CLIENT_ID` | Legacy fallback for SSO, used only when `GITHUB_OAUTH_*` are unset. |
| `GITHUB_CLIENT_SECRET` | Legacy fallback for SSO. |

### GitHub App integration — repository sync and webhooks

| Variable | Purpose | Notes |
| --- | --- | --- |
| `GITHUB_APP_ID` | GitHub App ID. | Required for the integration. |
| `GITHUB_WEBHOOK_SECRET` | Secret used to verify GitHub webhook payloads. | Required. |
| `GITHUB_PRIVATE_KEY` | PEM private key for the GitHub App (JWT authentication). | Accepts a real multi-line PEM, or a single line with literal `\n` characters (useful when an env editor strips newlines). |
| `GITHUB_PRIVATE_KEY_BASE64` | Base64-encoded alternative to `GITHUB_PRIVATE_KEY`. | Optional; takes precedence when both are set. Handles orchestrators that cannot carry newlines. |
| `GITHUB_APP_NAME` | GitHub App slug used for installation links in the UI. | Optional. |

## Other SSO providers

### Google SSO

| Variable | Purpose |
| --- | --- |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID. |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret. |

### Discord SSO

| Variable | Purpose |
| --- | --- |
| `DISCORD_CLIENT_ID` | Discord application client ID. |
| `DISCORD_CLIENT_SECRET` | Discord application client secret. |

### Custom OAuth / OIDC

| Variable | Purpose | Notes / default |
| --- | --- | --- |
| `CUSTOM_OAUTH_CLIENT_ID` | Client ID from your identity provider. | Required to activate the provider. |
| `CUSTOM_OAUTH_CLIENT_SECRET` | Client secret from your identity provider. | |
| `CUSTOM_OAUTH_AUTHORIZATION_URL` | Authorization endpoint URL. | |
| `CUSTOM_OAUTH_TOKEN_URL` | Token exchange endpoint URL. | |
| `CUSTOM_OAUTH_USER_INFO_URL` | User info endpoint URL. | |
| `CUSTOM_OAUTH_DISCOVERY_URL` | OpenID Connect discovery document URL. | Optional. |
| `CUSTOM_OAUTH_SCOPES` | Comma-separated OAuth scopes. | Default `profile,email`. |
| `CUSTOM_OAUTH_RESPONSE_TYPE` | OAuth response type. | Default `code`. |
| `CUSTOM_AUTH_PKCE` | Enables or disables PKCE. | Default `true`. |
| `CUSTOM_OAUTH_AUTO_LOGIN` | Automatically redirect to the IdP instead of showing the sign-in page. | Default `false`. |
| `CUSTOM_OAUTH_LOGOUT_URL` | Logout endpoint URL for your identity provider. | Optional. |

## SMTP

Email is used for workspace invitations, magic links, and sign-in verification codes.

| Variable | Purpose | Notes / default |
| --- | --- | --- |
| `SMTP_HOST` | SMTP server hostname. | |
| `SMTP_PORT` | SMTP server port. | |
| `SMTP_USER` | SMTP username. | |
| `SMTP_PASSWORD` | SMTP password. | |
| `SMTP_FROM` | From address on outgoing mail. | |
| `SMTP_SECURE` | Use TLS/SSL. | Default `true`. |
| `SMTP_REQUIRE_TLS` | Require TLS explicitly. | Default `false`. |
| `SMTP_IGNORE_TLS` | Ignore TLS certificate errors. | Default `false`; set `true` for self-signed certificates. |

When SMTP is configured, sign-in uses emailed verification codes by default; set `DISABLE_EMAIL_OTP_SIGN_IN=true` to fall back to email/password sign-in.

## Redis (WebSocket Pub/Sub)

Redis is optional and only needed for horizontal scaling of realtime WebSocket broadcasts across multiple API instances. When none of the modes below is configured, an in-memory adapter is used (single-instance only). Only one mode should be configured at a time; if several are set, the priority is **Cluster > Sentinel > Standalone**.

### Standalone

| Variable | Purpose |
| --- | --- |
| `REDIS_URL` | Redis connection string, e.g. `redis://localhost:6379`. |

### Sentinel (high availability with automatic failover)

| Variable | Purpose | Notes / default |
| --- | --- | --- |
| `REDIS_SENTINELS` | Comma-separated Sentinel nodes, e.g. `sentinel-1:26379,sentinel-2:26379,sentinel-3:26379`. | |
| `REDIS_SENTINEL_MASTER_NAME` | Name of the Sentinel master group. | Default `mymaster`. |
| `REDIS_SENTINEL_PASSWORD` | Password for the Sentinel instances, if different from the Redis data-node password. | |
| `REDIS_SENTINEL_TLS` | Enable TLS for Sentinel connections. | Default `false`. |

### Cluster (horizontal sharding)

| Variable | Purpose |
| --- | --- |
| `REDIS_CLUSTER_NODES` | Comma-separated cluster seed nodes, e.g. `node-1:6379,node-2:6379,node-3:6379`. |

### Shared (Sentinel and Cluster)

| Variable | Purpose |
| --- | --- |
| `REDIS_PASSWORD` | Password for the Redis data nodes. Used by both Sentinel and Cluster modes; Sentinel authentication itself uses `REDIS_SENTINEL_PASSWORD`. |

## Object storage (S3)

Kaneo uses S3-compatible object storage for private uploads in task descriptions and comments. MinIO is the primary tested target; AWS S3, Cloudflare R2, and similar backends also work.

| Variable | Purpose | Notes / default |
| --- | --- | --- |
| `S3_ENDPOINT` | S3-compatible API endpoint. | Required for uploads, e.g. `http://minio:9000`. Must be reachable by the browser for presigned URLs, not just by containers. |
| `S3_BUCKET` | Bucket used for uploaded files. | Required. |
| `S3_ACCESS_KEY_ID` | Access key for creating presigned upload URLs. | Set both this and `S3_SECRET_ACCESS_KEY`, or neither — setting only one fails startup. Leaving both unset uses the AWS default credential provider chain (IAM role / IRSA / instance profile). |
| `S3_SECRET_ACCESS_KEY` | Secret key for presigned upload URLs. | Same pairing rule as above. |
| `S3_REGION` | Region used for request signing. | Default `us-east-1`. |
| `S3_PUBLIC_BASE_URL` | Optional public base URL for uploaded assets. | Not required by the current private-asset flow. |
| `S3_FORCE_PATH_STYLE` | Use path-style S3 URLs. | Default `true` (correct for MinIO and `fs`). |
| `S3_MAX_IMAGE_UPLOAD_BYTES` | Maximum upload size in bytes. | Default `10485760` (10 MiB). |
| `S3_KEY_PREFIX` | Prefix prepended to all object keys. | Optional; handy for sharing one bucket across environments (e.g. `staging/`). Trailing slashes are trimmed. |
| `S3_PRESIGN_TTL_SECONDS` | How long presigned upload URLs remain valid. | Default `300`. |

## Cloud-mode abuse mitigations

These gates exist for hosted multi-tenant instances. Self-hosted deployments can leave them unset. Setting `KANEO_CLOUD=true` enables disposable-email signup blocking, Turnstile captcha enforcement on `/sign-up/email`, a guest-account invitation block, and tightened rate limits on signup and invite-member paths.

| Variable | Purpose | Notes / default |
| --- | --- | --- |
| `KANEO_CLOUD` | Enables cloud-only protections. | `false`. |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret key, used by the API for server-side verification. | When unset, captcha verification is skipped. |
| `KANEO_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key, used by the **web container**. | The production web image bakes the literal placeholder `KANEO_TURNSTILE_SITE_KEY` into the bundle and `apps/web/env.sh` swaps in the runtime value. |
| `VITE_TURNSTILE_SITE_KEY` | Local dev only. | Set in `apps/web/.env` when running `pnpm dev`; Vite reads it at build/dev time. Not used in the production image. |
| `TURNSTILE_TIMEOUT_MS` | Timeout for the Turnstile verification call. | Optional; read by `apps/api/src/utils/verify-turnstile.ts`. |

## Sentry (error monitoring)

All Sentry integration is opt-in; leave the DSNs unset for zero telemetry.

| Variable | Purpose | Notes / default |
| --- | --- | --- |
| `SENTRY_DSN` | Sentry DSN for the **API**. | When unset, the Sentry SDK never initializes. |
| `SENTRY_ENVIRONMENT` | Environment tag for API events. | Defaults to `NODE_ENV`. |
| `SENTRY_TRACES_SAMPLE_RATE` | Fraction of API requests traced for performance monitoring. | `0`–`1`; default `0` (tracing off). |
| `SENTRY_PROFILES_SAMPLE_RATE` | Fraction of API requests profiled. | `0`–`1`; default `0` (off). |
| `SENTRY_RELEASE` | Release identifier tying events to source maps. | Falls back to the `package.json` version. |
| `SENTRY_API_TOKEN` | Sentry API token (`org:write`) used by `scripts/provision-sentry-alerts.sh` and `scripts/provision-sentry-dashboards.sh`. | Not a runtime setting. |
| `KANEO_SENTRY_DSN` | Sentry DSN for the **web container** (browser errors, tracing, session replay). | Same runtime-placeholder mechanism as `KANEO_TURNSTILE_SITE_KEY`. |
| `VITE_SENTRY_DSN` | Local dev only. | Set in `apps/web/.env` when running `pnpm dev`. |

## Billing (Kaneo Cloud via Creem)

Billing is active only when `KANEO_CLOUD=true` and both Creem keys are set. Self-hosted installs leave these empty and billing stays off.

| Variable | Purpose | Notes / default |
| --- | --- | --- |
| `CREEM_API_KEY` | Creem API key. | |
| `CREEM_WEBHOOK_SECRET` | Secret verifying Creem webhook payloads. | |
| `CREEM_TEST_MODE` | Use the Creem sandbox API. | `true` when set. |
| `CREEM_PRODUCT_PERSONAL_MONTHLY` | Creem product ID for the personal monthly plan. | |
| `CREEM_PRODUCT_PERSONAL_ANNUAL` | Creem product ID for the personal annual plan. | |
| `CREEM_PRODUCT_TEAM_MONTHLY` | Creem product ID for the team monthly plan. | |
| `CREEM_PRODUCT_TEAM_ANNUAL` | Creem product ID for the team annual plan. | |
| `BILLING_TRIAL_DAYS` | Trial length in days. | Default `14`. |
| `BILLING_FOUNDING_CUTOFF` | ISO date; workspaces created on or before it keep free access. | |
| `BILLING_REMINDER_MAX_PER_RUN` | Upper bound on trial-reminder emails per scheduler run. | Optional; read by `apps/api/src/scheduler/trial-reminders.ts`. |

## Notifications and webhooks

| Variable | Purpose | Notes / default |
| --- | --- | --- |
| `KANEO_ALLOW_PRIVATE_WEBHOOK_DESTINATIONS` | Allow outbound notification destinations (ntfy, Gotify, generic webhooks) that resolve to private or non-routable addresses. | `false` by default to prevent SSRF; the `http`/`https` requirement still applies. Enable only on a trusted, isolated deployment. |
| `NOTIFICATION_SECRET_ENCRYPTION_KEY` | Key that encrypts stored ntfy/Gotify/webhook credentials at rest (AES-256-GCM). | Optional, but required when storing any notification secret — `apps/api/src/notification-preferences/secrets.ts` refuses to write encrypted secrets without it. |

## Development-only variables (Vite)

These matter only for local `pnpm dev` runs; the production image does not use them (the `KANEO_*` placeholders replace them).

| Variable | Purpose | Notes / default |
| --- | --- | --- |
| `VITE_API_URL` | API base URL for the web dev server. | Default `http://localhost:1337`; an `/api` suffix is appended when missing. |
| `VITE_APP_URL` | App URL used when generating shareable links. | Optional. |
| `VITE_CLIENT_URL` | Client URL used for OAuth error-callback URLs on the sign-in page. | Falls back to `window.location.origin` on the sign-up page. |
| `VITE_TURNSTILE_SITE_KEY` | Turnstile site key for dev. | See the Cloud-mode section. |
| `VITE_SENTRY_DSN` | Sentry DSN for the dev web app. | See the Sentry section. |

## Notes on wiring

- `KANEO_API_URL` and `KANEO_CLIENT_URL` must use the same protocol (both http or both https) in any given environment, and `CORS_ORIGINS` should match `KANEO_CLIENT_URL`.
- The web app's typed client resolves its base URL in `packages/libs/src/api-url.ts` and `apps/web/src/fetchers/get-api-url.ts`: `VITE_API_URL || http://localhost:1337`, with `/api` appended if the value does not already end in it.
- In a Docker Compose deployment, use `postgres` as the database hostname; on a host-native API process, use `localhost`. If the API logs `getaddrinfo EAI_AGAIN postgres`, it is resolving the Compose hostname from the wrong network context.
