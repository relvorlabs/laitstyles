import { requireApiStaff } from "@/lib/http/auth";
import { parseJsonBody, parseSearchParams } from "@/lib/http/request";
import { handleApiRequest } from "@/lib/http/server";
import { adminReturnListSearchSchema, createReturnSchema } from "@/modules/returns/schema";
import { throwReturnActionError } from "@/modules/returns/server/api-errors";
import { createReturn } from "@/modules/returns/server/commands";
import { returnCapabilities } from "@/modules/returns/server/policy";
import { listAdminReturns } from "@/modules/returns/server/queries";

const privateNoStore = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  return handleApiRequest(request, async () => {
    await requireApiStaff(returnCapabilities.read);
    const input = parseSearchParams(request, adminReturnListSearchSchema);
    const result = await listAdminReturns(input);
    return { data: result.data, meta: result.meta, headers: privateNoStore };
  });
}

export async function POST(request: Request) {
  return handleApiRequest(request, async () => {
    const actor = await requireApiStaff(returnCapabilities.update);
    const input = await parseJsonBody(request, createReturnSchema);
    const result = await createReturn(actor, input);
    if (!result.ok) throwReturnActionError(result.error);
    return { data: result.value, status: 201, headers: privateNoStore };
  });
}
