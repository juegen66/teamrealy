# Debugging

Most local failures fall into a handful of categories. This page collects the actionable fixes in your own words; the fuller version lives in `ENVIRONMENT_SETUP.md` at the repository root, and the environment variable reference is in [Configuration reference](../reference/configuration.md).

## CORS and network errors

"Failed to fetch", "Access ... blocked by CORS policy", or request timeouts usually come from mismatched URLs:

- `KANEO_API_URL` (what the API is) and `KANEO_CLIENT_URL` (what the web app is) must both be correct in the root `.env`. During development, `VITE_API_URL` in `apps/web/.env.local` overrides where the web app points; it defaults to `http://localhost:1337`.
- If you restrict CORS with `CORS_ORIGINS`, it should match `KANEO_CLIENT_URL` for authentication to work. Leaving it empty allows all origins in development.
- Keep the protocol consistent — don't mix `http` and `https` between the two apps in development.
- Confirm the API is actually reachable: `curl http://localhost:1337/config`. If the server is down or on a different port, nothing else will connect.

## Database connection failures

- Check PostgreSQL is running and reachable: `psql $DATABASE_URL`.
- `DATABASE_URL` must match where the API process runs. Use the `postgres` hostname only when the API container shares a Docker Compose network with the Postgres service; use `localhost` when the API runs directly on your host. `getaddrinfo EAI_AGAIN postgres` means the API is trying to resolve the Compose hostname from the wrong network context.
- `POSTGRES_DB` and `POSTGRES_USER` by themselves do not switch Kaneo into derived connection mode. An explicit `DATABASE_URL` is the reliable path for host-native development (set `POSTGRES_HOST=localhost` if you do derive it).

## Authentication problems

- `AUTH_SECRET` must be set and at least 32 characters long.
- `KANEO_CLIENT_URL` and `KANEO_API_URL` must match where you actually load the app — session cookies are tied to the origin.
- After changing auth configuration, clear cookies and local storage or use a private window. Stale session state is a common source of "sign-in doesn't stick."

## API error handling and reading logs

Both dev servers print to the same terminal under `pnpm dev` (API on port 1337, web on 5173). Startup failures are loud: `runStartupTasks()` in `apps/api/src/index.ts` exits the process with a `Database migration failed!` message when migrations can't run, and a missing CORS configuration logs a `[cors]` warning at boot.

Runtime API errors funnel through the `app.onError` handler in `apps/api/src/index.ts`:

- Expected `HTTPException`s (400s, 401s, 403s, 404s) are returned as-is; only `HTTPException`s with a status >= 500 are captured by Sentry.
- Anything that is not an `HTTPException` is captured and returned as a generic `Internal Server Error` with status 500.

So a 500 you can't explain is a real bug to trace, while a 400/401 is expected behavior for that request. Validation failures become `HTTPException(400, ...)` through the shared `defaultHook` in `apps/api/src/openapi.ts` (see [patterns-and-conventions.md](patterns-and-conventions.md)). For a failing request, the fastest path is usually the server's `console.error` output plus the response body the `onError` handler produced.

## Production debugging: Sentry

Sentry is opt-in and off by default — no DSN, no telemetry. The API initializes it in `apps/api/src/instrument.ts` when `SENTRY_DSN` is set: `SENTRY_ENVIRONMENT` and `SENTRY_TRACES_SAMPLE_RATE` / `SENTRY_PROFILES_SAMPLE_RATE` control environment tags and tracing, and the release tag comes from the root `package.json` version. The web app initializes in `apps/web/src/instrument.ts` when `VITE_SENTRY_DSN` is set locally (the production image swaps the `KANEO_SENTRY_DSN` runtime placeholder the same way it does for Turnstile), enabling browser tracing and session replay. Both run with `sendDefaultPii: false`. The web client filters known third-party noise (browser-extension and in-app-browser errors) and drops its own transient `auth.session` fetch errors, so an error showing up in Sentry is a real signal, not noise.
