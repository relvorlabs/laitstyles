import { requireApiStaff } from "@/lib/http/auth";
import { parseJsonBody } from "@/lib/http/request";
import { handleApiRequest } from "@/lib/http/server";
import { productTaxonomyReorderSchema } from "@/modules/products/schema";
import { throwProductTaxonomyError } from "@/modules/products/server/api-errors";
import { invalidateProductCatalogue } from "@/modules/products/server/cache";
import { reorderProductTaxonomy } from "@/modules/products/server/taxonomy-commands";

const privateNoStore = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  return handleApiRequest(request, async () => {
    const actor = await requireApiStaff("inventory:update");
    const input = await parseJsonBody(request, productTaxonomyReorderSchema);
    const result = await reorderProductTaxonomy(actor, input);
    if (!result.ok) throwProductTaxonomyError(result.error);

    invalidateProductCatalogue(result.value.affectedProductSlugs);
    const { affectedProductSlugs: _affectedProductSlugs, ...data } = result.value;
    return { data, headers: privateNoStore };
  });
}
