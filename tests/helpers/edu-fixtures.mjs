export const acceleratorId = "11111111-1111-4111-8111-111111111111";
export const workspaceId = "22222222-2222-4222-8222-222222222222";
export const reportId = "33333333-3333-4333-8333-333333333333";
export const actorId = "44444444-4444-4444-8444-444444444444";
export const timestamp = "2026-10-18T10:00:00Z";
export const evidence = "Synthetic evidence with full detail. ".repeat(30) + "EVIDENCE-END";
export const workspace = { id: workspaceId, name: "Synthetic team", slug: "synthetic-team" };
export const identity = { workspace_id: workspaceId, workspace_name: workspace.name, workspace_slug: workspace.slug };
export const accelerator = {
  id: acceleratorId,
  name: "Synthetic cohort",
  slug: "synthetic-cohort",
  description: "Synthetic EDU fixture",
  logo_url: null,
  website: "https://example.invalid/edu",
  created_by: actorId,
  created_at: timestamp,
  updated_at: timestamp,
};
export const detail = {
  ...accelerator,
  workspaces: [workspace],
  members: [{
    id: "55555555-5555-4555-8555-555555555555",
    accelerator_id: acceleratorId,
    user_id: actorId,
    user_name: "Synthetic observer",
    user_email: "private-contact@example.invalid",
    is_active: false,
    role: "observer",
    created_at: timestamp,
  }],
  access_reconciliation: [{
    workspace_id: workspaceId,
    workspace_name: workspace.name,
    user_id: actorId,
    user_email: "private-reconciliation@example.invalid",
    role: "admin",
    state: "granted",
  }],
};
export const dashboard = {
  accelerator_id: acceleratorId,
  workspaces_by_sprint_status: { planning: 0, active: 1, completed: 2, cancelled: 0, no_sprint: 0 },
  red_flags: [{ ...identity, last_activity_at: null, days_silent: 0 }],
  okr_progress: [{ cycle_id: "synthetic-cycle", progress: 0, key_results: [{ title: "Evidence", current_value: 0, target_value: 5, progress_pct: 0 }] }],
  top_velocity: [{ ...identity, velocity_last_sprint: 0 }],
  churn_risk: [{ ...identity, risk_score: 0, reason: "No recent activity" }],
};
const untouched = {
  evidence_notes: null, evidence_url: null, submitted_at: null,
  reviewed_by: null, reviewer_name: null, reviewed_at: null,
  review_notes: null, updated_at: null, history: [],
};
export const team = {
  ...identity,
  next_stage: "mvp",
  attention_reason: "Review requested",
  milestones: [
    {
      stage: "discovery", label: "Проблема подтверждена", status: "approved",
      evidence_notes: evidence, evidence_url: "https://example.invalid/evidence",
      submitted_at: timestamp, reviewed_by: actorId, reviewer_name: "Synthetic curator",
      reviewed_at: timestamp, review_notes: "Verified interviews", updated_at: timestamp,
      history: [
        { id: "event-submitted", stage: "discovery", status: "submitted", action: "submit", evidence_notes: evidence,
          evidence_url: "https://example.invalid/evidence", actor_id: actorId, actor_name: "Synthetic author", notes: null, created_at: timestamp },
        { id: "event-approved", stage: "discovery", status: "approved", action: "approve", evidence_notes: evidence,
          evidence_url: "https://example.invalid/evidence", actor_id: actorId, actor_name: "Synthetic curator", notes: "Approved after review", created_at: timestamp },
      ],
    },
    { ...untouched, stage: "mvp", label: "MVP проверен", status: "submitted" },
    { ...untouched, stage: "clients", label: "Первые клиенты", status: "not_started" },
  ],
};
export const progress = { accelerator_id: acceleratorId, total_teams: 1, stage_counts: { discovery: 1, mvp: 0, clients: 0 }, teams: [team] };
export const workspaceProgress = { accelerator_id: acceleratorId, can_submit: false, team };
export const report = {
  id: reportId, accelerator_id: acceleratorId, name: "Synthetic stored report",
  description: "Historical result", report_type: "team_progress", created_by: actorId,
  generated_at: "2026-10-01T10:00:00Z", created_at: "2026-10-01T09:59:59Z",
  stats: { total_teams: 0, stage_counts: { discovery: 0, mvp: 0, clients: 0 }, teams: [], preserved: false, evidence },
};

export function respond(url) {
  const routes = {
    "/api/v1/accelerators?member_only=true": [accelerator],
    "/api/v1/accelerators?member_only=false": [accelerator],
    [`/api/v1/accelerators/${acceleratorId}`]: detail,
    [`/api/v1/accelerators/${acceleratorId}/workspaces`]: [workspace],
    [`/api/v1/accelerators/${acceleratorId}/dashboard`]: dashboard,
    [`/api/v1/accelerators/${acceleratorId}/progress`]: progress,
    [`/api/v1/accelerators/workspaces/${workspaceId}/progress`]: workspaceProgress,
    [`/api/v1/accelerators/${acceleratorId}/reports`]: [report],
    [`/api/v1/accelerators/${acceleratorId}/reports/${reportId}`]: report,
    "/api/v1/workspaces/synthetic-team": workspace,
  };
  if (Object.hasOwn(routes, url)) return { body: structuredClone(routes[url]) };
  return { status: 404, body: { detail: "Unexpected fixture route" } };
}

export const eduToolNames = [
  "mono_list_accelerators", "mono_get_accelerator", "mono_list_accelerator_workspaces",
  "mono_get_accelerator_dashboard", "mono_get_accelerator_progress", "mono_get_workspace_edu_progress",
  "mono_list_accelerator_reports", "mono_get_accelerator_report",
];

export const existingToolNames = `
mono_add_comment mono_add_cycle_member mono_add_project_to_cycle mono_add_task_to_cycle
mono_add_task_to_sprint mono_advance mono_apply_task_template mono_bulk_close_sprint_reviews
mono_bulk_create_labels mono_bulk_create_tasks mono_bulk_delete_tasks mono_bulk_update_tasks
mono_complete_cycle mono_complete_sprint mono_create_custom_field mono_create_cycle mono_create_doc
mono_create_feedback mono_create_incident mono_create_key_result mono_create_label
mono_create_opportunity mono_create_product mono_create_specification mono_create_sprint
mono_create_task mono_create_task_from_incident mono_create_task_template mono_decompose_spec
mono_delete_comment mono_delete_custom_field mono_delete_cycle mono_delete_doc mono_delete_feedback
mono_delete_incident mono_delete_product mono_delete_sprint mono_delete_task mono_delete_task_template
mono_find_user mono_generate_spec mono_get_bug_hub_stats mono_get_cycle mono_get_doc
mono_get_incident mono_get_pm_hub_stats mono_get_project mono_get_project_summary mono_get_sprint
mono_get_task mono_get_task_activities mono_get_task_custom_fields mono_link_commit mono_link_dependency
mono_link_pull_request mono_list_activities mono_list_comments mono_list_commits mono_list_custom_fields
mono_list_cycles mono_list_docs mono_list_feedback mono_list_incidents mono_list_labels
mono_list_notifications mono_list_opportunities mono_list_products mono_list_projects
mono_list_specifications mono_list_sprints mono_list_task_dependencies mono_list_task_deploys
mono_list_task_pull_requests mono_list_task_templates mono_list_tasks mono_list_users mono_log_deploy
mono_mark_all_notifications_read mono_mark_notification_read mono_remove_project_from_cycle
mono_remove_task_from_cycle mono_remove_task_from_sprint mono_resolve_user mono_search mono_search_docs
mono_session_start mono_set_task_custom_fields mono_start_cycle mono_start_sprint mono_sync_sentry
mono_sync_users mono_unlink_dependency mono_update_comment mono_update_cycle mono_update_doc
mono_update_feedback mono_update_incident mono_update_key_result mono_update_opportunity
mono_update_product mono_update_project mono_update_sprint mono_update_task
`.trim().split(/\s+/);
