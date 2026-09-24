# planka-import

## Purpose

`packages/planka-import` is a migration CLI that reads a Planka instance through its REST API and recreates the boards in Kaneo through Kaneo's public API. Planka has no export feature, so the tool goes board-by-board over the API instead. Nothing is written to Planka, and Planka credentials never leave the machine running the import.

## How it runs

```bash
npx @kaneo/planka-import --planka-url https://planka.example.com --dry-run
```

The dry run reads Planka only and prints exactly what would be created (columns, tasks, labels, comments per board, plus warnings for skipped archive/trash lists and attachments). When the plan looks right, add the Kaneo credentials and drop `--dry-run`:

```bash
npx @kaneo/planka-import \
  --planka-url https://planka.example.com \
  --kaneo-url https://cloud.kaneo.app \
  --kaneo-api-key kaneo_xxx \
  --workspace ws_123
```

You are prompted for the Planka login and for which boards to migrate. A Kaneo API key comes from Settings → API keys; self-hosters point `--kaneo-url` at their own instance. Other flags: `--all` skips the board prompt, `--project <name|id>` restricts to specific Planka projects, `--skip-comments` drops comments, `--report <path>` writes a JSON report, and `-y` skips the confirmation prompt.

## What carries over

| Planka | Kaneo |
| --- | --- |
| Board | Project (named `Project - Board` when a Planka project has several boards) |
| List | Column (`Closed` lists become the final column) |
| Card | Task |
| Card description | Task description |
| Checklists | Markdown checkboxes appended to the description |
| Checklist items linked to another card | Task relations (subtask) |
| Labels | Labels, with their original colors |
| Card members | Assignee, matched by email address |
| Due date | Due date |
| Comments | Comments, prefixed with the original author and date |

## Mapping limitations

- **Attachments** are counted and reported but not transferred.
- **Archive and trash lists** are skipped by design; only active and closed lists migrate.
- **Comment authorship**: the comment is created by the API key's owner, with the original Planka author recorded and displayed alongside it. Requires Kaneo 2.17.6 or newer.
- **Priorities**: Planka has no priority field, so every task starts at `no-priority`.
- **Custom fields, stopwatches, and card subscriptions** have no Kaneo equivalent.

Two caveats that matter for a successful import, from the README:

- Run the import as a **Planka admin**. Planka hides other users' email addresses from non-admin accounts, and assignees are matched by email, so a non-admin import leaves every task unassigned.
- Assignees only match when the person already exists in the target Kaneo workspace with the same email address. Invite the team first, then import.

## Re-running

The importer always creates new projects; it never updates projects it created earlier. If an import goes wrong, delete the created Kaneo project and run it again. Board-level failures are isolated — one broken board doesn't stop the rest, and the summary reports which boards failed.

## Key abstractions

| Module | What it is |
| --- | --- |
| `packages/planka-import/src/index.ts` | CLI entry: argument parsing, prompts, dry run, confirmation, JSON reports |
| `packages/planka-import/src/planka.ts` | Planka REST client (`PlankaClient`), including login and API-key auth |
| `packages/planka-import/src/kaneo.ts` | Kaneo REST client (`KaneoClient`) authenticated with the API key |
| `packages/planka-import/src/migrate.ts` | Orchestrates one board's migration; returns a `BoardReport` per board |
| `packages/planka-import/src/mapping.ts` | Column name/slug planning, description building, comment formatting, priority and due-date defaults |

## Entry points for modification

- `packages/planka-import/src/index.ts` — CLI flow and flags
- `packages/planka-import/src/mapping.ts` — mapping decisions (columns, descriptions, priorities)
- `packages/planka-import/src/migrate.ts` — per-board orchestration

## Related pages

- [apps/api/auth](../apps/api/auth.md) for API keys (the credential the importer uses)
- [Getting started](../overview/getting-started.md) for pointing the tool at a self-hosted instance
