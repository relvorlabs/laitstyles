import { requireApiConsumer } from "@/lib/http/auth";
import { parseJsonBody } from "@/lib/http/request";
import { handleApiRequest } from "@/lib/http/server";
import { ownedCartWriteSchema } from "@/modules/cart/schema";
import {
  clearOwnedCart,
  listOwnedCart,
  mergeOwnedCart,
  replaceOwnedCart,
} from "@/modules/cart/server/owned-cart";

const privateNoStore = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  return handleApiRequest(request, async () => {
    const identity = await requireApiConsumer();
    const cart = await listOwnedCart(identity);
    return { data: cart, headers: privateNoStore };
  });
}

export async function PUT(request: Request) {
  return handleApiRequest(request, async () => {
    const identity = await requireApiConsumer();
    const input = await parseJsonBody(request, ownedCartWriteSchema);
    const cart = await replaceOwnedCart(identity, input);
    return { data: cart, headers: privateNoStore };
  });
}

export async function POST(request: Request) {
  return handleApiRequest(request, async () => {
    const identity = await requireApiConsumer();
    const input = await parseJsonBody(request, ownedCartWriteSchema);
    const cart = await mergeOwnedCart(identity, input);
    return { data: cart, headers: privateNoStore };
  });
}

export async function DELETE(request: Request) {
  return handleApiRequest(request, async () => {
    const identity = await requireApiConsumer();
    const cart = await clearOwnedCart(identity);
    return { data: cart, headers: privateNoStore };
  });
}
