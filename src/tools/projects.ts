import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ApiClient } from "../client.js";
import { ok, run, formatProject, formatList } from "../format.js";

export function registerProjectTools(server: McpServer, client: ApiClient) {
  server.registerTool(
    "mono_list_projects",
    {
      description: "List all projects in the workspace",
      inputSchema: z.object({}),
    },
    () =>
      run(async () => {
        const data = await client.get<any>(`${client.ws()}/projects`);
        // API returns paginated: {items: [...], total: N} or flat array
        const items = data.items || data.data || (Array.isArray(data) ? data : []);
        const total = data.total ?? items.length;
        return ok(formatList(items, formatProject, "projects", total));
      }),
  );

  server.registerTool(
    "mono_get_project",
    {
      description: "Get project details by ID",
      inputSchema: z.object({
        project_id: z.string().describe("Project UUID"),
      }),
    },
    ({ project_id }) =>
      run(async () => {
        const data = await client.get<any>(`${client.ws()}/projects/${project_id}`);
        const p = data.data || data;
        const lines = [
          `Project: ${p.name} [${p.key}]`,
          `ID: ${p.id}`,
          `Color: ${p.color}`,
          `Archived: ${p.is_archived}`,
          p.description ? `Description: ${p.description}` : null,
          `Created: ${p.created_at}`,
        ].filter(Boolean);
        return ok(lines.join("\n"));
      }),
  );

  server.registerTool(
    "mono_get_project_summary",
    {
      description: "Get project summary with task statistics, team size, active sprint info",
      inputSchema: z.object({
        project_id: z.string().describe("Project UUID"),
      }),
    },
    ({ project_id }) =>
      run(async () => {
        const data = await client.get<any>(`${client.ws()}/projects/${project_id}/summary`);
        return ok(JSON.stringify(data, null, 2));
      }),
  );
}
