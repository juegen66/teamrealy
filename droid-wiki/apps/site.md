# apps/site

Active contributors: Andrej, Tin.

`apps/site` is the public Next.js website for kaneo.app. It is the marketing site and the documentation host: it serves the landing pages, guides, blog, and comparison pages, and it shares the domain with the Mintlify-rendered `/docs` reader built from the `apps/docs` content.

## Purpose

A fully static Next.js app — `apps/site/next.config.mjs` sets `output: "export"` with unoptimized images, so there is no server runtime and the build output in `apps/site/out` is plain static files. The dev server runs on port 3001 (`next dev -p 3001` in `apps/site/package.json`).

The routes under `apps/site/app/` cover the whole marketing surface:

- `page.tsx` — the landing page (hero, features, founder statement, sponsors).
- `guides/` — SEO guides pages with static params, rendered from typed guide data.
- `blog/` — blog index, category filter, and per-post pages, plus an RSS feed.
- `[slug]/` — competitor comparison pages (`kaneo vs X` style).
- `pricing/`, `privacy/`, `terms/` — the remaining public pages.
- `llms.txt/` and `llms-full.txt/` — machine-readable site summaries for LLMs.
- `robots.ts`, `sitemap.xml/`, `sitemap-pages.xml/` — SEO output.

## Directory layout and content model

- `apps/site/app/` — Next.js route handlers and pages.
- `apps/site/content/blog/` — blog posts as markdown files, parsed at build time by `apps/site/lib/blog/` (frontmatter validation, markdown-to-HTML via `marked`, reading time, TOC).
- `apps/site/lib/guides/` — guide content as typed TypeScript data (`apps/site/lib/guides/index.ts` assembles the list).
- `apps/site/lib/comparisons/` — competitor comparison data driving the `[slug]` pages.
- `apps/site/components/` — React components (landing sections, blog cards, guide pages).
- `apps/site/scripts/` — `generate-og.mjs` (Open Graph image generation via `pnpm og:generate`) and `sync-sponsors.mjs` (sponsor data).
- `apps/site/public/` — static images, logo, and favicon.

## How it relates to apps/docs

`apps/site` does not statically import `apps/docs` files at build time. Instead the site is the documentation host on the same domain: marketing pages deep-link into the `/docs` reader (the Mintlify content from `apps/docs`), `apps/site/app/sitemap.xml/route.ts` lists `/docs/sitemap.xml` in the sitemap index, and `apps/site/app/llms.txt/route.ts` links the docs' installation and API reference pages. Docs URLs appear throughout `apps/site/components/landing/` — the navbar, footer, pricing CTAs, and guide pages all point at `/docs/core/...` paths.

## Deployment

`.github/workflows/deploy-site.yml` deploys the site to GitHub Pages. On a push to `main` (or `coss`) touching `apps/site/**`, `packages/**`, the pnpm lockfiles, or the workflow itself, plus manual `workflow_dispatch`, it checks out the repo, installs with a frozen pnpm lockfile, runs `pnpm --filter @kaneo/site build`, and publishes `apps/site/out` via `actions/deploy-pages`. The Mintlify docs reader is deployed separately by Mintlify, which is why docs content changes don't require this workflow to run.

## Integration points

- Serves as the public face of the project and routes visitors into `/docs`, `/pricing`, `/blog`, and `/guides`.
- Its OpenAPI-driven docs reader depends on the committed `apps/docs/openapi.json` (see [apps/docs](docs.md)).
- `apps/site/package.json` builds on Next.js 16, React 19, Base UI components, and `marked` for blog markdown.
