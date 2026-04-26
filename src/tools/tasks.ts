import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ApiClient } from "../client.js";
import { ok, run, formatTask, formatTaskFull, formatTaskList } from "../format.js";

export function registerTaskTools(server: McpServer, client: ApiClient) {
  server.registerTool(
    "mono_list_tasks",
    {
      description: "List tasks with optional filters. Paginated.",
      inputSchema: z.object({
        project_id: z.string().describe("Project UUID"),
        status: z.string().optional().describe("backlog|todo|in_progress|in_review|blocked|done|cancelled|archived"),
        priority: z.string().optional().describe("none|low|medium|high|urgent"),
        type: z.enum(["epic", "story", "task", "bug"]).optional().describe("Sub-tasks = type=task with parent_id."),
        assignee_id: z.string().optional().describe("Assignee UUID"),
        sprint_id: z.string().optional().describe("Sprint UUID"),
        product_id: z.string().optional().describe("Product UUID"),
        search: z.string().optional().describe("Match title/description/identifier (e.g. 'LGZ-79')"),
        page: z.number().optional().describe("Default 1"),
        per_page: z.number().optional().describe("Default 50, max 100"),
      }),
    },
    ({ project_id, status, priority, type, assignee_id, sprint_id, product_id, search, page, per_page }) =>
      run(async () => {
        // Backend uses skip/limit pagination and exposes filters under the public query aliases.
        const limit = per_page ?? 50;
        const skip = ((page ?? 1) - 1) * limit;
        const data = await client.get<any>(`/projects/${project_id}/tasks`, {
          status,
          priority,
          type,
          assignee_id,
          sprint_id,
          product_id,
          search,
          skip,
          limit,
        });
        const tasks = data.data || data;
        const total = data.total ?? tasks.length;
        return ok(formatTaskList(Array.isArray(tasks) ? tasks : [tasks], total));
      }),
  );

  server.registerTool(
    "mono_get_task",
    {
      description: "Get full task details by ID including description, custom fields, comments count",
      inputSchema: z.object({
        project_id: z.string().describe("Project UUID"),
        task_id: z.string().describe("Task UUID"),
      }),
    },
    ({ project_id, task_id }) =>
      run(async () => {
        const data = await client.get<any>(`/projects/${project_id}/tasks/${task_id}`);
        const t = data.data || data;
        return ok(formatTaskFull(t));
      }),
  );

  server.registerTool(
    "mono_create_task",
    {
      description: "Create a task. Returns task with auto-generated identifier.",
      inputSchema: z.object({
        project_id: z.string().describe("Project UUID"),
        title: z.string().describe("1-500 chars"),
        description: z.string().optional().describe("Markdown"),
        status: z.string().optional().describe("backlog|todo|in_progress|in_review|blocked|done|cancelled (default backlog)"),
        priority: z.string().optional().describe("none|low|medium|high|urgent (default none)"),
        type: z.enum(["epic", "story", "task", "bug"]).optional().describe("Default task. For sub-task: type=task + parent_id."),
        story_points: z.number().optional().describe("0-100"),
        estimate_hours: z.number().optional(),
        due_date: z.string().optional().describe("ISO 8601"),
        labels: z.array(z.string()).optional().describe("Workspace registry only — do NOT invent. Standard: backend, frontend, database, infrastructure, api, mobile, security, performance, tech-debt, ux, a11y, seo, observability, needs-design, needs-discussion, billing, auth, websocket, integration, analytics, kb, audit, search."),
        assignee_id: z.string().optional().describe("User UUID"),
        parent_id: z.string().optional().describe("Parent task UUID — turns this into a sub-task."),
        product_id: z.string().optional().describe("Product UUID"),
        sprint_id: z.string().optional().describe("Sprint UUID"),
      }),
    },
    ({ project_id, ...body }) =>
      run(async () => {
        const data = await client.post<any>(`/projects/${project_id}/tasks`, body);
        const t = data.data || data;
        return ok(`Task created: ${formatTask(t)}`);
      }),
  );

  server.registerTool(
    "mono_update_task",
    {
      description: "Patch task — only provided fields change. Same field semantics as mono_create_task.",
      inputSchema: z.object({
        project_id: z.string().describe("Project UUID"),
        task_id: z.string().describe("Task UUID"),
        title: z.string().optional(),
        description: z.string().optional().describe("Markdown"),
        status: z.string().optional(),
        priority: z.string().optional(),
        type: z.enum(["epic", "story", "task", "bug"]).optional(),
        story_points: z.number().optional(),
        estimate_hours: z.number().optional(),
        actual_hours: z.number().optional(),
        due_date: z.string().optional().describe("ISO 8601"),
        labels: z.array(z.string()).optional().describe("Replaces existing. Workspace registry only — do NOT invent."),
        assignee_id: z.string().optional().describe("Empty string unassigns."),
        sprint_id: z.string().optional(),
        product_id: z.string().optional(),
        sort_order: z.number().optional(),
      }),
    },
    ({ project_id, task_id, ...body }) =>
      run(async () => {
        // Filter out undefined values
        const payload = Object.fromEntries(
          Object.entries(body).filter(([, v]) => v !== undefined),
        );
        const data = await client.patch<any>(`/projects/${project_id}/tasks/${task_id}`, payload);
        const t = data.data || data;
        return ok(`Task updated: ${formatTask(t)}`);
      }),
  );

  server.registerTool(
    "mono_delete_task",
    {
      description: "Delete a task permanently",
      inputSchema: z.object({
        project_id: z.string().describe("Project UUID"),
        task_id: z.string().describe("Task UUID"),
      }),
    },
    ({ project_id, task_id }) =>
      run(async () => {
        await client.delete(`/projects/${project_id}/tasks/${task_id}`);
        return ok(`Task ${task_id} deleted.`);
      }),
  );

  server.registerTool(
    "mono_bulk_create_tasks",
    {
      description: "Create up to 50 tasks. Field semantics: see mono_create_task. Title required per task.",
      inputSchema: z.object({
        project_id: z.string().describe("Project UUID"),
        tasks: z.array(z.object({
          title: z.string(),
          description: z.string().optional(),
          status: z.string().optional(),
          priority: z.string().optional(),
          type: z.enum(["epic", "story", "task", "bug"]).optional(),
          story_points: z.number().optional(),
          estimate_hours: z.number().optional(),
          labels: z.array(z.string()).optional(),
          assignee_id: z.string().optional(),
          product_id: z.string().optional(),
        })).describe("Max 50"),
      }),
    },
    ({ project_id, tasks }) =>
      run(async () => {
        const data = await client.post<any>(`/projects/${project_id}/tasks/bulk`, { tasks });
        const created = data.created || [];
        const errors = data.errors || [];
        let result = `Created ${created.length} tasks.`;
        if (errors.length) result += `\nErrors: ${JSON.stringify(errors)}`;
        return ok(result);
      }),
  );

  server.registerTool(
    "mono_bulk_update_tasks",
    {
      description: "Update multiple tasks at once with the same field values",
      inputSchema: z.object({
        project_id: z.string().describe("Project UUID"),
        task_ids: z.array(z.string()).describe("Array of task UUIDs to update"),
        status: z.string().optional().describe("New status for all tasks"),
        priority: z.string().optional().describe("New priority for all tasks"),
        assignee_id: z.string().optional().describe("New assignee for all tasks"),
        sprint_id: z.string().optional().describe("Sprint UUID"),
        product_id: z.string().optional().describe("Product UUID"),
      }),
    },
    ({ project_id, task_ids, ...updates }) =>
      run(async () => {
        const payload = Object.fromEntries(
          Object.entries(updates).filter(([, v]) => v !== undefined),
        );
        const data = await client.patch<any>(`/projects/${project_id}/tasks/bulk`, {
          task_ids,
          updates: payload,
        });
        return ok(`Updated ${data.updated || task_ids.length} tasks.`);
      }),
  );

  server.registerTool(
    "mono_bulk_delete_tasks",
    {
      description: "Delete multiple tasks at once",
      inputSchema: z.object({
        project_id: z.string().describe("Project UUID"),
        task_ids: z.array(z.string()).describe("Array of task UUIDs to delete"),
      }),
    },
    ({ project_id, task_ids }) =>
      run(async () => {
        const data = await client.delete(`/projects/${project_id}/tasks/bulk`, { task_ids }) as any;
        return ok(`Deleted ${data?.deleted || task_ids.length} tasks.`);
      }),
  );
}
