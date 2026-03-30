# monoproject-mcp

MCP server for [MONOProject](https://monoproject.dev) — full API coverage for project management from Claude Code and other MCP-compatible AI assistants.

## Features

**86 tools** across 17 modules:

| Module | Tools | Description |
|--------|:-----:|-------------|
| **Tasks** | 8 | CRUD, bulk operations, search, filters |
| **Comments** | 4 | List, add, update, delete (threaded replies, @mentions) |
| **Sprints** | 9 | CRUD, start/complete, add/remove tasks |
| **Cycles** | 11 | OKR cycles, key results, members, projects |
| **Knowledge Base** | 6 | Docs CRUD, full-text search, tree structure |
| **Projects** | 3 | List, details, summary with stats |
| **Products** | 4 | CRUD for product catalog |
| **PM Hub** | 12 | Feedback, opportunities, specifications, AI spec generation |
| **Bug Hub** | 8 | Incidents, Sentry sync, task creation from incidents |
| **Users** | 4 | List, find, resolve, sync |
| **Activities** | 2 | Workspace and task activity feeds |
| **Notifications** | 3 | List, mark read, mark all read |
| **Commits** | 2 | Link commits to tasks, list task commits |
| **Custom Fields** | 5 | Define fields, get/set values on tasks |
| **Task Templates** | 4 | CRUD, apply template to create tasks |
| **Search** | 1 | Global search across workspace |

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

| Variable | Description |
|----------|-------------|
| `MONO_API_URL` | API base URL (e.g. `https://monoproject.dev/api/v1`) |
| `MONO_API_TOKEN` | Bearer token — create in MONOProject Settings → API Tokens |
| `MONO_WORKSPACE_ID` | Workspace UUID |

### 3. Build

```bash
npm run build
```

### 4. Add to Claude Code

Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "monoproject-mcp": {
      "command": "node",
      "args": ["/path/to/monoproject-mcp/dist/index.js"],
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

## Development

```bash
npm run dev        # Run with tsx (hot reload)
npm run build      # Compile TypeScript → dist/
npm run typecheck  # Type check without emit
```

## Architecture

```
src/
├── index.ts       # Entry point — registers all tool groups
├── client.ts      # HTTP client (auth, retries, error handling)
├── config.ts      # Environment variables loader
├── format.ts      # Response formatters (API JSON → human-readable text)
└── tools/         # 17 tool modules
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

- All API paths for project-scoped resources start with `/projects/{project_id}/`
- Import paths use `.js` extension (NodeNext module resolution)
- Responses go through `format.ts` formatters — never raw JSON
- Tool handlers use `run()` wrapper for error handling and `ok()` for responses

## Tech Stack

- TypeScript 5.7+ (strict mode, ES2022)
- [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk) — MCP protocol
- [zod](https://github.com/colinhacks/zod) — input schema validation
- Node.js 20+

## License

Private — MONO Studio internal tool.
