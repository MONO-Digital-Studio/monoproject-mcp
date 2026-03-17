import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ApiClient } from "../client.js";
import { ok, run, formatTaskList } from "../format.js";

export function registerSearchTools(server: McpServer, client: ApiClient) {
  server.registerTool(
    "mono_search",
    {
      description: "Full-text search across tasks in a workspace. Searches title, description, identifier, labels.",
      inputSchema: z.object({
        query: z.string().describe("Search query text"),
        project_id: z.string().optional().describe("Limit to project UUID"),
        status: z.string().optional().describe("Filter by status"),
        priority: z.string().optional().describe("Filter by priority"),
        type: z.string().optional().describe("Filter by type"),
        assignee_id: z.string().optional().describe("Filter by assignee UUID"),
        limit: z.number().optional().describe("Max results (default 20)"),
      }),
    },
    ({ query, ...filters }) =>
      run(async () => {
        const data = await client.get<any>(`/search/tasks`, {
          q: query,
          ...filters,
        });
        const tasks = data.data || data.hits || data;
        return ok(formatTaskList(Array.isArray(tasks) ? tasks : [], data.total));
      }),
  );
}
