import { requireApiStaff } from "@/lib/http/auth";
import { parseJsonBody } from "@/lib/http/request";
import { handleApiRequest } from "@/lib/http/server";
import { productTaxonomyInputSchema } from "@/modules/products/schema";
import { throwProductTaxonomyError } from "@/modules/products/server/api-errors";
import { invalidateProductCatalogue } from "@/modules/products/server/cache";
import { createProductTaxonomy } from "@/modules/products/server/commands";
import { listProductTaxonomy } from "@/modules/products/server/queries";

const privateNoStore = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  return handleApiRequest(request, async () => {
    await requireApiStaff("inventory:read");
    return { data: await listProductTaxonomy(), headers: privateNoStore };
  });
}

export async function POST(request: Request) {
  return handleApiRequest(request, async () => {
    const actor = await requireApiStaff("inventory:update");
    const input = await parseJsonBody(request, productTaxonomyInputSchema);
    const result = await createProductTaxonomy(actor, input);
    if (!result.ok) throwProductTaxonomyError(result.error);

    invalidateProductCatalogue(result.value.affectedProductSlugs);
    const { affectedProductSlugs: _affectedProductSlugs, ...data } = result.value;
    return { data, status: 201, headers: privateNoStore };
  });
}
