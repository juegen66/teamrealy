# Integrations

> Active contributors: Tin, Andrej, justin, Luan

## Purpose

Kaneo ships six external integrations — GitHub, Gitea, Slack, Discord, Telegram, and Mattermost — plus an outgoing generic webhook. They all follow the same shape: a per-project row in the `integration` table, a plugin object that knows how to react to task events, and (for GitHub and Gitea) an inbound webhook route that turns external activity back into task changes. This page covers the shared contract, how events reach the integrations, and where SSRF protection sits.

The shared contract lives in `apps/api/src/plugins/` — `registry.ts` and `types.ts` — not in `apps/api/src/integrations/`, which holds only the small shared route helpers (`middleware.ts`, `schema.ts`, `response.ts`) that the per-integration CRUD routers import.

## Key abstractions

| Abstraction | Source | What it is |
| --- | --- | --- |
| `IntegrationPlugin` | `apps/api/src/plugins/types.ts` | The contract: `type`, `name`, optional task-event handlers (`onTaskCreated`, `onTaskStatusChanged`, …), optional `handleWebhook`/`getTaskMetadata`, required `validateConfig`. |
| `registerPlugin()` / `initializeEventSubscriptions()` | `apps/api/src/plugins/registry.ts` | Registers a plugin in a `Map` keyed by type, and wires the plugin bus to the shared event bus. |
| `broadcastTask*()` functions | `apps/api/src/plugins/registry.ts` | Look up the active integrations for a project and dispatch each task event to the matching plugin handler with a `PluginContext`. |
| `integrationTable` | `apps/api/src/database/schema.ts` | One row per project per integration type; `config` holds the plugin's JSON config, `isActive` gates delivery. |
| Per-integration CRUD router | `apps/api/src/<name>-integration/index.ts` | OpenAPI routes to get/create/update/delete the integration for a project, plus type-specific extras (repo listing, verification, issue import). |
| `assertPublicDestination()` | `apps/api/src/utils/assert-public-destination.ts` | SSRF guard applied to every outbound destination URL. |

## Directory layout

| Path | Purpose |
| --- | --- |
| `apps/api/src/plugins/index.ts` | `initializePlugins()` — registers all seven plugins (github, gitea, slack, mattermost, discord, generic-webhook, telegram) and starts event subscriptions. |
| `apps/api/src/plugins/<name>/` | One folder per integration: `index.ts` (the `IntegrationPlugin` object), `config.ts` (Valibot schema + `validateConfig`), `events.ts` (the `onTask*` handlers), `client.ts` (the HTTP client for the channel). |
| `apps/api/src/plugins/github/` | The GitHub App: config, webhook handler, per-event handlers under `webhooks/`, and utils including the `resolve-column.ts` used by workflow rules. |
| `apps/api/src/<name>-integration/index.ts` | The route layer for each integration. |
| `apps/api/src/integrations/` | Shared route middleware (`scopeToProjectFromBody`) and the event-toggle schemas both integrations' CRUD routes use. |

## How it works

The flow has two directions. Outbound: a task mutation calls `publishEvent()`; the plugin registry's event subscriptions receive it, find every active integration for the task's project, and invoke the plugin's handler, which sends to the external channel. Inbound: GitHub or Gitea posts a webhook; the API verifies the signature, then the handler mutates Kaneo state (and usually publishes events itself, which then flow out again).

```mermaid
graph LR
    C["Task controller"] -->|publishEvent| E["events/ EventEmitter"]
    E --> R["plugins/registry.ts<br/>subscribeToEvent × 12"]
    R -->|getActiveIntegrations(projectId)| DB[(integration table)]
    DB --> R
    R -->|onTaskCreated / onTaskStatusChanged / ...| P["Plugin (slack, github, ...)"]
    P -->|POST| EXT["External service"]
    EXT -.->|"webhook (github / gitea only)"| API["/api/github-integration/webhook<br/>or /api/gitea-integration/webhook/:id"]
    API --> H["Webhook handler"]
    H -->|signature check| T["Task/column changes"]
    T -.->|publishEvent| E
```

### Registration

`initializePlugins()` (`apps/api/src/plugins/index.ts`) calls `registerPlugin()` for each of the seven plugins and then `initializeEventSubscriptions()`, which subscribes the plugin bus to the shared event types (`task.created`, `task.status_changed`, `task.priority_changed`, `task.title_changed`, `task.description_changed`, `comment.created`, `task.deleted`, `task.moved`, `task.due_date_changed`, `task.assignee_changed`, `task.unassigned`). The `IntegrationPlugin` type also declares optional `handleWebhook` and `getTaskMetadata` capabilities, but no plugin currently implements them — GitHub and Gitea webhooks are handled by dedicated route handlers instead of going through the plugin interface.

### Outbound notifications

On each event, the registry loads the project's active integrations and calls the matching plugin handler. Each handler decides for itself whether the event is enabled in its config (Slack, for instance, defaults `taskCreated` and `taskCommentCreated` on and the rest off), then posts to its channel: Slack webhook URL, Discord webhook, Telegram chat, Mattermost, or — for the generic webhook — an arbitrary HTTPS endpoint signed with an HMAC (`X-Kaneo-Signature`) when a secret is configured. The generic webhook is the only integration that can also send due-date reminders (`dueDateReminder` event), driven by the scheduler rather than the event bus; see [Notifications](notifications.md).

### Inbound webhooks

- **GitHub App events**: `POST /api/github-integration/webhook` is mounted in `apps/api/src/index.ts` (line ~235) as `handleGithubWebhookRoute`. It requires `x-hub-signature-256`, `x-github-event`, and `x-github-delivery` headers, then `handleGitHubWebhook` in `apps/api/src/plugins/github/webhook-handler.ts` verifies the HMAC through the octokit App's `webhooks.verifyAndReceive` and dispatches to per-event handlers (`issues.opened`, `issues.closed`, `push`, `pull_request.*`, `label.created`, `issue_comment.created`, …). These handlers create or update tasks from issues, move tasks between columns (via workflow rules — see [Workflow automation](workflow-automation.md)), and comment task links back on GitHub issues.
- **Gitea**: `POST /api/gitea-integration/webhook/:integrationId` is mounted next to it. The handler validates the `X-Gitea-Signature` against the stored integration config, then `handleGiteaWebhookRequest` in `apps/api/src/plugins/gitea/webhook-handler.ts` processes the same class of events.

### GitHub SSO vs. GitHub App — two separate things

- **GitHub SSO ("Sign in with GitHub")** is an OAuth login flow for getting users into Kaneo. It is configured through Better Auth's `socialProviders` in `apps/api/src/auth.ts`, reading `GITHUB_OAUTH_CLIENT_ID` / `GITHUB_OAUTH_CLIENT_SECRET` (legacy `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` still work) via `apps/api/src/utils/github-sso-env.ts`. It has nothing to do with task integration.
- **GitHub App integration** links a project to a repository. It needs `GITHUB_APP_ID`, `GITHUB_PRIVATE_KEY` (or `GITHUB_PRIVATE_KEY_BASE64` — the same key in base64 for hosts that mangle newlines), and `GITHUB_WEBHOOK_SECRET`, read in `apps/api/src/plugins/github/utils/github-app.ts`. Configuring the App does not enable SSO, and vice versa: the SSO env reads only the OAuth client variables, so the App's env vars can be set without implicitly turning on GitHub login.

### SSRF protection

Every outbound destination — generic webhook URLs, and the ntfy/Gotify/webhook notification channels in `apps/api/src/notification-preferences/delivery.ts` — passes through `assertPublicDestination()` (`apps/api/src/utils/assert-public-destination.ts`). It rejects non-`http(s)` protocols, literal private hosts (`localhost`, loopback, RFC 1918, RFC 6598, link-local, IPv6 equivalents including `::ffff:` mapped forms), and then resolves the hostname and rejects any DNS answer pointing at a private address. Redirects are not followed (generic webhook client returns an error on redirect statuses). `KANEO_ALLOW_PRIVATE_WEBHOOK_DESTINATIONS=true` or `=1` disables the check entirely for deployments that deliberately webhook into their own network; the default (unset) keeps the guard on.

## Integration points

- `apps/api/src/index.ts` — mounts every integration router (`/api/github-integration`, `/api/gitea-integration`, `/api/slack-integration`, `/api/discord-integration`, `/api/telegram-integration`, `/api/mattermost-integration`, `/api/generic-webhook-integration`) plus the two inbound webhook routes.
- `apps/api/src/plugins/registry.ts` — the fan-out from the event bus to plugins.
- `apps/api/src/events/index.ts` — the bus the registry subscribes to; controllers publish rather than calling plugins directly.
- `apps/api/src/utils/require-workspace-permission.ts` — integration management routes require `workspace:manage_settings`; issue import requires `task:create`.
- `apps/api/src/scheduler/project-webhook-reminders.ts` — the only scheduler-driven integration behavior (generic webhook due-date reminders).
- Web app: the integration settings screens under workspace settings use the typed client from `@kaneo/libs`; there is no second untyped request layer.

## Entry points for modification

- Add a new integration: create `apps/api/src/plugins/<name>/` implementing `IntegrationPlugin` (at minimum `validateConfig`), register it in `apps/api/src/plugins/index.ts`, and add a CRUD router mirroring an existing `<name>-integration/index.ts` plus a route mount in `apps/api/src/index.ts`.
- Change which events reach an integration: edit the event subscription in `apps/api/src/plugins/registry.ts` and the handler's config schema in the plugin's `config.ts`.
- Change webhook verification: `apps/api/src/plugins/github/webhook-handler.ts` and `apps/api/src/plugins/gitea/webhook-handler.ts`.

## Key source files

| File | Purpose |
| --- | --- |
| `apps/api/src/plugins/types.ts` | The `IntegrationPlugin` contract and task-event payload types |
| `apps/api/src/plugins/registry.ts` | Plugin registration and event-to-plugin fan-out |
| `apps/api/src/plugins/index.ts` | Registers all seven plugins and starts subscriptions |
| `apps/api/src/<name>-integration/index.ts` | Per-integration CRUD routes |
| `apps/api/src/plugins/github/webhook-handler.ts` | GitHub App webhook verification and dispatch |
| `apps/api/src/plugins/github/utils/github-app.ts` | GitHub App construction from `GITHUB_APP_ID` / `GITHUB_PRIVATE_KEY` / `GITHUB_WEBHOOK_SECRET` |
| `apps/api/src/utils/github-sso-env.ts` | GitHub SSO OAuth credentials, kept separate from the App |
| `apps/api/src/utils/assert-public-destination.ts` | SSRF guard used by every outbound destination |
| `apps/api/src/plugins/generic-webhook/client.ts` | Outgoing webhook POST with HMAC signing, timeout, and no-redirect policy |

## Related pages

- [Workflow automation](workflow-automation.md) for how GitHub/Gitea events move tasks between columns
- [Notifications](notifications.md) for the per-user delivery channels that share the SSRF guard
- [Realtime](realtime.md) for how integration-driven task changes reach the browser
- [apps/api/auth](../apps/api/auth.md) for the Better Auth side of GitHub SSO
- [Reference configuration](../reference/configuration.md) for the full env-var list (`GITHUB_*`, `KANEO_ALLOW_PRIVATE_WEBHOOK_DESTINATIONS`, …)
