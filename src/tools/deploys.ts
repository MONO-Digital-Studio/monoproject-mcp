import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ApiClient } from "../client.js";
import { ok, run, formatList } from "../format.js";

/* eslint-disable @typescript-eslint/no-explicit-any */

function formatDeploy(d: any): string {
  const parts = [
    `${d.repository} run=${d.run_id}${d.conclusion ? ` [${d.conclusion}]` : ""}`,
    `  ID: ${d.id}`,
  ];
  if (d.workflow_name) parts.push(`  Workflow: ${d.workflow_name}`);
  if (d.environment) parts.push(`  Env: ${d.environment}`);
  if (d.head_sha) parts.push(`  SHA: ${d.head_sha.slice(0, 8)}`);
  if (d.run_url) parts.push(`  URL: ${d.run_url}`);
  if (d.started_at) parts.push(`  Started: ${d.started_at}`);
  if (d.completed_at) parts.push(`  Completed: ${d.completed_at}`);
  return parts.join("\n");
}

/** Parse a GitHub Actions run URL into {owner, repo, run_id} or null. */
function parseRunUrl(url: string): { repository: string; run_id: number } | null {
  // https://github.com/{owner}/{repo}/actions/runs/{id}[/job/...]
  const m = url.match(/github\.com\/([^/]+)\/([^/]+)\/actions\/runs\/(\d+)/);
  if (!m) return null;
  const repository = `${m[1]}/${m[2]}`;
  const run_id = Number(m[3]);
  if (!Number.isFinite(run_id)) return null;
  return { repository, run_id };
}

export function registerDeployTools(server: McpServer, client: ApiClient) {
  server.registerTool(
    "mono_list_task_deploys",
    {
      description: "List GitHub Actions deploys linked to a task.",
      inputSchema: z.object({
        task_id: z.string().describe("Task UUID"),
      }),
    },
    ({ task_id }) =>
      run(async () => {
        const data = await client.get<any>(`/tasks/${task_id}/deploys`);
        const items: any[] = data.data || data || [];
        return ok(
          formatList(
            Array.isArray(items) ? items : [items],
            formatDeploy,
            "deploys",
          ),
        );
      }),
  );

  server.registerTool(
    "mono_log_deploy",
    {
      description:
        "Manually log a GitHub Actions deploy for a task. Pass either run_url " +
        "(repository + run_id are auto-parsed from the URL) or repository + run_id directly. " +
        "Idempotent on (task_id, run_id).",
      inputSchema: z.object({
        task_id: z.string().describe("Task UUID"),
        run_url: z
          .string()
          .optional()
          .describe(
            "Full Actions run URL, e.g. https://github.com/owner/repo/actions/runs/12345",
          ),
        repository: z
          .string()
          .optional()
          .describe("owner/repo (omit if run_url is given)"),
        run_id: z.number().optional().describe("Workflow run id (omit if run_url is given)"),
        workflow_name: z.string().optional(),
        environment: z.string().optional().describe("e.g. production, staging"),
        conclusion: z
          .string()
          .optional()
          .describe("success | failure | cancelled | skipped | timed_out"),
        head_sha: z.string().optional(),
        started_at: z.string().optional().describe("ISO 8601"),
        completed_at: z.string().optional().describe("ISO 8601"),
      }),
    },
    ({ task_id, run_url, repository, run_id, ...rest }) =>
      run(async () => {
        let resolvedRepo = repository;
        let resolvedRunId = run_id;
        let resolvedUrl = run_url;

        if (run_url && (!resolvedRepo || resolvedRunId === undefined)) {
          const parsed = parseRunUrl(run_url);
          if (!parsed) {
            throw new Error(
              "run_url does not match the expected GitHub Actions run URL pattern",
            );
          }
          resolvedRepo = resolvedRepo ?? parsed.repository;
          resolvedRunId = resolvedRunId ?? parsed.run_id;
        }

        if (!resolvedRepo || resolvedRunId === undefined) {
          throw new Error(
            "Either run_url or both repository + run_id must be provided",
          );
        }

        const payload = Object.fromEntries(
          Object.entries({
            repository: resolvedRepo,
            run_id: resolvedRunId,
            run_url: resolvedUrl,
            ...rest,
          }).filter(([, v]) => v !== undefined),
        );
        const data = await client.post<any>(`/tasks/${task_id}/deploys`, payload);
        const d = data.data || data;
        return ok(`Deploy logged:\n${formatDeploy(d)}`);
      }),
  );
}
