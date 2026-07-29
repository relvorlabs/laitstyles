import { parseJsonBody } from "@/lib/http/request";
import { handleApiRequest } from "@/lib/http/server";
import { mfaChallengeSchema } from "@/modules/auth/schema";
import {
  requireAccountSecurityIdentity,
  throwAccountSecurityError,
} from "@/modules/auth/server/account-security-http";
import { createMfaChallenge } from "@/modules/auth/server/mfa";

const privateNoStore = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  return handleApiRequest(request, async () => {
    const identity = await requireAccountSecurityIdentity();
    const input = await parseJsonBody(request, mfaChallengeSchema);
    try {
      return {
        data: await createMfaChallenge(identity, input),
        status: 201,
        headers: privateNoStore,
      };
    } catch (error) {
      throwAccountSecurityError(error);
    }
  });
}
