import { z } from "zod";
import { signCloudinaryUploadParams } from "@/lib/assets/server/cloudinary-signature";
import { ApiError } from "@/lib/errors/api-error";
import { requireApiStaff } from "@/lib/http/auth";
import { parseJsonBody } from "@/lib/http/request";
import { handleApiRequest } from "@/lib/http/server";

const signRequestSchema = z.object({
  paramsToSign: z.record(z.string(), z.union([z.string(), z.number()])),
});

export async function POST(request: Request) {
  return handleApiRequest(request, async () => {
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

    return { data: { signature }, headers: { "Cache-Control": "private, no-store" } };
  });
}
