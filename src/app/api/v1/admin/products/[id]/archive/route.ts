import { ApiError } from "@/lib/errors/api-error";
import { requireApiStaff } from "@/lib/http/auth";
import { handleApiRequest } from "@/lib/http/server";
import { productIdSchema } from "@/modules/products/schema";
import { throwProductLifecycleError } from "@/modules/products/server/api-errors";
import { invalidateProductCatalogue } from "@/modules/products/server/cache";
import { archiveProduct } from "@/modules/products/server/commands";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleApiRequest(request, async () => {
    const actor = await requireApiStaff("inventory:archive");
    const { id } = await params;
    const parsed = productIdSchema.safeParse(id);
    if (!parsed.success) {
      throw new ApiError({
        code: "PRODUCT_NOT_FOUND",
        message: "The selected product could not be found.",
        status: 404,
      });
    }

    const result = await archiveProduct(actor, parsed.data);
    if (!result.ok) throwProductLifecycleError(result.error);
    invalidateProductCatalogue([result.value.slug]);
    const { slug: _slug, ...data } = result.value;
    return { data, headers: { "Cache-Control": "private, no-store" } };
  });
}
