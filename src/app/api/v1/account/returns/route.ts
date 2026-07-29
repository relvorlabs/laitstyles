import { requireApiConsumer } from "@/lib/http/auth";
import { parseJsonBody } from "@/lib/http/request";
import { handleApiRequest } from "@/lib/http/server";
import { createAccountReturnSchema } from "@/modules/returns/schema";
import {
  createCustomerReturn,
  listAccountReturns,
} from "@/modules/returns/server/account-returns";

const privateNoStore = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  return handleApiRequest(request, async () => {
    const identity = await requireApiConsumer();
    const returns = await listAccountReturns(identity.customerId);
    return { data: returns, headers: privateNoStore };
  });
}

export async function POST(request: Request) {
  return handleApiRequest(request, async () => {
    const identity = await requireApiConsumer();
    const input = await parseJsonBody(request, createAccountReturnSchema);
    const created = await createCustomerReturn(identity, input);
    return { data: created, status: 201, headers: privateNoStore };
  });
}
