import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { ApiClient } from "../client.js";
import {
  ok,
  run,
  formatAcceleratorList,
  formatAcceleratorDetail,
  formatAcceleratorWorkspaces,
  formatAcceleratorDashboard,
  formatAcceleratorProgress,
  formatWorkspaceEduProgress,
  formatAcceleratorReports,
  formatAcceleratorReport,
} from "../format.js";
import type {
  Accelerator,
  AcceleratorDetail,
  AcceleratorWorkspace,
  AcceleratorDashboard,
  CohortProgress,
  WorkspaceEduProgress,
  AcceleratorReport,
} from "../types/accelerators.js";

const uuid = z.uuid();
const acceleratorInput = z.strictObject({
  accelerator_id: uuid.describe("Accelerator/cohort UUID"),
});
const readOnly = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
};
const membershipRequired = "Requires actual accelerator OBSERVER or CURATOR membership; staff status alone does not grant access.";

async function configuredWorkspaceUuid(client: ApiClient): Promise<string> {
  if (uuid.safeParse(client.workspaceId).success) return client.workspaceId;
  if (!/^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]$/i.test(client.workspaceId)) {
    throw new Error("MONO_WORKSPACE_ID must be a workspace UUID or URL-safe slug (2–50 characters)");
  }
  // The workspace route resolves slugs; the EDU progress route requires a UUID.
  const workspace = await client.get<{ id: string }>(client.ws());
  const resolved = uuid.safeParse(workspace.id);
  if (!resolved.success) throw new Error("Workspace resolution returned an invalid workspace UUID");
  return resolved.data;
}

export function registerAcceleratorTools(server: McpServer, client: ApiClient) {
  server.registerTool(
    "mono_list_accelerators",
    {
      description: "List EDU cohorts. Default membership scope lists the caller's accelerator memberships. Explicit administrative scope lists backend-visible metadata (all cohorts for staff); visibility does not imply participation or cohort-data access.",
      inputSchema: z.strictObject({
        scope: z.enum(["membership", "administrative"]).default("membership")
          .describe("membership (default) or explicit administrative metadata inventory"),
      }),
      annotations: readOnly,
    },
    ({ scope }) => run(async () => {
      const data = await client.get<Accelerator[]>("/accelerators", { member_only: scope === "membership" });
      return ok(formatAcceleratorList(data, scope));
    }),
  );

  server.registerTool(
    "mono_get_accelerator",
    {
      description: "Read EDU cohort metadata, linked workspaces, membership roles and access reconciliation returned by the API. Staff may read metadata without membership; this does not establish participation or cohort-data access. Contact emails are omitted.",
      inputSchema: acceleratorInput,
      annotations: readOnly,
    },
    ({ accelerator_id }) => run(async () => {
      const data = await client.get<AcceleratorDetail>(`/accelerators/${accelerator_id}`);
      return ok(formatAcceleratorDetail(data));
    }),
  );

  server.registerTool(
    "mono_list_accelerator_workspaces",
    {
      description: `List workspaces linked to an EDU cohort. ${membershipRequired}`,
      inputSchema: acceleratorInput,
      annotations: readOnly,
    },
    ({ accelerator_id }) => run(async () => {
      const data = await client.get<AcceleratorWorkspace[]>(`/accelerators/${accelerator_id}/workspaces`);
      return ok(formatAcceleratorWorkspaces(data));
    }),
  );

  server.registerTool(
    "mono_get_accelerator_dashboard",
    {
      description: `Read aggregate EDU cohort sprint counts, red flags, OKR progress, velocity and churn risk. ${membershipRequired}`,
      inputSchema: acceleratorInput,
      annotations: readOnly,
    },
    ({ accelerator_id }) => run(async () => {
      const data = await client.get<AcceleratorDashboard>(`/accelerators/${accelerator_id}/dashboard`);
      return ok(formatAcceleratorDashboard(data));
    }),
  );

  server.registerTool(
    "mono_get_accelerator_progress",
    {
      description: `Read EDU cohort team milestones, stage counts, evidence, reviews and event history. ${membershipRequired}`,
      inputSchema: acceleratorInput,
      annotations: readOnly,
    },
    ({ accelerator_id }) => run(async () => {
      const data = await client.get<CohortProgress>(`/accelerators/${accelerator_id}/progress`);
      return ok(formatAcceleratorProgress(data));
    }),
  );

  server.registerTool(
    "mono_get_workspace_edu_progress",
    {
      description: "Read EDU milestones only for the configured MONO_WORKSPACE_ID (UUID or slug). Requires workspace VIEWER or higher via the backend. No workspace argument; no linked cohort is reported explicitly. can_submit is informational and does not enable writing through this tool.",
      inputSchema: z.strictObject({}),
      annotations: readOnly,
    },
    () => run(async () => {
      const workspaceId = await configuredWorkspaceUuid(client);
      const data = await client.get<WorkspaceEduProgress>(`/accelerators/workspaces/${workspaceId}/progress`);
      return ok(formatWorkspaceEduProgress(data, workspaceId));
    }),
  );

  server.registerTool(
    "mono_list_accelerator_reports",
    {
      description: `Read existing EDU report snapshots with their stored stats. Does not generate, export or share reports. ${membershipRequired}`,
      inputSchema: acceleratorInput,
      annotations: readOnly,
    },
    ({ accelerator_id }) => run(async () => {
      const data = await client.get<AcceleratorReport[]>(`/accelerators/${accelerator_id}/reports`);
      return ok(formatAcceleratorReports(data));
    }),
  );

  server.registerTool(
    "mono_get_accelerator_report",
    {
      description: `Read an existing EDU report's stored stats snapshot in its cohort. Does not regenerate, export or share it. ${membershipRequired}`,
      inputSchema: acceleratorInput.extend({ report_id: uuid.describe("Report UUID within this accelerator") }),
      annotations: readOnly,
    },
    ({ accelerator_id, report_id }) => run(async () => {
      const data = await client.get<AcceleratorReport>(`/accelerators/${accelerator_id}/reports/${report_id}`);
      return ok(formatAcceleratorReport(data));
    }),
  );
}
