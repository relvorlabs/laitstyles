import { requireApiStaff } from "@/lib/http/auth";
import { parseJsonBody } from "@/lib/http/request";
import { handleApiRequest } from "@/lib/http/server";
import { convertHoldSchema, holdIdentifierSchema } from "@/modules/holds/schema";
import { throwHoldActionError } from "@/modules/holds/server/api-errors";
import { convertHold } from "@/modules/holds/server/commands";
import { holdCapabilities } from "@/modules/holds/server/policy";

const privateNoStore = { "Cache-Control": "private, no-store" };
type RouteContext = { params: Promise<{ holdId: string }> };

export async function POST(request: Request, context: RouteContext) {
  return handleApiRequest(request, async () => {
    const actor = await requireApiStaff(holdCapabilities.update);
    const { holdId } = await context.params;
    const identifier = holdIdentifierSchema.parse(holdId);
    const input = await parseJsonBody(request, convertHoldSchema);
    const result = await convertHold(actor, identifier, input);
    if (!result.ok) throwHoldActionError(result.error);
    return { data: result.value, headers: privateNoStore };
  });
}
