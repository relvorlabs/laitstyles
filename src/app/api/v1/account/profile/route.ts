import { requireApiConsumer } from "@/lib/http/auth";
import { parseJsonBody } from "@/lib/http/request";
import { handleApiRequest } from "@/lib/http/server";
import { updateOwnedProfileSchema } from "@/modules/customers/schema";
import { getOwnedProfile, updateOwnedProfile } from "@/modules/customers/server/account-profile";

const privateNoStore = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  return handleApiRequest(request, async () => {
    const identity = await requireApiConsumer();
    const profile = await getOwnedProfile(identity);
    return { data: profile, headers: privateNoStore };
  });
}

export async function PATCH(request: Request) {
  return handleApiRequest(request, async () => {
    const identity = await requireApiConsumer();
    const input = await parseJsonBody(request, updateOwnedProfileSchema);
    const profile = await updateOwnedProfile(identity, input);
    return { data: profile, headers: privateNoStore };
  });
}
