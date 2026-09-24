# Maintainers and subsystem ownership

This page is the last page in the wiki. It answers two questions the rest of the wiki deliberately avoids: who owns each subsystem, and who does the work overall. Per-person contribution data lives here and only here; [by-the-numbers](by-the-numbers.md) and [lore](lore.md) point here for the human side of the story.

There is no `CODEOWNERS` file in the repository (a `find` across the tree confirms it), so the table below is derived entirely from `git log origin/main` history as of the September 24, 2026 snapshot (3,014 commits). Bots are excluded everywhere, and three known identity merges are applied because the same people committed under different git names:

- **Andrej** and **Andrej Acevski** are one person (~1,158 merged commits).
- **Tin** and **Tin Sever** are one person (~334 merged commits).
- **(justin)randoneering**, **justin**, and **randoneering** are one person (~208 merged commits).

The counts in parentheses are merged commits per contributor. "Last activity" is the most recent human commit relative to the snapshot.

## Subsystem ownership

| Subsystem | Recent contributors (git history) | Last activity |
| --- | --- | --- |
| `apps/api` | Andrej (347), Tin (133), justin group (29), MonsPropre (28), tiran133 (25) | Tin, 18 hours ago |
| `apps/web` | Andrej (420), Tin (133), justin group (69), LAZIC Erwan (27), tiran133 (25) | Tin, 18 hours ago |
| `apps/docs` | Andrej (204), Tin (32), justin group (12), tiran133 (8), Morteza (4) | Tin, 18 hours ago |
| `apps/site` | Andrej (35), Tin (10), xFGhoul (2), SegoCode (2) | Tin, 10 hours ago |
| `packages/libs` | Andrej (31), Tin (4), tiran133 (1) | Andrej, 31 hours ago |
| `packages/permissions` | Andrej (9) | Andrej, 31 hours ago |
| `packages/mcp` | Andrej (20), Tin (8), dmtrTm (3), N1arko (1) | Andrej, 31 hours ago |
| `packages/email` | Andrej (28), Tin (10), namtao (2), eeshs (1), sinsky (1) | Andrej, 31 hours ago |
| `packages/planka-import` | Andrej (8), aoright (1) | Andrej, 31 hours ago |
| `charts/kaneo` | Andrej (11), justin group (8), dscham (7), Tin (7), Tymek (6) | Tin, 2 days ago (most recent raw commit is a `github-actions[bot]` release/CI commit) |

The pattern is consistent with the rest of the repo's story: `apps/web` and `apps/api` are the sustained hotspots with the largest contributor base, the `packages/*` surface is dominated by the same core pair plus drive-by specialists (dmtrTm on MCP, namtao on email, aoright on the Planka importer, dscham and Tymek on the Helm chart), and `apps/site` and `apps/docs` are busiest in bursts tied to marketing and docs work.

## Who does the work

Of the 3,014 commits on `origin/main`, 2,154 are human-authored and 860 are bots (`dependabot[bot]` and `github-actions[bot]`). Among humans, the picture is a small core and a long tail:

| Contributor | Merged commits | Share of human commits |
| --- | --- | --- |
| Andrej (incl. Andrej Acevski) | 1,158 | 54% |
| Tin (incl. Tin Sever) | 334 | 15% |
| justin group | 208 | 10% |
| Everyone else combined | ~454 | 21% |

The top three identities account for roughly four of every five human commits, which matches the by-the-numbers churn data: `apps/web` and `apps/api` together absorbed most of the work, and both are led by the same people.

The remaining ~454 human commits are spread across dozens of named contributors. The most active are MonsPropre (47), tiran133 (44), LAZIC Erwan (38), reachsanjivbhagat-gif (23), Frank Smeets (20), Tymek (18), Glen Eder (15), Ivan Bobchenkov (13), Navdeep Singh (12), FVOCI (11), and guillemc23 (9), with a longer tail of single- and few-commit contributors including dmtrTm, namtao, Morteza, dscham, sinsky, aoright, xFGhoul, and SegoCode. This is not a solo project in any sense — even the "core" pair's share is only possible because dependabot handles the dependency treadmill (616 commits) and the release workflow automates tagging.

## How the numbers were computed

- Overall counts: `git log origin/main --format="%aN" | sort | uniq -c | sort -rn`.
- Subsystem counts: the same command scoped with `-- <dir>` for each of the ten directories above.
- Identity merging and bot exclusion were applied to the raw author names before aggregation; any `[bot]`-suffixed author is dropped.
- Last activity per subsystem: `git log origin/main -n 3 --format="%aN|%ar" -- <dir>`, taking the most recent non-bot row.
