import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ApiClient } from "../client.js";
import { ok, run, formatSprint, formatList, formatTaskList } from "../format.js";

export function registerSprintTools(server: McpServer, client: ApiClient) {
  server.registerTool(
    "mono_list_sprints",
    {
      description: "List all sprints for a project with task counts",
      inputSchema: z.object({
        project_id: z.string().describe("Project UUID"),
        status: z.string().optional().describe("Filter: planning, active, completed"),
      }),
    },
    ({ project_id, status }) =>
      run(async () => {
        const data = await client.get<any>(`/projects/${project_id}/sprints`, { status });
        const sprints = data.data || data;
        return ok(formatList(Array.isArray(sprints) ? sprints : [], formatSprint, "sprints"));
      }),
  );

  server.registerTool(
    "mono_get_sprint",
    {
      description: "Get sprint details with all its tasks",
      inputSchema: z.object({
        project_id: z.string().describe("Project UUID"),
        sprint_id: z.string().describe("Sprint UUID"),
      }),
    },
    ({ project_id, sprint_id }) =>
      run(async () => {
        const data = await client.get<any>(`/projects/${project_id}/sprints/${sprint_id}`);
        const s = data.data || data;
        let result = formatSprint(s);
        if (s.tasks?.length) {
          result += "\n\nTasks:\n" + formatTaskList(s.tasks);
        }
        return ok(result);
      }),
  );

  server.registerTool(
    "mono_create_sprint",
    {
      description: "Create a new sprint in a project (status: planning)",
      inputSchema: z.object({
        project_id: z.string().describe("Project UUID"),
        name: z.string().describe("Sprint name"),
        goal: z.string().optional().describe("Sprint goal"),
        description: z.string().optional().describe("Sprint description"),
        capacity: z.number().optional().describe("Sprint capacity in story points"),
        start_date: z.string().optional().describe("Start date (ISO 8601)"),
        end_date: z.string().optional().describe("End date (ISO 8601)"),
      }),
    },
    ({ project_id, ...body }) =>
      run(async () => {
        const data = await client.post<any>(`/projects/${project_id}/sprints`, body);
        const s = data.data || data;
        return ok(`Sprint created:\n${formatSprint(s)}`);
      }),
  );

  server.registerTool(
    "mono_update_sprint",
    {
      description: "Update sprint properties (name, goal, dates, capacity)",
      inputSchema: z.object({
        project_id: z.string().describe("Project UUID"),
        sprint_id: z.string().describe("Sprint UUID"),
        name: z.string().optional(),
        goal: z.string().optional(),
        description: z.string().optional(),
        capacity: z.number().optional(),
        start_date: z.string().optional(),
        end_date: z.string().optional(),
      }),
    },
    ({ project_id, sprint_id, ...body }) =>
      run(async () => {
        const payload = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined));
        const data = await client.patch<any>(`/projects/${project_id}/sprints/${sprint_id}`, payload);
        const s = data.data || data;
        return ok(`Sprint updated:\n${formatSprint(s)}`);
      }),
  );

  server.registerTool(
    "mono_delete_sprint",
    {
      description: "Delete a sprint (tasks are unlinked, not deleted)",
      inputSchema: z.object({
        project_id: z.string().describe("Project UUID"),
        sprint_id: z.string().describe("Sprint UUID"),
      }),
    },
    ({ project_id, sprint_id }) =>
      run(async () => {
        await client.delete(`/projects/${project_id}/sprints/${sprint_id}`);
        return ok(`Sprint ${sprint_id} deleted.`);
      }),
  );

  server.registerTool(
    "mono_add_task_to_sprint",
    {
      description: "Add a task to a sprint",
      inputSchema: z.object({
        project_id: z.string().describe("Project UUID"),
        sprint_id: z.string().describe("Sprint UUID"),
        task_id: z.string().describe("Task UUID to add"),
      }),
    },
    ({ project_id, sprint_id, task_id }) =>
      run(async () => {
        await client.post(`/projects/${project_id}/sprints/${sprint_id}/tasks/${task_id}`);
        return ok(`Task ${task_id} added to sprint ${sprint_id}.`);
      }),
  );

  server.registerTool(
    "mono_remove_task_from_sprint",
    {
      description: "Remove a task from a sprint",
      inputSchema: z.object({
        project_id: z.string().describe("Project UUID"),
        sprint_id: z.string().describe("Sprint UUID"),
        task_id: z.string().describe("Task UUID to remove"),
      }),
    },
    ({ project_id, sprint_id, task_id }) =>
      run(async () => {
        await client.delete(`/projects/${project_id}/sprints/${sprint_id}/tasks/${task_id}`);
        return ok(`Task ${task_id} removed from sprint ${sprint_id}.`);
      }),
  );

  server.registerTool(
    "mono_start_sprint",
    {
      description: "Start a sprint (PLANNING → ACTIVE). Only one sprint can be active per project.",
      inputSchema: z.object({
        project_id: z.string().describe("Project UUID"),
        sprint_id: z.string().describe("Sprint UUID"),
      }),
    },
    ({ project_id, sprint_id }) =>
      run(async () => {
        const data = await client.post<any>(`/projects/${project_id}/sprints/${sprint_id}/start`);
        const s = data.data || data;
        return ok(`Sprint started:\n${formatSprint(s)}`);
      }),
  );

  server.registerTool(
    "mono_complete_sprint",
    {
      description: "Complete an active sprint (ACTIVE → COMPLETED)",
      inputSchema: z.object({
        project_id: z.string().describe("Project UUID"),
        sprint_id: z.string().describe("Sprint UUID"),
      }),
    },
    ({ project_id, sprint_id }) =>
      run(async () => {
        const data = await client.post<any>(`/projects/${project_id}/sprints/${sprint_id}/complete`);
        const s = data.data || data;
        return ok(`Sprint completed:\n${formatSprint(s)}`);
      }),
  );
}
