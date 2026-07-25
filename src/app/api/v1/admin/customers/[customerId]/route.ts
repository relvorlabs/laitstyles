import { ApiError } from "@/lib/errors/api-error";
import { requireApiStaff } from "@/lib/http/auth";
import { handleApiRequest } from "@/lib/http/server";
import { customerIdentifierSchema } from "@/modules/customers/schema";
import { customerCapabilities } from "@/modules/customers/server/policy";
import { getAdminCustomer } from "@/modules/customers/server/queries";

const privateNoStore = { "Cache-Control": "private, no-store" };

type RouteContext = { params: Promise<{ customerId: string }> };

export async function GET(request: Request, context: RouteContext) {
  return handleApiRequest(request, async () => {
    await requireApiStaff(customerCapabilities.read);
    const { customerId } = await context.params;
    const identifier = customerIdentifierSchema.parse(customerId);
    const customer = await getAdminCustomer(identifier);
    if (!customer) {
      throw new ApiError({
        code: "CUSTOMER_NOT_FOUND",
        message: "The selected customer could not be found.",
        status: 404,
      });
    }
    return { data: customer, headers: privateNoStore };
  });
}
