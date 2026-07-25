import { requireApiStaff } from "@/lib/http/auth";
import { parseJsonBody } from "@/lib/http/request";
import { handleApiRequest } from "@/lib/http/server";
import { addCustomerNoteSchema, customerIdentifierSchema } from "@/modules/customers/schema";
import { throwCustomerActionError } from "@/modules/customers/server/api-errors";
import { addCustomerNote } from "@/modules/customers/server/commands";
import { customerCapabilities } from "@/modules/customers/server/policy";

const privateNoStore = { "Cache-Control": "private, no-store" };

type RouteContext = { params: Promise<{ customerId: string }> };

export async function POST(request: Request, context: RouteContext) {
  return handleApiRequest(request, async () => {
    const actor = await requireApiStaff(customerCapabilities.note);
    const { customerId } = await context.params;
    const identifier = customerIdentifierSchema.parse(customerId);
    const input = await parseJsonBody(request, addCustomerNoteSchema);
    const result = await addCustomerNote(actor, { customerId: identifier, body: input.body });
    if (!result.ok) throwCustomerActionError(result.error);
    return { data: result.value, status: 201, headers: privateNoStore };
  });
}
