import { ApiError } from "@/lib/errors/api-error";
import { requireApiConsumer } from "@/lib/http/auth";
import { handleApiRequest } from "@/lib/http/server";
import { dataExportIdentifierSchema } from "@/modules/account-lifecycle/schema";
import { getAccountExport } from "@/modules/account-lifecycle/server/exports";

type RouteContext = { params: Promise<{ exportId: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  return handleApiRequest(request, async () => {
    const identity = await requireApiConsumer();
    const exportId = dataExportIdentifierSchema.parse((await params).exportId);
    const data = await getAccountExport(identity, exportId);
    if (!data) {
      throw new ApiError({
        code: "EXPORT_NOT_FOUND",
        message: "The selected export could not be found.",
        status: 404,
      });
    }
    return { data, headers: { "Cache-Control": "private, no-store" } };
  });
}
