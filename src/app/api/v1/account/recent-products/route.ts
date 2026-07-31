import { z } from "zod";
import { requireApiConsumer } from "@/lib/http/auth";
import { parseJsonBody } from "@/lib/http/request";
import { handleApiRequest } from "@/lib/http/server";
import {
  listOwnedRecentProductIds,
  recordOwnedRecentProductIds,
} from "@/modules/customers/server/recent-products";

const privateNoStore = { "Cache-Control": "private, no-store" };
const recentProductsInputSchema = z.object({
  productIds: z.array(z.string().trim().min(1).max(128)).min(1).max(8),
});

export async function GET(request: Request) {
  return handleApiRequest(request, async () => {
    const identity = await requireApiConsumer();
    const productIds = await listOwnedRecentProductIds(identity);
    return { data: productIds, headers: privateNoStore };
  });
}

export async function PUT(request: Request) {
  return handleApiRequest(request, async () => {
    const identity = await requireApiConsumer();
    const input = await parseJsonBody(request, recentProductsInputSchema);
    const productIds = await recordOwnedRecentProductIds(identity, input.productIds);
    return { data: productIds, headers: privateNoStore };
  });
}
