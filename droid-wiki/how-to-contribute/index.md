# How to contribute

Contributing to Kaneo means picking up work from the issue tracker, landing it through a clean pull request, and meeting the checks that gate the merge. This page covers the process end to end; the mechanics live in the companion pages under `droid-wiki/how-to-contribute/`. The canonical entry point remains [`CONTRIBUTING.md`](https://github.com/usekaneo/kaneo/blob/main/CONTRIBUTING.md) at the repository root — this wiki goes deeper on workflow, testing, debugging, and tooling, and points back to it where the source is the authority.

## Picking up work

- Browse the [open issues](https://github.com/usekaneo/kaneo/issues) and look for the "good first issue" label for a low-friction starting point.
- Features and bugs are discussed on the [Discord server](https://discord.gg/rU4tSyhXXU); check whether an idea has already been raised before opening an issue.
- Found a bug? Feel free to fix it and open a PR.

## Branch naming

Create a branch named for what it does — `fix/...` for bug fixes, `feat/...` for features:

```bash
git checkout -b fix/whatever-youre-fixing
# or
git checkout -b feat/cool-new-feature
```

## Commit messages

Kaneo uses conventional commits, enforced locally. The hook at `.husky/commit-msg` runs `pnpm exec commitlint --edit "$1"`, and `commitlint.config.js` at the repository root extends `@commitlint/config-conventional`, so the enforced grammar is the standard one: a lowercase type, an optional scope in parentheses, a colon, and a subject, for example `feat: add bulk task operations`, `fix: resolve calendar date selection bug`, or `docs: update deployment guide`.

The type matters beyond style: the release process derives the next version from the Conventional Commits since the last tag. `feat:` bumps the minor version, `fix:`/`perf:` bump the patch, and a breaking change bumps the major. See [development-workflow.md](development-workflow.md) for what happens to a merged PR.

## The PR process

1. Branch off `main` using the naming above.
2. Make the change and verify it locally — `pnpm test`, `pnpm typecheck`, and the targeted checks in [testing.md](testing.md) and [tooling.md](tooling.md).
3. Commit with a conventional message; commitlint enforces it at commit time.
4. Push the branch and open a pull request against `main` with a clear description of what you changed and why.

## Review expectations

Every PR runs through the CI pipeline (see [development-workflow.md](development-workflow.md)) and gets a human maintainer review. Maintainers can also dispatch an AI code review through `.github/workflows/code-review.yml` (`peekareview`), which the `peekareq[bot]` GitHub App posts back as a comment on the PR. Treat bot feedback like any reviewer feedback: address what is relevant, stabilize the change, and keep responsibility for the work yourself.

The "Using AI" section of `CONTRIBUTING.md` sets two boundaries that apply to every contribution, whether or not you used AI:

- **Speak for yourself.** Write issues, pull request descriptions, and review replies in your own words. Clear, imperfect writing is better than a generated explanation that is longer than necessary or does not describe the contribution accurately.
- **Think for yourself.** Understand and take responsibility for every change you submit. Reproduce the problem, keep the solution scoped to what's necessary, and verify the behavior yourself before requesting review. You should be able to explain the design decisions, tradeoffs, and tests without relying on an AI-generated answer.

AI output is not evidence that a change is correct; include meaningful regression coverage for behavior changes and keep unrelated or speculative work out of the PR. Automated review is fine as part of preparing an open PR, but address relevant bot feedback before requesting a maintainer review. Maintainers may close a PR without a detailed implementation review when its description is inaccurate, its scope exceeds the linked issue, important behavior is untested, or the author cannot explain and validate the submitted work.

## Definition of done

Before a PR is ready to merge:

- **Lint is clean.** Biome passes with no pending fixes; CI's `lint` job runs `pnpm exec biome ci .`.
- **Typecheck is clean.** `pnpm typecheck` passes across the monorepo.
- **Tests pass.** `pnpm test` for unit tests, and `pnpm test:integration` when the change touches API routing, authentication, authorization, or PostgreSQL behavior.
- **New UI copy has i18n keys.** Add the key to `i18n/en-US.json` first and run the i18n checks — `CONTRIBUTING.md`'s localization section covers the full workflow.
- **API changes keep OpenAPI in sync.** Any change to a route, request schema, or response schema must be followed by `pnpm openapi:check:fix`, which regenerates the committed `apps/docs/openapi.json`. CI's `openapi` job fails the PR if the committed file drifts from the routes.

## Related pages

- [Development workflow](development-workflow.md) — the branch → code → test → PR → merge cycle and what CI runs
- [Testing](testing.md) — unit vs integration split, patterns, and how to add coverage
- [Debugging](debugging.md) — common local-dev failure modes and how to read API errors
- [Tooling](tooling.md) — Turborepo, Biome, and the i18n/OpenAPI scripts
- [Patterns and conventions](patterns-and-conventions.md) — API feature shape, authorization, events, and formatting
