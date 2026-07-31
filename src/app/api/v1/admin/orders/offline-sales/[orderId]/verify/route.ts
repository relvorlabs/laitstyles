import { requireApiStaff } from "@/lib/http/auth";
import { handleApiRequest } from "@/lib/http/server";
import { throwOrderActionError } from "@/modules/orders/server/api-errors";
import { verifyOfflineSalePayment } from "@/modules/orders/server/commands";

const privateNoStore = { "Cache-Control": "private, no-store" };
type RouteContext = { params: Promise<{ orderId: string }> };

export async function POST(request: Request, context: RouteContext) {
  return handleApiRequest(request, async () => {
    const actor = await requireApiStaff("sales:record");
    const { orderId } = await context.params;
    const result = await verifyOfflineSalePayment(actor, orderId.trim());
    if (!result.ok) throwOrderActionError(result.error);
    return { data: result.value, headers: privateNoStore };
  });
}
