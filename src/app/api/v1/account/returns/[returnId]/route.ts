import { ApiError } from "@/lib/errors/api-error";
import { requireApiConsumer } from "@/lib/http/auth";
import { handleApiRequest } from "@/lib/http/server";
import { returnIdentifierSchema } from "@/modules/returns/schema";
import { getAccountReturn } from "@/modules/returns/server/account-returns";

const privateNoStore = { "Cache-Control": "private, no-store" };
type RouteContext = { params: Promise<{ returnId: string }> };

export async function GET(request: Request, context: RouteContext) {
  return handleApiRequest(request, async () => {
    const identity = await requireApiConsumer();
    const { returnId } = await context.params;
    const identifier = returnIdentifierSchema.parse(returnId);
    const record = await getAccountReturn(identity.customerId, identifier);
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
