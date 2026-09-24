# Tooling

The repo is a pnpm workspace driven by Turborepo, formatted and linted by Biome, with small Node scripts keeping the locale files and the OpenAPI spec in sync with reality.

## Turborepo task graph and caching

`turbo.json` at the repository root declares the tasks every package can run and how they relate:

- `build` depends on `^build` (each package's dependencies build first) and caches `dist/**` as its output, keyed on the default inputs plus `.env*`. `@kaneo/site#build` overrides the output to `.next/**` (excluding cache) and `out/**`.
- `dev` also depends on `^build`, is marked `persistent` (long-running) and uncached — that's what `pnpm dev` runs.
- `lint`, `typecheck`, `test`, and `test:integration` are uncached. `test:integration` additionally declares `DATABASE_URL` as an environment input, so its key changes when the connection string does.
- `typecheck` and the test tasks depend on `^build`, so changed dependencies are rebuilt before checks run.

The practical upshot: a change inside `apps/web/src` rebuilds only the web app, and a package whose inputs didn't change restores its build from cache instead of re-executing.

## Biome

`biome.json` configures Biome 2.x for formatting, linting, and import organization:

- The top-level formatter uses tab indentation (`indentStyle: "tab"`), but the `javascript` formatter override switches `.js`/`.ts`/`.tsx` files to space indentation with double quotes (`quoteStyle: "double"`). In practice TypeScript sources are space-indented with double quotes, while JSON files follow the tab default.
- `assist.actions.source.organizeImports: "on"` — Biome sorts and merges import statements automatically.
- The linter runs the `recommended` preset plus stricter `style` rules promoted to `error`: `noParameterAssign`, `useAsConstAssertion`, `useDefaultParameterLast`, `useEnumInitializers`, `useSelfClosingElements`, `useSingleVarDeclarator`, `noUnusedTemplateLiteral`, `useNumberNamespace`, `noInferrableTypes`, and `noUselessElse`.
- Two release scripts (`release.config.js` and `scripts/release/*.mjs`) relax `noTemplateCurlyInString` and `noUndeclaredEnvVars` via overrides, because their string-building patterns are intentional.

Biome ignores generated artifacts by path: `dist`, `.next`, `.turbo`, coverage output, CSS/SVG/HTML files, `package.json` and tsconfig files, and `openapi.json`.

Two commands behave differently:

- `pnpm lint` runs `turbo lint`, which is Biome with `--write` and can reformat files you didn't intend to touch. Review the diff after a full run.
- `pnpm exec biome check <path>` is the targeted read-only check to use while iterating; the pre-commit hook runs `pnpm exec biome ci .`, Biome's CI mode, which reports problems without writing.

## i18n tooling

The localization workflow and its commands — `pnpm i18n:check`, `pnpm i18n:check:fix`, `pnpm i18n:report`, `pnpm i18n:report:fix`, and `pnpm i18n:schema` — are documented in the localization section of [`CONTRIBUTING.md`](https://github.com/usekaneo/kaneo/blob/main/CONTRIBUTING.md). The short version: `i18n/en-US.json` is the source of truth, the other locale files must match it, and CI's `i18n` job runs `pnpm i18n:check` on every PR, so new UI copy needs its key added and checked in the same PR.

## OpenAPI tooling

`apps/docs/openapi.json` is a committed artifact — it is not generated at build time, and the docs site serves it. Two root scripts keep it in sync with the route definitions:

- `pnpm openapi:check` — builds the API's dependencies, exports the spec from the routes into a temporary file, and fails if that file differs from `apps/docs/openapi.json`.
- `pnpm openapi:check:fix` — regenerates `apps/docs/openapi.json` in place when it has drifted.

CI's `openapi` job runs the check. Whenever you change a route, request schema, or response schema, run the fix script and commit the regenerated file along with the change.
