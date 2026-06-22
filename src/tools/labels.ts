import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ApiClient } from "../client.js";
import { ok, run, formatLabel, formatList } from "../format.js";

/**
 * Guardrail shared by every WRITE label tool.
 *
 * The workspace label/tag registry is curated and shared across all projects.
 * The agent must NEVER create labels on its own initiative — only when the user
 * explicitly asks for it. This note is surfaced to the model via the tool
 * description so it is enforced at decision time, not after the fact.
 */
const USER_REQUEST_ONLY =
  "⚠️ USER-REQUEST ONLY. Invoke this tool ONLY when the user explicitly asks to create a label/tag. " +
  "NEVER decide on your own to add new labels (e.g. while creating tasks or tidying up) — the workspace " +
  "label registry is curated. If a label you need is missing, ask the user first and create it only after approval.";

export function registerLabelTools(server: McpServer, client: ApiClient) {
  server.registerTool(
    "mono_list_labels",
    {
      description:
        "List the workspace label/tag registry (read-only). Use this to check which labels already exist " +
        "before assigning them to tasks or before asking the user about creating new ones.",
      inputSchema: z.object({
        group: z
          .string()
          .optional()
          .describe("Filter by group: area, nature, module, workflow"),
      }),
    },
    ({ group }) =>
      run(async () => {
        const data = await client.get<any>(`${client.ws()}/labels`, { group });
        const labels = data.data || data;
        return ok(
          formatList(
            Array.isArray(labels) ? labels : [],
            formatLabel,
            "labels",
          ),
        );
      }),
  );

  server.registerTool(
    "mono_create_label",
    {
      description:
        `Create a single workspace label/tag. ${USER_REQUEST_ONLY} ` +
        "Requires workspace admin role. Fails with 409 if a label with the same name already exists.",
      inputSchema: z.object({
        name: z
          .string()
          .describe("Label name, unique per workspace (1-50 chars)"),
        color: z
          .string()
          .optional()
          .describe("Hex color, e.g. #6366f1 (default #6b7280)"),
        group: z
          .string()
          .optional()
          .describe("Group: area, nature, module, workflow"),
        description: z
          .string()
          .optional()
          .describe("Optional description (max 200 chars)"),
      }),
    },
    (input) =>
      run(async () => {
        const payload = Object.fromEntries(
          Object.entries(input).filter(([, v]) => v !== undefined),
        );
        const data = await client.post<any>(`${client.ws()}/labels`, payload);
        const l = data.data || data;
        return ok(`Label created:\n${formatLabel(l)}`);
      }),
  );

  server.registerTool(
    "mono_bulk_create_labels",
    {
      description:
        `Create up to 50 workspace labels/tags in one call. Existing names are skipped (no error). ` +
        `${USER_REQUEST_ONLY} Requires workspace admin role.`,
      inputSchema: z.object({
        labels: z
          .array(
            z.object({
              name: z
                .string()
                .describe("Label name, unique per workspace (1-50 chars)"),
              color: z
                .string()
                .optional()
                .describe("Hex color, e.g. #6366f1 (default #6b7280)"),
              group: z
                .string()
                .optional()
                .describe("Group: area, nature, module, workflow"),
              description: z
                .string()
                .optional()
                .describe("Optional description (max 200 chars)"),
            }),
          )
          .describe("Labels to create (max 50)"),
      }),
    },
    ({ labels }) =>
      run(async () => {
        const data = await client.post<any>(`${client.ws()}/labels/bulk`, {
          labels,
        });
        const created = data.data || data;
        const arr = Array.isArray(created) ? created : [];
        return ok(
          `${arr.length} label(s) created (duplicates skipped):\n` +
            formatList(arr, formatLabel, "labels"),
        );
      }),
  );
}
