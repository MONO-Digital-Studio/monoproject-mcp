import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ApiClient } from "../client.js";
import { ok, run, formatCommit } from "../format.js";

export function registerCommitTools(server: McpServer, client: ApiClient) {
  server.registerTool(
    "mono_link_commit",
    {
      description:
        "Link a git commit to a task manually. Use when auto-linking did not pick up the commit " +
        "(e.g. commit message missing task identifier). Requires at least hash and message.",
      inputSchema: z.object({
        task_id: z.string().describe("Task UUID"),
        hash: z.string().describe("Full or short commit SHA hash"),
        message: z.string().describe("Commit message (first line)"),
        repository: z.string().optional().describe("Repository full name (e.g. Planometrica/planometrica-studio)"),
        branch: z.string().optional().describe("Branch name"),
        author: z.string().optional().describe("Commit author name"),
        committed_at: z.string().optional().describe("Commit date (ISO 8601)"),
      }),
    },
    ({ task_id, hash, message, repository, branch, author, committed_at }) =>
      run(async () => {
        const data = await client.post<any>(`/tasks/${task_id}/commits`, {
          hash,
          message,
          repository,
          branch,
          author,
          committed_at,
        });
        const c = data.data || data;
        return ok(`Commit linked to task:\n  ${formatCommit(c)}`);
      }),
  );

  server.registerTool(
    "mono_list_commits",
    {
      description: "List all commits linked to a task.",
      inputSchema: z.object({
        task_id: z.string().describe("Task UUID"),
      }),
    },
    ({ task_id }) =>
      run(async () => {
        const data = await client.get<any>(`/tasks/${task_id}/commits`);
        const commits: any[] = Array.isArray(data) ? data : data.data || [];
        if (commits.length === 0) return ok("No commits linked to this task.");
        return ok(
          `${commits.length} commit(s):\n` + commits.map((c: any) => `• ${formatCommit(c)}`).join("\n"),
        );
      }),
  );
}
