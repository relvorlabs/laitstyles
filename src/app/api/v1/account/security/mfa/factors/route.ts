import { parseJsonBody } from "@/lib/http/request";
import { handleApiRequest } from "@/lib/http/server";
import { mfaEnrollTotpSchema } from "@/modules/auth/schema";
import {
  requireAccountSecurityIdentity,
  throwAccountSecurityError,
} from "@/modules/auth/server/account-security-http";
import { enrollTotp, listMfaFactors } from "@/modules/auth/server/mfa";

const privateNoStore = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  return handleApiRequest(request, async () => {
    const identity = await requireAccountSecurityIdentity();
    try {
      return { data: await listMfaFactors(identity), headers: privateNoStore };
    } catch (error) {
      throwAccountSecurityError(error);
    }
  });
}

export async function POST(request: Request) {
  return handleApiRequest(request, async () => {
    const identity = await requireAccountSecurityIdentity();
    const input = await parseJsonBody(request, mfaEnrollTotpSchema);
    try {
      return {
        data: await enrollTotp(identity, input),
        status: 201,
        headers: privateNoStore,
      };
    } catch (error) {
      throwAccountSecurityError(error);
    }
  });
}
