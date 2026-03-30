import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ApiClient } from "../client.js";
import { ok, run, formatCommentList, formatComment } from "../format.js";

export function registerCommentTools(server: McpServer, client: ApiClient) {
  server.registerTool(
    "mono_list_comments",
    {
      description: "List all comments on a task, ordered by creation date. Includes threaded replies.",
      inputSchema: z.object({
        project_id: z.string().describe("Project UUID"),
        task_id: z.string().describe("Task UUID"),
      }),
    },
    ({ project_id, task_id }) =>
      run(async () => {
        const data = await client.get<any>(`/projects/${project_id}/tasks/${task_id}/comments`);
        const comments = Array.isArray(data) ? data : (data.data || []);
        return ok(formatCommentList(comments));
      }),
  );

  server.registerTool(
    "mono_add_comment",
    {
      description: "Add a comment to a task. Supports @mentions (e.g. @username). Use parent_id for replies.",
      inputSchema: z.object({
        project_id: z.string().describe("Project UUID"),
        task_id: z.string().describe("Task UUID"),
        content: z.string().describe("Comment text (1-10000 chars). Use @username for mentions."),
        parent_id: z.string().optional().describe("Parent comment UUID for threaded reply"),
      }),
    },
    ({ project_id, task_id, content, parent_id }) =>
      run(async () => {
        const data = await client.post<any>(`/projects/${project_id}/tasks/${task_id}/comments`, {
          content,
          parent_id,
        });
        const c = data.data || data;
        return ok(`Comment added:\n${formatComment(c)}`);
      }),
  );

  server.registerTool(
    "mono_update_comment",
    {
      description: "Edit a comment (author-only)",
      inputSchema: z.object({
        project_id: z.string().describe("Project UUID"),
        task_id: z.string().describe("Task UUID"),
        comment_id: z.string().describe("Comment UUID"),
        content: z.string().describe("Updated comment text"),
      }),
    },
    ({ project_id, task_id, comment_id, content }) =>
      run(async () => {
        const data = await client.patch<any>(
          `/projects/${project_id}/tasks/${task_id}/comments/${comment_id}`,
          { content },
        );
        const c = data.data || data;
        return ok(`Comment updated:\n${formatComment(c)}`);
      }),
  );

  server.registerTool(
    "mono_delete_comment",
    {
      description: "Delete a comment (author-only)",
      inputSchema: z.object({
        project_id: z.string().describe("Project UUID"),
        task_id: z.string().describe("Task UUID"),
        comment_id: z.string().describe("Comment UUID"),
      }),
    },
    ({ project_id, task_id, comment_id }) =>
      run(async () => {
        await client.delete(`/projects/${project_id}/tasks/${task_id}/comments/${comment_id}`);
        return ok(`Comment ${comment_id} deleted.`);
      }),
  );
}
