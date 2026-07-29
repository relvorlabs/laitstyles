import { requireApiConsumer } from "@/lib/http/auth";
import { parseJsonBody } from "@/lib/http/request";
import { handleApiRequest } from "@/lib/http/server";
import { saveOwnedProductSchema } from "@/modules/customers/schema";
import {
  listOwnedSavedProductIds,
  saveOwnedProduct,
} from "@/modules/customers/server/saved-products";

const privateNoStore = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  return handleApiRequest(request, async () => {
    const identity = await requireApiConsumer();
    const productIds = await listOwnedSavedProductIds(identity);
    return { data: productIds, headers: privateNoStore };
  });
}

export async function POST(request: Request) {
  return handleApiRequest(request, async () => {
    const identity = await requireApiConsumer();
    const input = await parseJsonBody(request, saveOwnedProductSchema);
    await saveOwnedProduct(identity, input.productId);
    return { data: { productId: input.productId }, status: 201, headers: privateNoStore };
  });
}
