import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ApiClient } from "../client.js";
import { ok, run, formatFeedback, formatOpportunity, formatSpecification, formatList } from "../format.js";

export function registerPmHubTools(server: McpServer, client: ApiClient) {
  // -- Feedback --
  server.registerTool(
    "mono_list_feedback",
    {
      description: "List PM Hub feedback entries with filters",
      inputSchema: z.object({
        source: z.string().optional().describe("Filter by source (e.g. slack, email, manual)"),
        sentiment: z.string().optional().describe("Filter: positive, neutral, negative"),
        search: z.string().optional().describe("Search in title and content"),
        page: z.number().optional(),
        per_page: z.number().optional(),
      }),
    },
    (params) =>
      run(async () => {
        const data = await client.get<any>(`${client.ws()}/pm-hub/feedback`, params);
        const items = data.items || data.data || data;
        return ok(formatList(Array.isArray(items) ? items : [], formatFeedback, "feedback", data.total));
      }),
  );

  server.registerTool(
    "mono_create_feedback",
    {
      description: "Create a feedback entry in PM Hub from any source",
      inputSchema: z.object({
        title: z.string().describe("Feedback title"),
        content: z.string().optional().describe("Feedback content"),
        source: z.string().optional().describe("Source (manual, slack, email, etc.)"),
        sentiment: z.string().optional().describe("positive, neutral, negative"),
        author_name: z.string().optional().describe("Author name"),
        author_email: z.string().optional().describe("Author email"),
      }),
    },
    (body) =>
      run(async () => {
        const data = await client.post<any>(`${client.ws()}/pm-hub/feedback`, body);
        const fb = data.data || data;
        return ok(`Feedback created:\n${formatFeedback(fb)}`);
      }),
  );

  server.registerTool(
    "mono_update_feedback",
    {
      description: "Update a feedback entry",
      inputSchema: z.object({
        feedback_id: z.string().describe("Feedback UUID"),
        title: z.string().optional(),
        content: z.string().optional(),
        sentiment: z.string().optional(),
      }),
    },
    ({ feedback_id, ...body }) =>
      run(async () => {
        const payload = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined));
        const data = await client.patch<any>(`${client.ws()}/pm-hub/feedback/${feedback_id}`, payload);
        return ok(`Feedback updated:\n${formatFeedback(data.data || data)}`);
      }),
  );

  server.registerTool(
    "mono_delete_feedback",
    {
      description: "Delete a feedback entry",
      inputSchema: z.object({
        feedback_id: z.string().describe("Feedback UUID"),
      }),
    },
    ({ feedback_id }) =>
      run(async () => {
        await client.delete(`${client.ws()}/pm-hub/feedback/${feedback_id}`);
        return ok(`Feedback ${feedback_id} deleted.`);
      }),
  );

  // -- Opportunities --
  server.registerTool(
    "mono_list_opportunities",
    {
      description: "List product opportunities derived from feedback",
      inputSchema: z.object({
        status: z.string().optional().describe("Filter by status"),
        category: z.string().optional().describe("Filter by category"),
        page: z.number().optional(),
        per_page: z.number().optional(),
      }),
    },
    (params) =>
      run(async () => {
        const data = await client.get<any>(`${client.ws()}/pm-hub/opportunities`, params);
        const items = data.items || data.data || data;
        return ok(formatList(Array.isArray(items) ? items : [], formatOpportunity, "opportunities", data.total));
      }),
  );

  server.registerTool(
    "mono_create_opportunity",
    {
      description: "Create a product opportunity from feedback insights",
      inputSchema: z.object({
        title: z.string().describe("Opportunity title"),
        description: z.string().optional(),
        category: z.string().optional(),
        score: z.number().optional().describe("Priority/impact score"),
      }),
    },
    (body) =>
      run(async () => {
        const data = await client.post<any>(`${client.ws()}/pm-hub/opportunities`, body);
        return ok(`Opportunity created:\n${formatOpportunity(data.data || data)}`);
      }),
  );

  server.registerTool(
    "mono_update_opportunity",
    {
      description: "Update a product opportunity",
      inputSchema: z.object({
        opportunity_id: z.string().describe("Opportunity UUID"),
        title: z.string().optional(),
        description: z.string().optional(),
        status: z.string().optional(),
        category: z.string().optional(),
        score: z.number().optional(),
      }),
    },
    ({ opportunity_id, ...body }) =>
      run(async () => {
        const payload = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined));
        const data = await client.patch<any>(`${client.ws()}/pm-hub/opportunities/${opportunity_id}`, payload);
        return ok(`Opportunity updated:\n${formatOpportunity(data.data || data)}`);
      }),
  );

  // -- Specifications --
  server.registerTool(
    "mono_list_specifications",
    {
      description: "List product specifications",
      inputSchema: z.object({
        status: z.string().optional(),
        page: z.number().optional(),
        per_page: z.number().optional(),
      }),
    },
    (params) =>
      run(async () => {
        const data = await client.get<any>(`${client.ws()}/pm-hub/specifications`, params);
        const items = data.items || data.data || data;
        return ok(formatList(Array.isArray(items) ? items : [], formatSpecification, "specifications", data.total));
      }),
  );

  server.registerTool(
    "mono_create_specification",
    {
      description: "Create a product specification",
      inputSchema: z.object({
        title: z.string().describe("Specification title"),
        description: z.string().optional(),
        opportunity_id: z.string().optional().describe("Link to opportunity UUID"),
      }),
    },
    (body) =>
      run(async () => {
        const data = await client.post<any>(`${client.ws()}/pm-hub/specifications`, body);
        return ok(`Specification created:\n${formatSpecification(data.data || data)}`);
      }),
  );

  server.registerTool(
    "mono_generate_spec",
    {
      description: "AI-generate a specification from an opportunity. Returns a job_id for async processing.",
      inputSchema: z.object({
        opportunity_id: z.string().describe("Opportunity UUID to generate spec from"),
      }),
    },
    ({ opportunity_id }) =>
      run(async () => {
        const data = await client.post<any>(
          `${client.ws()}/pm-hub/opportunities/${opportunity_id}/generate-spec`,
        );
        return ok(`Spec generation started. Job ID: ${data.job_id || JSON.stringify(data)}`);
      }),
  );

  server.registerTool(
    "mono_decompose_spec",
    {
      description: "AI-decompose a specification into tasks. Returns a job_id for async processing.",
      inputSchema: z.object({
        spec_id: z.string().describe("Specification UUID to decompose"),
      }),
    },
    ({ spec_id }) =>
      run(async () => {
        const data = await client.post<any>(
          `${client.ws()}/pm-hub/specifications/${spec_id}/decompose`,
        );
        return ok(`Decomposition started. Job ID: ${data.job_id || JSON.stringify(data)}`);
      }),
  );

  server.registerTool(
    "mono_get_pm_hub_stats",
    {
      description: "Get PM Hub statistics overview",
      inputSchema: z.object({}),
    },
    () =>
      run(async () => {
        const data = await client.get<any>(`${client.ws()}/pm-hub/stats`);
        return ok(JSON.stringify(data.data || data, null, 2));
      }),
  );
}
