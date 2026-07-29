import { z } from "zod";
import { handleApiRequest } from "@/lib/http/server";
import {
  requireAccountSecurityIdentity,
  throwAccountSecurityError,
} from "@/modules/auth/server/account-security-http";
import { unenrollFactor } from "@/modules/auth/server/mfa";

const privateNoStore = { "Cache-Control": "private, no-store" };
const factorIdSchema = z.string().trim().min(1);
type FactorRouteContext = { params: Promise<{ factorId: string }> };

export async function DELETE(request: Request, context: FactorRouteContext) {
  return handleApiRequest(request, async () => {
    const identity = await requireAccountSecurityIdentity();
    const { factorId } = await context.params;
    const parsedFactorId = factorIdSchema.parse(factorId);
    try {
      return {
        data: await unenrollFactor(identity, parsedFactorId),
        headers: privateNoStore,
      };
    } catch (error) {
      throwAccountSecurityError(error);
    }
  });
}
