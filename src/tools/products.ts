import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ApiClient } from "../client.js";
import { ok, run, formatProduct, formatList } from "../format.js";

export function registerProductTools(server: McpServer, client: ApiClient) {
  server.registerTool(
    "mono_list_products",
    {
      description: "List products (deployable units) for a project",
      inputSchema: z.object({
        project_id: z.string().describe("Project UUID"),
        status: z.string().optional().describe("Filter: active, archived"),
      }),
    },
    ({ project_id, status }) =>
      run(async () => {
        const data = await client.get<any>(`/projects/${project_id}/products`, { status });
        const products = data.data || data;
        return ok(formatList(Array.isArray(products) ? products : [], formatProduct, "products"));
      }),
  );

  server.registerTool(
    "mono_create_product",
    {
      description: "Create a product (app, service, library) within a project",
      inputSchema: z.object({
        project_id: z.string().describe("Project UUID"),
        name: z.string().describe("Product name"),
        description: z.string().optional(),
        color: z.string().optional().describe("Hex color (e.g. #6366f1)"),
        repository_url: z.string().optional().describe("Git repository URL"),
        local_path: z.string().optional().describe("Local repo path (e.g. ~/Projects/my-app)"),
        tech_stack: z.array(z.string()).optional().describe("Technologies (e.g. ['React', 'TypeScript'])"),
      }),
    },
    ({ project_id, ...body }) =>
      run(async () => {
        const data = await client.post<any>(`/projects/${project_id}/products`, body);
        const p = data.data || data;
        return ok(`Product created:\n${formatProduct(p)}`);
      }),
  );

  server.registerTool(
    "mono_update_product",
    {
      description: "Update product properties",
      inputSchema: z.object({
        project_id: z.string().describe("Project UUID"),
        product_id: z.string().describe("Product UUID"),
        name: z.string().optional(),
        description: z.string().optional(),
        color: z.string().optional(),
        repository_url: z.string().optional(),
        local_path: z.string().optional(),
        tech_stack: z.array(z.string()).optional(),
        status: z.string().optional().describe("active or archived"),
      }),
    },
    ({ project_id, product_id, ...body }) =>
      run(async () => {
        const payload = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined));
        const data = await client.patch<any>(`/projects/${project_id}/products/${product_id}`, payload);
        const p = data.data || data;
        return ok(`Product updated:\n${formatProduct(p)}`);
      }),
  );

  server.registerTool(
    "mono_delete_product",
    {
      description: "Delete a product from a project",
      inputSchema: z.object({
        project_id: z.string().describe("Project UUID"),
        product_id: z.string().describe("Product UUID"),
      }),
    },
    ({ project_id, product_id }) =>
      run(async () => {
        await client.delete(`/projects/${project_id}/products/${product_id}`);
        return ok(`Product ${product_id} deleted.`);
      }),
  );
}
