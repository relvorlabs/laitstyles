import { requireApiStaff } from "@/lib/http/auth";
import { parseSearchParams } from "@/lib/http/request";
import { handleApiRequest } from "@/lib/http/server";
import { inventoryStockMovementSearchSchema } from "@/modules/inventory/schema";
import { listStockMovements } from "@/modules/inventory/server/queries";

export async function GET(request: Request) {
  return handleApiRequest(request, async () => {
    await requireApiStaff("inventory:read");
    const input = parseSearchParams(request, inventoryStockMovementSearchSchema);
    const result = await listStockMovements(input);
    return {
      data: result.data,
      meta: result.meta,
      headers: { "Cache-Control": "private, no-store" },
    };
  });
}
