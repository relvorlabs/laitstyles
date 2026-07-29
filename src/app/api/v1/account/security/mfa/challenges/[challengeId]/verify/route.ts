import { z } from "zod";
import { parseJsonBody } from "@/lib/http/request";
import { handleApiRequest } from "@/lib/http/server";
import { mfaVerifySchema } from "@/modules/auth/schema";
import {
  requireAccountSecurityIdentity,
  throwAccountSecurityError,
} from "@/modules/auth/server/account-security-http";
import { verifyMfaChallenge } from "@/modules/auth/server/mfa";

const privateNoStore = { "Cache-Control": "private, no-store" };
const challengeIdSchema = z.string().trim().min(1);
type ChallengeRouteContext = { params: Promise<{ challengeId: string }> };

export async function POST(request: Request, context: ChallengeRouteContext) {
  return handleApiRequest(request, async () => {
    const identity = await requireAccountSecurityIdentity();
    const { challengeId } = await context.params;
    const parsedChallengeId = challengeIdSchema.parse(challengeId);
    const input = await parseJsonBody(request, mfaVerifySchema);
    try {
      return {
        data: await verifyMfaChallenge(identity, parsedChallengeId, input),
        headers: privateNoStore,
      };
    } catch (error) {
      throwAccountSecurityError(error);
    }
  });
}
