/**
 * Response formatters — convert API JSON to human-readable text.
 * Keeps Claude Code context window clean.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export function formatTask(t: any): string {
  const parts = [
    `${t.identifier || t.id} [${t.status}] ${t.title}`,
    `  ID: ${t.id}`,
    `  Priority: ${t.priority || "none"} | Type: ${t.type || "task"} | SP: ${t.story_points ?? "—"}`,
  ];
  if (t.assignee_id) parts.push(`  Assignee: ${t.assignee_id}`);
  if (t.sprint_id) parts.push(`  Sprint: ${t.sprint_id}`);
  if (t.product_id) parts.push(`  Product: ${t.product_id}`);
  if (t.due_date) parts.push(`  Due: ${t.due_date}`);
  if (t.labels?.length) parts.push(`  Labels: ${t.labels.join(", ")}`);
  if (t.description) {
    const desc =
      t.description.length > 200
        ? t.description.slice(0, 200) + "..."
        : t.description;
    parts.push(`  Description: ${desc}`);
  }
  return parts.join("\n");
}

export function formatTaskList(tasks: any[], total?: number): string {
  if (!tasks.length) return "No tasks found.";
  const header = total ? `Found ${total} tasks:\n` : `${tasks.length} tasks:\n`;
  return header + tasks.map((t, i) => `${i + 1}. ${formatTask(t)}`).join("\n\n");
}

export function formatComment(c: any): string {
  const author = c.author?.name || c.author_id || "Unknown";
  const date = c.created_at ? new Date(c.created_at).toLocaleString() : "";
  return `[${author}] ${date}\n${c.content}`;
}

export function formatCommentList(comments: any[]): string {
  if (!comments.length) return "No comments.";
  return `${comments.length} comments:\n\n` +
    comments.map((c, i) => `${i + 1}. ${formatComment(c)}`).join("\n\n---\n\n");
}

export function formatSprint(s: any): string {
  const parts = [
    `${s.name} [${s.status}]`,
    `  ID: ${s.id}`,
  ];
  if (s.goal) parts.push(`  Goal: ${s.goal}`);
  if (s.start_date) parts.push(`  Start: ${s.start_date}`);
  if (s.end_date) parts.push(`  End: ${s.end_date}`);
  if (s.task_count !== undefined) parts.push(`  Tasks: ${s.task_count}`);
  if (s.capacity) parts.push(`  Capacity: ${s.capacity} SP`);
  return parts.join("\n");
}

export function formatCycle(c: any): string {
  const parts = [
    `${c.name} [${c.status}]`,
    `  ID: ${c.id}`,
    `  Progress: ${c.progress ?? 0}%`,
  ];
  if (c.goal) parts.push(`  Goal: ${c.goal}`);
  if (c.start_date) parts.push(`  Start: ${c.start_date}`);
  if (c.end_date) parts.push(`  End: ${c.end_date}`);
  if (c.project_count !== undefined) parts.push(`  Projects: ${c.project_count}`);
  if (c.task_count !== undefined) parts.push(`  Tasks: ${c.task_count}`);
  if (c.member_count !== undefined) parts.push(`  Members: ${c.member_count}`);
  if (c.kr_count !== undefined) parts.push(`  Key Results: ${c.kr_count}`);
  return parts.join("\n");
}

export function formatProject(p: any): string {
  const parts = [`${p.name} [${p.key}]`, `  ID: ${p.id}`];
  if (p.description) parts.push(`  Description: ${p.description}`);
  if (p.is_archived) parts.push(`  ARCHIVED`);
  return parts.join("\n");
}

export function formatIncident(inc: any): string {
  const parts = [
    `${inc.title} [${inc.status}] (${inc.severity})`,
    `  ID: ${inc.id}`,
    `  Source: ${inc.source || "manual"}`,
  ];
  if (inc.assignee_id) parts.push(`  Assignee: ${inc.assignee_id}`);
  if (inc.task_id) parts.push(`  Linked task: ${inc.task_id}`);
  if (inc.created_at) parts.push(`  Created: ${inc.created_at}`);
  return parts.join("\n");
}

export function formatProduct(p: any): string {
  const parts = [`${p.name} [${p.status}]`, `  ID: ${p.id}`];
  if (p.description) parts.push(`  Description: ${p.description}`);
  if (p.repository_url) parts.push(`  Repo: ${p.repository_url}`);
  if (p.tech_stack?.length) parts.push(`  Stack: ${p.tech_stack.join(", ")}`);
  return parts.join("\n");
}

export function formatKeyResult(kr: any): string {
  return `${kr.title} [${kr.status}] — ${kr.current_value}/${kr.target_value} ${kr.unit || ""} (${kr.progress_pct ?? 0}%)`;
}

export function formatFeedback(fb: any): string {
  const parts = [`${fb.title || fb.id} [${fb.sentiment || "neutral"}]`];
  if (fb.source) parts.push(`  Source: ${fb.source}`);
  if (fb.content) {
    const c = fb.content.length > 150 ? fb.content.slice(0, 150) + "..." : fb.content;
    parts.push(`  ${c}`);
  }
  return parts.join("\n");
}

export function formatOpportunity(opp: any): string {
  const parts = [
    `${opp.title} [${opp.status}]`,
    `  ID: ${opp.id}`,
  ];
  if (opp.category) parts.push(`  Category: ${opp.category}`);
  if (opp.score !== undefined) parts.push(`  Score: ${opp.score}`);
  return parts.join("\n");
}

export function formatSpecification(spec: any): string {
  const parts = [
    `${spec.title} [${spec.status}]`,
    `  ID: ${spec.id}`,
  ];
  if (spec.description) {
    const d = spec.description.length > 150 ? spec.description.slice(0, 150) + "..." : spec.description;
    parts.push(`  ${d}`);
  }
  return parts.join("\n");
}

export function formatCustomField(f: any): string {
  const parts = [`${f.name} (${f.field_type}) — ID: ${f.id}`];
  if (f.is_required) parts.push(`  Required`);
  if (f.description) parts.push(`  ${f.description}`);
  if (f.options?.length) {
    parts.push(`  Options: ${f.options.map((o: any) => o.label).join(", ")}`);
  }
  return parts.join("\n");
}

export function formatTemplate(t: any): string {
  const parts = [`${t.name} — ID: ${t.id}`];
  if (t.type) parts.push(`  Type: ${t.type}`);
  if (t.priority) parts.push(`  Priority: ${t.priority}`);
  if (t.story_points != null) parts.push(`  SP: ${t.story_points}`);
  if (t.description) parts.push(`  ${t.description}`);
  return parts.join("\n");
}

export function formatNotification(n: any): string {
  const read = n.read ? "" : " [UNREAD]";
  return `${n.type}${read}: ${n.title}\n  ${n.message}\n  ${n.created_at}`;
}

export function formatActivity(a: any): string {
  const actor = a.actor?.name || a.actor_id || "System";
  return `[${actor}] ${a.action} ${a.entity_type} — ${a.description} (${a.created_at})`;
}

/** Generic list formatter */
export function formatList<T>(
  items: T[] | undefined | null,
  formatter: (item: T) => string,
  label = "items",
  total?: number,
): string {
  if (!items || !Array.isArray(items) || !items.length) return `No ${label} found.`;
  const header = total !== undefined
    ? `${total} ${label} (showing ${items.length}):\n`
    : `${items.length} ${label}:\n`;
  return header + items.map((item, i) => `${i + 1}. ${formatter(item)}`).join("\n\n");
}

/** Wrap tool result */
export function ok(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

export function err(message: string) {
  return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true as const };
}

/** Safe tool execution wrapper */
export async function run(fn: () => Promise<ReturnType<typeof ok>>) {
  try {
    return await fn();
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return err(msg);
  }
}
