import { requireApiConsumer } from "@/lib/http/auth";
import { handleApiRequest } from "@/lib/http/server";
import { productIdentifierSchema } from "@/modules/customers/schema";
import { removeOwnedSavedProduct } from "@/modules/customers/server/saved-products";

const privateNoStore = { "Cache-Control": "private, no-store" };

type RouteContext = { params: Promise<{ productId: string }> };

export async function DELETE(request: Request, context: RouteContext) {
  return handleApiRequest(request, async () => {
    const identity = await requireApiConsumer();
    const { productId } = await context.params;
    const identifier = productIdentifierSchema.parse(productId);
    await removeOwnedSavedProduct(identity, identifier);
    return { data: { productId: identifier }, headers: privateNoStore };
  });
}
