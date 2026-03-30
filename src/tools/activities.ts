import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ApiClient } from "../client.js";
import { ok, run, formatActivity, formatList } from "../format.js";

export function registerActivityTools(server: McpServer, client: ApiClient) {
  server.registerTool(
    "mono_list_activities",
    {
      description: "List recent activity feed for the workspace (task changes, comments, status updates)",
      inputSchema: z.object({
        project_id: z.string().optional().describe("Filter by project UUID"),
        actor_id: z.string().optional().describe("Filter by user UUID who performed the action"),
        entity_type: z.string().optional().describe("Filter: task, comment, cycle, sprint, project"),
        page: z.number().optional(),
        per_page: z.number().optional(),
      }),
    },
    (params) =>
      run(async () => {
        const data = await client.get<any>(`${client.ws()}/activities`, params);
        const items = data.data || data;
        return ok(formatList(Array.isArray(items) ? items : [], formatActivity, "activities", data.total));
      }),
  );

  server.registerTool(
    "mono_get_task_activities",
    {
      description: "Get activity history for a specific task (all changes, comments, status transitions)",
      inputSchema: z.object({
        task_id: z.string().describe("Task UUID"),
      }),
    },
    ({ task_id }) =>
      run(async () => {
        const data = await client.get<any>(`/tasks/${task_id}/activities`);
        const items = data.data || data;
        return ok(formatList(Array.isArray(items) ? items : [], formatActivity, "task activities", data.total));
      }),
  );
}
