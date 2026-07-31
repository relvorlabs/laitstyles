import { z } from "zod";

const dateFilterSchema = z.string().trim().min(1).max(40);
const pageSchema = z.coerce.number().int().positive().default(1);
const perPageSchema = z.coerce.number().int().min(1).max(100).default(25);

export const financeListQuerySchema = z.object({
  page: pageSchema,
  perPage: perPageSchema,
  from: dateFilterSchema.optional(),
  to: dateFilterSchema.optional(),
});

export const financeLedgerQuerySchema = financeListQuerySchema.extend({
  sourceType: z.string().trim().min(1).max(80).optional(),
});

export const settlementListQuerySchema = financeListQuerySchema.extend({
  status: z.enum(["failed", "pending", "processing", "success"]).optional(),
});

export const settlementIdentifierSchema = z.string().trim().regex(/^\d+$/);
export const financeTransactionIdentifierSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^[A-Za-z0-9.=_-]+$/);
export const payoutRecipientIdentifierSchema = z.string().uuid();
export const payoutTransferIdentifierSchema = z.string().uuid();

export const bankListQuerySchema = z.object({
  country: z.enum(["ghana", "kenya", "nigeria", "south africa"]).default("nigeria"),
  currency: z.string().trim().length(3).toUpperCase().default("NGN"),
  type: z.string().trim().min(1).max(30).optional(),
  perPage: z.coerce.number().int().min(1).max(100).default(50),
  next: z.string().trim().min(1).max(200).optional(),
  previous: z.string().trim().min(1).max(200).optional(),
});

export const resolveBankAccountBodySchema = z.object({
  accountNumber: z.string().trim().regex(/^\d{6,20}$/),
  bankCode: z.string().trim().regex(/^[A-Za-z0-9_-]+$/),
});

export const recipientListQuerySchema = z.object({
  page: pageSchema,
  perPage: perPageSchema,
  active: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
});

export const createRecipientBodySchema = z.object({
  type: z.enum(["basa", "ghipss", "mobile_money", "nuban"]).default("nuban"),
  name: z.string().trim().min(2).max(120),
  accountNumber: z.string().trim().regex(/^\d{6,20}$/),
  bankCode: z.string().trim().regex(/^[A-Za-z0-9_-]+$/),
  currency: z.literal("NGN"),
  description: z.string().trim().min(1).max(240).optional(),
});

export const updateRecipientBodySchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().optional(),
});

export const transferListQuerySchema = z.object({
  page: pageSchema,
  perPage: perPageSchema,
  status: z
    .enum([
      "pending",
      "otp_required",
      "processing",
      "needs_reconciliation",
      "success",
      "failed",
      "reversed",
    ])
    .optional(),
  recipientId: z.string().uuid().optional(),
});

export const initiateTransferBodySchema = z.object({
  recipientId: payoutRecipientIdentifierSchema,
  amountMinor: z.number().int().positive().safe(),
  currency: z.literal("NGN"),
  reason: z.string().trim().min(3).max(240),
});

export const finalizeTransferBodySchema = z.object({
  otp: z.string().trim().regex(/^\d{6}$/),
});

export const reconcileFinanceBodySchema = z
  .object({
    scope: z.enum(["all", "settlements", "transactions", "transfers"]).default("all"),
    transferId: payoutTransferIdentifierSchema.optional(),
    settlementId: settlementIdentifierSchema.optional(),
  })
  .superRefine((value, context) => {
    if (value.scope === "transfers" && value.transferId === undefined) {
      context.addIssue({
        code: "custom",
        path: ["transferId"],
        message: "A transfer ID is required for transfer reconciliation.",
      });
    }
    if (value.scope === "settlements" && value.settlementId === undefined) {
      context.addIssue({
        code: "custom",
        path: ["settlementId"],
        message: "A settlement ID is required for settlement reconciliation.",
      });
    }
  });

export type FinanceListQuery = z.infer<typeof financeListQuerySchema>;
export type FinanceLedgerQuery = z.infer<typeof financeLedgerQuerySchema>;
export type SettlementListQuery = z.infer<typeof settlementListQuerySchema>;
export type RecipientListQuery = z.infer<typeof recipientListQuerySchema>;
export type TransferListQuery = z.infer<typeof transferListQuerySchema>;
export type CreateRecipientBody = z.infer<typeof createRecipientBodySchema>;
export type UpdateRecipientBody = z.infer<typeof updateRecipientBodySchema>;
export type InitiateTransferBody = z.infer<typeof initiateTransferBodySchema>;
export type ReconcileFinanceBody = z.infer<typeof reconcileFinanceBodySchema>;
