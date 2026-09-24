# Workflow automation

> Active contributors: Andrej, MonsPropre, Tin, tiran133

## Purpose

Three features make up Kaneo's "automation" surface, and they are deliberately different in weight: workflow rules (a thin mapping from provider events to a target column), custom fields (per-project extensions of the task model), and labels (workspace-scoped tags). This page is honest about the split — workflow rules are not a general automation engine; they are a two-column lookup that the GitHub and Gitea webhook handlers consult when an event arrives.

## Workflow rules

### Key abstractions

| Abstraction | Source | What it is |
| --- | --- | --- |
| `workflowRuleTable` | `apps/api/src/database/schema.ts` | One row per project + integration type + provider event, pointing at a `columnId`. |
| CRUD router | `apps/api/src/workflow-rule/index.ts` | `GET/PUT /{projectId}`, `DELETE /{id}`; upsert is unique on (project, integrationType, eventType). |
| `resolveTargetStatus()` | `apps/api/src/plugins/github/utils/resolve-column.ts` (and `apps/api/src/plugins/gitea/utils/resolve-column.ts`) | The only consumer: given an event, returns the column slug to move a task to. |

### How it works

A rule stores exactly: `integrationType` (e.g. `github`), `eventType` (e.g. `pull_request.opened`), and `columnId`. The webhook handlers for GitHub and Gitea call `resolveTargetStatus(projectId, eventType, fallbackStatus)`, which looks up the rule and, when present, maps it to the project's column slug; otherwise it falls back to a column with the default status slug, then to the first column. So a rule's effect is "when this provider event fires for this project, move the task to this column" — nothing more. It has no conditions, no actions beyond the column move, and no timer or webhook-triggered execution of its own; it only shapes the behavior of the inbound GitHub/Gitea handlers described in [Integrations](integrations.md).

That thinness is by design and worth knowing before extending: if you need multi-step automation, the existing shape does not stretch; you would extend the plugin webhook handlers or build a new engine rather than growing `workflowRuleTable`.

## Custom fields

### Key abstractions

| Abstraction | Source | What it is |
| --- | --- | --- |
| `customFieldDefinitionTable` | `apps/api/src/database/schema.ts` | Per-project field definitions: name, type, required, default value, options, position. |
| `customFieldValueTable` | `apps/api/src/database/schema.ts` | Per-task values, unique on (taskId, fieldId). |
| CRUD router | `apps/api/src/custom-field/index.ts` | Definitions, values by project/task, distinct filter values, reorder, set-value. |

### How it works

Custom fields extend the task model per project. A definition is created with `type` in `text | number | date | dropdown | boolean`, an optional `required` flag, an optional `defaultValue`, and for dropdowns an `options` list. Values are set per task through `PUT /value` (upsert on task+field), with type validation in `apps/api/src/custom-field/controllers/set-custom-field-value.ts`: required fields reject empty values, dropdown values must be in `options`, numbers must parse, booleans must be `true`/`false`. Fields can be reordered (`PUT /reorder/{projectId}`), and `GET /project/{projectId}/filter-values` returns the distinct values in use per field so the board filters can render sensible choices. The field types, validation, and values are plain text columns — no per-type tables, no computed fields.

## Labels

### Key abstractions

| Abstraction | Source | What it is |
| --- | --- | --- |
| `labelTable` | `apps/api/src/database/schema.ts` | Workspace-scoped labels: name, color. |
| CRUD router | `apps/api/src/label/index.ts` | Workspace and task listings, create/update/delete, attach/detach on a task. |
| Permission checks | `apps/api/src/label/index.ts` | Uses the `label` resource from `@kaneo/permissions` (`create`/`update`/`delete`). |

### How it works

Labels belong to a workspace, not a project, and are attached to tasks one at a time: `PUT /{id}/task` attaches a label to a task and `DELETE /{id}/task` detaches it. Task-label mutations publish `task.label_assigned` / `task.label_unassigned` events, and label create/delete publishes `task.label_created` / `task.label_deleted`; the WebSocket layer maps all four to a `TASK_LABEL_UPDATED` message so open boards refresh (see [Realtime](realtime.md)). Attachment validates that label and task live in the same workspace, and the routes enforce the `label` permission vocabulary.

## Integration points

- Webhook handlers: `resolveTargetStatus` in the github/gitea plugin `utils/` is the only consumer of `workflowRuleTable`.
- Events: task label changes flow through `publishEvent` → `TASK_LABEL_UPDATED` realtime message.
- Permissions: `project:update` gates workflow-rule and custom-field writes; `label:*` gates label writes (see [packages/permissions](../packages/permissions.md)).
- Web app: board settings screens for columns/rules, the task-detail custom-field section, and label pickers all use the typed client from `@kaneo/libs`.

## Entry points for modification

- Add a provider event that can move tasks: register the event in the github/gitea webhook handler and, if wanted, surface it in the workflow-rule UI — the table itself needs no schema change (`eventType` is a string).
- Add a custom-field type: extend the `type` enum in `apps/api/src/custom-field/schema.ts`, the validation in `set-custom-field-value.ts`, and the web app's field renderers.
- Add label behavior (e.g. multi-label per task): this is a schema and controller change in `apps/api/src/label/` plus the attach/detach routes.

## Key source files

| File | Purpose |
| --- | --- |
| `apps/api/src/workflow-rule/index.ts` | Workflow-rule routes |
| `apps/api/src/workflow-rule/controllers/upsert-workflow-rule.ts` | Upsert semantics: one rule per project+integration+event |
| `apps/api/src/plugins/github/utils/resolve-column.ts` | The rule's consumer on GitHub events |
| `apps/api/src/plugins/gitea/utils/resolve-column.ts` | The rule's consumer on Gitea events |
| `apps/api/src/custom-field/index.ts` | Custom-field routes |
| `apps/api/src/custom-field/controllers/set-custom-field-value.ts` | Per-type value validation and upsert |
| `apps/api/src/label/index.ts` | Label routes and permission checks |

## Related pages

- [Integrations](integrations.md) for the webhook handlers that consume workflow rules
- [Realtime](realtime.md) for `TASK_LABEL_UPDATED` delivery
- [Packages/permissions](../packages/permissions.md) for the `label` resource vocabulary
- [Primitives/task model](../primitives/task-model.md) for the `label`, `custom_field_definition`, and `custom_field_value` tables
