import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { ApiClient } from "./client.js";
import {
  registerProjectTools,
  registerTaskTools,
  registerCommentTools,
  registerSprintTools,
  registerCycleTools,
  registerProductTools,
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
} from "./tools/index.js";

async function main() {
  const config = loadConfig();
  const client = new ApiClient(config);

  const server = new McpServer({
    name: "monoproject-mcp",
    version: "1.0.0",
  });

  // Register all tool groups
  registerProjectTools(server, client);
  registerTaskTools(server, client);
  registerCommentTools(server, client);
  registerSprintTools(server, client);
  registerCycleTools(server, client);
  registerProductTools(server, client);
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

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
