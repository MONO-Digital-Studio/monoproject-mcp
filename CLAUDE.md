# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

MCP server for MONOProject — provides 100 tools for project management (tasks, sprints, docs, comments, billing, integrations) via Model Context Protocol.

## Commands

```bash
npm run build      # Compile TypeScript → dist/ (REQUIRED after changes)
npm run dev        # Dev mode with tsx (hot reload)
npm run typecheck  # Type check without emit
```

## Architecture

- `src/index.ts` — entry point, registers all tool groups
- `src/client.ts` — HTTP client (auth, retry/backoff on 429 & 5xx, error handling, response parsing)
- `src/config.ts` — env vars: MONO_API_URL, MONO_API_TOKEN, MONO_WORKSPACE_ID
- `src/format.ts` — response formatters (convert API JSON → human-readable text)
- `src/tools/` — 23 tool modules, each exports a `register*Tools(server, client)` function

## Critical Rules

### API URL paths must include project context

All project-scoped resources require `/projects/{project_id}/` prefix. Example:

- Correct: `/projects/${project_id}/tasks/${task_id}/comments`
- Wrong: `/tasks/${task_id}/comments` (→ 404)

### Always rebuild after changes

The MCP runtime executes `dist/index.js`, not source. After any code change:

```bash
npm run build
```

Then restart Claude Code to reload the MCP server.

### Import paths must use `.js` extension

TypeScript with `"module": "NodeNext"` requires `.js` in import paths:

```typescript
import { ok, run } from "../format.js"; // correct
import { ok, run } from "../format"; // wrong — runtime error
```

## Adding a New Tool

1. Create `src/tools/<name>.ts` with `export function register<Name>Tools(server, client)`
2. Export from `src/tools/index.ts`
3. Import and call in `src/index.ts`
4. Add formatter in `src/format.ts` if the response has structured data
5. `npm run build`

Pattern: use `run()` wrapper for error handling, `ok()` for responses, `client.get/post/patch/delete` for API calls.

## Response Formatting

All tool responses go through `src/format.ts` formatters — never return raw JSON to Claude. This keeps the context window clean. Each entity type (task, comment, sprint, etc.) has a dedicated formatter.

## Environment Variables

| Var                 | Description                                         |
| ------------------- | --------------------------------------------------- |
| `MONO_API_URL`      | API base URL, e.g. `https://monoproject.dev/api/v1` |
| `MONO_API_TOKEN`    | Bearer token (create in Settings → API Tokens)      |
| `MONO_WORKSPACE_ID` | Default workspace UUID                              |

## Backend API Reference

The OpenAPI schema, ReDoc and Swagger UI are exposed **only outside
production** (`settings.docs_enabled`). On `monoproject.dev` they return 404 by
design — the app is not open-source and its API surface is not publicly
discoverable. Use a local/dev environment to browse the schema, or read the
tool modules in `src/tools/` (each maps 1:1 to a REST endpoint).

## Public repository

This repo is **public** (MIT). The MONOProject app/API stays private — this is
only the thin client. Report vulnerabilities privately: see
[SECURITY.md](SECURITY.md). Contribution guide: [CONTRIBUTING.md](CONTRIBUTING.md).

The API token (`MONO_API_TOKEN`) is created in any workspace regardless of plan —
MCP access is not a paid feature; the token carries your existing permissions
and subscription. AI generations run on **your** LLM key (BYOK), so the client
never spends the platform's budget.
