import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ApiClient } from "../client.js";
import { ok, run, formatTemplate, formatList, formatTask } from "../format.js";

export function registerTaskTemplateTools(server: McpServer, client: ApiClient) {
  server.registerTool(
    "mono_list_task_templates",
    {
      description: "List task templates for a project",
      inputSchema: z.object({
        project_id: z.string().describe("Project UUID"),
      }),
    },
    ({ project_id }) =>
      run(async () => {
        const data = await client.get<any>(`/projects/${project_id}/task-templates`);
        const templates = data.data || data;
        return ok(formatList(Array.isArray(templates) ? templates : [], formatTemplate, "templates"));
      }),
  );

  server.registerTool(
    "mono_create_task_template",
    {
      description: "Create a reusable task template with default values",
      inputSchema: z.object({
        project_id: z.string().describe("Project UUID"),
        name: z.string().describe("Template name (unique per project)"),
        description: z.string().optional().describe("Default task description"),
        type: z.enum(["epic", "story", "task", "bug"]).optional().describe("Default type: epic, story, task, bug"),
        priority: z.string().optional().describe("Default priority: none, low, medium, high, urgent"),
        story_points: z.number().optional().describe("Default story points"),
        estimate_hours: z.number().optional().describe("Default estimate hours"),
        labels: z.array(z.string()).optional().describe("Default labels"),
        assignee_id: z.string().optional().describe("Default assignee UUID"),
        product_id: z.string().optional().describe("Default product UUID"),
      }),
    },
    ({ project_id, ...body }) =>
      run(async () => {
        const data = await client.post<any>(`/projects/${project_id}/task-templates`, body);
        const t = data.data || data;
        return ok(`Template created:\n${formatTemplate(t)}`);
      }),
  );

  server.registerTool(
    "mono_delete_task_template",
    {
      description: "Delete a task template",
      inputSchema: z.object({
        project_id: z.string().describe("Project UUID"),
        template_id: z.string().describe("Template UUID"),
      }),
    },
    ({ project_id, template_id }) =>
      run(async () => {
        await client.delete(`/projects/${project_id}/task-templates/${template_id}`);
        return ok(`Template ${template_id} deleted.`);
      }),
  );

  server.registerTool(
    "mono_apply_task_template",
    {
      description: "Create a task from a template. Provide a title and optionally override default values.",
      inputSchema: z.object({
        project_id: z.string().describe("Project UUID"),
        template_id: z.string().describe("Template UUID"),
        title: z.string().describe("Task title (required)"),
        description: z.string().optional().describe("Override template description"),
        type: z.string().optional().describe("Override type"),
        priority: z.string().optional().describe("Override priority"),
        story_points: z.number().optional().describe("Override story points"),
        assignee_id: z.string().optional().describe("Override assignee"),
      }),
    },
    ({ project_id, template_id, ...body }) =>
      run(async () => {
        const data = await client.post<any>(
          `/projects/${project_id}/task-templates/${template_id}/apply`,
          body,
        );
        const task = data.data || data;
        return ok(`Task created from template:\n${formatTask(task)}`);
      }),
  );
}
