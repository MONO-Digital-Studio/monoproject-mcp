#!/usr/bin/env node
import { createRequire } from "node:module";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { McpServer } from "@modelcontextprotocol/server";
import { loadConfig } from "./config.js";
import { ApiClient } from "./client.js";
import {
  registerProjectTools,
  registerTaskTools,
  registerCommentTools,
  registerSprintTools,
  registerCycleTools,
  registerProductTools,
  registerLabelTools,
  registerUserTools,
  registerSearchTools,
  registerActivityTools,
  registerNotificationTools,
  registerBugHubTools,
  registerPmHubTools,
  registerCustomFieldTools,
  registerTaskTemplateTools,
  registerKnowledgeTools,
  registerCommitTools,
  registerBulkOpsTools,
  registerSessionTools,
  registerPullRequestTools,
  registerDeployTools,
  registerDependencyTools,
  registerWorkflowTools,
  registerAcceleratorTools,
} from "./tools/index.js";

/**
 * Собирает полностью укомплектованный экземпляр сервера.
 *
 * serveStdio вызывает фабрику один раз на соединение и «прикалывает» результат
 * к выбранной в открывающем обмене эре протокола, поэтому регистрация
 * инструментов обязана жить здесь, а не в main().
 */
// Read from the manifest instead of repeating the number here: a hardcoded
// "1.0.0" survived the 1.1.0 bump, so the server introduced itself to every
// client under a version it hadn't been for a while.
const { version: PACKAGE_VERSION } = createRequire(import.meta.url)(
  "../package.json",
) as { version: string };

function buildServer(client: ApiClient): McpServer {
  const server = new McpServer({
    name: "monoproject-mcp",
    version: PACKAGE_VERSION,
  });

  // Register all tool groups
  registerProjectTools(server, client);
  registerTaskTools(server, client);
  registerCommentTools(server, client);
  registerSprintTools(server, client);
  registerCycleTools(server, client);
  registerProductTools(server, client);
  registerLabelTools(server, client);
  registerUserTools(server, client);
  registerSearchTools(server, client);
  registerActivityTools(server, client);
  registerNotificationTools(server, client);
  registerBugHubTools(server, client);
  registerPmHubTools(server, client);
  registerCustomFieldTools(server, client);
  registerTaskTemplateTools(server, client);
  registerKnowledgeTools(server, client);
  registerCommitTools(server, client);
  registerBulkOpsTools(server, client);
  registerSessionTools(server, client);
  registerPullRequestTools(server, client);
  registerDeployTools(server, client);
  registerDependencyTools(server, client);
  registerWorkflowTools(server, client);
  registerAcceleratorTools(server, client);

  return server;
}

function main() {
  const config = loadConfig();
  const client = new ApiClient(config);

  // legacy: 'serve' (по умолчанию) — одно и то же соединение обслуживает как
  // ревизию 2026-07-28, так и 2025-era initialize.
  // serveStdio синхронный, поэтому внеполосные ошибки транспорта не попадут в
  // try/catch ниже — их забирает onerror (раньше это делал main().catch()).
  serveStdio(() => buildServer(client), {
    onerror: (err) => console.error("Transport error:", err),
  });
}

try {
  main();
} catch (err) {
  console.error("Fatal:", err);
  process.exit(1);
}
