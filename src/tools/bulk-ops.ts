import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ApiClient } from "../client.js";
import { ok, run } from "../format.js";

export function registerBulkOpsTools(server: McpServer, client: ApiClient) {
  server.registerTool(
    "mono_bulk_close_sprint_reviews",
    {
      description:
        "Close all in_review tasks of a sprint (in_review → done). " +
        "Use ONLY after explicit user confirmation. " +
        "Pass dry_run=true first to preview the affected tasks.",
      inputSchema: z.object({
        project_id: z.string().describe("Project UUID"),
        sprint_id: z.string().describe("Sprint UUID"),
        dry_run: z
          .boolean()
          .optional()
          .describe("If true, return matching tasks without updating. Default false."),
      }),
    },
    ({ project_id, sprint_id, dry_run }) =>
      run(async () => {
        const sprint = await client.get<any>(
          `/projects/${project_id}/sprints/${sprint_id}`,
        );
        const sprintData = sprint.data || sprint;
        const tasks: any[] = sprintData.tasks || [];
        const inReview = tasks.filter((t) => t.status === "in_review");

        if (inReview.length === 0) {
          return ok(`No in_review tasks in sprint ${sprint_id}.`);
        }

        const preview = inReview
          .map((t) => `  • ${t.identifier ?? t.id}: ${t.title}`)
          .join("\n");

        if (dry_run) {
          return ok(
            `[dry_run] Would close ${inReview.length} task(s):\n${preview}`,
          );
        }

        const results: { id: string; identifier?: string; ok: boolean; error?: string }[] = [];
        for (const t of inReview) {
          try {
            await client.patch<any>(`/projects/${project_id}/tasks/${t.id}`, {
              status: "done",
            });
            results.push({ id: t.id, identifier: t.identifier, ok: true });
          } catch (err) {
            results.push({
              id: t.id,
              identifier: t.identifier,
              ok: false,
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }

        const closed = results.filter((r) => r.ok);
        const failed = results.filter((r) => !r.ok);
        let out = `Closed ${closed.length}/${inReview.length} in_review tasks.\n`;
        out += closed.map((r) => `  ✓ ${r.identifier ?? r.id}`).join("\n");
        if (failed.length) {
          out += "\nFailed:\n";
          out += failed
            .map((r) => `  ✗ ${r.identifier ?? r.id}: ${r.error}`)
            .join("\n");
        }
        return ok(out);
      }),
  );
}
