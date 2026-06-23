# Contributing to monoproject-mcp

Thanks for your interest in improving the MONOProject MCP server. This is a
thin TypeScript client that exposes the MONOProject REST API as MCP tools.

## Development setup

```bash
git clone https://github.com/MONO-Digital-Studio/monoproject-mcp.git
cd monoproject-mcp
npm install
cp .env.example .env   # fill in MONO_API_URL, MONO_API_TOKEN, MONO_WORKSPACE_ID
npm run build
```

| Command             | What it does                                                 |
| ------------------- | ------------------------------------------------------------ |
| `npm run build`     | Compile TypeScript → `dist/` (**required** after any change) |
| `npm run dev`       | Run with `tsx` (hot reload)                                  |
| `npm run typecheck` | Type-check without emit                                      |

The MCP runtime executes `dist/index.js`, so **always rebuild** after editing
source, then restart your MCP client (Claude Code, Cursor, Codex) to reload.

## Project layout

- `src/index.ts` — entry point, registers all tool groups
- `src/client.ts` — HTTP client (auth, retry/backoff, error handling)
- `src/config.ts` — environment configuration
- `src/format.ts` — response formatters (API JSON → human-readable text)
- `src/tools/` — one module per tool group, each exporting `register*Tools()`

## Conventions

- **Import paths use the `.js` extension** (`"module": "NodeNext"`):
  `import { ok, run } from "../format.js";`
- **Project-scoped paths** require the `/projects/{project_id}/` prefix.
- **Never return raw JSON to the model** — route responses through a
  `src/format.ts` formatter to keep the context window clean.
- Use the `run()` wrapper for error handling and `ok()` for responses.

## Adding a tool

1. Create `src/tools/<name>.ts` exporting `register<Name>Tools(server, client)`.
2. Export it from `src/tools/index.ts` and wire it up in `src/index.ts`.
3. Add a formatter in `src/format.ts` if the response is structured.
4. `npm run build` and verify with your MCP client.

## Pull requests

- Keep changes focused; run `npm run typecheck` and `npm run build` before
  opening a PR.
- Do not commit `.env`, real tokens, or the `dist/` build output.

## Security

Please report vulnerabilities privately — see [SECURITY.md](SECURITY.md).
