import { ApiError } from "@/lib/errors/api-error";
import { requireApiStaff } from "@/lib/http/auth";
import { parseJsonBody } from "@/lib/http/request";
import { handleApiRequest } from "@/lib/http/server";
import { productIdSchema, productMutationSchema } from "@/modules/products/schema";
import {
  throwProductLifecycleError,
  throwProductMutationError,
} from "@/modules/products/server/api-errors";
import { invalidateProductCatalogue } from "@/modules/products/server/cache";
import { deleteProduct, saveProduct } from "@/modules/products/server/commands";
import { getAdminProduct } from "@/modules/products/server/queries";

const privateNoStore = { "Cache-Control": "private, no-store" };

type ProductRouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: ProductRouteContext) {
  return handleApiRequest(request, async () => {
    await requireApiStaff("inventory:read");
    const productId = await parseProductId(context);
    const product = await getAdminProduct(productId);
    if (!product) {
      throw new ApiError({
        code: "PRODUCT_NOT_FOUND",
        message: "The selected product could not be found.",
        status: 404,
      });
    }
    return { data: product, headers: privateNoStore };
  });
}

export async function PATCH(request: Request, context: ProductRouteContext) {
  return handleApiRequest(request, async () => {
    const actor = await requireApiStaff("inventory:update");
    const productId = await parseProductId(context);
    const input = await parseJsonBody(request, productMutationSchema);
    if (input.values.productId && input.values.productId !== productId) {
      throw new ApiError({
        code: "PRODUCT_ID_MISMATCH",
        message: "The product ID in the request does not match the route.",
        status: 409,
        fieldErrors: { productId: "Use the product ID from the current product route." },
      });
    }

    const result = await saveProduct(
      actor,
      { ...input.values, productId } as typeof input.values,
      input.intent,
    );
    if (!result.ok) throwProductMutationError(result.error);

    invalidateProductCatalogue([result.value.previousSlug, result.value.product.slug]);
    const { previousSlug: _previousSlug, ...data } = result.value;
    return { data, headers: privateNoStore };
  });
}

export async function DELETE(request: Request, context: ProductRouteContext) {
  return handleApiRequest(request, async () => {
    const actor = await requireApiStaff("inventory:delete");
    const productId = await parseProductId(context);
    const result = await deleteProduct(actor, productId);
    if (!result.ok) throwProductLifecycleError(result.error);

    invalidateProductCatalogue([result.value.slug]);
    const { slug: _slug, ...data } = result.value;
    return { data, headers: privateNoStore };
  });
}

async function parseProductId(context: ProductRouteContext): Promise<string> {
  const { id } = await context.params;
  const parsed = productIdSchema.safeParse(id);
  if (parsed.success) return parsed.data;
  throw new ApiError({
    code: "PRODUCT_NOT_FOUND",
    message: "The selected product could not be found.",
    status: 404,
  });
}
