import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ApiClient } from "../client.js";
import { ok, run, formatList } from "../format.js";

/* eslint-disable @typescript-eslint/no-explicit-any */

function formatPullRequest(pr: any): string {
  const parts = [
    `${pr.repository}#${pr.pr_number} [${pr.state}] ${pr.title}`,
    `  ID: ${pr.id}`,
  ];
  if (pr.html_url) parts.push(`  URL: ${pr.html_url}`);
  if (pr.author) parts.push(`  Author: ${pr.author}`);
  if (pr.opened_at) parts.push(`  Opened: ${pr.opened_at}`);
  if (pr.merged_at) parts.push(`  Merged: ${pr.merged_at}`);
  if (pr.closed_at) parts.push(`  Closed: ${pr.closed_at}`);
  return parts.join("\n");
}

export function registerPullRequestTools(server: McpServer, client: ApiClient) {
  server.registerTool(
    "mono_list_task_pull_requests",
    {
      description: "List GitHub pull requests linked to a task.",
      inputSchema: z.object({
        task_id: z.string().describe("Task UUID"),
      }),
    },
    ({ task_id }) =>
      run(async () => {
        const data = await client.get<any>(`/tasks/${task_id}/pull-requests`);
        const items: any[] = data.data || data || [];
        return ok(
          formatList(
            Array.isArray(items) ? items : [items],
            formatPullRequest,
            "pull requests",
          ),
        );
      }),
  );

  server.registerTool(
    "mono_link_pull_request",
    {
      description:
        "Manually link a GitHub pull request to a task. Idempotent on " +
        "(task_id, repository, pr_number). Auto-link runs separately when " +
        "a task transitions to in_review.",
      inputSchema: z.object({
        task_id: z.string().describe("Task UUID"),
        repository: z.string().describe("owner/repo, e.g. MONO-Digital-Studio/MONOProject"),
        pr_number: z.number().describe("Pull request number"),
        title: z.string().describe("Pull request title"),
        state: z.string().describe("open|closed|merged"),
        html_url: z.string().optional(),
        author: z.string().optional(),
        opened_at: z.string().optional().describe("ISO 8601"),
        merged_at: z.string().optional().describe("ISO 8601"),
        closed_at: z.string().optional().describe("ISO 8601"),
      }),
    },
    ({ task_id, ...body }) =>
      run(async () => {
        const payload = Object.fromEntries(
          Object.entries(body).filter(([, v]) => v !== undefined),
        );
        const data = await client.post<any>(
          `/tasks/${task_id}/pull-requests`,
          payload,
        );
        const pr = data.data || data;
        return ok(`Pull request linked:\n${formatPullRequest(pr)}`);
      }),
  );
}
