import "server-only";

import { z } from "zod";
import { PaystackProviderError, paystackRequest } from "@/modules/payments/server/paystack/client";
import {
  paystackPaginationSchema,
  paystackProviderIdSchema,
  paystackSuccessEnvelope,
} from "@/modules/payments/server/paystack/schemas";

const referenceSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9_-]{16,50}$/);
const providerIdentifierSchema = z
  .string()
  .trim()
  .min(1)
  .regex(/^[A-Za-z0-9_-]+$/);
const currencySchema = z.string().trim().length(3).toUpperCase();
const transferStatusSchema = z.enum([
  "abandoned",
  "blocked",
  "failed",
  "otp",
  "pending",
  "received",
  "rejected",
  "reversed",
  "success",
]);

const initiateTransferInputSchema = z.object({
  amountMinor: z.number().int().positive().safe(),
  recipientCode: providerIdentifierSchema,
  reference: referenceSchema,
  reason: z.string().trim().min(1).max(240),
  currency: currencySchema.default("NGN"),
});

const finalizeTransferOtpInputSchema = z.object({
  transferCode: providerIdentifierSchema,
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/),
});

const listTransfersInputSchema = z.object({
  page: z.number().int().positive().default(1),
  perPage: z.number().int().min(1).max(100).default(50),
  recipient: z.number().int().positive().optional(),
  from: z.string().trim().min(1).optional(),
  to: z.string().trim().min(1).optional(),
});

const transferRecipientSchema = z.object({
  id: paystackProviderIdSchema,
  recipient_code: z.string().min(1),
});

const transferSchema = z.object({
  id: paystackProviderIdSchema,
  transfer_code: z.string().min(1),
  reference: z.string().min(1),
  amount: z.number().int().nonnegative().safe(),
  currency: z.string().length(3),
  status: transferStatusSchema,
  source: z.string().min(1),
  reason: z.string().optional().nullable(),
  recipient: z.union([paystackProviderIdSchema, transferRecipientSchema]).optional().nullable(),
  createdAt: z.string().optional().nullable(),
  created_at: z.string().optional().nullable(),
  updatedAt: z.string().optional().nullable(),
  updated_at: z.string().optional().nullable(),
  transferred_at: z.string().optional().nullable(),
});

const transferResponseSchema = paystackSuccessEnvelope(transferSchema);
const listTransfersResponseSchema = z.object({
  status: z.literal(true),
  message: z.string().min(1),
  data: z.array(transferSchema),
  meta: paystackPaginationSchema,
});
const messageResponseSchema = z.object({
  status: z.literal(true),
  message: z.string().min(1),
});
const transferEventSchema = z.discriminatedUnion("event", [
  z.object({ event: z.literal("transfer.success"), data: transferSchema }),
  z.object({ event: z.literal("transfer.failed"), data: transferSchema }),
  z.object({ event: z.literal("transfer.reversed"), data: transferSchema }),
]);

export type InitiateTransferInput = z.input<typeof initiateTransferInputSchema>;
export type FinalizeTransferOtpInput = z.input<typeof finalizeTransferOtpInputSchema>;
export type ListTransfersInput = z.input<typeof listTransfersInputSchema>;
export type PaystackTransferStatus = z.infer<typeof transferStatusSchema>;
export type PaystackTransfer = ReturnType<typeof mapTransfer>;

export async function initiateTransfer(
  input: InitiateTransferInput,
  fetchImplementation?: typeof fetch,
) {
  const parsed = initiateTransferInputSchema.parse(input);
  let response: z.output<typeof transferResponseSchema>;
  try {
    response = await paystackRequest({
      operation: "initiate-transfer",
      path: "/transfer",
      method: "POST",
      schema: transferResponseSchema,
      fetchImplementation,
      body: {
        source: "balance",
        amount: parsed.amountMinor,
        recipient: parsed.recipientCode,
        reference: parsed.reference,
        reason: parsed.reason,
        currency: parsed.currency,
      },
    });
  } catch (error) {
    if (!isAmbiguousInitiationError(error)) throw error;
    try {
      const transfer = await verifyTransfer(parsed.reference, fetchImplementation);
      return { kind: "recovered" as const, transfer };
    } catch {
      return { kind: "needs_reconciliation" as const, reference: parsed.reference };
    }
  }

  const transfer = mapTransfer(response.data);
  if (transfer.status === "otp") return { kind: "otp_required" as const, transfer };
  if (["failed", "reversed", "success"].includes(transfer.status)) {
    return { kind: transfer.status, transfer };
  }
  return { kind: "pending" as const, transfer };
}

export async function finalizeTransferOtp(
  input: FinalizeTransferOtpInput,
  fetchImplementation?: typeof fetch,
) {
  const parsed = finalizeTransferOtpInputSchema.parse(input);
  const response = await paystackRequest({
    operation: "finalize-transfer-otp",
    path: "/transfer/finalize_transfer",
    method: "POST",
    schema: transferResponseSchema,
    fetchImplementation,
    body: { transfer_code: parsed.transferCode, otp: parsed.otp },
  });
  return mapTransfer(response.data);
}

export async function resendTransferOtp(transferCode: string, fetchImplementation?: typeof fetch) {
  const parsedCode = providerIdentifierSchema.parse(transferCode);
  const response = await paystackRequest({
    operation: "resend-transfer-otp",
    path: "/transfer/resend_otp",
    method: "POST",
    schema: messageResponseSchema,
    fetchImplementation,
    body: { transfer_code: parsedCode, reason: "resend_otp" },
  });
  return { resent: true as const, message: response.message };
}

export async function listTransfers(
  input: ListTransfersInput = {},
  fetchImplementation?: typeof fetch,
) {
  const parsed = listTransfersInputSchema.parse(input);
  const response = await paystackRequest({
    operation: "list-transfers",
    path: "/transfer",
    schema: listTransfersResponseSchema,
    fetchImplementation,
    query: {
      page: parsed.page,
      perPage: parsed.perPage,
      recipient: parsed.recipient,
      from: parsed.from,
      to: parsed.to,
    },
  });
  return {
    transfers: response.data.map(mapTransfer),
    pagination: response.meta,
  };
}

export async function fetchTransfer(idOrCode: string, fetchImplementation?: typeof fetch) {
  const parsedIdentifier = providerIdentifierSchema.parse(idOrCode);
  const response = await paystackRequest({
    operation: "fetch-transfer",
    path: `/transfer/${encodeURIComponent(parsedIdentifier)}`,
    schema: transferResponseSchema,
    fetchImplementation,
  });
  return mapTransfer(response.data);
}

export async function verifyTransfer(reference: string, fetchImplementation?: typeof fetch) {
  const parsedReference = referenceSchema.parse(reference);
  const response = await paystackRequest({
    operation: "verify-transfer",
    path: `/transfer/verify/${encodeURIComponent(parsedReference)}`,
    schema: transferResponseSchema,
    fetchImplementation,
  });
  return mapTransfer(response.data);
}

export function normalizeTransferEvent(payload: unknown) {
  const parsed = transferEventSchema.parse(payload);
  const status = parsed.event.slice("transfer.".length) as "failed" | "reversed" | "success";
  return {
    event: parsed.event,
    status,
    transfer: { ...mapTransfer(parsed.data), status },
  };
}

function isAmbiguousInitiationError(error: unknown) {
  return (
    error instanceof PaystackProviderError &&
    (error.status === null || error.status >= 500 || error.code === "PAYSTACK_INVALID_RESPONSE")
  );
}

function mapTransfer(transfer: z.output<typeof transferSchema>) {
  return {
    id: String(transfer.id),
    transferCode: transfer.transfer_code,
    reference: transfer.reference,
    amountMinor: transfer.amount,
    currency: transfer.currency.toUpperCase(),
    status: transfer.status,
    source: transfer.source,
    reason: transfer.reason ?? null,
    recipientCode:
      transfer.recipient && typeof transfer.recipient === "object"
        ? transfer.recipient.recipient_code
        : null,
    createdAt: transfer.createdAt ?? transfer.created_at ?? null,
    updatedAt: transfer.updatedAt ?? transfer.updated_at ?? null,
    transferredAt: transfer.transferred_at ?? null,
  };
}
