# mcp

**Active contributors:** Andrej, Tin, dmtrTm

## Purpose

`packages/mcp` is the published `@kaneo/mcp` npm package: a stdio MCP (Model Context Protocol) server that lets local MCP clients — Claude Desktop, Cursor, and others — talk to a Kaneo instance. This is the standalone, client-agnostic path. It is separate from the built-in HTTP MCP endpoint mounted inside the API at `apps/api/src/mcp/`, which Streamable-HTTP clients can connect to directly (see [apps/api](../apps/api/index.md)); `@kaneo/mcp` is what you reach for when your client speaks stdio only, or you want the device-flow/API-key auth path.

## Key abstractions

| Component | Source | What it is |
| --- | --- | --- |
| `kaneo-mcp` CLI | `packages/mcp/src/index.ts` / `packages/mcp/src/cli.ts` (bin `dist/index.js`) | Entry point: interactive installer in a TTY, stdio MCP server when stdin is piped; `serve`/`install` subcommands |
| MCP server | `packages/mcp/src/server.ts` | `McpServer` from `@modelcontextprotocol/sdk`, wired to `AuthService` + `KaneoClient` with all tools registered |
| `AuthService` | `packages/mcp/src/auth/auth-service.ts` | Device flow against the API, or a static `KANEO_API_KEY` bearer token |
| `KaneoClient` | `packages/mcp/src/kaneo/client.ts` | Thin `fetch` wrapper that attaches the bearer token and parses JSON responses |
| Tool registration | `packages/mcp/src/tools/register.ts` | Declares every MCP tool in terms of the Kaneo API |
| Installer | `packages/mcp/src/install/` | Merges an `mcpServers` entry into Cursor user/project, Claude Desktop, or a custom JSON config |
| Registry metadata | `packages/mcp/server.json` | MCP registry entry (`io.github.usekaneo/kaneo`) describing the npm package, stdio transport, and environment variables |

## Configuring a client

Run `npx -y @kaneo/mcp`. npm downloads the package and the CLI shows an interactive menu (arrow keys + Enter) asking where to register the server: Cursor user-wide (`~/.cursor/mcp.json`), Cursor project (`.cursor/mcp.json`), Claude Desktop, or a custom JSON path. It merges an `mcpServers` entry that points at the package's `dist/index.js` with your current Node binary. When an MCP client launches the process over a pipe, the same binary runs the stdio server instead.

The server reads three environment variables:

| Variable | Meaning |
| --- | --- |
| `KANEO_API_URL` | Kaneo API origin, default `http://localhost:1337` (do not include `/api`) |
| `KANEO_MCP_CLIENT_ID` | Device-flow client id, default `kaneo-mcp`; must appear in the server's `DEVICE_AUTH_CLIENT_IDS` (the API allows `kaneo-cli` and `kaneo-mcp` by default) |
| `KANEO_API_KEY` | Optional; when set, the server authenticates with it as a Bearer token and skips the interactive device flow — for headless/Docker setups |

Without an API key, the first tool call runs the device flow: the server requests a device code from `POST /api/auth/device/code`, prints the verification URL and user code to `stderr`, tries to open the browser, polls `POST /api/auth/device/token` until approved, and stores the access token at `~/.config/kaneo-mcp/credentials.json` with mode `0600`.

## Tools

Session tools (`whoami`, `list_workspaces`, `list_workspace_members`, `list_notifications`), `search`, projects (list/get/create/update, `list_project_columns`), tasks (create/update/delete/move/status/assignee/due date, `list_task_activity`), time entries, comments, labels, and task relations. Two practical notes from the README: `list_project_columns` returns the column slugs that `create_task` and `update_task_status` accept, and `list_workspace_members` resolves the user ids the assignee tools expect. Time entries have no delete endpoint on the API, so there is no `delete_time_entry` tool.

## Integration points

- API device-flow endpoints for authentication (`apps/api/src/auth.ts`)
- The built-in HTTP MCP endpoint `apps/api/src/mcp/` — the alternative transport surface
- Server-side device-client allowlist via `DEVICE_AUTH_CLIENT_IDS`

## Entry points for modification

- `packages/mcp/src/tools/register.ts` — add or change a tool
- `packages/mcp/src/kaneo/client.ts` — API call handling
- `packages/mcp/src/install/index.ts` — installer targets and the wizard
- `packages/mcp/package.json` — version bump; the publish workflow (`.github/workflows/publish-mcp.yml`) publishes the new npm version and creates a `mcp-v<version>` GitHub release once the version changes

## Key source files

| File | Purpose |
| --- | --- |
| `packages/mcp/src/server.ts` | Server construction, auth and client wiring |
| `packages/mcp/src/cli.ts` | Installer-vs-server dispatch, help text |
| `packages/mcp/src/tools/register.ts` | Tool definitions |
| `packages/mcp/src/auth/` | Device flow, token store, `AuthService` |
| `packages/mcp/README.md` | Setup, environment, tool list, releasing |

## Related pages

- [apps/api/index](../apps/api/index.md) and [apps/api/auth](../apps/api/auth.md) for the HTTP MCP endpoint and device flow
- [Features/integrations](../features/integrations.md) for MCP as an integration-like surface
- [Glossary](../overview/glossary.md) for the MCP and device-flow terms
