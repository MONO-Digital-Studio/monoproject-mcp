import assert from "node:assert/strict";
import test from "node:test";
import { fixture, textResult, errorResult } from "./helpers/mcp.mjs";
import {
  acceleratorId, workspaceId, reportId, actorId, timestamp, evidence,
  detail, dashboard, progress, workspaceProgress, report, respond,
  eduToolNames, existingToolNames,
} from "./helpers/edu-fixtures.mjs";

const cohortArgs = { accelerator_id: acceleratorId };
const route = `/api/v1/accelerators/${acceleratorId}`;

test("built stdio server registers all 103 existing and 8 EDU tools once", async (t) => {
  const mcp = await fixture(t, workspaceId, respond);
  assert.equal(mcp.hello.serverInfo.version, "1.2.0");
  const reply = await mcp.request("tools/list");
  assert.equal(reply.error, undefined);
  assert.equal(reply.result.nextCursor, undefined);
  const tools = reply.result.tools;
  assert.deepEqual(tools.map((tool) => tool.name).sort(), [...existingToolNames, ...eduToolNames].sort());
  assert.equal(tools.length, 111);
  for (const tool of tools.filter((tool) => eduToolNames.includes(tool.name))) {
    assert.deepEqual(tool.annotations, { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true });
    assert.equal(tool.inputSchema.additionalProperties, false);
  }
  assert.deepEqual(tools.find((tool) => tool.name === "mono_get_workspace_edu_progress").inputSchema.properties, {});
  assert.deepEqual(mcp.requests, []);
});

test("membership is the default; administrative scope is explicit metadata inventory", async (t) => {
  const mcp = await fixture(t, workspaceId, respond);
  const implicit = textResult(await mcp.call("mono_list_accelerators"));
  const membership = textResult(await mcp.call("mono_list_accelerators", { scope: "membership" }));
  const admin = textResult(await mcp.call("mono_list_accelerators", { scope: "administrative" }));
  assert.equal(implicit, membership);
  assert.match(implicit, /Scope: membership/);
  assert.match(implicit, /Accelerators \(1\)/);
  assert.match(admin, /Scope: administrative/);
  assert.match(admin, /visibility does not imply participation/);
  assert.deepEqual(mcp.requests.map((request) => request.url), [
    "/api/v1/accelerators?member_only=true", "/api/v1/accelerators?member_only=true", "/api/v1/accelerators?member_only=false",
  ]);
});

test("cohort detail and linked workspaces preserve roles and omit contact emails", async (t) => {
  const mcp = await fixture(t, workspaceId, respond);
  const output = textResult(await mcp.call("mono_get_accelerator", cohortArgs));
  for (const value of [acceleratorId, workspaceId, actorId, "observer", "Active: false", "State: granted", "Website: https://example.invalid/edu", timestamp]) {
    assert.ok(output.includes(value), value);
  }
  assert.match(output, /does not imply caller participation/);
  assert.ok(!output.includes(detail.members[0].user_email));
  assert.ok(!output.includes(detail.access_reconciliation[0].user_email));
  const workspaces = textResult(await mcp.call("mono_list_accelerator_workspaces", cohortArgs));
  assert.match(workspaces, /Linked workspaces \(1\)/);
  assert.match(workspaces, /Synthetic team \[synthetic-team\]/);
  assert.ok(workspaces.includes(workspaceId));
  assert.deepEqual(mcp.requests.map((request) => request.url), [route, `${route}/workspaces`]);
});

test("dashboard preserves all aggregate groups, zeros, empty values and OKR payload", async (t) => {
  const mcp = await fixture(t, workspaceId, respond);
  const output = textResult(await mcp.call("mono_get_accelerator_dashboard", cohortArgs));
  for (const value of ["planning: 0", "active: 1", "completed: 2", "cancelled: 0", "no_sprint: 0", "Days silent: 0", "Last activity: none", "Velocity last sprint: 0", "Risk score: 0", "Reason: No recent activity"]) {
    assert.ok(output.includes(value), value);
  }
  assert.ok(output.includes(JSON.stringify(dashboard.okr_progress[0], null, 2)));
  assert.deepEqual(mcp.requests.map((request) => request.url), [`${route}/dashboard`]);
});

test("cohort and workspace progress retain stages, full evidence, reviews and ordered history", async (t) => {
  const mcp = await fixture(t, workspaceId, respond);
  const cohort = textResult(await mcp.call("mono_get_accelerator_progress", cohortArgs));
  const current = textResult(await mcp.call("mono_get_workspace_edu_progress"));
  for (const output of [cohort, current]) {
    for (const value of ["Stage: discovery — Проблема подтверждена [approved]", "Stage: mvp — MVP проверен [submitted]", "Stage: clients — Первые клиенты [not_started]", evidence, "https://example.invalid/evidence", "Reviewer: Synthetic curator", "Review notes: Verified interviews", "History (2)", "History (0): none", "Next stage: mvp", "Attention reason: Review requested", "Approved after review", timestamp]) {
      assert.ok(output.includes(value), value);
    }
    assert.ok(output.indexOf("event-submitted") < output.indexOf("event-approved"));
  }
  assert.match(cohort, /Total teams: 1/);
  assert.ok(cohort.includes(JSON.stringify(progress.stage_counts, null, 2)));
  assert.match(current, /Can submit \(backend capability; this tool only reads\): false/);
  assert.deepEqual(mcp.requests.map((request) => request.url), [
    `${route}/progress`, `/api/v1/accelerators/workspaces/${workspaceId}/progress`,
  ]);
});

test("configured slug resolves through the existing workspace route before UUID progress", async (t) => {
  const mcp = await fixture(t, "synthetic-team", respond);
  assert.ok(textResult(await mcp.call("mono_get_workspace_edu_progress")).includes(workspaceId));
  assert.deepEqual(mcp.requests.map((request) => request.url), [
    "/api/v1/workspaces/synthetic-team", `/api/v1/accelerators/workspaces/${workspaceId}/progress`,
  ]);
});

test("no EDU workspace, empty lists and zero teams are explicit without fabricated completion", async (t) => {
  const mcp = await fixture(t, workspaceId, (url) => {
    if (url.endsWith(`/workspaces/${workspaceId}/progress`)) return { body: { accelerator_id: null, can_submit: false, team: null } };
    if (url.endsWith("/progress")) return { body: { accelerator_id: acceleratorId, total_teams: 0, stage_counts: { discovery: 0, mvp: 0, clients: 0 }, teams: [] } };
    if (url.endsWith("/dashboard")) return { body: { ...dashboard, workspaces_by_sprint_status: { planning: 0, active: 0, completed: 0, cancelled: 0, no_sprint: 0 }, red_flags: [], okr_progress: [], top_velocity: [], churn_risk: [] } };
    return { body: [] };
  });
  const empty = textResult(await mcp.call("mono_get_workspace_edu_progress"));
  assert.match(empty, /No EDU cohort is linked/);
  assert.match(empty, /Team progress: none/);
  assert.match(empty, /Accelerator ID: none/);
  assert.doesNotMatch(empty, /completed|100%/);
  const cohort = textResult(await mcp.call("mono_get_accelerator_progress", cohortArgs));
  assert.match(cohort, /Total teams: 0/);
  assert.match(cohort, /Teams \(0\): none/);
  assert.doesNotMatch(cohort, /100%/);
  assert.match(textResult(await mcp.call("mono_list_accelerators")), /Accelerators \(0\): none/);
  assert.match(textResult(await mcp.call("mono_list_accelerator_workspaces", cohortArgs)), /Linked workspaces \(0\): none/);
  assert.match(textResult(await mcp.call("mono_list_accelerator_reports", cohortArgs)), /Report snapshots \(0\): none/);
  const dashboardOutput = textResult(await mcp.call("mono_get_accelerator_dashboard", cohortArgs));
  for (const value of ["Red flags (0): none", "OKR progress (API values) (0): none", "Top velocity (0): none", "Churn risk (0): none"]) assert.ok(dashboardOutput.includes(value));
});

test("existing report snapshots preserve complete stats and are not refreshed from live progress", async (t) => {
  const reports = [
    report,
    { ...report, report_type: "summary", stats: { total_tasks: 0, tasks_done: 0, total_workspaces: 1 } },
    { ...report, report_type: "velocity", stats: { avg_velocity: 0, median_velocity: 0, per_workspace: [] } },
    { ...report, report_type: "funnel", stats: { total_tasks: 0, total_tasks_with_commits: 0, total_commits: 0, per_workspace: [] } },
    { ...report, report_type: "future_type", stats: [{ zero: 0, flag: false, missing: null, empty: [], nested: { evidence } }] },
  ];
  const mcp = await fixture(t, workspaceId, (url) => url === `${route}/reports` ? { body: reports } : respond(url));
  const list = textResult(await mcp.call("mono_list_accelerator_reports", cohortArgs));
  assert.match(list, /Report snapshots \(5\)/);
  for (const entry of reports) assert.ok(list.includes(JSON.stringify(entry.stats, null, 2)));
  const single = textResult(await mcp.call("mono_get_accelerator_report", { ...cohortArgs, report_id: reportId }));
  assert.ok(single.includes(JSON.stringify(report.stats, null, 2)));
  assert.ok(single.includes(report.generated_at));
  assert.match(single, /Stored stats snapshot \(not live progress\)/);
  assert.deepEqual(mcp.requests.map((request) => request.url), [`${route}/reports`, `${route}/reports/${reportId}`]);
});

test("403 and 404 stay errors for every EDU tool, with no fallback or retry", async (t) => {
  let status = 403;
  const mcp = await fixture(t, workspaceId, () => ({ status, body: { detail: status === 403 ? "Membership required" : "Resource not found" } }));
  for (status of [403, 404]) {
    for (const name of eduToolNames) {
      const args = name === "mono_list_accelerators" || name === "mono_get_workspace_edu_progress" ? {} : name === "mono_get_accelerator_report" ? { ...cohortArgs, report_id: reportId } : cohortArgs;
      const before = mcp.requests.length;
      const output = errorResult(await mcp.call(name, args));
      assert.ok(output.includes(`API ${status}:`), `${name}: ${output}`);
      assert.equal(mcp.requests.length, before + 1, `${name} must not retry or fall back`);
    }
  }
});

test("UUID, scope and strict workspace boundaries reject invalid MCP inputs before HTTP", async (t) => {
  const mcp = await fixture(t, workspaceId, respond);
  const cohortTools = eduToolNames.filter((name) => !["mono_list_accelerators", "mono_get_workspace_edu_progress"].includes(name));
  for (const name of cohortTools) {
    for (const id of ["not-a-uuid", "../workspaces", "https://example.invalid", `${acceleratorId}?member_only=false`, ""]) {
      const args = { accelerator_id: id, ...(name === "mono_get_accelerator_report" ? { report_id: reportId } : {}) };
      errorResult(await mcp.call(name, args));
    }
    errorResult(await mcp.call(name));
  }
  for (const id of ["../export", "not-a-uuid", "", 42]) errorResult(await mcp.call("mono_get_accelerator_report", { ...cohortArgs, report_id: id }));
  for (const args of [{ scope: "all" }, { scope: null }, { member_only: false }, { scope: "membership", url: "/admin" }]) errorResult(await mcp.call("mono_list_accelerators", args));
  for (const args of [{ workspace_id: acceleratorId }, { workspace: "other" }, { url: "https://example.invalid" }]) errorResult(await mcp.call("mono_get_workspace_edu_progress", args));
  assert.deepEqual(mcp.requests, []);
});

test("slug resolution errors do not trigger alternate routes or a progress request", async (t) => {
  for (const status of [403, 404]) {
    await t.test(String(status), async (t) => {
      const mcp = await fixture(t, "synthetic-team", () => ({ status, body: { detail: "Workspace unavailable" } }));
      assert.match(errorResult(await mcp.call("mono_get_workspace_edu_progress")), new RegExp(`API ${status}:`));
      assert.deepEqual(mcp.requests.map((request) => request.url), ["/api/v1/workspaces/synthetic-team"]);
    });
  }
});

test("resolved workspace IDs are validated before constructing an EDU path", async (t) => {
  const mcp = await fixture(t, "synthetic-team", () => ({ body: { id: "../../admin" } }));
  assert.match(errorResult(await mcp.call("mono_get_workspace_edu_progress")), /invalid workspace UUID/);
  assert.deepEqual(mcp.requests.map((request) => request.url), ["/api/v1/workspaces/synthetic-team"]);
});

test("unsafe configured workspace identifiers fail before HTTP", async (t) => {
  for (const workspace of ["../admin", "https://example.invalid", "mono?scope=all", "mono#other", "mono%2fadmin", "mono/../admin"]) {
    await t.test(workspace, async (t) => {
      const mcp = await fixture(t, workspace, respond);
      assert.match(errorResult(await mcp.call("mono_get_workspace_edu_progress")), /MONO_WORKSPACE_ID must be/);
      assert.deepEqual(mcp.requests, []);
    });
  }
});

test("can_submit true is reported as a capability and never causes a write", async (t) => {
  const mcp = await fixture(t, workspaceId, () => ({ body: { ...workspaceProgress, can_submit: true } }));
  assert.match(textResult(await mcp.call("mono_get_workspace_edu_progress")), /Can submit \(backend capability; this tool only reads\): true/);
  assert.equal(mcp.requests.length, 1);
});
