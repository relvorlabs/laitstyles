import { requireApiConsumer } from "@/lib/http/auth";
import { parseJsonBody } from "@/lib/http/request";
import { handleApiRequest } from "@/lib/http/server";
import { addressIdentifierSchema, updateOwnedAddressSchema } from "@/modules/customers/schema";
import { deleteOwnedAddress, updateOwnedAddress } from "@/modules/customers/server/addresses";

const privateNoStore = { "Cache-Control": "private, no-store" };

type RouteContext = { params: Promise<{ addressId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  return handleApiRequest(request, async () => {
    const identity = await requireApiConsumer();
    const { addressId } = await context.params;
    const identifier = addressIdentifierSchema.parse(addressId);
    const input = await parseJsonBody(request, updateOwnedAddressSchema);
    const address = await updateOwnedAddress(identity, identifier, input);
    return { data: address, headers: privateNoStore };
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  return handleApiRequest(request, async () => {
    const identity = await requireApiConsumer();
    const { addressId } = await context.params;
    const identifier = addressIdentifierSchema.parse(addressId);
    await deleteOwnedAddress(identity, identifier);
    return { data: { id: identifier }, headers: privateNoStore };
  });
}
