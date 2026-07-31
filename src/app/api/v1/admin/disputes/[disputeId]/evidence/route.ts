import { ApiError } from "@/lib/errors/api-error";
import { requireApiStaff } from "@/lib/http/auth";
import { handleApiRequest } from "@/lib/http/server";
import { DISPUTE_EVIDENCE_MAX_BYTES } from "@/modules/payments/dispute-contract";
import {
  disputeEvidenceBodySchema,
  disputeEvidenceFileSchema,
  disputeIdentifierSchema,
} from "@/modules/payments/dispute-schema";
import {
  reconcileOrderDisputeState,
  submitDisputeEvidence,
  throwDisputeApiError,
} from "@/modules/payments/server/disputes/index";
import {
  requireFinancialMutationOrigin,
  requireIdempotencyKey,
} from "@/modules/payments/server/request-security";

const privateNoStore = { "Cache-Control": "private, no-store" };
const MAX_MULTIPART_BYTES = DISPUTE_EVIDENCE_MAX_BYTES + 512 * 1024;
type RouteContext = { params: Promise<{ disputeId: string }> };

export async function POST(request: Request, context: RouteContext) {
  return handleApiRequest(request, async () => {
    requireFinancialMutationOrigin(request);
    const idempotencyKey = requireIdempotencyKey(request);
    const actor = await requireApiStaff("payments:refund");
    const { disputeId } = await context.params;
    const id = disputeIdentifierSchema.parse(disputeId);

    const rawContentLength = request.headers.get("content-length")?.trim();
    const contentLength = rawContentLength ? Number(rawContentLength) : Number.NaN;
    if (!Number.isSafeInteger(contentLength) || contentLength < 1) {
      throw new ApiError({
        code: "CONTENT_LENGTH_REQUIRED",
        message: "A bounded Content-Length is required for dispute evidence.",
        status: 411,
      });
    }
    if (contentLength > MAX_MULTIPART_BYTES) {
      throw new ApiError({
        code: "EVIDENCE_FILE_TOO_LARGE",
        message: "Dispute evidence cannot exceed 5 MB.",
        status: 413,
      });
    }
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data")) {
      throw new ApiError({
        code: "MULTIPART_REQUIRED",
        message: "Dispute evidence must use multipart form data.",
        status: 415,
      });
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch (cause: unknown) {
      throw new ApiError({
        code: "MALFORMED_MULTIPART",
        message: "The dispute evidence form could not be read.",
        status: 400,
        cause,
      });
    }

    const input = disputeEvidenceBodySchema.parse({
      customerEmail: stringField(form, "customerEmail"),
      customerName: stringField(form, "customerName"),
      customerPhone: stringField(form, "customerPhone"),
      serviceDetails: stringField(form, "serviceDetails"),
      deliveryAddress: optionalStringField(form, "deliveryAddress"),
      deliveryDate: optionalStringField(form, "deliveryDate"),
      uploadedFilename: optionalStringField(form, "uploadedFilename"),
    });

    const formValue = form.get("file");
    const file = formValue instanceof Blob && formValue.size > 0 ? formValue : null;
    const fileDescriptor = file
      ? disputeEvidenceFileSchema.parse({
          name: readUploadedFileName(file),
          type: file.type,
          size: file.size,
        })
      : null;
    if (!file && !input.uploadedFilename) {
      throw new ApiError({
        code: "EVIDENCE_FILE_REQUIRED",
        message: "Attach a PDF, PNG or JPEG evidence file.",
        status: 422,
      });
    }

    const result = await submitDisputeEvidence(actor, id, {
      ...input,
      idempotencyKey,
      ...(file && fileDescriptor
        ? {
            file: {
              blob: file,
              name: fileDescriptor.name,
              contentType: fileDescriptor.type,
            },
          }
        : {}),
    });
    if (!result.ok) throwDisputeApiError(result.error);
    return {
      data: await reconcileOrderDisputeState(result.value),
      headers: privateNoStore,
    };
  });
}

function stringField(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

function optionalStringField(form: FormData, name: string): string | undefined {
  const value = form.get(name);
  return typeof value === "string" && value.trim() ? value : undefined;
}

function readUploadedFileName(file: Blob): string {
  return typeof File !== "undefined" && file instanceof File && file.name.trim()
    ? file.name
    : "evidence";
}
