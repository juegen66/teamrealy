# email

**Active contributors:** Andrej, Tin, namtao

## Purpose

`packages/email` (`@kaneo/email`) is the shared mail layer: React email templates rendered with `@react-email/components` and nodemailer send helpers. SMTP configuration lives entirely in the API's environment variables (documented in `ENVIRONMENT_SETUP.md`), so this package reads `process.env` and carries no configuration of its own.

## Templates

| Template | Source | Used for |
| --- | --- | --- |
| Magic link | `packages/email/src/templates/magic-link.tsx` | Passwordless sign-in links |
| OTP | `packages/email/src/templates/otp.tsx` | Email verification codes |
| Password reset | `packages/email/src/templates/password-reset.tsx` | Forgot-password flow |
| Workspace invitation | `packages/email/src/templates/workspace-invitation.tsx` | Workspace invite emails |
| Notification | `packages/email/src/templates/notification.tsx` | Notification delivery emails |
| Trial reminder | `packages/email/src/templates/trial-reminder.tsx` | Cloud trial expiry reminders |

`packages/email/src/templates/shell.tsx` provides the shared `EmailShell` layout and inline styles every template sits in. `packages/email/src/templates/resolve-locale.ts` maps a user locale to one of the supported copy languages (`en`, `de`, `vi`, `ja`). The workspace-invitation copy is inlined in the template rather than imported from `i18n/en-US.json` — the package builds with `tsc`, and a runtime i18n import would resolve outside the published files.

## Key abstractions

| Export | What it does |
| --- | --- |
| `sendMagicLinkEmail`, `sendOtpEmail`, `sendPasswordResetEmail`, `sendTrialReminderEmail` | Render the template and send; log and swallow failures |
| `sendWorkspaceInvitationEmail`, `sendNotificationEmail` | Same, but return an `EmailResult` — `{ success: true }` or `{ success: false, reason: "SMTP_NOT_CONFIGURED" }` — and rethrow unexpected errors |
| `isSmtpConfigured` | True when both `SMTP_HOST` and `SMTP_FROM` are set |
| `getSmtpTransportOptions` | Builds nodemailer options from `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASSWORD`/`SMTP_SECURE`/`SMTP_REQUIRE_TLS`/`SMTP_IGNORE_TLS`; omits `auth` unless user and password are both present |

## How a feature triggers a send

A feature imports a send helper and calls it with a recipient, a subject, and template props. The API does this in three places:

- `apps/api/src/auth.ts` — magic links, OTPs, and workspace invitations during the auth flows
- `apps/api/src/notification-preferences/delivery.ts` — `sendNotificationEmail` when a user's notification preference has email enabled
- `apps/api/src/scheduler/trial-reminders.ts` — `sendTrialReminderEmail` for expiring cloud trials

The nodemailer transporter is created once at module load from `getSmtpTransportOptions()`. Whether mail can go out at all is decided by `isSmtpConfigured()`; the invitation and notification senders check it before rendering and report `SMTP_NOT_CONFIGURED` when it is false.

## Entry points for modification

- `packages/email/src/send-email.tsx` — the send helpers
- `packages/email/src/templates/` — template copy, layout, and the locale resolver
- `packages/email/src/smtp-config.ts` — transport options and the configured check

## Key source files

| File | Purpose |
| --- | --- |
| `packages/email/src/send-email.tsx` | Send helpers, transporter, `EmailResult` |
| `packages/email/src/smtp-config.ts` | Transport options from env, `isSmtpConfigured` |
| `packages/email/src/templates/shell.tsx` | Shared layout and styles |
| `packages/email/src/templates/resolve-locale.ts` | Locale → supported copy language |

## Related pages

- [Features/notifications](../features/notifications.md) for the notification delivery path
- [apps/api/auth](../apps/api/auth.md) for magic links, OTPs, and invitations
- [Getting started](../overview/getting-started.md) for the SMTP environment variables
