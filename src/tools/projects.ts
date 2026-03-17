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
        // Assemble summary from existing endpoints (no dedicated /summary route)
        // tasks, sprints, members routes are NOT under /workspaces prefix
        const [project, tasks, sprints, members] = await Promise.all([
          client.get<any>(`${client.ws()}/projects/${project_id}`),
          client.get<any>(`/projects/${project_id}/tasks`, { limit: 500 }),
          client.get<any>(`/projects/${project_id}/sprints`),
          client.get<any>(`/projects/${project_id}/members`).catch(() => []),
        ]);

        const p = project.data || project;
        const taskList: any[] = tasks.data || tasks || [];
        const sprintList: any[] = sprints.data || sprints || [];
        const memberList: any[] = members.data || members || [];

        // Task stats by status
        const statusCounts: Record<string, number> = {};
        for (const t of taskList) {
          const s = t.status || "unknown";
          statusCounts[s] = (statusCounts[s] || 0) + 1;
        }

        const activeSprint = sprintList.find((s: any) => s.status === "active");

        const lines = [
          `# ${p.name} [${p.key}]`,
          ``,
          `## Task Statistics (${taskList.length} total)`,
          ...Object.entries(statusCounts).map(([s, c]) => `- ${s}: ${c}`),
          ``,
          `## Team`,
          `- Members: ${memberList.length}`,
          ``,
          `## Sprints`,
          `- Total: ${sprintList.length}`,
          activeSprint
            ? `- Active: ${activeSprint.name} (${activeSprint.task_count ?? "?"} tasks)`
            : `- No active sprint`,
        ];

        return ok(lines.join("\n"));
      }),
  );
}
