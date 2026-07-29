import { requireApiConsumer } from "@/lib/http/auth";
import { createApiRequestContext, withRequestId } from "@/lib/http/request-context";
import { apiFailure, mapApiError } from "@/lib/http/server";
import { dataExportIdentifierSchema } from "@/modules/account-lifecycle/schema";
import { streamAccountExport } from "@/modules/account-lifecycle/server/exports";

type RouteContext = { params: Promise<{ exportId: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const context = createApiRequestContext(request);
  try {
    const identity = await requireApiConsumer();
    const exportId = dataExportIdentifierSchema.parse((await params).exportId);
    const artifact = await streamAccountExport(identity, exportId);
    const safeName = artifact.filename.replace(/[^a-zA-Z0-9._-]/g, "-");
    return new Response(artifact.body, {
      status: 200,
      headers: withRequestId(
        {
          "Cache-Control": "private, no-store",
          "Content-Type": artifact.contentType,
          "Content-Disposition": `attachment; filename="${safeName}"`,
          "X-Content-Type-Options": "nosniff",
        },
        context.requestId,
      ),
    });
  } catch (error) {
    return apiFailure(mapApiError(error, context), {
      headers: withRequestId({ "Cache-Control": "private, no-store" }, context.requestId),
    });
  }
}
