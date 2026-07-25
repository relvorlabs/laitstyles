import { ApiError } from "@/lib/errors/api-error";
import { requireApiStaff } from "@/lib/http/auth";
import { parseJsonBody } from "@/lib/http/request";
import { handleApiRequest } from "@/lib/http/server";
import { returnIdentifierSchema, returnTransitionSchema } from "@/modules/returns/schema";
import { throwReturnActionError } from "@/modules/returns/server/api-errors";
import { transitionReturn } from "@/modules/returns/server/commands";
import { returnCapabilities } from "@/modules/returns/server/policy";
import { getAdminReturn } from "@/modules/returns/server/queries";

const privateNoStore = { "Cache-Control": "private, no-store" };

type RouteContext = { params: Promise<{ returnId: string }> };

export async function GET(request: Request, context: RouteContext) {
  return handleApiRequest(request, async () => {
    await requireApiStaff(returnCapabilities.read);
    const { returnId } = await context.params;
    const identifier = returnIdentifierSchema.parse(returnId);
    const record = await getAdminReturn(identifier);
    if (!record) {
      throw new ApiError({
        code: "RETURN_NOT_FOUND",
        message: "The selected return could not be found.",
        status: 404,
      });
    }
    return { data: record, headers: privateNoStore };
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  return handleApiRequest(request, async () => {
    const actor = await requireApiStaff(returnCapabilities.update);
    const { returnId } = await context.params;
    const identifier = returnIdentifierSchema.parse(returnId);
    const input = await parseJsonBody(request, returnTransitionSchema);
    const result = await transitionReturn(actor, identifier, input.nextStatus);
    if (!result.ok) throwReturnActionError(result.error);
    return { data: result.value, headers: privateNoStore };
  });
}
