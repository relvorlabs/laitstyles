import { requireApiStaff } from "@/lib/http/auth";
import { parseSearchParams } from "@/lib/http/request";
import { handleApiRequest } from "@/lib/http/server";
import { inventoryProductListSearchSchema } from "@/modules/inventory/schema";
import { findInventoryProductPage } from "@/modules/inventory/server/product-page";
import { getAdminProductsByIds } from "@/modules/products/server/queries";

export async function GET(request: Request) {
  return handleApiRequest(request, async () => {
    await requireApiStaff("inventory:read");
    const input = parseSearchParams(request, inventoryProductListSearchSchema);
    const page = await findInventoryProductPage(input);
    const products = await getAdminProductsByIds(page.productIds);

    return {
      data: products,
      meta: {
        ...page.pagination,
        summary: page.summary,
        viewCounts: page.viewCounts,
      },
      headers: { "Cache-Control": "private, no-store" },
    };
  });
}
