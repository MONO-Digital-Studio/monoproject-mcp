import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ApiClient } from "../client.js";
import { ok, run, formatTask, formatTaskFull, formatTaskList } from "../format.js";

export function registerTaskTools(server: McpServer, client: ApiClient) {
  server.registerTool(
    "mono_list_tasks",
    {
      description:
        "List tasks in a project with optional filters. Returns paginated results.",
      inputSchema: z.object({
        project_id: z.string().describe("Project UUID"),
        status: z.string().optional().describe("Filter: backlog, todo, in_progress, in_review, blocked, done, cancelled, archived"),
        priority: z.string().optional().describe("Filter: none, low, medium, high, urgent"),
        type: z.string().optional().describe("Filter: epic, story, task, bug, sub_task"),
        assignee_id: z.string().optional().describe("Filter by assignee UUID"),
        sprint_id: z.string().optional().describe("Filter by sprint UUID"),
        product_id: z.string().optional().describe("Filter by product UUID"),
        search: z.string().optional().describe("Search in title, description, and identifier (e.g. 'LGZ-79')"),
        page: z.number().optional().describe("Page number (default 1)"),
        per_page: z.number().optional().describe("Items per page (default 50, max 100)"),
      }),
    },
    ({ project_id, status, priority, type, assignee_id, sprint_id, product_id, search, page, per_page }) =>
      run(async () => {
        // Backend uses skip/limit (not page/per_page) and status_filter (not status)
        const limit = per_page ?? 50;
        const skip = ((page ?? 1) - 1) * limit;
        const data = await client.get<any>(`/projects/${project_id}/tasks`, {
          status_filter: status,
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
      description:
        "Create a new task in a project. Returns the created task with auto-generated identifier.",
      inputSchema: z.object({
        project_id: z.string().describe("Project UUID"),
        title: z.string().describe("Task title (1-500 chars)"),
        description: z.string().optional().describe("Task description (Markdown)"),
        status: z.string().optional().describe("Status: backlog, todo, in_progress, in_review, blocked, done, cancelled (default: backlog)"),
        priority: z.string().optional().describe("Priority: none, low, medium, high, urgent (default: none)"),
        type: z.string().optional().describe("Type: epic, story, task, bug, sub_task (default: task)"),
        story_points: z.number().optional().describe("Story points (0-100)"),
        estimate_hours: z.number().optional().describe("Estimated hours"),
        due_date: z.string().optional().describe("Due date (ISO 8601)"),
        labels: z.array(z.string()).optional().describe("Labels from workspace registry. Standard: backend, frontend, database, infrastructure, api, mobile, security, performance, tech-debt, ux, a11y, seo, observability, needs-design, needs-discussion, billing, auth, websocket, integration, analytics, kb, audit, search. Do NOT invent new labels."),
        assignee_id: z.string().optional().describe("Assignee user UUID"),
        parent_id: z.string().optional().describe("Parent task UUID (for sub-tasks)"),
        product_id: z.string().optional().describe("Product UUID"),
        sprint_id: z.string().optional().describe("Sprint UUID to add task to"),
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
      description: "Update task fields. Only provided fields are changed.",
      inputSchema: z.object({
        project_id: z.string().describe("Project UUID"),
        task_id: z.string().describe("Task UUID"),
        title: z.string().optional().describe("New title"),
        description: z.string().optional().describe("New description (Markdown)"),
        status: z.string().optional().describe("New status"),
        priority: z.string().optional().describe("New priority"),
        type: z.string().optional().describe("New type"),
        story_points: z.number().optional().describe("Story points"),
        estimate_hours: z.number().optional().describe("Estimated hours"),
        actual_hours: z.number().optional().describe("Actual hours spent"),
        due_date: z.string().optional().describe("Due date (ISO 8601)"),
        labels: z.array(z.string()).optional().describe("Labels from workspace registry (replaces existing). Use only standard labels, do NOT invent new ones."),
        assignee_id: z.string().optional().describe("Assignee UUID (empty string to unassign)"),
        sprint_id: z.string().optional().describe("Sprint UUID"),
        product_id: z.string().optional().describe("Product UUID"),
        sort_order: z.number().optional().describe("Sort order in board/list"),
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
      description: "Create multiple tasks at once (max 50). Each task must have at least a title.",
      inputSchema: z.object({
        project_id: z.string().describe("Project UUID"),
        tasks: z.array(z.object({
          title: z.string(),
          description: z.string().optional(),
          status: z.string().optional(),
          priority: z.string().optional(),
          type: z.string().optional(),
          story_points: z.number().optional(),
          estimate_hours: z.number().optional(),
          labels: z.array(z.string()).optional().describe("Labels from workspace registry only"),
          assignee_id: z.string().optional(),
          product_id: z.string().optional(),
        })).describe("Array of tasks to create (max 50)"),
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
