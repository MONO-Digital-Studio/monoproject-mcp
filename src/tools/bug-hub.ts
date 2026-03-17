import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ApiClient } from "../client.js";
import { ok, run, formatIncident, formatList } from "../format.js";

export function registerBugHubTools(server: McpServer, client: ApiClient) {
  server.registerTool(
    "mono_list_incidents",
    {
      description: "List Bug Hub incidents with optional filters (source, severity, status, project, search)",
      inputSchema: z.object({
        source: z.string().optional().describe("Filter: sentry, grafana, manual"),
        severity: z.string().optional().describe("Filter: low, medium, high, critical"),
        status: z.string().optional().describe("Filter: new, investigating, task_created, resolved, dismissed"),
        project_id: z.string().optional().describe("Filter by project UUID"),
        search: z.string().optional().describe("Search in title/description"),
        page: z.number().optional(),
        per_page: z.number().optional(),
      }),
    },
    (params) =>
      run(async () => {
        const data = await client.get<any>(`${client.ws()}/bug-hub/incidents`, params);
        const incidents = data.items || data.data || data;
        return ok(formatList(Array.isArray(incidents) ? incidents : [], formatIncident, "incidents", data.total));
      }),
  );

  server.registerTool(
    "mono_get_incident",
    {
      description: "Get full incident details",
      inputSchema: z.object({
        incident_id: z.string().describe("Incident UUID"),
      }),
    },
    ({ incident_id }) =>
      run(async () => {
        const data = await client.get<any>(`${client.ws()}/bug-hub/incidents/${incident_id}`);
        const inc = data.data || data;
        return ok(JSON.stringify(inc, null, 2));
      }),
  );

  server.registerTool(
    "mono_create_incident",
    {
      description: "Create a manual Bug Hub incident",
      inputSchema: z.object({
        title: z.string().describe("Incident title"),
        description: z.string().optional().describe("Incident description"),
        severity: z.string().optional().describe("low, medium, high, critical (default: medium)"),
        source: z.string().optional().describe("Source (default: manual)"),
      }),
    },
    (body) =>
      run(async () => {
        const data = await client.post<any>(`${client.ws()}/bug-hub/incidents`, body);
        const inc = data.data || data;
        return ok(`Incident created:\n${formatIncident(inc)}`);
      }),
  );

  server.registerTool(
    "mono_update_incident",
    {
      description: "Update incident status, severity, or assignee",
      inputSchema: z.object({
        incident_id: z.string().describe("Incident UUID"),
        status: z.string().optional().describe("open, in_progress, resolved, dismissed"),
        severity: z.string().optional().describe("low, medium, high, critical"),
        assignee_id: z.string().optional().describe("Assignee user UUID"),
      }),
    },
    ({ incident_id, ...body }) =>
      run(async () => {
        const payload = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined));
        const data = await client.patch<any>(`${client.ws()}/bug-hub/incidents/${incident_id}`, payload);
        const inc = data.data || data;
        return ok(`Incident updated:\n${formatIncident(inc)}`);
      }),
  );

  server.registerTool(
    "mono_delete_incident",
    {
      description: "Delete a Bug Hub incident",
      inputSchema: z.object({
        incident_id: z.string().describe("Incident UUID"),
      }),
    },
    ({ incident_id }) =>
      run(async () => {
        await client.delete(`${client.ws()}/bug-hub/incidents/${incident_id}`);
        return ok(`Incident ${incident_id} deleted.`);
      }),
  );

  server.registerTool(
    "mono_create_task_from_incident",
    {
      description: "Create a task linked to a Bug Hub incident. Requires project_id to place the task.",
      inputSchema: z.object({
        incident_id: z.string().describe("Incident UUID"),
        project_id: z.string().describe("Project UUID to create the task in"),
      }),
    },
    ({ incident_id, project_id }) =>
      run(async () => {
        const data = await client.post<any>(
          `${client.ws()}/bug-hub/incidents/${incident_id}/create-task`,
          { project_id },
        );
        const task = data.data || data;
        return ok(`Task created from incident: ${task.task_identifier || task.identifier || task.id} (${task.incident_status || "linked"})`);
      }),
  );

  server.registerTool(
    "mono_get_bug_hub_stats",
    {
      description: "Get Bug Hub statistics -- breakdown by severity, source, status",
      inputSchema: z.object({}),
    },
    () =>
      run(async () => {
        const data = await client.get<any>(`${client.ws()}/bug-hub/stats`);
        return ok(JSON.stringify(data.data || data, null, 2));
      }),
  );

  server.registerTool(
    "mono_sync_sentry",
    {
      description: "Manually trigger Sentry API polling to import new issues as incidents",
      inputSchema: z.object({}),
    },
    () =>
      run(async () => {
        const data = await client.post<any>(`${client.ws()}/bug-hub/sync-sentry`);
        return ok(`Sentry sync completed. ${JSON.stringify(data.data || data)}`);
      }),
  );
}
