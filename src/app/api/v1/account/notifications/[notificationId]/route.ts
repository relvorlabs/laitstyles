import { requireApiConsumer } from "@/lib/http/auth";
import { parseJsonBody } from "@/lib/http/request";
import { handleApiRequest } from "@/lib/http/server";
import {
  markNotificationReadSchema,
  notificationIdentifierSchema,
} from "@/modules/notifications/schema";
import { markNotificationRead } from "@/modules/notifications/server/commands";

type RouteContext = { params: Promise<{ notificationId: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  return handleApiRequest(request, async () => {
    const identity = await requireApiConsumer();
    const notificationId = notificationIdentifierSchema.parse((await params).notificationId);
    await parseJsonBody(request, markNotificationReadSchema);
    await markNotificationRead(identity, notificationId);
    return { data: { id: notificationId, read: true }, headers: { "Cache-Control": "private, no-store" } };
  });
}
