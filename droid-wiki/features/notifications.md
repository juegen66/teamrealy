# Notifications

> Active contributors: Andrej, Tin, shockalotti

## Purpose

Notifications are the in-app inbox plus the delivery channels a user opts into: email (via `@kaneo/email`), ntfy, Gotify, or a personal webhook. The system is event-driven — a task mutation publishes an event, `createNotification` persists a row and raises `notification.created`, and delivery then happens asynchronously through the user's preferences. Two scheduler jobs extend the same path with proactive reminders: due-date reminders per task owner, and due-date reminders per generic-webhook integration.

## Key abstractions

| Abstraction | Source | What it is |
| --- | --- | --- |
| `notificationTable` | `apps/api/src/database/schema.ts` | One row per notification: user, type, optional title/content, `eventData`, resource link, read state. |
| `createNotification()` | `apps/api/src/notification/controllers/create-notification.ts` | The single write path: checks the user's category preference, inserts, publishes `notification.created`, and kicks off delivery. |
| Event subscriptions | `apps/api/src/notification/index.ts` | Maps task/workspace/time-entry events to `createNotification` calls for the affected user. |
| `userNotificationPreferenceTable` | `apps/api/src/database/schema.ts` | Global per-user settings: which channels are enabled, which notification categories are muted, due-date lead time. |
| `userNotificationWorkspaceRuleTable` (+ `…ProjectTable`) | `apps/api/src/database/schema.ts` | Per-workspace overrides: channel toggles and all-projects vs. selected-projects mode. |
| `deliverNotification()` | `apps/api/src/notification-preferences/delivery.ts` | Resolves the resource context, applies the workspace rule, builds content, and sends each enabled channel. |
| `checkDueDateReminders()` | `apps/api/src/scheduler/due-date-reminders.ts` | Every 5 minutes: notifies task owners whose due date hits the configured lead time, or that just went overdue. |
| `checkProjectWebhookReminders()` | `apps/api/src/scheduler/project-webhook-reminders.ts` | Every 5 minutes: sends due-date reminders to generic-webhook integrations that enable the event. |

## Directory layout

| Path | Purpose |
| --- | --- |
| `apps/api/src/notification/` | Routes (`/api/notification`), controllers (create/list/mark-read/mark-all/clear), and the event subscriptions that raise notifications. |
| `apps/api/src/notification-preferences/` | Routes (`/api/notification-preferences`), the preferences service, delivery, and secret encryption helpers. |
| `apps/api/src/scheduler/due-date-reminders.ts` | Task-owner due-date and overdue reminders. |
| `apps/api/src/scheduler/project-webhook-reminders.ts` | Integration-level due-date reminders for generic webhooks. |
| `packages/email/src/` | `sendNotificationEmail` and the React Email templates, including `templates/notification.tsx`. |

## How it works

### What triggers a notification

Three sources feed `createNotification`:

1. **Event subscriptions** in `apps/api/src/notification/index.ts`: `task.created` notifies the task's `userId` (skipped when the actor is the same user — the event carries `currentUserId`), `workspace.created` notifies the new owner, `task.status_changed` notifies the assignee (if different from the actor), `task.assignee_changed` notifies the newly assigned user, and `time-entry.created` notifies the task owner.
2. **The scheduler**: `checkDueDateReminders` raises `due_date_reminder` / `task_overdue` notifications for task owners (see below).
3. **Integrations**: `POST /api/notification` lets an authenticated caller create a notification for the current user; the route exists for integrations and respects the same preference checks.

`createNotification` maps the notification type to a preference key (`taskAssignmentEnabled`, `taskCommentEnabled`, `taskStatusChangeEnabled`, `dueDateReminderEnabled`) and returns `null` — no row, no delivery, no realtime ping — when the user has turned that category off. Otherwise it inserts the row, `publishEvent("notification.created", { notificationId, userId })` (which the WebSocket layer turns into a `NOTIFICATION_CREATED` push — see [Realtime](realtime.md)), and fires `deliverNotification` in the background.

### Preferences: global settings and workspace rules

Global preferences (`userNotificationPreferenceTable`) hold channel toggles and credentials (ntfy server/topic/token, Gotify server/token, webhook URL/secret), the four category toggles, and `dueDateReminderLeadTimeMinutes` (default 1440). Secrets are encrypted at rest with AES-256-GCM under `NOTIFICATION_SECRET_ENCRYPTION_KEY` (`apps/api/src/notification-preferences/secrets.ts`) and never returned in full — responses report booleans plus masked previews.

Per-workspace rules (`userNotificationWorkspaceRuleTable`) override the global channel toggles per workspace and add `projectMode: all | selected` with a join table of selected projects. A rule gates every channel delivery: a channel must be enabled both globally and in the workspace rule, and a `selected` rule only delivers when the notification's project is in the selection. Workspace rules can only enable channels already enabled globally, and disabling a channel globally cascades the disable into active rules.

### Delivery channels

`deliverNotification` resolves the notification's resource (task or workspace) into a context with workspace/project/task names and a task URL, then sends every enabled channel concurrently with `Promise.allSettled` so one failing channel doesn't drop the others:

| Channel | Mechanism | Notes |
| --- | --- | --- |
| In-app | `notificationTable` row served by `/api/notification` | Always on; the realtime `NOTIFICATION_CREATED` push keeps the badge fresh. |
| Email | `sendNotificationEmail` from `@kaneo/email` | Requires SMTP (`SMTP_HOST`, `SMTP_FROM`, …); no-ops with `SMTP_NOT_CONFIGURED` when unset. |
| ntfy | `POST <server>/<topic>` with optional bearer token | `Click` header points at the task URL. |
| Gotify | `POST <server>/message?token=…` | Token travels in the query string, called out in a comment in `delivery.ts`. |
| Webhook | `POST <url>` with HMAC `X-Kaneo-Signature` when a secret is set | Payload nests notification, workspace, project, task, and user objects. |

All outbound channel URLs pass `assertPublicDestination` (the same SSRF guard integrations use — see [Integrations](integrations.md)).

### Reminder scheduled jobs

`checkDueDateReminders` runs every 5 minutes (`*/5 * * * *`) in two windows:

- `configured_before`: tasks whose `dueDate - leadTimeMinutes` falls inside the last 10-minute window, where lead time comes from the owner's preference (default 24 h). Produces `due_date_reminder` notifications.
- `overdue`: tasks whose due date fell inside the last 10 minutes. Produces `task_overdue` notifications.

Both skip tasks in final (done) columns, archived tasks, and tasks whose owner disabled `dueDateReminderEnabled`. Claims are recorded in `taskReminderSentTable` (unique per task + reminder type), so a restart or overlapping run cannot double-notify.

`checkProjectWebhookReminders` runs on the same 5-minute cadence but per generic-webhook integration: when the integration's config has `dueDateReminder` enabled, it finds the project's tasks due within the integration's `dueDateReminderLeadTimeMinutes` (default 1440) window, claims each in `taskReminderSentTable` under `generic_webhook:<integrationId>`, and POSTs the reminder through the generic webhook client. On a failed delivery the claim is deleted so the next run retries.

## Integration points

- `apps/api/src/events/index.ts` — notifications subscribe to events; controllers only publish.
- `apps/api/src/ws/index.ts` — `notification.created` → `NOTIFICATION_CREATED` user-channel broadcast.
- `apps/api/src/scheduler/index.ts` — registers the two 5-minute jobs with Sentry check-ins.
- `@kaneo/email` — the SMTP transport and React Email templates.
- Web app: the notification bell reads `/api/notification` through TanStack Query; `use-user-websocket.ts` invalidates `["notifications"]` on the realtime push.

## Entry points for modification

- Add a notification trigger: subscribe to the event in `apps/api/src/notification/index.ts` and call `createNotification` with a type; add rendering in `buildDeliveryContent` in `apps/api/src/notification-preferences/delivery.ts`.
- Add a preference category: extend the schema, `UpdateNotificationPreferenceInput`, the `preferenceKey` mapping in `create-notification.ts`, and the response schema.
- Add a delivery channel: new branch in `deliverNotification` plus schema/service plumbing in `apps/api/src/notification-preferences/`.
- Tune reminders: lead-time defaults and windows in `apps/api/src/scheduler/due-date-reminders.ts`, `reminder-timing.ts`, and the preference default (1440).

## Key source files

| File | Purpose |
| --- | --- |
| `apps/api/src/notification/index.ts` | Routes and event subscriptions that raise notifications |
| `apps/api/src/notification/controllers/create-notification.ts` | Preference check, insert, `notification.created` event, async delivery kick-off |
| `apps/api/src/notification-preferences/delivery.ts` | Context resolution, rule filtering, per-channel senders |
| `apps/api/src/notification-preferences/service.ts` | Global preferences and workspace-rule CRUD with secret masking and validation |
| `apps/api/src/notification-preferences/secrets.ts` | AES-256-GCM encryption of ntfy/Gotify/webhook secrets |
| `apps/api/src/scheduler/due-date-reminders.ts` | Task-owner due-date and overdue reminders |
| `apps/api/src/scheduler/project-webhook-reminders.ts` | Integration-level due-date reminders via generic webhook |
| `packages/email/src/send-email.tsx` | `sendNotificationEmail` over the SMTP transport |

## Related pages

- [Realtime](realtime.md) for the `NOTIFICATION_CREATED` push and cache invalidation
- [Integrations](integrations.md) for the generic-webhook client and the shared SSRF guard
- [Packages/email](../packages/email.md) for SMTP config and templates
- [Billing](billing.md) for the trial-reminder emails, which use the same `@kaneo/email` transport
- [Primitives/task model](../primitives/task-model.md) for the `task_reminder_sent` claim table
