import { parseJsonBody } from "@/lib/http/request";
import { handleApiRequest } from "@/lib/http/server";
import { accountPasswordChangeSchema } from "@/modules/auth/schema";
import { changeAccountPassword } from "@/modules/auth/server/account-security";
import {
  requireAccountSecurityIdentity,
  throwAccountSecurityError,
} from "@/modules/auth/server/account-security-http";

const privateNoStore = { "Cache-Control": "private, no-store" };

export async function PATCH(request: Request) {
  return handleApiRequest(request, async () => {
    const identity = await requireAccountSecurityIdentity();
    const input = await parseJsonBody(request, accountPasswordChangeSchema);
    try {
      return {
        data: await changeAccountPassword(identity, input),
        headers: privateNoStore,
      };
    } catch (error) {
      throwAccountSecurityError(error);
    }
  });
}
