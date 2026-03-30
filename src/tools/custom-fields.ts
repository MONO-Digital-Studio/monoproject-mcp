import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ApiClient } from "../client.js";
import { ok, run, formatCustomField, formatList } from "../format.js";

export function registerCustomFieldTools(server: McpServer, client: ApiClient) {
  server.registerTool(
    "mono_list_custom_fields",
    {
      description: "List custom field definitions for a project (text, number, select, date, checkbox, etc.)",
      inputSchema: z.object({
        project_id: z.string().describe("Project UUID"),
      }),
    },
    ({ project_id }) =>
      run(async () => {
        const data = await client.get<any>(`/projects/${project_id}/custom-fields`);
        const fields = data.data || data;
        return ok(formatList(Array.isArray(fields) ? fields : [], formatCustomField, "custom fields"));
      }),
  );

  server.registerTool(
    "mono_create_custom_field",
    {
      description: "Create a custom field definition for a project",
      inputSchema: z.object({
        project_id: z.string().describe("Project UUID"),
        name: z.string().describe("Field name"),
        description: z.string().optional(),
        field_type: z.string().describe("Type: text, number, select, multi_select, date, checkbox, url"),
        is_required: z.boolean().optional().describe("Whether the field is required (default false)"),
        options: z.array(z.object({
          label: z.string(),
          value: z.string(),
          color: z.string().optional(),
        })).optional().describe("Options for select/multi_select fields"),
      }),
    },
    ({ project_id, ...body }) =>
      run(async () => {
        const data = await client.post<any>(`/projects/${project_id}/custom-fields`, body);
        const f = data.data || data;
        return ok(`Custom field created:\n${formatCustomField(f)}`);
      }),
  );

  server.registerTool(
    "mono_delete_custom_field",
    {
      description: "Delete a custom field definition and all its values across tasks",
      inputSchema: z.object({
        project_id: z.string().describe("Project UUID"),
        field_id: z.string().describe("Custom field definition UUID"),
      }),
    },
    ({ project_id, field_id }) =>
      run(async () => {
        await client.delete(`/projects/${project_id}/custom-fields/${field_id}`);
        return ok(`Custom field ${field_id} deleted.`);
      }),
  );

  server.registerTool(
    "mono_get_task_custom_fields",
    {
      description: "Get all custom field values for a specific task",
      inputSchema: z.object({
        task_id: z.string().describe("Task UUID"),
      }),
    },
    ({ task_id }) =>
      run(async () => {
        const data = await client.get<any>(`/tasks/${task_id}/custom-fields`);
        const fields = data.data || data;
        if (!Array.isArray(fields) || !fields.length) return ok("No custom field values set for this task.");
        const lines = fields.map((f: any) =>
          `${f.field_name} (${f.field_type}): ${f.value ?? "—"}`,
        );
        return ok(`Custom field values:\n${lines.join("\n")}`);
      }),
  );

  server.registerTool(
    "mono_set_task_custom_fields",
    {
      description: "Set custom field values for a task. Provide field_definition_id and value pairs.",
      inputSchema: z.object({
        task_id: z.string().describe("Task UUID"),
        fields: z.array(z.object({
          field_definition_id: z.string().describe("Custom field definition UUID"),
          value: z.any().describe("Field value (type depends on field_type)"),
        })).describe("Array of {field_definition_id, value} pairs"),
      }),
    },
    ({ task_id, fields }) =>
      run(async () => {
        await client.put(`/tasks/${task_id}/custom-fields`, fields);
        return ok(`Set ${fields.length} custom field value(s) on task ${task_id}.`);
      }),
  );
}
