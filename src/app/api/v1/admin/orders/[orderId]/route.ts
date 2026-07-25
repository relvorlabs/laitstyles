import { ApiError } from "@/lib/errors/api-error";
import { requireApiStaff } from "@/lib/http/auth";
import { parseJsonBody } from "@/lib/http/request";
import { handleApiRequest } from "@/lib/http/server";
import { orderIdentifierSchema, orderTransitionSchema } from "@/modules/orders/schema";
import { throwOrderActionError } from "@/modules/orders/server/api-errors";
import { transitionOrder } from "@/modules/orders/server/commands";
import { getAdminOrder } from "@/modules/orders/server/queries";

const privateNoStore = { "Cache-Control": "private, no-store" };

type RouteContext = {
  params: Promise<{ orderId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  return handleApiRequest(request, async () => {
    await requireApiStaff("orders:read");
    const { orderId } = await context.params;
    const identifier = orderIdentifierSchema.parse(orderId);
    const order = await getAdminOrder(identifier);
    if (!order) {
      throw new ApiError({
        code: "ORDER_NOT_FOUND",
        message: "The selected order could not be found.",
        status: 404,
      });
    }
    return { data: order, headers: privateNoStore };
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  return handleApiRequest(request, async () => {
    const actor = await requireApiStaff("orders:update");
    const { orderId } = await context.params;
    const identifier = orderIdentifierSchema.parse(orderId);
    const input = await parseJsonBody(request, orderTransitionSchema);
    const result = await transitionOrder(actor, identifier, input.nextStatus);
    if (!result.ok) throwOrderActionError(result.error);
    return { data: result.value, headers: privateNoStore };
  });
}
