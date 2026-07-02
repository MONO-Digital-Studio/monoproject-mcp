import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ApiClient } from "../client.js";
import { ok, run, formatCycle, formatList, formatKeyResult } from "../format.js";

export function registerCycleTools(server: McpServer, client: ApiClient) {
  server.registerTool(
    "mono_list_cycles",
    {
      description: "List all cycles (OKR periods) in the workspace with task/member counts",
      inputSchema: z.object({
        status: z.string().optional().describe("Filter: planning, active, completed"),
        page: z.number().optional(),
        per_page: z.number().optional(),
      }),
    },
    ({ status, page, per_page }) =>
      run(async () => {
        const data = await client.get<any>(`${client.ws()}/cycles`, {
          status, page, per_page,
        });
        const cycles = data.items || data.data || data;
        return ok(formatList(Array.isArray(cycles) ? cycles : [], formatCycle, "cycles", data.total));
      }),
  );

  server.registerTool(
    "mono_get_cycle",
    {
      description: "Get cycle details including projects, tasks, members, and key results (OKRs)",
      inputSchema: z.object({
        cycle_id: z.string().describe("Cycle UUID"),
      }),
    },
    ({ cycle_id }) =>
      run(async () => {
        const data = await client.get<any>(`${client.ws()}/cycles/${cycle_id}`);
        const c = data.data || data;
        let result = formatCycle(c);
        if (c.key_results?.length) {
          result += "\n\nKey Results:\n" +
            c.key_results.map((kr: any, i: number) => `  ${i + 1}. ${formatKeyResult(kr)}`).join("\n");
        }
        if (c.members?.length) {
          result += "\n\nMembers:\n" +
            c.members.map((m: any) => `  - ${m.user_name || m.user_id} (${m.role})`).join("\n");
        }
        if (c.projects?.length) {
          result += "\n\nProjects:\n" +
            c.projects.map((p: any) => `  - ${p.name || p.project_id}`).join("\n");
        }
        return ok(result);
      }),
  );

  server.registerTool(
    "mono_create_cycle",
    {
      description: "Create a new cycle (OKR period). Optionally link projects.",
      inputSchema: z.object({
        name: z.string().describe("Cycle name (e.g. 'Q1 2026')"),
        description: z.string().optional(),
        goal: z.string().optional().describe("Cycle objective/goal"),
        start_date: z.string().optional().describe("Start date (ISO 8601)"),
        end_date: z.string().optional().describe("End date (ISO 8601)"),
        project_ids: z.array(z.string()).optional().describe("Project UUIDs to include"),
      }),
    },
    (body) =>
      run(async () => {
        const data = await client.post<any>(`${client.ws()}/cycles`, body);
        const c = data.data || data;
        return ok(`Cycle created:\n${formatCycle(c)}`);
      }),
  );

  server.registerTool(
    "mono_update_cycle",
    {
      description: "Update cycle properties",
      inputSchema: z.object({
        cycle_id: z.string().describe("Cycle UUID"),
        name: z.string().optional(),
        description: z.string().optional(),
        goal: z.string().optional(),
        status: z.string().optional().describe("planning, active, completed"),
        start_date: z.string().optional(),
        end_date: z.string().optional(),
      }),
    },
    ({ cycle_id, ...body }) =>
      run(async () => {
        const payload = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined));
        const data = await client.patch<any>(`${client.ws()}/cycles/${cycle_id}`, payload);
        const c = data.data || data;
        return ok(`Cycle updated:\n${formatCycle(c)}`);
      }),
  );

  server.registerTool(
    "mono_delete_cycle",
    {
      description: "Delete a cycle and its key results",
      inputSchema: z.object({
        cycle_id: z.string().describe("Cycle UUID"),
      }),
    },
    ({ cycle_id }) =>
      run(async () => {
        await client.delete(`${client.ws()}/cycles/${cycle_id}`);
        return ok(`Cycle ${cycle_id} deleted.`);
      }),
  );

  server.registerTool(
    "mono_start_cycle",
    {
      description: "Start a cycle (draft/planning -> active)",
      inputSchema: z.object({
        cycle_id: z.string().describe("Cycle UUID"),
      }),
    },
    ({ cycle_id }) =>
      run(async () => {
        const data = await client.post<any>(`${client.ws()}/cycles/${cycle_id}/start`);
        return ok(`Cycle started:\n${formatCycle(data.data || data)}`);
      }),
  );

  server.registerTool(
    "mono_complete_cycle",
    {
      description: "Complete an active cycle",
      inputSchema: z.object({
        cycle_id: z.string().describe("Cycle UUID"),
      }),
    },
    ({ cycle_id }) =>
      run(async () => {
        const data = await client.post<any>(`${client.ws()}/cycles/${cycle_id}/complete`);
        return ok(`Cycle completed:\n${formatCycle(data.data || data)}`);
      }),
  );

  server.registerTool(
    "mono_add_cycle_member",
    {
      description: "Add a member to a cycle with a role",
      inputSchema: z.object({
        cycle_id: z.string().describe("Cycle UUID"),
        user_id: z.string().describe("User UUID to add"),
        role: z.string().optional().describe("Role: owner, member, contributor (default: member)"),
      }),
    },
    ({ cycle_id, user_id, role }) =>
      run(async () => {
        await client.post(`${client.ws()}/cycles/${cycle_id}/members`, {
          user_id,
          role: role || "member",
        });
        return ok(`User ${user_id} added to cycle as ${role || "member"}.`);
      }),
  );

  server.registerTool(
    "mono_add_project_to_cycle",
    {
      description: "Add a project to a cycle",
      inputSchema: z.object({
        cycle_id: z.string().describe("Cycle UUID"),
        project_id: z.string().describe("Project UUID to add"),
      }),
    },
    ({ cycle_id, project_id }) =>
      run(async () => {
        await client.post(`${client.ws()}/cycles/${cycle_id}/projects/${project_id}`);
        return ok(`Project ${project_id} added to cycle.`);
      }),
  );

  server.registerTool(
    "mono_remove_project_from_cycle",
    {
      description: "Unlink a project from a cycle",
      inputSchema: z.object({
        cycle_id: z.string().describe("Cycle UUID"),
        project_id: z.string().describe("Project UUID to unlink"),
      }),
    },
    ({ cycle_id, project_id }) =>
      run(async () => {
        await client.delete(`${client.ws()}/cycles/${cycle_id}/projects/${project_id}`);
        return ok(`Project ${project_id} removed from cycle.`);
      }),
  );

  server.registerTool(
    "mono_add_task_to_cycle",
    {
      description: "Link a task to a cycle. The task must belong to a project linked to the cycle.",
      inputSchema: z.object({
        cycle_id: z.string().describe("Cycle UUID"),
        task_id: z.string().describe("Task UUID to link"),
      }),
    },
    ({ cycle_id, task_id }) =>
      run(async () => {
        await client.post(`${client.ws()}/cycles/${cycle_id}/tasks/${task_id}`);
        return ok(`Task ${task_id} linked to cycle.`);
      }),
  );

  server.registerTool(
    "mono_remove_task_from_cycle",
    {
      description: "Unlink a task from a cycle",
      inputSchema: z.object({
        cycle_id: z.string().describe("Cycle UUID"),
        task_id: z.string().describe("Task UUID to unlink"),
      }),
    },
    ({ cycle_id, task_id }) =>
      run(async () => {
        await client.delete(`${client.ws()}/cycles/${cycle_id}/tasks/${task_id}`);
        return ok(`Task ${task_id} removed from cycle.`);
      }),
  );

  server.registerTool(
    "mono_create_key_result",
    {
      description: "Create a Key Result (OKR) for a cycle",
      inputSchema: z.object({
        cycle_id: z.string().describe("Cycle UUID"),
        title: z.string().describe("Key Result title"),
        description: z.string().optional(),
        target_value: z.number().optional().describe("Target value (default 100)"),
        unit: z.string().optional().describe("Unit of measurement (e.g. '%', 'users', 'features')"),
      }),
    },
    ({ cycle_id, ...body }) =>
      run(async () => {
        const data = await client.post<any>(`${client.ws()}/cycles/${cycle_id}/key-results`, body);
        const kr = data.data || data;
        return ok(`Key Result created: ${formatKeyResult(kr)}`);
      }),
  );

  server.registerTool(
    "mono_update_key_result",
    {
      description: "Update a Key Result -- set current_value to track progress",
      inputSchema: z.object({
        cycle_id: z.string().describe("Cycle UUID"),
        kr_id: z.string().describe("Key Result UUID"),
        title: z.string().optional(),
        description: z.string().optional(),
        current_value: z.number().optional().describe("Current progress value"),
        target_value: z.number().optional(),
        unit: z.string().optional(),
        status: z.string().optional().describe("not_started, on_track, at_risk, completed"),
      }),
    },
    ({ cycle_id, kr_id, ...body }) =>
      run(async () => {
        const payload = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined));
        const data = await client.patch<any>(`${client.ws()}/cycles/${cycle_id}/key-results/${kr_id}`, payload);
        const kr = data.data || data;
        return ok(`Key Result updated: ${formatKeyResult(kr)}`);
      }),
  );
}
