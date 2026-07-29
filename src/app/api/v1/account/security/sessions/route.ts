import { handleApiRequest } from "@/lib/http/server";
import {
  requireAccountSecurityIdentity,
  throwAccountSecurityError,
} from "@/modules/auth/server/account-security-http";
import { getAccountSessionSummary } from "@/modules/auth/server/account-sessions";

const privateNoStore = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  return handleApiRequest(request, async () => {
    const identity = await requireAccountSecurityIdentity();
    try {
      return { data: await getAccountSessionSummary(identity), headers: privateNoStore };
    } catch (error) {
      throwAccountSecurityError(error);
    }
  });
}
