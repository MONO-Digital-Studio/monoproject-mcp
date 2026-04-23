# monoproject-mcp — Local Agent Notes

Локальные инструкции для `[/Users/metatau/Projects/MCP/monoproject-mcp](/Users/metatau/Projects/MCP/monoproject-mcp)`.
Дополняют глобальный `~/.codex/AGENTS.md`.

## Контекст

- Репозиторий — MCP server для MONOProject.
- Entry point: `src/index.ts`.
- Runtime исполняет `dist/index.js`, а не `src/`.
- Основные модули: `src/client.ts`, `src/format.ts`, `src/tools/*.ts`.

## Обязательные команды после изменений

```bash
npm run typecheck
npm run build
```

Если менялся код в `src/`, считай rebuild обязательным: иначе MCP runtime останется на старом `dist/`.

## Контракты API

- Для project-scoped ресурсов используй путь вида `/projects/{project_id}/...`.
- Для workspace-scoped путей используй `client.ws()`.
- В query params передавай публичные API aliases, а не внутренние имена backend-переменных.
  Пример: для `mono_list_tasks` нужен `status`, а не `status_filter`.

## Правила реализации

- Все import paths в TypeScript должны оканчиваться на `.js`.
- Ответы инструментов форматируй через `src/format.ts`; не возвращай raw JSON без необходимости.
- Новые MCP tools регистрируй в `src/index.ts` и экспортируй через `src/tools/index.ts`.
- Не добавляй секреты в репозиторий; `MONO_API_TOKEN` живёт только в окружении.

## Проверка перед сдачей

- `npm run typecheck` проходит.
- `npm run build` проходит.
- Если менялся контракт tool → API, проверь фактические query/path params, а не только типы.
