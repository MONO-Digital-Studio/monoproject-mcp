# monoproject-mcp

MCP server for [MONOProject](https://monoproject.dev) — full API coverage for project management from Claude Code and other MCP-compatible AI assistants.

## Features

**111 tools** across 24 modules:

| Module             | Tools | Description                                                 |
| ------------------ | :---: | ----------------------------------------------------------- |
| **Tasks**          |   8   | CRUD, bulk operations, search, filters                      |
| **Comments**       |   4   | List, add, update, delete (threaded replies, @mentions)     |
| **Sprints**        |   9   | CRUD, start/complete, add/remove tasks                      |
| **Cycles**         |  14   | OKR cycles, key results, members, projects, tasks           |
| **Knowledge Base** |   6   | Docs CRUD, full-text search, tree structure                 |
| **Projects**       |   4   | List, details, summary with stats, update                   |
| **Products**       |   4   | CRUD for product catalog                                    |
| **PM Hub**         |  12   | Feedback, opportunities, specifications, AI spec generation |
| **Bug Hub**        |   8   | Incidents, Sentry sync, task creation from incidents        |
| **Users**          |   4   | List, find, resolve, sync                                   |
| **Activities**     |   2   | Workspace and task activity feeds                           |
| **Notifications**  |   3   | List, mark read, mark all read                              |
| **Commits**        |   2   | Link commits to tasks, list task commits                    |
| **Custom Fields**  |   5   | Define fields, get/set values on tasks                      |
| **Task Templates** |   4   | CRUD, apply template to create tasks                        |
| **Search**         |   1   | Task search across workspace                                |
| **Labels**         |   3   | List, create, bulk-create the workspace label registry      |
| **Dependencies**   |   3   | Link / unlink task dependencies (blocks / relates)          |
| **Pull Requests**  |   2   | Link and list task pull requests                            |
| **Deploys**        |   2   | List task deploys, log a deploy                             |
| **Workflow**       |   1   | Advance task status with workflow guards                    |
| **Session**        |   1   | Session bootstrap aggregator                                |
| **Bulk Ops**       |   1   | Bulk-close sprint in-review tasks                           |
| **EDU / Accelerators** | 8 | Read cohort metadata, teams, dashboard, milestones and stored reports |

## EDU reading (1.2.0)

These eight tools issue GET requests only. They read the backend's existing
EDU contracts; the API remains responsible for authorization. They do not create
cohorts, change memberships, submit/review evidence, generate reports, upload
files, export PDFs or create share links.

| Tool | Arguments | Reads |
| --- | --- | --- |
| `mono_list_accelerators` | Optional `scope`: `membership` (default) or `administrative` | Cohort metadata with `member_only=true` or `false` respectively |
| `mono_get_accelerator` | `accelerator_id` | Metadata, linked workspaces, membership roles and API-provided access reconciliation; contact emails omitted |
| `mono_list_accelerator_workspaces` | `accelerator_id` | Linked workspace IDs, names and slugs |
| `mono_get_accelerator_dashboard` | `accelerator_id` | Sprint status counts, red flags, OKR progress, velocity and churn risk |
| `mono_get_accelerator_progress` | `accelerator_id` | Team milestones with stage labels/statuses, evidence, reviews, history and aggregate counts |
| `mono_get_workspace_edu_progress` | None | Progress for the configured `MONO_WORKSPACE_ID` only |
| `mono_list_accelerator_reports` | `accelerator_id` | Existing reports and their complete stored stats snapshots |
| `mono_get_accelerator_report` | `accelerator_id`, `report_id` | One existing report in its cohort, including its stored stats snapshot |

All accelerator/report inputs must be UUIDs. The workspace progress tool accepts
no workspace override: a configured UUID is used directly, while a configured
slug is resolved through `GET /workspaces/{slug}` before requesting
`GET /accelerators/workspaces/{uuid}/progress`. Invalid configuration or an
invalid UUID returned by resolution fails before a progress request.

**Membership and administrative visibility are different.** The default list
uses `GET /accelerators?member_only=true` to request actual accelerator
memberships. Administrative inventory must be explicitly requested with
`{"scope":"administrative"}`; staff can then see all cohort metadata, while
other users receive only what the backend permits. Metadata visibility is not
proof that the caller participates in a cohort. List/detail metadata may be
visible to staff without membership, but linked-workspace listing, dashboard,
cohort progress and reports require actual accelerator `OBSERVER` or `CURATOR`
membership. Staff status alone does not satisfy those checks. Workspace progress
requires workspace `VIEWER` or higher; `can_submit` is a backend capability
reported for context and never enables a write through these tools.

The backend must support the `member_only` list parameter and these EDU read
routes. The MCP server neither infers membership from administrative visibility
nor adds permission fallbacks. API 403/404 responses remain tool errors. An empty
list and a workspace with no EDU cohort are shown explicitly. Zero values and
complete evidence/review/history are retained; report stats are labeled as
stored snapshots, not current progress. No completion status is inferred from
empty data.

Example MCP `tools/call` arguments (IDs below are illustrative):

```json
{"name":"mono_list_accelerators","arguments":{}}
{"name":"mono_list_accelerators","arguments":{"scope":"administrative"}}
{"name":"mono_get_accelerator_progress","arguments":{"accelerator_id":"11111111-1111-4111-8111-111111111111"}}
{"name":"mono_get_workspace_edu_progress","arguments":{}}
{"name":"mono_get_accelerator_report","arguments":{"accelerator_id":"11111111-1111-4111-8111-111111111111","report_id":"33333333-3333-4333-8333-333333333333"}}
```

## Quick Start

No clone, no build — the package is published to npm as
[`monoproject-mcp`](https://www.npmjs.com/package/monoproject-mcp).

### Environment

| Variable            | Required | Default                          | Description                                    |
| ------------------- | -------- | -------------------------------- | ---------------------------------------------- |
| `MONO_API_TOKEN`    | yes      | —                                | Bearer token — create in Settings → API Tokens |
| `MONO_API_URL`      | no       | `https://monoproject.dev/api/v1` | API base URL                                   |
| `MONO_WORKSPACE_ID` | no       | `mono`                           | Workspace UUID or slug                         |

Only the token is required; set `MONO_API_URL` or `MONO_WORKSPACE_ID` to work with another instance or workspace.

> **Token & subscription.** The API token is created in your workspace (Settings → API Tokens) and is bound to your subscription/plan — the server does nothing without a valid token. Revoke a leaked token in Settings → API Tokens.

### Add to Claude Code

Via CLI (recommended):

```bash
claude mcp add monoproject \
  -e MONO_API_TOKEN=mono_your_token \
  -- npx -y monoproject-mcp
```

Or add to `~/.claude.json` (a project-level `.mcp.json` works too):

```json
{
  "mcpServers": {
    "monoproject": {
      "command": "npx",
      "args": ["-y", "monoproject-mcp"],
      "env": {
        "MONO_API_TOKEN": "mono_your_token"
      }
    }
  }
}
```

Restart Claude Code to load the server.

Global install works too: `npm install -g monoproject-mcp`, then use
`"command": "monoproject-mcp"` instead of `npx`.

## Development (from source)

```bash
git clone git@gitlab.com:monostudio/monoproject/monoproject-mcp.git
cd monoproject-mcp
npm ci                 # prepare hook builds dist/
cp .env.example .env   # заполнить MONO_API_TOKEN (никогда не коммитить)
npm run dev            # Run with tsx (hot reload)
npm run build          # Compile TypeScript → dist/
npm run typecheck      # Type check without emit
npm test               # Integration tests against the existing dist/ build
npm run gate           # Typecheck → build → tests (local/CI gate)
```

Tests use Node's built-in test runner, synthetic fixtures on an ephemeral
loopback HTTP server and the real `ApiClient` inside a spawned `dist/index.js`
stdio process. No production account or data is needed. They verify tool
registration and annotations, UUID/scope validation, configured UUID/slug
resolution, exact GET paths/query parameters, 403/404 without fallback, empty
EDU data, complete progress/report output, email omission and clean JSON-RPC
stdout. Run `npm run gate` after source changes so tests exercise a fresh build.

Installing straight from GitHub also works (the `prepare` hook builds `dist/`):
`npm install -g github:MONO-Digital-Studio/monoproject-mcp`.

### Releasing (maintainers)

Bump `version` in `package.json` → merge → create a GitHub Release with tag
`vX.Y.Z` — the `Release (npm publish)` workflow publishes to npm with
`--provenance`. No npm token is involved: the package trusts this repository
and the `release.yml` workflow via OIDC ([trusted
publishing](https://docs.npmjs.com/trusted-publishers)), so renaming that
workflow file breaks publishing until the trust setting is updated on npmjs.com.

## Architecture

```
src/
├── index.ts       # Entry point — registers all tool groups
├── client.ts      # HTTP client (auth, URL/query building, error handling)
├── config.ts      # Environment variables loader
├── format.ts      # Response formatters (API JSON → human-readable text)
├── format-accelerators.ts # Typed EDU formatters, re-exported by format.ts
├── types/
│   └── accelerators.ts # EDU read models matching the backend responses
└── tools/         # 24 tool modules
    ├── index.ts   # Barrel exports
    ├── tasks.ts
    ├── comments.ts
    ├── sprints.ts
    ├── cycles.ts
    ├── knowledge.ts
    ├── projects.ts
    ├── products.ts
    ├── pm-hub.ts
    ├── bug-hub.ts
    ├── users.ts
    ├── activities.ts
    ├── notifications.ts
    ├── commits.ts
    ├── custom-fields.ts
    ├── task-templates.ts
    ├── search.ts
    ├── labels.ts
    ├── dependencies.ts
    ├── pull-requests.ts
    ├── deploys.ts
    ├── workflow.ts
    ├── session.ts
    ├── bulk-ops.ts
    └── accelerators.ts
```

### Adding a new tool

1. Create `src/tools/<name>.ts` — export `register<Name>Tools(server, client)`
2. Add export to `src/tools/index.ts`
3. Import and call in `src/index.ts`
4. Add response formatter in `src/format.ts`
5. Add HTTP/stdio integration coverage and run `npm run gate`

### Conventions

- Project-entity routes use `${client.ws()}/projects/...`; project-scoped task/sprint/comment resources use `/projects/{project_id}/...`
- Import paths use `.js` extension (NodeNext module resolution)
- Most responses go through `format.ts` formatters; some passthrough/debug endpoints intentionally return JSON text
- Tool handlers use `run()` wrapper for error handling and `ok()` for responses

## Tech Stack

- TypeScript 5.7+ (strict mode, ES2022)
- [@modelcontextprotocol/server](https://github.com/modelcontextprotocol/typescript-sdk) v2 — MCP protocol
  (serves both the 2025-era revisions and 2026-07-28 over stdio via `serveStdio`)
- [zod](https://github.com/colinhacks/zod) 4 — input schema validation
- Node.js 20+

## License

[MIT](LICENSE) © MONO Studio, ООО «ИЦТ»
