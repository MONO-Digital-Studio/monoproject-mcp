import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ApiClient } from "../client.js";
import { ok, run, formatNotification, formatList } from "../format.js";

export function registerNotificationTools(server: McpServer, client: ApiClient) {
  server.registerTool(
    "mono_list_notifications",
    {
      description: "List current user notifications (task assignments, mentions, updates)",
      inputSchema: z.object({
        is_read: z.boolean().optional().describe("Filter: true=read, false=unread"),
        page: z.number().optional(),
        per_page: z.number().optional(),
      }),
    },
    (params) =>
      run(async () => {
        const data = await client.get<any>(`/notifications`, params);
        const items = data.data || data;
        return ok(formatList(Array.isArray(items) ? items : [], formatNotification, "notifications", data.total));
      }),
  );

  server.registerTool(
    "mono_mark_notification_read",
    {
      description: "Mark a notification as read",
      inputSchema: z.object({
        notification_id: z.string().describe("Notification UUID"),
      }),
    },
    ({ notification_id }) =>
      run(async () => {
        await client.patch(`/notifications/${notification_id}`, { is_read: true });
        return ok(`Notification ${notification_id} marked as read.`);
      }),
  );

  server.registerTool(
    "mono_mark_all_notifications_read",
    {
      description: "Mark all notifications as read for the current user",
      inputSchema: z.object({}),
    },
    () =>
      run(async () => {
        await client.post(`/notifications/mark-all-read`);
        return ok("All notifications marked as read.");
      }),
  );
}
