import { ApiError } from "@/lib/errors/api-error";
import { requireApiStaff } from "@/lib/http/auth";
import { handleApiRequest } from "@/lib/http/server";
import { holdIdentifierSchema } from "@/modules/holds/schema";
import { holdCapabilities } from "@/modules/holds/server/policy";
import { getAdminHold } from "@/modules/holds/server/queries";

const privateNoStore = { "Cache-Control": "private, no-store" };

type RouteContext = { params: Promise<{ holdId: string }> };

export async function GET(request: Request, context: RouteContext) {
  return handleApiRequest(request, async () => {
    await requireApiStaff(holdCapabilities.read);
    const { holdId } = await context.params;
    const identifier = holdIdentifierSchema.parse(holdId);
    const hold = await getAdminHold(identifier);
    if (!hold) {
      throw new ApiError({
        code: "HOLD_NOT_FOUND",
        message: "The selected hold could not be found.",
        status: 404,
      });
    }
    return { data: hold, headers: privateNoStore };
  });
}
