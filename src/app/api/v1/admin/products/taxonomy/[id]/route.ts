import { ApiError } from "@/lib/errors/api-error";
import { requireApiStaff } from "@/lib/http/auth";
import { parseJsonBody } from "@/lib/http/request";
import { handleApiRequest } from "@/lib/http/server";
import {
  productTaxonomyIdSchema,
  productTaxonomyRenameSchema,
} from "@/modules/products/schema";
import { throwProductTaxonomyError } from "@/modules/products/server/api-errors";
import { invalidateProductCatalogue } from "@/modules/products/server/cache";
import {
  deleteProductTaxonomy,
  renameProductTaxonomy,
} from "@/modules/products/server/commands";

const privateNoStore = { "Cache-Control": "private, no-store" };
type TaxonomyRouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: TaxonomyRouteContext) {
  return handleApiRequest(request, async () => {
    const actor = await requireApiStaff("inventory:update");
    const taxonomyId = await parseTaxonomyId(context);
    const input = await parseJsonBody(request, productTaxonomyRenameSchema);
    const result = await renameProductTaxonomy(actor, taxonomyId, input.name);
    if (!result.ok) throwProductTaxonomyError(result.error);

    invalidateProductCatalogue(result.value.affectedProductSlugs);
    const { affectedProductSlugs: _affectedProductSlugs, ...data } = result.value;
    return { data, headers: privateNoStore };
  });
}

export async function DELETE(request: Request, context: TaxonomyRouteContext) {
  return handleApiRequest(request, async () => {
    const actor = await requireApiStaff("inventory:update");
    const taxonomyId = await parseTaxonomyId(context);
    const result = await deleteProductTaxonomy(actor, taxonomyId);
    if (!result.ok) throwProductTaxonomyError(result.error);

    invalidateProductCatalogue(result.value.affectedProductSlugs);
    const { affectedProductSlugs: _affectedProductSlugs, ...data } = result.value;
    return { data, headers: privateNoStore };
  });
}

async function parseTaxonomyId(context: TaxonomyRouteContext): Promise<string> {
  const { id } = await context.params;
  const parsed = productTaxonomyIdSchema.safeParse(id);
  if (parsed.success) return parsed.data;
  throw new ApiError({
    code: "TAXONOMY_NOT_FOUND",
    message: "The selected catalogue group could not be found.",
    status: 404,
  });
}
