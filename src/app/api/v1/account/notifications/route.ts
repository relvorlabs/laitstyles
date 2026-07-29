import { requireApiConsumer } from "@/lib/http/auth";
import { parseJsonBody, parseSearchParams } from "@/lib/http/request";
import { handleApiRequest } from "@/lib/http/server";
import {
  markAllNotificationsReadSchema,
  notificationListSearchSchema,
} from "@/modules/notifications/schema";
import { markAllNotificationsRead } from "@/modules/notifications/server/commands";
import { listNotifications } from "@/modules/notifications/server/queries";

const privateNoStore = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  return handleApiRequest(request, async () => {
    const identity = await requireApiConsumer();
    const input = parseSearchParams(request, notificationListSearchSchema);
    const result = await listNotifications(identity, input);
    return { data: result.data, meta: result.meta, headers: privateNoStore };
  });
}

export async function PATCH(request: Request) {
  return handleApiRequest(request, async () => {
    const identity = await requireApiConsumer();
    await parseJsonBody(request, markAllNotificationsReadSchema);
    const data = await markAllNotificationsRead(identity);
    return { data, headers: privateNoStore };
  });
}
