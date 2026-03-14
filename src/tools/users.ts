import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ApiClient } from "../client.js";
import { ok, run } from "../format.js";

/** Extract user display name from workspace member response. */
function userName(m: any): string {
  // API returns: { name, email, user_id, role } or { user: { name, last_name, email, id } }
  const name = m.name || m.user?.name || "";
  const lastName = m.last_name || m.user?.last_name || "";
  return [name, lastName].filter(Boolean).join(" ") || m.email || "—";
}

/** Extract user ID from workspace member response. */
function userId(m: any): string {
  return m.user_id || m.user?.id || m.id || "—";
}

export function registerUserTools(server: McpServer, client: ApiClient) {
  server.registerTool(
    "mono_list_users",
    {
      description: "List workspace members with roles, names, and emails",
      inputSchema: z.object({}),
    },
    () =>
      run(async () => {
        const data = await client.get<any>(`${client.ws()}/members`);
        const members = data.data || data;
        if (!Array.isArray(members) || !members.length) return ok("No members found.");
        const lines = members.map((m: any) =>
          `• ${userName(m)} <${m.email || m.user?.email || "—"}> | role: ${m.role || "member"} | id: ${userId(m)}`,
        );
        return ok(`Members (${members.length}):\n${lines.join("\n")}`);
      }),
  );

  server.registerTool(
    "mono_find_user",
    {
      description: "Find a user by email or display name (fuzzy search). Returns name, email, role, and UUID.",
      inputSchema: z.object({
        query: z.string().describe("Email or display name to search"),
      }),
    },
    ({ query }) =>
      run(async () => {
        const data = await client.get<any>(`${client.ws()}/members`, { search: query });
        const members = data.data || data;
        if (!Array.isArray(members) || !members.length) return ok(`No user matching "${query}".`);
        const lines = members.map((m: any) =>
          `• ${userName(m)} <${m.email || m.user?.email || "—"}> | role: ${m.role || "member"} | id: ${userId(m)}`,
        );
        return ok(`Found ${members.length} user(s):\n${lines.join("\n")}`);
      }),
  );

  server.registerTool(
    "mono_resolve_user",
    {
      description: "Resolve a user by exact email — returns UUID, full name, and role for use in assignee_id fields",
      inputSchema: z.object({
        email: z.string().describe("Exact user email"),
      }),
    },
    ({ email }) =>
      run(async () => {
        const data = await client.get<any>(`${client.ws()}/members`, { search: email });
        const members = data.data || data;
        if (!Array.isArray(members) || !members.length) return ok(`No user with email "${email}".`);
        const m = members[0];
        return ok(`${userName(m)} <${m.email || email}> | role: ${m.role || "member"} → ${userId(m)}`);
      }),
  );

  server.registerTool(
    "mono_sync_users",
    {
      description: "Trigger user directory sync (pulls latest from auth provider)",
      inputSchema: z.object({}),
    },
    () =>
      run(async () => {
        const data = await client.post<any>(`${client.ws()}/members/sync`);
        return ok(`User sync completed. ${JSON.stringify(data.data || data)}`);
      }),
  );
}
