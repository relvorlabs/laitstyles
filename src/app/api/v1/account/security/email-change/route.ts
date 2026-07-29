import { parseJsonBody } from "@/lib/http/request";
import { handleApiRequest } from "@/lib/http/server";
import { accountEmailChangeSchema } from "@/modules/auth/schema";
import { requestAccountEmailChange } from "@/modules/auth/server/account-security";
import {
  requireAccountSecurityIdentity,
  throwAccountSecurityError,
} from "@/modules/auth/server/account-security-http";

const privateNoStore = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  return handleApiRequest(request, async () => {
    const identity = await requireAccountSecurityIdentity();
    const input = await parseJsonBody(request, accountEmailChangeSchema);
    try {
      return {
        data: await requestAccountEmailChange(identity, input),
        status: 202,
        headers: privateNoStore,
      };
    } catch (error) {
      throwAccountSecurityError(error);
    }
  });
}
