# Development workflow

The day-to-day loop is branch → code → test → PR → merge → ship. This page walks through each step with the tooling that gates it; for the surrounding process see [index.md](index.md) and for code shape see [patterns-and-conventions.md](patterns-and-conventions.md).

## Local iteration with `pnpm dev`

`pnpm dev` runs `turbo dev`, which starts the API on port 1337 and the web app on port 5173 in parallel, both with hot reload. Server configuration comes from the root `.env`; Vite-only overrides live in `apps/web/.env.local`. See [getting-started](../overview/getting-started.md) for the setup, and [debugging.md](debugging.md) for what to do when a piece doesn't come up.

## Git hooks

Husky installs two hooks during `pnpm install` (the root `prepare` script runs `husky`):

- `.husky/pre-commit` runs `pnpm exec biome ci .` — Biome's CI mode, which reports formatting and lint problems without writing. It gates the commit rather than auto-fixing, so run the targeted check while iterating and fix what it flags.
- `.husky/commit-msg` runs `pnpm exec commitlint --edit "$1"`, validating the message against `@commitlint/config-conventional` (see `commitlint.config.js`). A commit with a non-conventional message fails at commit time, so the message has to be right the first time.

## What CI runs on a PR

`.github/workflows/ci.yml` runs a set of independent jobs on every pull request (and on pushes to `main`). PR builds cancel when a new commit is pushed; `main` builds serialize. Each job provisions Node 24.19 and pnpm 10.32.1 and runs `pnpm install --frozen-lockfile`:

- `peekareq-tests` — runs the unit tests of the review-bot tooling itself (`scripts/ui-review-bot`), keeping the maintainer-triggered AI code review machinery green.
- `lint` — runs `pnpm exec biome ci .`, the read-only Biome check, across the repo.
- `i18n` — runs `pnpm i18n:check`, which compares every locale file against `i18n/en-US.json` and fails on missing or extra keys.
- `openapi` — runs `pnpm openapi:check`, which regenerates the API spec from the routes in a temporary directory and diffs it against the committed `apps/docs/openapi.json`.
- `typecheck` — runs `pnpm typecheck`, TypeScript project-references typechecking across the monorepo.
- `unit` — runs `pnpm test`, the unit tests in every package.
- `build` — runs `pnpm build`, the full Turborepo build.
- `integration` — runs `pnpm test:integration` against a PostgreSQL 16 service container. It sets `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/kaneo_test`, `NODE_ENV=test`, `DISABLE_GUEST_ACCESS=false`, and a throwaway `AUTH_SECRET` — the same environment `tests/api-integration/setup.ts` establishes locally.
- `docker-build` — smoke-test builds the `Dockerfile.kaneo` image for `linux/amd64` without pushing, catching packaging regressions that tests wouldn't.

## Auto-merge and PR size labels

Two workflows affect how a PR is handled, neither of which changes the contributor's job:

- `.github/workflows/auto-merge.yml` only acts on Dependabot PRs — it waits for checks and squash-merges semver `patch` and `minor` dependency bumps. Human-authored PRs always merge through a maintainer.
- `.github/workflows/pr-size-labeler.yml` labels every PR `size/xs` through `size/xl` from the larger of changed lines and changed file counts (thresholds in `.github/pull-request-size.yml`, lockfiles excluded). The label is informational; it does not gate merging.

## After the merge: shipping

Releasing is manual and deliberate. Nothing ships on a push to `main`. A maintainer dispatches the **Release** workflow from the default branch, which resolves the next version from the Conventional Commits since the last tag, builds and pushes the three GHCR images under that version, validates the Helm chart, and only then cuts the release: version bumps, `CHANGELOG.md`, a `vX.Y.Z` tag, a GitHub Release with grouped notes, and a "released in vX.Y.Z" comment on every PR and issue it closed. The `release_type` input forces the bump (`patch`/`minor`/`major`), and `dry_run` prints the planned version and notes without doing anything.

Two implications for contributors: commit messages must use the conventional types (they drive the version bump), and PR titles matter — the notes generator maps each commit back to its PR and uses the PR title when its type matches. This is why `feat:` bumps minor, `fix:`/`perf:` bump patch, and breaking changes bump major. See the "Releases" section of `AGENTS.md` at the repository root for the full description, and [deployment](../deployment.md) for how the images and chart are run.
