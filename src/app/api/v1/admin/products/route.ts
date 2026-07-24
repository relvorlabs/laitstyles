import { ApiError } from "@/lib/errors/api-error";
import { requireApiStaff } from "@/lib/http/auth";
import { parseJsonBody, parseSearchParams } from "@/lib/http/request";
import { handleApiRequest } from "@/lib/http/server";
import { adminProductListSearchSchema, productMutationSchema } from "@/modules/products/schema";
import { throwProductMutationError } from "@/modules/products/server/api-errors";
import { invalidateProductCatalogue } from "@/modules/products/server/cache";
import { saveProduct } from "@/modules/products/server/commands";
import { listAdminProducts } from "@/modules/products/server/queries";

const privateNoStore = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  return handleApiRequest(request, async () => {
    await requireApiStaff("inventory:read");
    const input = parseSearchParams(request, adminProductListSearchSchema);
    const result = await listAdminProducts(input);
    return { data: result.data, meta: result.meta, headers: privateNoStore };
  });
}

export async function POST(request: Request) {
  return handleApiRequest(request, async () => {
    const actor = await requireApiStaff("inventory:create");
    const input = await parseJsonBody(request, productMutationSchema);
    if (input.values.productId) {
      throw new ApiError({
        code: "PRODUCT_ID_NOT_ALLOWED",
        message: "A new product request must not include an existing product ID.",
        status: 422,
        fieldErrors: { productId: "Remove the existing product ID before creating a product." },
      });
    }

    const result = await saveProduct(actor, input.values, input.intent);
    if (!result.ok) throwProductMutationError(result.error);

    invalidateProductCatalogue([result.value.previousSlug, result.value.product.slug]);
    const { previousSlug: _previousSlug, ...data } = result.value;
    return { data, status: 201, headers: privateNoStore };
  });
}
