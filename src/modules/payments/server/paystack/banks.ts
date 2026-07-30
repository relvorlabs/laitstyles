import "server-only";

import { createHash } from "node:crypto";
import { z } from "zod";
import { paystackRequest } from "@/modules/payments/server/paystack/client";
import { paystackProviderIdSchema } from "@/modules/payments/server/paystack/schemas";

const listBanksInputSchema = z.object({
  country: z.enum(["ghana", "kenya", "nigeria", "south africa"]).default("nigeria"),
  currency: z.string().trim().length(3).toUpperCase().default("NGN"),
  type: z.string().trim().min(1).optional(),
  perPage: z.number().int().min(1).max(100).default(50),
  next: z.string().trim().min(1).optional(),
  previous: z.string().trim().min(1).optional(),
});

const bankSchema = z.object({
  id: paystackProviderIdSchema,
  name: z.string().min(1),
  slug: z.string().min(1),
  code: z.string().min(1),
  gateway: z.string().optional().nullable(),
  supports_transfer: z.boolean().optional().default(false),
  active: z.boolean(),
  country: z.string().min(1),
  currency: z.string().length(3),
  type: z.string().min(1),
});

const listBanksResponseSchema = z.object({
  status: z.literal(true),
  message: z.string().min(1),
  data: z.array(bankSchema),
  meta: z
    .object({
      next: z.string().optional().nullable(),
      previous: z.string().optional().nullable(),
    })
    .optional(),
});

const resolveAccountInputSchema = z.object({
  accountNumber: z.string().trim().regex(/^\d{6,20}$/),
  bankCode: z.string().trim().regex(/^[A-Za-z0-9_-]+$/),
});

const resolveAccountResponseSchema = z.object({
  status: z.literal(true),
  message: z.string().min(1),
  data: z.object({
    account_number: z.string().min(1),
    account_name: z.string().min(1),
    bank_id: paystackProviderIdSchema.optional(),
  }),
});

export type ListBanksInput = z.input<typeof listBanksInputSchema>;

export async function listBanks(
  input: ListBanksInput = {},
  fetchImplementation?: typeof fetch,
) {
  const parsed = listBanksInputSchema.parse(input);
  const response = await paystackRequest({
    operation: "list-banks",
    path: "/bank",
    schema: listBanksResponseSchema,
    fetchImplementation,
    query: {
      country: parsed.country,
      currency: parsed.currency,
      type: parsed.type,
      perPage: parsed.perPage,
      use_cursor: true,
      next: parsed.next,
      previous: parsed.previous,
    },
  });
  return {
    banks: response.data.map((bank) => ({
      id: String(bank.id),
      name: bank.name,
      slug: bank.slug,
      code: bank.code,
      gateway: bank.gateway ?? null,
      active: bank.active,
      country: bank.country,
      currency: bank.currency.toUpperCase(),
      type: bank.type,
      supportsTransfer: bank.supports_transfer,
    })),
    cursors: {
      next: response.meta?.next ?? null,
      previous: response.meta?.previous ?? null,
    },
  };
}

export async function resolveAccount(
  input: z.input<typeof resolveAccountInputSchema>,
  fetchImplementation?: typeof fetch,
) {
  const parsed = resolveAccountInputSchema.parse(input);
  const response = await paystackRequest({
    operation: "resolve-bank-account",
    path: "/bank/resolve",
    schema: resolveAccountResponseSchema,
    fetchImplementation,
    query: {
      account_number: parsed.accountNumber,
      bank_code: parsed.bankCode,
    },
  });
  const accountNumber = response.data.account_number;
  const maskedAccountNumber = `${"*".repeat(Math.max(0, accountNumber.length - 4))}${accountNumber.slice(-4)}`;
  return {
    accountName: response.data.account_name,
    bankId: response.data.bank_id === undefined ? null : String(response.data.bank_id),
    bankCode: parsed.bankCode,
    maskedNumber: maskedAccountNumber,
    maskedAccountNumber,
    fingerprint: createHash("sha256")
      .update(`NGN:${parsed.bankCode}:${accountNumber}`)
      .digest("hex"),
  };
}
