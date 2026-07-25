import { requireApiStaff } from "@/lib/http/auth";
import { parseJsonBody } from "@/lib/http/request";
import { handleApiRequest } from "@/lib/http/server";
import { offlineSaleSchema } from "@/modules/orders/schema";
import { throwOrderActionError } from "@/modules/orders/server/api-errors";
import { recordOfflineSale } from "@/modules/orders/server/commands";

const privateNoStore = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  return handleApiRequest(request, async () => {
    const actor = await requireApiStaff("sales:record");
    const input = await parseJsonBody(request, offlineSaleSchema);
    const result = await recordOfflineSale(actor, input);
    if (!result.ok) throwOrderActionError(result.error);

    return {
      data: result.value,
      status: 201,
      headers: privateNoStore,
    };
  });
}
