# Reference

The reference section is where the wiki keeps the exhaustive, field-by-field material — the kind that changes slowly and that feature pages point at instead of repeating. If a page elsewhere in the wiki links to "the full reference," the target is one of these three pages.

- [Configuration](configuration.md) — the complete environment variable reference, organized by category, read from `ENVIRONMENT_SETUP.md` and `.env.sample` at the repo root.
- [Data models](data-models.md) — every table in `apps/api/src/database/schema.ts` with column names, types, defaults, and constraints.
- [Dependencies](dependencies.md) — the key libraries across `package.json`, `apps/api/package.json`, `apps/web/package.json`, and the `pnpm-workspace.yaml` overrides, and why each was chosen.

For the conceptual and relational view of the core objects, see [Primitives](../primitives/index.md), especially [Workspace and project hierarchy](../primitives/workspace-and-project.md) and [Task model](../primitives/task-model.md). For how the schema is applied to PostgreSQL and migrated, see [apps/api/database](../apps/api/database.md).
