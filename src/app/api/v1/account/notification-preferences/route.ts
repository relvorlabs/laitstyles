import { requireApiConsumer } from "@/lib/http/auth";
import { parseJsonBody } from "@/lib/http/request";
import { handleApiRequest } from "@/lib/http/server";
import { updateNotificationPreferenceSchema } from "@/modules/notifications/schema";
import { updateNotificationPreference } from "@/modules/notifications/server/commands";
import { listNotificationPreferences } from "@/modules/notifications/server/queries";

const privateNoStore = { "Cache-Control": "private, no-store" };

export async function GET() {
  return handleApiRequest(async () => {
    const identity = await requireApiConsumer();
    const data = await listNotificationPreferences(identity);
    return { data, headers: privateNoStore };
  });
}

export async function PATCH(request: Request) {
  return handleApiRequest(request, async () => {
    const identity = await requireApiConsumer();
    const input = await parseJsonBody(request, updateNotificationPreferenceSchema);
    const data = await updateNotificationPreference(identity, input);
    return { data, headers: privateNoStore };
  });
}
