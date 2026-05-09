import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ApiClient } from "../client.js";
import { ok, run, formatSprint, formatTaskList } from "../format.js";

/* eslint-disable @typescript-eslint/no-explicit-any */

export function registerSessionTools(server: McpServer, client: ApiClient) {
  server.registerTool(
    "mono_session_start",
    {
      description:
        "Aggregate session bootstrap snapshot for a project: active sprint, " +
        "current in_progress / in_review / todo tasks, and high-level counters. " +
        "Replaces the usual sequence of list_tasks + list_sprints + get_project_summary calls.",
      inputSchema: z.object({
        project_id: z.string().describe("Project UUID"),
        per_status_limit: z
          .number()
          .optional()
          .describe("Max tasks to return per status. Default 10, max 50."),
      }),
    },
    ({ project_id, per_status_limit }) =>
      run(async () => {
        const limit = Math.min(per_status_limit ?? 10, 50);

        const [summary, sprints, inProgress, inReview, todo] = await Promise.all([
          client.get<any>(`/projects/${project_id}/summary`).catch(() => null),
          client
            .get<any>(`/projects/${project_id}/sprints`, { status: "active" })
            .catch(() => ({ data: [] })),
          client.get<any>(`/projects/${project_id}/tasks`, {
            status: "in_progress",
            limit,
            skip: 0,
          }),
          client.get<any>(`/projects/${project_id}/tasks`, {
            status: "in_review",
            limit,
            skip: 0,
          }),
          client.get<any>(`/projects/${project_id}/tasks`, {
            status: "todo",
            limit,
            skip: 0,
          }),
        ]);

        const sprintList: any[] = sprints.data || sprints || [];
        const activeSprint = Array.isArray(sprintList)
          ? sprintList.find((s) => s.status === "active") ?? sprintList[0]
          : null;

        const out: string[] = [];

        if (summary) {
          const s = summary.data || summary;
          const counters: string[] = [];
          if (s.task_counts) {
            for (const [k, v] of Object.entries(s.task_counts)) counters.push(`${k}=${v}`);
          }
          out.push(`Project: ${s.name ?? project_id}`);
          if (counters.length) out.push(`  Counters: ${counters.join(", ")}`);
          if (s.team_size != null) out.push(`  Team: ${s.team_size}`);
        }

        out.push("");
        out.push("Active sprint:");
        out.push(activeSprint ? formatSprint(activeSprint) : "  (no active sprint)");

        const sections: { title: string; payload: any }[] = [
          { title: "In progress", payload: inProgress },
          { title: "In review", payload: inReview },
          { title: "Todo", payload: todo },
        ];

        for (const section of sections) {
          const tasks: any[] = section.payload.data || section.payload || [];
          const total = section.payload.total ?? tasks.length;
          out.push("");
          out.push(`${section.title} (${total}):`);
          out.push(
            Array.isArray(tasks) && tasks.length
              ? formatTaskList(tasks)
              : "  (none)",
          );
        }

        return ok(out.join("\n"));
      }),
  );
}
