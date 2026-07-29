import { requireApiConsumer } from "@/lib/http/auth";
import { parseJsonBody } from "@/lib/http/request";
import { handleApiRequest } from "@/lib/http/server";
import { updatePrivacyPreferencesSchema } from "@/modules/privacy/schema";
import { updatePrivacyPreferences } from "@/modules/privacy/server/commands";
import { getPrivacyPreferences } from "@/modules/privacy/server/queries";

const privateNoStore = { "Cache-Control": "private, no-store" };

export async function GET() {
  return handleApiRequest(async () => {
    const identity = await requireApiConsumer();
    const data = await getPrivacyPreferences(identity);
    return { data, headers: privateNoStore };
  });
}

export async function PATCH(request: Request) {
  return handleApiRequest(request, async () => {
    const identity = await requireApiConsumer();
    const input = await parseJsonBody(request, updatePrivacyPreferencesSchema);
    const data = await updatePrivacyPreferences(identity, input);
    return { data, headers: privateNoStore };
  });
}
