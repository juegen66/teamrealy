# Primitives

> Active contributors: Andrej, Tin, LAZIC, MonsPropre, Ivan, justin, randoneering, shockalotti, Rojenson, Cursor

## Purpose

The primitives lens covers Kaneo's foundational domain objects — the ones that appear across more than three systems and whose shape every other layer inherits. The workspace, project, column, and task show up in the API controllers, the typed client, the web app's queries and realtime cache, the permission checks, the events that drive activity and notifications, and the MCP tools. This section is about how those objects are stored in PostgreSQL and how the tables relate to each other, not about the features built on top of them.

Everything here is read from two files:

- `apps/api/src/database/schema.ts` — every Drizzle table definition, including foreign keys and their `onDelete` behavior
- `apps/api/src/database/relations.ts` — the Drizzle relation graph that powers `db.query` joins

## Core entity groups

| Group | Tables | Covered in |
| --- | --- | --- |
| Hierarchy and membership | `workspace`, `workspace_member`, `workspace_role`, `project`, `column`, `team`, `team_member`, `invitation` | [Workspace and project hierarchy](workspace-and-project.md) |
| Task model | `task`, `comment`, `label`, `custom_field_definition`, `custom_field_value`, `task_relation`, `time_entry`, `activity` | [Task model](task-model.md) |
| Feature-owned objects | `asset`, `workflow_rule`, `integration`, `github_integration`, `external_link`, `notification`, `task_reminder_sent`, billing tables | their feature pages |

The third group is in the same schema and has the same cascade rules, but each table is owned by a specific feature (billing, automation, integrations, notifications) and gets depth-first coverage there. The first two groups are the primitives: they are the backbone that authorization, realtime delivery, activity history, and external integrations all hang off.

## What makes a table a primitive

- **`workspace`** is the authorization boundary — almost every permission check and read query is scoped to one.
- **`project`** is the task container that columns, labels, custom fields, and integrations all hang off.
- **`task`** is the unit of work that events, activity, realtime WebSockets, and MCP tools orbit.
- Their supporting tables (`comment`, `label`, `custom_field_value`, `task_relation`, `time_entry`, `activity`) are the ones most frequently joined when loading a task's detail view.

## Related pages

- [Glossary](../overview/glossary.md) for term-level definitions that this section maps to tables
- [apps/api/database](../apps/api/database.md) for migrations, connection setup, and how the schema is applied to PostgreSQL
- [packages/permissions](../packages/permissions.md) for the permission vocabulary that `workspace_role` rows resolve against
- [Workflow automation](../features/workflow-automation.md) for custom fields and labels as a feature
- [Data models](../reference/data-models.md) for a fuller field-by-field reference (written in a later wave)
