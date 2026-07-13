# monoproject-mcp

MCP server for [MONOProject](https://monoproject.dev) — full API coverage for project management from Claude Code and other MCP-compatible AI assistants.

## Features

**103 tools** across 23 modules:

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

## Quick Start

No clone, no build — the package is published to npm as
[`monoproject-mcp`](https://www.npmjs.com/package/monoproject-mcp).

### Environment

| Variable            | Description                                                |
| ------------------- | ---------------------------------------------------------- |
| `MONO_API_URL`      | API base URL (e.g. `https://monoproject.dev/api/v1`)       |
| `MONO_API_TOKEN`    | Bearer token — create in MONOProject Settings → API Tokens |
| `MONO_WORKSPACE_ID` | Workspace UUID or slug                                     |

> **Token & subscription.** The API token is created in your workspace (Settings → API Tokens) and is bound to your subscription/plan — the server does nothing without a valid token. Revoke a leaked token in Settings → API Tokens.

### Add to Claude Code

Via CLI (recommended):

```bash
claude mcp add monoproject \
  -e MONO_API_URL=https://monoproject.dev/api/v1 \
  -e MONO_API_TOKEN=mono_your_token \
  -e MONO_WORKSPACE_ID=your-workspace-id \
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
        "MONO_API_URL": "https://monoproject.dev/api/v1",
        "MONO_API_TOKEN": "mono_your_token",
        "MONO_WORKSPACE_ID": "your-workspace-id"
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
git clone https://github.com/MONO-Digital-Studio/monoproject-mcp.git
cd monoproject-mcp
npm install            # prepare-хук соберёт dist/
cp .env.example .env   # заполнить MONO_* (никогда не коммитить)
npm run dev            # Run with tsx (hot reload)
npm run build          # Compile TypeScript → dist/
npm run typecheck      # Type check without emit
```

Installing straight from GitHub also works (the `prepare` hook builds `dist/`):
`npm install -g github:MONO-Digital-Studio/monoproject-mcp`.

### Releasing (maintainers)

Bump `version` in `package.json` → merge → create a GitHub Release with tag
`vX.Y.Z` — the `Release (npm publish)` workflow publishes to npm with
`--provenance` (requires the `NPM_TOKEN` repo secret).

## Architecture

```
src/
├── index.ts       # Entry point — registers all tool groups
├── client.ts      # HTTP client (auth, URL/query building, error handling)
├── config.ts      # Environment variables loader
├── format.ts      # Response formatters (API JSON → human-readable text)
└── tools/         # 16 tool modules
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
    └── search.ts
```

### Adding a new tool

1. Create `src/tools/<name>.ts` — export `register<Name>Tools(server, client)`
2. Add export to `src/tools/index.ts`
3. Import and call in `src/index.ts`
4. Add response formatter in `src/format.ts`
5. Run `npm run build`

### Conventions

- Project-entity routes use `${client.ws()}/projects/...`; project-scoped task/sprint/comment resources use `/projects/{project_id}/...`
- Import paths use `.js` extension (NodeNext module resolution)
- Most responses go through `format.ts` formatters; some passthrough/debug endpoints intentionally return JSON text
- Tool handlers use `run()` wrapper for error handling and `ok()` for responses

## Tech Stack

- TypeScript 5.7+ (strict mode, ES2022)
- [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk) — MCP protocol
- [zod](https://github.com/colinhacks/zod) — input schema validation
- Node.js 20+

## License

[MIT](LICENSE) © MONO Studio, ООО «ИЦТ»
