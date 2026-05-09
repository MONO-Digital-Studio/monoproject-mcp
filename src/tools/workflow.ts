import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ApiClient } from "../client.js";
import { ok, run, formatTask } from "../format.js";

/* eslint-disable @typescript-eslint/no-explicit-any */

export function registerWorkflowTools(server: McpServer, client: ApiClient) {
  server.registerTool(
    "mono_advance",
    {
      description:
        "Transition a task to a new status with workflow guards. " +
        "When the workspace has enforce_workflow_guards=true, in_review → done " +
        "requires a merged PR or a successful deploy linked to the task. " +
        "Pass force=true to bypass. Returns 422 with a descriptive message on reject.",
      inputSchema: z.object({
        project_id: z.string().describe("Project UUID"),
        task_id: z.string().describe("Task UUID"),
        target: z
          .enum([
            "backlog",
            "todo",
            "in_progress",
            "in_review",
            "blocked",
            "done",
            "cancelled",
          ])
          .describe("Target status"),
        force: z
          .boolean()
          .optional()
          .describe("Bypass workflow guards (only effective when guards are enforced)."),
      }),
    },
    ({ project_id, task_id, target, force }) =>
      run(async () => {
        const query = force ? "?force=true" : "";
        const data = await client.patch<any>(
          `/projects/${project_id}/tasks/${task_id}${query}`,
          { status: target },
        );
        const t = data.data || data;
        return ok(`Status advanced:\n${formatTask(t)}`);
      }),
  );
}
