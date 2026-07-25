import { requireApiStaff } from "@/lib/http/auth";
import { parseJsonBody } from "@/lib/http/request";
import { handleApiRequest } from "@/lib/http/server";
import { storeSettingsInputSchema } from "@/modules/settings/schema";
import { throwSettingsActionError } from "@/modules/settings/server/api-errors";
import { saveStoreSettings } from "@/modules/settings/server/commands";
import { settingsCapabilities } from "@/modules/settings/server/policy";
import { getStoreSettings } from "@/modules/settings/server/queries";

const privateNoStore = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  return handleApiRequest(request, async () => {
    await requireApiStaff(settingsCapabilities.read);
    const data = await getStoreSettings();
    return { data, headers: privateNoStore };
  });
}

export async function PATCH(request: Request) {
  return handleApiRequest(request, async () => {
    const actor = await requireApiStaff(settingsCapabilities.update);
    const input = await parseJsonBody(request, storeSettingsInputSchema);
    const result = await saveStoreSettings(actor, input);
    if (!result.ok) throwSettingsActionError(result.error);
    return { data: result.value, headers: privateNoStore };
  });
}
