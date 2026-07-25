import { requireApiStaff } from "@/lib/http/auth";
import { parseJsonBody } from "@/lib/http/request";
import { handleApiRequest } from "@/lib/http/server";
import { inventoryStockAdjustmentSchema } from "@/modules/inventory/schema";
import { adjustInventoryStock } from "@/modules/inventory/server/adjust-stock";
import { throwStockAdjustmentError } from "@/modules/inventory/server/api-errors";

const privateNoStore = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  return handleApiRequest(request, async () => {
    const actor = await requireApiStaff("inventory:update");
    const input = await parseJsonBody(request, inventoryStockAdjustmentSchema);
    const result = await adjustInventoryStock(actor, input);
    if (!result.ok) throwStockAdjustmentError(result.error);

    return { data: result.value, headers: privateNoStore };
  });
}
