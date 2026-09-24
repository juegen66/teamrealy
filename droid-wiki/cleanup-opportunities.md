# Cleanup opportunities

A quick pass over where the codebase is getting heavy and how the dependency tree is kept patched. None of this is a defect — it is where the next refactor or audit could start.

## Complexity hotspots

The largest source files in the repository, by line count:

| File | Lines | Package | What it is |
| --- | --- | --- | --- |
| `apps/web/src/components/task/task-description.tsx` | 1,988 | web | Task description editor |
| `apps/web/src/components/activity/comment-editor.tsx` | 1,979 | web | Comment editor |
| `apps/web/src/components/shared/modals/create-task-modal.tsx` | 1,374 | web | Task creation modal |
| `apps/api/src/database/schema.ts` | 1,241 | api | All PostgreSQL table definitions |
| `apps/web/src/components/account/notification-preferences-settings.tsx` | 1,224 | web | Notification preferences UI |
| `apps/api/src/auth-openapi.ts` | 1,175 | api | Generated Better Auth organization operations on the OpenAPI registry |
| `apps/api/src/mcp/tools.ts` | 957 | api | MCP tool registrations |
| `apps/api/src/index.ts` | 950 | api | App assembly and route mounting |

The web components above 1,200 lines are the natural first candidates if a large component needs splitting. `apps/api/src/database/schema.ts` is one cohesive module, and part of its size is inherent to declaring roughly forty tables. `apps/api/src/auth-openapi.ts` is generated from Better Auth's `generateOpenAPISchema()` output and diffed against upgrades rather than hand-edited — see [apps/api/auth](apps/api/auth.md).

## Dependency freshness

`pnpm-workspace.yaml` carries a thirty-entry `overrides` block that forces specific transitive dependency versions. Most are minimum-version floors — `hono: '>=4.12.25'`, `path-to-regexp: '>=8.4.0'`, `ws: '>=8.20.1'`, `undici: '>=7.29.0 <8'` — and a few are exact pins, most notably `better-auth: 1.6.25`. These are active security-patch hygiene: when a transitive dependency ships a fixed version that the declared ranges have not picked up yet, the override pulls every consumer onto the patched release without waiting for each upstream range to widen.

The evidence of how that list gets maintained is in the git history: dependabot has landed 616 commits (overwhelmingly `chore(deps): bump ...`), keeping direct dependencies current so the override set stays small rather than growing.

For the record: there are only two `TODO`/`FIXME` comments in the entire codebase (both in `apps/web/src/components/team/`), and no dead-code analysis was performed for this wiki, so there is no separate dead-ends or todos section here.

## Related pages

- [Reference dependencies](reference/dependencies.md) — the dependency inventory
- [apps/api](apps/api/index.md) and [apps/web](apps/web/index.md) — where the large files live
- [Patterns and conventions](how-to-contribute/patterns-and-conventions.md) — the module shapes a split would follow
