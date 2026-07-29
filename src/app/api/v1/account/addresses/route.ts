import { requireApiConsumer } from "@/lib/http/auth";
import { parseJsonBody } from "@/lib/http/request";
import { handleApiRequest } from "@/lib/http/server";
import { createOwnedAddressSchema } from "@/modules/customers/schema";
import { createOwnedAddress, listOwnedAddresses } from "@/modules/customers/server/addresses";

const privateNoStore = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  return handleApiRequest(request, async () => {
    const identity = await requireApiConsumer();
    const addresses = await listOwnedAddresses(identity);
    return { data: addresses, headers: privateNoStore };
  });
}

export async function POST(request: Request) {
  return handleApiRequest(request, async () => {
    const identity = await requireApiConsumer();
    const input = await parseJsonBody(request, createOwnedAddressSchema);
    const address = await createOwnedAddress(identity, input);
    return { data: address, status: 201, headers: privateNoStore };
  });
}
