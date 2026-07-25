import { handleApiRequest } from "@/lib/http/server";
import { getStorefrontShellCatalog } from "@/modules/products/server/storefront/shell-query";

const publicCache = {
  "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
};

export async function GET(request: Request) {
  return handleApiRequest(request, async () => ({
    data: await getStorefrontShellCatalog(),
    headers: publicCache,
  }));
}
