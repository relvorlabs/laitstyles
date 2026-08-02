import "server-only";

import { z } from "zod";
import { PaystackProviderError, paystackRequest } from "@/modules/payments/server/paystack/client";
import {
  type PaystackRawDispute,
  paystackDisputeEvidenceResponseSchema,
  paystackDisputeMutationResponseSchema,
  paystackDisputeResponseSchema,
  paystackDisputeUploadResponseSchema,
  paystackListDisputesResponseSchema,
} from "@/modules/payments/server/paystack/schemas";

const providerIdSchema = z.string().trim().regex(/^\d+$/);
const fileNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(180)
  .regex(/^[A-Za-z0-9._ -]+$/);
const amountMinorSchema = z.number().int().nonnegative().safe();
const isoDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/);

const listDisputesInputSchema = z.object({
  page: z.number().int().positive().default(1),
  perPage: z.number().int().min(1).max(100).default(50),
  transaction: z.string().trim().min(1).optional(),
  status: z
    .enum(["awaiting-merchant-feedback", "awaiting-bank-feedback", "pending", "resolved"])
    .optional(),
  from: z.string().trim().min(1).optional(),
  to: z.string().trim().min(1).optional(),
});

const updateDisputeInputSchema = z.object({
  refundAmountMinor: amountMinorSchema,
  uploadedFilename: fileNameSchema.optional(),
});

const evidenceInputSchema = z.object({
  customerEmail: z.string().trim().email(),
  customerName: z.string().trim().min(1).max(160),
  customerPhone: z.string().trim().min(5).max(40),
  serviceDetails: z.string().trim().min(3).max(2_000),
  deliveryAddress: z.string().trim().min(3).max(500).optional(),
  deliveryDate: isoDateSchema.optional(),
});

const resolveDisputeInputSchema = z.object({
  resolution: z.enum(["merchant-accepted", "declined"]),
  message: z.string().trim().min(3).max(1_000),
  refundAmountMinor: amountMinorSchema,
  uploadedFilename: fileNameSchema.optional(),
  evidenceId: z.string().trim().regex(/^\d+$/).optional(),
});

const MAX_EVIDENCE_BYTES = 5 * 1024 * 1024;
const allowedEvidenceTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
const knownStatuses = new Set([
  "archived",
  "awaiting-bank-feedback",
  "awaiting-merchant-feedback",
  "pending",
  "resolved",
]);

export type ListDisputesInput = z.input<typeof listDisputesInputSchema>;
export type UpdateDisputeInput = z.input<typeof updateDisputeInputSchema>;
export type AddDisputeEvidenceInput = z.input<typeof evidenceInputSchema>;
export type ResolveDisputeInput = z.input<typeof resolveDisputeInputSchema>;
export type PaystackDisputeStatus =
  | "archived"
  | "awaiting-bank-feedback"
  | "awaiting-merchant-feedback"
  | "pending"
  | "resolved"
  | "unknown";

export type PaystackDispute = {
  id: string;
  transactionId: string | null;
  transactionReference: string | null;
  status: PaystackDisputeStatus;
  providerStatus: string;
  resolution: string | null;
  category: string | null;
  amountMinor: number;
  currency: string;
  reason: string | null;
  dueAt: string | null;
  resolvedAt: string | null;
  evidence: unknown;
  attachments: unknown;
  createdAt: string | null;
  updatedAt: string | null;
};

export type PaystackDisputePagination = {
  total: number | null;
  skipped: number | null;
  perPage: number;
  page: number;
  pageCount: number | null;
};

export async function listDisputes(
  input: ListDisputesInput = {},
  fetchImplementation?: typeof fetch,
): Promise<{ disputes: PaystackDispute[]; pagination: PaystackDisputePagination }> {
  const parsed = listDisputesInputSchema.parse(input);
  const response = await paystackRequest({
    operation: "list-disputes",
    path: "/dispute",
    schema: paystackListDisputesResponseSchema,
    fetchImplementation,
    query: {
      page: parsed.page,
      perPage: parsed.perPage,
      transaction: parsed.transaction,
      status: parsed.status,
      from: parsed.from,
      to: parsed.to,
    },
  });

  return {
    disputes: response.data.map(mapPaystackDispute),
    pagination: response.meta ?? {
      total: null,
      skipped: null,
      perPage: parsed.perPage,
      page: parsed.page,
      pageCount: null,
    },
  };
}

export async function fetchDispute(
  id: string,
  fetchImplementation?: typeof fetch,
): Promise<PaystackDispute> {
  const disputeId = providerIdSchema.parse(id);
  const response = await paystackRequest({
    operation: "fetch-dispute",
    path: `/dispute/${disputeId}`,
    schema: paystackDisputeResponseSchema,
    fetchImplementation,
  });
  return mapPaystackDispute(response.data);
}

export async function updateDispute(
  id: string,
  input: UpdateDisputeInput,
  fetchImplementation?: typeof fetch,
): Promise<PaystackDispute> {
  const disputeId = providerIdSchema.parse(id);
  const parsed = updateDisputeInputSchema.parse(input);
  await paystackRequest({
    operation: "update-dispute",
    path: `/dispute/${disputeId}`,
    method: "PUT",
    schema: paystackDisputeMutationResponseSchema,
    fetchImplementation,
    body: {
      refund_amount: parsed.refundAmountMinor,
      ...(parsed.uploadedFilename ? { uploaded_filename: parsed.uploadedFilename } : {}),
    },
  });
  return fetchDispute(disputeId, fetchImplementation);
}

export async function addDisputeEvidence(
  id: string,
  input: AddDisputeEvidenceInput,
  fetchImplementation?: typeof fetch,
) {
  const disputeId = providerIdSchema.parse(id);
  const parsed = evidenceInputSchema.parse(input);
  const response = await paystackRequest({
    operation: "add-dispute-evidence",
    path: `/dispute/${disputeId}/evidence`,
    method: "POST",
    schema: paystackDisputeEvidenceResponseSchema,
    fetchImplementation,
    body: {
      customer_email: parsed.customerEmail,
      customer_name: parsed.customerName,
      customer_phone: parsed.customerPhone,
      service_details: parsed.serviceDetails,
      ...(parsed.deliveryAddress ? { delivery_address: parsed.deliveryAddress } : {}),
      ...(parsed.deliveryDate ? { delivery_date: parsed.deliveryDate } : {}),
    },
  });
  return {
    id: String(response.data.id),
    disputeId: String(response.data.dispute),
    customerEmail: response.data.customer_email,
    customerName: response.data.customer_name,
    customerPhone: response.data.customer_phone,
    serviceDetails: response.data.service_details,
    deliveryAddress: response.data.delivery_address ?? null,
    deliveryDate: response.data.delivery_date ?? null,
    createdAt: response.data.createdAt ?? null,
    updatedAt: response.data.updatedAt ?? null,
  };
}

export async function getDisputeUploadUrl(
  id: string,
  uploadFilename: string,
  fetchImplementation?: typeof fetch,
) {
  const disputeId = providerIdSchema.parse(id);
  const fileName = fileNameSchema.parse(uploadFilename);
  const response = await paystackRequest({
    operation: "get-dispute-upload-url",
    path: `/dispute/${disputeId}/upload_url`,
    schema: paystackDisputeUploadResponseSchema,
    fetchImplementation,
    query: { upload_filename: fileName },
  });
  assertTrustedUploadUrl(response.data.signedUrl);
  return { signedUrl: response.data.signedUrl, fileName: response.data.fileName };
}

export async function uploadDisputeEvidenceFile(input: {
  signedUrl: string;
  file: Blob;
  contentType: string;
  fetchImplementation?: typeof fetch;
}) {
  assertTrustedUploadUrl(input.signedUrl);
  if (
    !allowedEvidenceTypes.has(input.contentType) ||
    input.file.size < 1 ||
    input.file.size > MAX_EVIDENCE_BYTES
  ) {
    throw new TypeError("Dispute evidence must be a PDF, PNG or JPEG no larger than 5 MB.");
  }

  let response: Response;
  try {
    response = await (input.fetchImplementation ?? fetch)(input.signedUrl, {
      method: "PUT",
      body: input.file,
      headers: { "Content-Type": input.contentType },
      redirect: "error",
      cache: "no-store",
    });
  } catch (cause) {
    throw new PaystackProviderError(
      "Paystack evidence storage could not be reached.",
      "upload-dispute-evidence",
      null,
      "PAYSTACK_EVIDENCE_UPLOAD_UNAVAILABLE",
      null,
    );
  }
  if (!response.ok) {
    throw new PaystackProviderError(
      `Paystack evidence upload failed (${response.status}).`,
      "upload-dispute-evidence",
      response.status,
      "PAYSTACK_EVIDENCE_UPLOAD_FAILED",
      response.headers.get("x-request-id"),
    );
  }
}

export async function resolveDispute(
  id: string,
  input: ResolveDisputeInput,
  fetchImplementation?: typeof fetch,
): Promise<PaystackDispute> {
  const disputeId = providerIdSchema.parse(id);
  const parsed = resolveDisputeInputSchema.parse(input);
  await paystackRequest({
    operation: "resolve-dispute",
    path: `/dispute/${disputeId}/resolve`,
    method: "PUT",
    schema: paystackDisputeMutationResponseSchema,
    fetchImplementation,
    body: {
      resolution: parsed.resolution,
      message: parsed.message,
      refund_amount: parsed.refundAmountMinor,
      ...(parsed.uploadedFilename ? { uploaded_filename: parsed.uploadedFilename } : {}),
      ...(parsed.evidenceId ? { evidence: Number(parsed.evidenceId) } : {}),
    },
  });
  return fetchDispute(disputeId, fetchImplementation);
}

export function acceptDispute(
  id: string,
  input: Omit<ResolveDisputeInput, "resolution">,
  fetchImplementation?: typeof fetch,
) {
  return resolveDispute(id, { ...input, resolution: "merchant-accepted" }, fetchImplementation);
}

export function declineDispute(
  id: string,
  input: Omit<ResolveDisputeInput, "resolution">,
  fetchImplementation?: typeof fetch,
) {
  return resolveDispute(id, { ...input, resolution: "declined" }, fetchImplementation);
}

export function mapPaystackDispute(dispute: PaystackRawDispute): PaystackDispute {
  const transaction = dispute.transaction;
  const transactionId =
    typeof transaction === "object" ? String(transaction.id) : String(transaction);
  const transactionReference =
    typeof transaction === "object"
      ? (transaction.reference ??
        dispute.transaction_reference ??
        dispute.merchant_transaction_reference ??
        null)
      : (dispute.transaction_reference ?? dispute.merchant_transaction_reference ?? null);
  const amountMinor =
    dispute.refund_amount ??
    dispute.amount ??
    (typeof transaction === "object" ? (transaction.amount ?? 0) : 0);
  const providerStatus = dispute.status;
  return {
    id: String(dispute.id),
    transactionId,
    transactionReference,
    status: knownStatuses.has(providerStatus)
      ? (providerStatus as Exclude<PaystackDisputeStatus, "unknown">)
      : "unknown",
    providerStatus,
    resolution: dispute.resolution ?? null,
    category: dispute.category ?? null,
    amountMinor,
    currency:
      dispute.currency ??
      (typeof transaction === "object" ? (transaction.currency ?? "NGN") : "NGN"),
    reason: dispute.reason ?? dispute.note ?? null,
    dueAt: dispute.dueAt ?? dispute.due_at ?? null,
    resolvedAt: dispute.resolvedAt ?? dispute.resolved_at ?? null,
    evidence: dispute.evidence ?? null,
    attachments: dispute.attachments ?? null,
    createdAt: dispute.createdAt ?? dispute.created_at ?? null,
    updatedAt: dispute.updatedAt ?? dispute.updated_at ?? null,
  };
}

function assertTrustedUploadUrl(value: string) {
  const url = new URL(value);
  const host = url.hostname.toLowerCase();
  if (
    url.protocol !== "https:" ||
    !(host === "files.paystack.co" || host.endsWith(".amazonaws.com"))
  ) {
    throw new PaystackProviderError(
      "Paystack returned an invalid evidence upload destination.",
      "get-dispute-upload-url",
      null,
      "PAYSTACK_INVALID_UPLOAD_URL",
      null,
    );
  }
}

export const DISPUTE_EVIDENCE_MAX_BYTES = MAX_EVIDENCE_BYTES;
export const DISPUTE_EVIDENCE_CONTENT_TYPES = [...allowedEvidenceTypes];
