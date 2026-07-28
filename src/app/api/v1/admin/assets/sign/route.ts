import { z } from "zod";
import { signCloudinaryUploadParams } from "@/lib/assets/server/cloudinary-signature";
import { ApiError } from "@/lib/errors/api-error";
import { requireApiStaff } from "@/lib/http/auth";
import { parseJsonBody } from "@/lib/http/request";
import { createApiRequestContext, withRequestId } from "@/lib/http/request-context";
import { apiFailure, mapApiError } from "@/lib/http/server";
import { NextResponse } from "next/server";

const signRequestSchema = z.object({
  paramsToSign: z.record(z.string(), z.union([z.string(), z.number()])),
});

export async function POST(request: Request) {
  const context = createApiRequestContext(request);

  try {
    await requireApiStaff();
    const { paramsToSign } = await parseJsonBody(request, signRequestSchema);

    let signature: string;
    try {
      signature = signCloudinaryUploadParams(paramsToSign);
    } catch (cause) {
      throw new ApiError({
        code: "ASSET_PROVIDER_UNCONFIGURED",
        message: "Image uploads are not configured on this server.",
        status: 503,
        cause,
      });
    }

    return NextResponse.json(
      { signature },
      {
        headers: withRequestId(
          { "Cache-Control": "private, no-store" },
          context.requestId,
        ),
      },
    );
  } catch (cause) {
    return apiFailure(mapApiError(cause, context), {
      headers: withRequestId(undefined, context.requestId),
    });
  }
}
