# Features

> Active contributors: Andrej, Tin, justin, Luan, tiran133, MonsPropre

## Purpose

The features lens covers the cross-cutting, user-visible capabilities that span several systems at once. Unlike the [primitives](../primitives/index.md) — the domain objects every layer inherits — or the app-internal guides, each page here follows one capability from the API controllers and events through to the web UI, and calls out where it depends on optional infrastructure or cloud-only configuration.

These features are the places where the event bus, the permission middleware, the scheduler, and external services meet the task model. Understanding them means understanding how a single mutation in a controller fans out to activity history, notifications, integrations, WebSockets, and — on the cloud tier — billing enforcement.

## Table of contents

| Page | What it covers |
| --- | --- |
| [Integrations](integrations.md) | The six external integrations (GitHub, Gitea, Slack, Discord, Telegram, Mattermost) plus outgoing generic webhooks: the plugin contract, inbound webhook routes, outbound event delivery, and the GitHub SSO vs. GitHub App distinction. |
| [Realtime](realtime.md) | The WebSocket layer in depth: connection tracking, the `BroadcastAdapter` interface, the in-memory vs. Redis adapters, and how the web app consumes live events. |
| [Billing](billing.md) | The Creem-based paid tier: entitlements, trial lifecycle, seat reconciliation, and why self-hosted instances are unaffected. |
| [Notifications](notifications.md) | What triggers a notification, per-user preferences and delivery channels (in-app, email, ntfy, Gotify, webhook), and the reminder scheduler jobs. |
| [Workflow automation](workflow-automation.md) | Workflow rules (provider event → column move), custom fields, and labels — with an honest note on how thin the rule engine is. |
| [Search](search.md) | What is searchable, how the API ranks results with `ILIKE` queries rather than full-text search, and how the command menu surfaces it. |

## Related pages

- [Architecture](../overview/architecture.md) for the component map these features hang off
- [apps/api](../apps/api/index.md) and [apps/web](../apps/web/index.md) for the internal structure each feature lives in
- [Patterns and conventions](../how-to-contribute/patterns-and-conventions.md) for the event, permission, and route conventions these features follow
