export type AcceleratorScope = "membership" | "administrative";

export type JsonValue = string | number | boolean | null | JsonValue[] | {
  [key: string]: JsonValue;
};

export interface Accelerator {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  website: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AcceleratorWorkspace {
  id: string;
  name: string;
  slug: string;
}

export interface AcceleratorDetail extends Accelerator {
  workspaces: AcceleratorWorkspace[];
  members: {
    id: string;
    accelerator_id: string;
    user_id: string;
    user_name: string;
    user_email: string;
    is_active: boolean;
    role: string;
    created_at: string;
  }[];
  access_reconciliation: {
    workspace_id: string;
    workspace_name: string;
    user_id: string;
    user_email: string;
    role: string;
    state: string;
  }[];
}

interface TeamIdentity {
  workspace_id: string;
  workspace_name: string;
  workspace_slug: string;
}

export interface AcceleratorDashboard {
  accelerator_id: string;
  workspaces_by_sprint_status: {
    planning: number;
    active: number;
    completed: number;
    cancelled: number;
    no_sprint: number;
  };
  red_flags: (TeamIdentity & {
    last_activity_at: string | null;
    days_silent: number;
  })[];
  okr_progress: { [key: string]: JsonValue }[];
  top_velocity: (TeamIdentity & { velocity_last_sprint: number })[];
  churn_risk: (TeamIdentity & { risk_score: number; reason: string })[];
}

export interface ProgressEvent {
  id: string;
  stage: string;
  status: string;
  action: string;
  evidence_notes: string;
  evidence_url: string | null;
  actor_id: string | null;
  actor_name: string | null;
  notes: string | null;
  created_at: string;
}

export interface ProgressMilestone {
  stage: string;
  label: string;
  status: string;
  evidence_notes: string | null;
  evidence_url: string | null;
  submitted_at: string | null;
  reviewed_by: string | null;
  reviewer_name: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  updated_at: string | null;
  history: ProgressEvent[];
}

export interface TeamProgress extends TeamIdentity {
  milestones: ProgressMilestone[];
  next_stage: string | null;
  attention_reason: string | null;
}

export interface CohortProgress {
  accelerator_id: string;
  total_teams: number;
  stage_counts: Record<string, number>;
  teams: TeamProgress[];
}

export interface WorkspaceEduProgress {
  accelerator_id: string | null;
  can_submit: boolean;
  team: TeamProgress | null;
}

export interface AcceleratorReport {
  id: string;
  accelerator_id: string;
  name: string;
  description: string | null;
  report_type: string;
  created_by: string | null;
  generated_at: string | null;
  created_at: string;
  stats: { [key: string]: JsonValue } | JsonValue[];
}
