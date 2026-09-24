# permissions

## Purpose

`packages/permissions` (`@kaneo/permissions`) is the canonical permission vocabulary and the built-in workspace roles. The API's `requireWorkspacePermission()` middleware enforces it, and the web app's UI capability checks mirror it — but hiding an action in the UI is never treated as an authorization check; the API stays authoritative.

## Key abstractions

| Export | Source | What it is |
| --- | --- | --- |
| `statement` | `packages/permissions/src/index.ts` | Resource-to-actions map defining Kaneo's permissions on top of better-auth's `defaultStatements` |
| `ac` | `packages/permissions/src/index.ts` | The `createAccessControl(statement)` instance from `better-auth/plugins/access` |
| `viewer`, `member`, `admin`, `owner` | `packages/permissions/src/index.ts` | Built-in roles created with `ac.newRole(...)` |
| `builtInRoles` | `packages/permissions/src/index.ts` | `{ viewer, member, admin, owner } as const`; `BuiltInRoleName` is its key type |
| `DEFAULT_ROLE_NAMES` | `packages/permissions/src/index.ts` | `["viewer", "member", "admin"]` — the seedable default role names |
| `defaultRolePayloads` | `packages/permissions/src/index.ts` | JSON-serializable statement payloads that mirror each default role, used for seeding |

## The permission vocabulary

`statement` spreads better-auth's `defaultStatements` (organization, member, team, invitation, account, and friends — the better-auth organization plugin's defaults) and adds Kaneo's own resources:

| Resource | Actions |
| --- | --- |
| `project` | create, read, update, delete, share |
| `task` | create, read, update, delete, assign |
| `label` | create, read, update, delete |
| `workspace` | read, update, delete, manage_settings |

## Built-in roles

The four roles are built on `ac.newRole(...)` and combine better-auth's organization `memberAc`/`adminAc`/`ownerAc` defaults with Kaneo's own statements:

- **viewer** — read only: `project`, `task`, `label`, `workspace` are all `["read"]`, plus the better-auth member defaults.
- **member** — `project: ["create", "read"]`, `task: ["create", "read", "update"]` (no task delete), full label access, `workspace: ["read"]`.
- **admin** — everything member can do, plus task `delete`/`assign`, project `update`/`delete`/`share`, and `workspace: ["read", "update", "manage_settings"]`. Admin cannot delete the workspace.
- **owner** — everything admin has, plus `workspace: ["delete"]`.

`owner` is intentionally not in `DEFAULT_ROLE_NAMES`: it stays a true static role on the better-auth side, while `viewer`/`member`/`admin` are seeded as editable rows in `workspace_role` (their names reserved, their permissions overridable per workspace).

## How it works

A workspace-scoped route calls `requireWorkspacePermission({ resource: [actions] })`, defined in `apps/api/src/utils/require-workspace-permission.ts`. The middleware resolves the caller's permissions (from the API key scope, the instance-admin override, or the `workspace_user.role` for the current user), then checks either the editable `workspace_role` row — so admin edits to viewer/member/admin take effect immediately — or falls back to the compiled `builtInRoles` statements when no row exists. Any missing action becomes an `HTTPException(403)`.

At boot, `apps/api/src/utils/seed-default-workspace-roles.ts` backfills a `workspace_role` row per workspace for each `DEFAULT_ROLE_NAMES` name, using `defaultRolePayloads` as the serialized permission JSON. The web app imports the same vocabulary through `apps/web/src/lib/permissions.ts` (a re-export), so UI capability checks match API enforcement. `packages/permissions/src/index.test.ts` pins the statement surface, each role's actions, and the seed-payload parity against the compiled roles.

## Integration points

- `apps/api/src/utils/require-workspace-permission.ts` — enforcement
- `apps/api/src/utils/seed-default-workspace-roles.ts` — boot-time backfill of default role rows
- `apps/web/src/lib/permissions.ts` — UI capability checks
- `apps/web/src/routes/_layout/_authenticated/dashboard/settings/workspace/roles.tsx` — workspace roles editor

## Entry points for modification

- `packages/permissions/src/index.ts` — the vocabulary and the built-in roles
- `packages/permissions/src/index.test.ts` — the contract tests that pin the surface

## Key source files

| File | Purpose |
| --- | --- |
| `packages/permissions/src/index.ts` | `statement`, `ac`, the four roles, `builtInRoles`, `DEFAULT_ROLE_NAMES`, `defaultRolePayloads` |
| `packages/permissions/src/index.test.ts` | Contract tests for the statement surface, role actions, and seed payloads |

## Related pages

- [Primitives](../primitives/index.md) for the domain concept this vocabulary implements
- [Architecture](../overview/architecture.md) for the workspace authorization flow
- [Patterns and conventions](../how-to-contribute/patterns-and-conventions.md) for the `requireWorkspacePermission` convention
