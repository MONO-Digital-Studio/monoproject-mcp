import type {
  Accelerator,
  AcceleratorDashboard,
  AcceleratorDetail,
  AcceleratorReport,
  AcceleratorScope,
  AcceleratorWorkspace,
  CohortProgress,
  JsonValue,
  ProgressEvent,
  ProgressMilestone,
  TeamProgress,
  WorkspaceEduProgress,
} from "./types/accelerators.js";

function field(label: string, value: string | number | boolean | null): string {
  return `${label}: ${value === null ? "none" : value}`;
}

function section<T>(label: string, items: T[], format: (item: T) => string): string {
  return `${label} (${items.length}):${items.length ? "\n" + items.map(format).join("\n\n") : " none"}`;
}

function json(value: JsonValue): string {
  return JSON.stringify(value, null, 2);
}

function formatAccelerator(accelerator: Accelerator): string {
  return [
    `Accelerator: ${accelerator.name} [${accelerator.slug}]`,
    field("ID", accelerator.id),
    field("Description", accelerator.description),
    field("Website", accelerator.website),
    field("Logo URL", accelerator.logo_url),
    field("Created by", accelerator.created_by),
    field("Created", accelerator.created_at),
    field("Updated", accelerator.updated_at),
  ].join("\n");
}

export function formatAcceleratorList(items: Accelerator[], scope: AcceleratorScope): string {
  const label = scope === "membership"
    ? "Scope: membership — cohorts where the caller has accelerator membership."
    : "Scope: administrative — backend-visible metadata; visibility does not imply participation or access to cohort data.";
  return `${label}\n\n${section("Accelerators", items, formatAccelerator)}`;
}

function formatWorkspace(workspace: AcceleratorWorkspace): string {
  return `${workspace.name} [${workspace.slug}]\nID: ${workspace.id}`;
}

export function formatAcceleratorWorkspaces(items: AcceleratorWorkspace[]): string {
  return section("Linked workspaces", items, formatWorkspace);
}

export function formatAcceleratorDetail(accelerator: AcceleratorDetail): string {
  return [
    formatAccelerator(accelerator),
    "Metadata visibility does not imply caller participation or access to cohort data.",
    formatAcceleratorWorkspaces(accelerator.workspaces),
    section("Members (contact emails omitted)", accelerator.members, (member) => [
      `${member.user_name} [${member.role}]`,
      field("Membership ID", member.id),
      field("User ID", member.user_id),
      field("Active", member.is_active),
      field("Created", member.created_at),
    ].join("\n")),
    section("Access reconciliation (contact emails omitted)", accelerator.access_reconciliation, (entry) => [
      field("Workspace", entry.workspace_name),
      field("Workspace ID", entry.workspace_id),
      field("User ID", entry.user_id),
      field("Role", entry.role),
      field("State", entry.state),
    ].join("\n")),
  ].join("\n\n");
}

export function formatAcceleratorDashboard(dashboard: AcceleratorDashboard): string {
  const team = (item: { workspace_id: string; workspace_name: string; workspace_slug: string }) =>
    `${item.workspace_name} [${item.workspace_slug}]\nWorkspace ID: ${item.workspace_id}`;
  return [
    field("Accelerator ID", dashboard.accelerator_id),
    "Workspace sprint status counts:\n" + Object.entries(dashboard.workspaces_by_sprint_status)
      .map(([status, count]) => field(status, count)).join("\n"),
    section("Red flags", dashboard.red_flags, (item) => [
      team(item), field("Last activity", item.last_activity_at), field("Days silent", item.days_silent),
    ].join("\n")),
    section("OKR progress (API values)", dashboard.okr_progress, json),
    section("Top velocity", dashboard.top_velocity, (item) =>
      `${team(item)}\n${field("Velocity last sprint", item.velocity_last_sprint)}`),
    section("Churn risk", dashboard.churn_risk, (item) => [
      team(item), field("Risk score", item.risk_score), field("Reason", item.reason),
    ].join("\n")),
  ].join("\n\n");
}

function formatProgressEvent(event: ProgressEvent): string {
  return [
    `Event: ${event.id} | ${event.action} | ${event.stage} [${event.status}]`,
    field("Actor ID", event.actor_id),
    field("Actor", event.actor_name),
    field("Created", event.created_at),
    field("Evidence notes", event.evidence_notes),
    field("Evidence URL", event.evidence_url),
    field("Notes", event.notes),
  ].join("\n");
}

function formatMilestone(milestone: ProgressMilestone): string {
  return [
    `Stage: ${milestone.stage} — ${milestone.label} [${milestone.status}]`,
    field("Evidence notes", milestone.evidence_notes),
    field("Evidence URL", milestone.evidence_url),
    field("Submitted", milestone.submitted_at),
    field("Reviewer ID", milestone.reviewed_by),
    field("Reviewer", milestone.reviewer_name),
    field("Reviewed", milestone.reviewed_at),
    field("Review notes", milestone.review_notes),
    field("Updated", milestone.updated_at),
    section("History", milestone.history, formatProgressEvent),
  ].join("\n");
}

function formatTeamProgress(team: TeamProgress): string {
  return [
    `Team: ${team.workspace_name} [${team.workspace_slug}]`,
    field("Workspace ID", team.workspace_id),
    field("Next stage", team.next_stage),
    field("Attention reason", team.attention_reason),
    section("Milestones", team.milestones, formatMilestone),
  ].join("\n\n");
}

export function formatAcceleratorProgress(progress: CohortProgress): string {
  return [
    field("Accelerator ID", progress.accelerator_id),
    field("Total teams", progress.total_teams),
    "Stage counts: " + json(progress.stage_counts),
    section("Teams", progress.teams, formatTeamProgress),
  ].join("\n\n");
}

export function formatWorkspaceEduProgress(progress: WorkspaceEduProgress, workspaceId: string): string {
  return [
    field("Configured workspace ID", workspaceId),
    field("Accelerator ID", progress.accelerator_id),
    field("Can submit (backend capability; this tool only reads)", progress.can_submit),
    progress.accelerator_id === null ? "No EDU cohort is linked to this workspace." : null,
    progress.team === null ? "Team progress: none" : formatTeamProgress(progress.team),
  ].filter((line) => line !== null).join("\n\n");
}

export function formatAcceleratorReport(report: AcceleratorReport): string {
  return [
    `Report snapshot: ${report.name} [${report.report_type}]`,
    field("Report ID", report.id),
    field("Accelerator ID", report.accelerator_id),
    field("Description", report.description),
    field("Created by", report.created_by),
    field("Created", report.created_at),
    field("Generated", report.generated_at),
    "Stored stats snapshot (not live progress):\n" + json(report.stats),
  ].join("\n\n");
}

export function formatAcceleratorReports(reports: AcceleratorReport[]): string {
  return section("Report snapshots", reports, formatAcceleratorReport);
}
