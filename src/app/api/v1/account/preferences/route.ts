import { requireApiConsumer } from "@/lib/http/auth";
import { parseJsonBody } from "@/lib/http/request";
import { handleApiRequest } from "@/lib/http/server";
import { updateCustomerPreferencesSchema } from "@/modules/preferences/schema";
import { updateCustomerPreferences } from "@/modules/preferences/server/commands";
import { getCustomerPreferences } from "@/modules/preferences/server/queries";

const privateNoStore = { "Cache-Control": "private, no-store" };

export async function GET() {
  return handleApiRequest(async () => {
    const identity = await requireApiConsumer();
    const data = await getCustomerPreferences(identity);
    return { data, headers: privateNoStore };
  });
}

export async function PATCH(request: Request) {
  return handleApiRequest(request, async () => {
    const identity = await requireApiConsumer();
    const input = await parseJsonBody(request, updateCustomerPreferencesSchema);
    const data = await updateCustomerPreferences(identity, input);
    return { data, headers: privateNoStore };
  });
}
