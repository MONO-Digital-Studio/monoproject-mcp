import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ApiClient } from "../client.js";
import { ok, run, formatList } from "../format.js";

/* eslint-disable @typescript-eslint/no-explicit-any */

function formatDependency(d: any): string {
  return [
    `${d.source_task_id} -[${d.kind}]-> ${d.target_task_id}`,
    `  ID: ${d.id}`,
  ].join("\n");
}

export function registerDependencyTools(server: McpServer, client: ApiClient) {
  server.registerTool(
    "mono_list_task_dependencies",
    {
      description:
        "List all dependencies where the task is either source or target. " +
        "Returns both outgoing (this task → other) and incoming (other → this task).",
      inputSchema: z.object({
        task_id: z.string().describe("Task UUID"),
      }),
    },
    ({ task_id }) =>
      run(async () => {
        const data = await client.get<any>(`/tasks/${task_id}/dependencies`);
        const items: any[] = data.data || data || [];
        return ok(
          formatList(
            Array.isArray(items) ? items : [items],
            formatDependency,
            "dependencies",
          ),
        );
      }),
  );

  server.registerTool(
    "mono_link_dependency",
    {
      description:
        "Create a directed dependency from source_task → target_task. " +
        "kind: blocks (target waits for source) | relates | duplicates. " +
        "Self-loop is rejected with 422; duplicate (source, target, kind) returns 409.",
      inputSchema: z.object({
        task_id: z.string().describe("Source task UUID"),
        target_task_id: z.string().describe("Target task UUID"),
        kind: z
          .enum(["blocks", "relates", "duplicates"])
          .optional()
          .describe("Default 'relates'"),
      }),
    },
    ({ task_id, target_task_id, kind }) =>
      run(async () => {
        const payload: Record<string, unknown> = { target_task_id };
        if (kind) payload.kind = kind;
        const data = await client.post<any>(
          `/tasks/${task_id}/dependencies`,
          payload,
        );
        const dep = data.data || data;
        return ok(`Dependency linked:\n${formatDependency(dep)}`);
      }),
  );

  server.registerTool(
    "mono_unlink_dependency",
    {
      description: "Remove a dependency by id. The dependency must reference task_id.",
      inputSchema: z.object({
        task_id: z.string().describe("Task UUID (source or target of the dependency)"),
        dep_id: z.string().describe("Dependency UUID"),
      }),
    },
    ({ task_id, dep_id }) =>
      run(async () => {
        await client.delete(`/tasks/${task_id}/dependencies/${dep_id}`);
        return ok(`Dependency ${dep_id} removed.`);
      }),
  );
}
