import "server-only";

import { createHash } from "node:crypto";
import { z } from "zod";
import { paystackRequest } from "@/modules/payments/server/paystack/client";
import {
  paystackPaginationSchema,
  paystackProviderIdSchema,
  paystackSuccessEnvelope,
} from "@/modules/payments/server/paystack/schemas";

const recipientTypeSchema = z.enum(["basa", "ghipss", "mobile_money", "nuban"]);
const currencySchema = z.string().trim().length(3).toUpperCase();
const recipientIdentifierSchema = z.string().trim().min(1).regex(/^[A-Za-z0-9_-]+$/);

const createRecipientInputSchema = z.object({
  type: recipientTypeSchema.default("nuban"),
  name: z.string().trim().min(1).max(120),
  accountNumber: z.string().trim().min(4).max(40),
  bankCode: z.string().trim().min(1).max(30),
  currency: currencySchema.default("NGN"),
  description: z.string().trim().min(1).max(240).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const listRecipientsInputSchema = z.object({
  page: z.number().int().positive().default(1),
  perPage: z.number().int().min(1).max(100).default(50),
  from: z.string().trim().min(1).optional(),
  to: z.string().trim().min(1).optional(),
});

const updateRecipientInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().optional(),
});

const recipientSchema = z.object({
  id: paystackProviderIdSchema,
  type: recipientTypeSchema,
  name: z.string().min(1),
  currency: z.string().length(3),
  recipient_code: z.string().min(1),
  active: z.boolean(),
  is_deleted: z.boolean().optional(),
  isDeleted: z.boolean().optional(),
  createdAt: z.string().optional().nullable(),
  updatedAt: z.string().optional().nullable(),
  details: z.object({
    account_number: z.string().min(4),
    account_name: z.string().optional().nullable(),
    bank_code: z.string().min(1),
    bank_name: z.string().optional().nullable(),
  }),
});

const recipientResponseSchema = paystackSuccessEnvelope(recipientSchema);
const listRecipientsResponseSchema = z.object({
  status: z.literal(true),
  message: z.string().min(1),
  data: z.array(recipientSchema),
  meta: paystackPaginationSchema,
});
const deleteRecipientResponseSchema = z.object({
  status: z.literal(true),
  message: z.string().min(1),
});

export type CreateRecipientInput = z.input<typeof createRecipientInputSchema>;
export type ListRecipientsInput = z.input<typeof listRecipientsInputSchema>;
export type UpdateRecipientInput = z.input<typeof updateRecipientInputSchema>;
export type PaystackTransferRecipient = ReturnType<typeof mapRecipient>;

export async function createRecipient(
  input: CreateRecipientInput,
  fetchImplementation?: typeof fetch,
) {
  const parsed = createRecipientInputSchema.parse(input);
  const response = await paystackRequest({
    operation: "create-transfer-recipient",
    path: "/transferrecipient",
    method: "POST",
    schema: recipientResponseSchema,
    fetchImplementation,
    body: {
      type: parsed.type,
      name: parsed.name,
      account_number: parsed.accountNumber,
      bank_code: parsed.bankCode,
      currency: parsed.currency,
      ...(parsed.description === undefined ? {} : { description: parsed.description }),
      ...(parsed.metadata === undefined ? {} : { metadata: parsed.metadata }),
    },
  });
  return mapRecipient(response.data);
}

export async function listRecipients(
  input: ListRecipientsInput = {},
  fetchImplementation?: typeof fetch,
) {
  const parsed = listRecipientsInputSchema.parse(input);
  const response = await paystackRequest({
    operation: "list-transfer-recipients",
    path: "/transferrecipient",
    schema: listRecipientsResponseSchema,
    fetchImplementation,
    query: {
      page: parsed.page,
      perPage: parsed.perPage,
      from: parsed.from,
      to: parsed.to,
    },
  });
  return {
    recipients: response.data.map(mapRecipient),
    pagination: response.meta,
  };
}

export async function updateRecipient(
  idOrCode: string,
  input: UpdateRecipientInput,
  fetchImplementation?: typeof fetch,
) {
  const parsedIdentifier = recipientIdentifierSchema.parse(idOrCode);
  const parsed = updateRecipientInputSchema.parse(input);
  const response = await paystackRequest({
    operation: "update-transfer-recipient",
    path: `/transferrecipient/${encodeURIComponent(parsedIdentifier)}`,
    method: "PUT",
    schema: recipientResponseSchema,
    fetchImplementation,
    body: {
      name: parsed.name,
      ...(parsed.email === undefined ? {} : { email: parsed.email }),
    },
  });
  return mapRecipient(response.data);
}

export async function deleteRecipient(
  idOrCode: string,
  fetchImplementation?: typeof fetch,
) {
  const parsedIdentifier = recipientIdentifierSchema.parse(idOrCode);
  const response = await paystackRequest({
    operation: "delete-transfer-recipient",
    path: `/transferrecipient/${encodeURIComponent(parsedIdentifier)}`,
    method: "DELETE",
    schema: deleteRecipientResponseSchema,
    fetchImplementation,
  });
  return { deleted: true as const, message: response.message };
}

function mapRecipient(recipient: z.output<typeof recipientSchema>) {
  const accountNumber = recipient.details.account_number;
  const currency = recipient.currency.toUpperCase();
  return {
    id: String(recipient.id),
    recipientCode: recipient.recipient_code,
    type: recipient.type,
    name: recipient.name,
    currency,
    active: recipient.active && !(recipient.is_deleted ?? recipient.isDeleted ?? false),
    account: {
      name: recipient.details.account_name ?? recipient.name,
      bankCode: recipient.details.bank_code,
      bankName: recipient.details.bank_name ?? null,
      maskedNumber: maskAccountNumber(accountNumber),
      fingerprint: createHash("sha256")
        .update(`${currency}:${recipient.details.bank_code}:${accountNumber}`)
        .digest("hex"),
    },
    createdAt: recipient.createdAt ?? null,
    updatedAt: recipient.updatedAt ?? null,
  };
}

function maskAccountNumber(accountNumber: string) {
  const visibleDigits = accountNumber.slice(-4);
  return `${"*".repeat(Math.max(0, accountNumber.length - visibleDigits.length))}${visibleDigits}`;
}
