import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ApiClient } from "../client.js";
import { ok, run } from "../format.js";

function formatDoc(d: any): string {
  const parts = [
    `${d.type === "folder" ? "📁" : "📄"} ${d.title} [${d.type}]`,
    `  ID: ${d.id}`,
    `  Slug: ${d.slug}`,
  ];
  if (d.parent_id) parts.push(`  Parent: ${d.parent_id}`);
  if (d.frontmatter?.tags?.length) parts.push(`  Tags: ${d.frontmatter.tags.join(", ")}`);
  if (d.frontmatter?.status) parts.push(`  Status: ${d.frontmatter.status}`);
  if (d.updated_at) parts.push(`  Updated: ${d.updated_at}`);
  return parts.join("\n");
}

export function registerKnowledgeTools(server: McpServer, client: ApiClient) {
  // ─── Tree ───────────────────────────────────────────────────────

  server.registerTool(
    "mono_list_docs",
    {
      description: "List all Knowledge Base documents and folders for a project (tree structure)",
      inputSchema: z.object({
        project_id: z.string().describe("Project UUID"),
      }),
    },
    ({ project_id }) =>
      run(async () => {
        const data = await client.get<any>(`/projects/${project_id}/docs`);
        const items = data.items || data.data?.items || [];
        const total = data.total ?? items.length;
        if (!items.length) return ok("No documents in this project.");

        const lines = items.map((d: any) => {
          const indent = "  ";
          const icon = d.type === "folder" ? "📁" : "📄";
          return `${indent}${icon} ${d.title} (${d.id})`;
        });

        return ok(`Knowledge Base (${total} documents):\n${lines.join("\n")}`);
      }),
  );

  // ─── Read ───────────────────────────────────────────────────────

  server.registerTool(
    "mono_get_doc",
    {
      description: "Get a Knowledge Base document with full content",
      inputSchema: z.object({
        project_id: z.string().describe("Project UUID"),
        document_id: z.string().describe("Document UUID"),
      }),
    },
    ({ project_id, document_id }) =>
      run(async () => {
        const d = await client.get<any>(`/projects/${project_id}/docs/${document_id}`);
        const doc = d.data || d;
        const parts = [formatDoc(doc)];
        if (doc.content) {
          parts.push(`\n--- Content ---\n${doc.content}`);
        }
        return ok(parts.join("\n"));
      }),
  );

  // ─── Create ─────────────────────────────────────────────────────

  server.registerTool(
    "mono_create_doc",
    {
      description: "Create a Knowledge Base document or folder in a project",
      inputSchema: z.object({
        project_id: z.string().describe("Project UUID"),
        title: z.string().describe("Document or folder title"),
        type: z.enum(["document", "folder"]).default("document").describe("Type: document or folder"),
        parent_id: z.string().optional().describe("Parent folder UUID (null = root)"),
        content: z.string().optional().describe("Markdown content (documents only)"),
        frontmatter: z.record(z.any()).optional().describe("Metadata: {tags: [], status: 'draft'}"),
      }),
    },
    (body) =>
      run(async () => {
        const data = await client.post<any>(`/projects/${body.project_id}/docs`, {
          title: body.title,
          type: body.type,
          parent_id: body.parent_id || null,
          content: body.content || null,
          frontmatter: body.frontmatter || null,
        });
        const doc = data.data || data;
        return ok(`Document created:\n${formatDoc(doc)}`);
      }),
  );

  // ─── Update ─────────────────────────────────────────────────────

  server.registerTool(
    "mono_update_doc",
    {
      description: "Update a Knowledge Base document (title, content, frontmatter). Auto-saves version on content change.",
      inputSchema: z.object({
        project_id: z.string().describe("Project UUID"),
        document_id: z.string().describe("Document UUID"),
        title: z.string().optional().describe("New title"),
        content: z.string().optional().describe("New markdown content"),
        frontmatter: z.record(z.any()).optional().describe("New metadata"),
      }),
    },
    ({ project_id, document_id, ...body }) =>
      run(async () => {
        const patch: Record<string, any> = {};
        if (body.title !== undefined) patch.title = body.title;
        if (body.content !== undefined) patch.content = body.content;
        if (body.frontmatter !== undefined) patch.frontmatter = body.frontmatter;

        const data = await client.patch<any>(`/projects/${project_id}/docs/${document_id}`, patch);
        const doc = data.data || data;
        return ok(`Document updated:\n${formatDoc(doc)}`);
      }),
  );

  // ─── Delete ─────────────────────────────────────────────────────

  server.registerTool(
    "mono_delete_doc",
    {
      description: "Delete a Knowledge Base document or folder (cascades to children)",
      inputSchema: z.object({
        project_id: z.string().describe("Project UUID"),
        document_id: z.string().describe("Document UUID"),
      }),
    },
    ({ project_id, document_id }) =>
      run(async () => {
        await client.delete(`/projects/${project_id}/docs/${document_id}`);
        return ok(`Document ${document_id} deleted.`);
      }),
  );

  // ─── Search ─────────────────────────────────────────────────────

  server.registerTool(
    "mono_search_docs",
    {
      description: "Full-text search across Knowledge Base documents in a project",
      inputSchema: z.object({
        project_id: z.string().describe("Project UUID"),
        query: z.string().describe("Search query"),
        limit: z.number().optional().default(10).describe("Max results (default 10)"),
      }),
    },
    ({ project_id, query, limit }) =>
      run(async () => {
        const params = `q=${encodeURIComponent(query)}&limit=${limit || 10}`;
        const data = await client.post<any>(`/projects/${project_id}/docs/search?${params}`);
        const result = data.data || data;
        const hits = result.hits || [];
        if (!hits.length) return ok(`No documents matching "${query}".`);

        const lines = hits.map((h: any) =>
          `• ${h.title} (${h.id})${h._formatted?.content ? "\n  " + h._formatted.content : ""}`,
        );
        return ok(`Found ${result.total || hits.length} document(s):\n${lines.join("\n")}`);
      }),
  );
}
