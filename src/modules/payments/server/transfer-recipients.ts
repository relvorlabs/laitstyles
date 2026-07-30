import "server-only";

import { err, ok, type Result } from "@/lib/errors";
import { Prisma, prisma } from "@/lib/prisma";
import { hasCapability } from "@/modules/auth/permissions";
import type { StaffSession } from "@/modules/auth/server/session";
import type {
  CreateRecipientBody,
  RecipientListQuery,
  UpdateRecipientBody,
} from "@/modules/payments/finance-schema";
import { toRecipientProjection } from "@/modules/payments/server/finance-projection";
import type {
  FinanceError,
  PayoutRecipientProjection,
} from "@/modules/payments/server/finance-types";
import {
  encryptPayoutAccountNumber,
  fingerprintPayoutAccount,
  normalizeAccountNumber,
} from "@/modules/payments/server/payout-secrets";
import {
  createRecipient as createPaystackRecipient,
  deleteRecipient as deletePaystackRecipient,
  PaystackConfigurationError,
  PaystackProviderError,
  resolveAccount,
  updateRecipient as updatePaystackRecipient,
} from "@/modules/payments/server/paystack";

const unresolvedTransferStatuses = [
  "pending",
  "otp_required",
  "processing",
  "needs_reconciliation",
] as const;

export async function resolvePayoutAccount(
  actor: StaffSession,
  input: { accountNumber: string; bankCode: string },
): Promise<
  Result<
    { accountName: string; bankCode: string; maskedAccountNumber: string },
    FinanceError
  >
> {
  const denied = requireTransferCapability(actor);
  if (denied) return denied;
  try {
    const resolved = await resolveAccount(input);
    return ok({
      accountName: resolved.accountName,
      bankCode: resolved.bankCode,
      maskedAccountNumber: resolved.maskedAccountNumber,
    });
  } catch (error: unknown) {
    return providerFailure(error, "The bank account could not be resolved.");
  }
}

export async function listPayoutRecipients(
  actor: StaffSession,
  query: RecipientListQuery,
): Promise<
  Result<
    { items: PayoutRecipientProjection[]; page: number; perPage: number; total: number },
    FinanceError
  >
> {
  if (!hasCapability(actor.role, "finance:read")) {
    return err({ code: "FORBIDDEN", message: "You do not have permission to view payout recipients." });
  }
  const where: Prisma.payout_recipientsWhereInput = {
    deleted_at: null,
    ...(query.active === undefined ? {} : { is_active: query.active }),
  };
  const [rows, total] = await prisma.$transaction([
    prisma.payout_recipients.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (query.page - 1) * query.perPage,
      take: query.perPage,
    }),
    prisma.payout_recipients.count({ where }),
  ]);
  return ok({
    items: rows.map(toRecipientProjection),
    page: query.page,
    perPage: query.perPage,
    total,
  });
}

export async function createPayoutRecipient(
  actor: StaffSession,
  input: CreateRecipientBody,
): Promise<Result<PayoutRecipientProjection, FinanceError>> {
  const denied = requireTransferCapability(actor);
  if (denied) return denied;

  const accountNumber = normalizeAccountNumber(input.accountNumber);
  const fingerprint = fingerprintPayoutAccount({
    accountNumber,
    bankCode: input.bankCode,
    currency: input.currency,
  });
  const existing = await prisma.payout_recipients.findFirst({
    where: {
      provider: "paystack",
      currency: input.currency,
      bank_code: input.bankCode,
      account_fingerprint: fingerprint,
      deleted_at: null,
    },
  });
  if (existing) {
    return err({
      code: "RECIPIENT_DUPLICATE",
      message: "This bank account is already saved as a payout recipient.",
    });
  }

  try {
    const resolved = await resolveAccount({ accountNumber, bankCode: input.bankCode });
    const provider = await createPaystackRecipient({
      type: input.type,
      name: input.name,
      accountNumber,
      bankCode: input.bankCode,
      currency: input.currency,
      description: input.description,
      metadata: { source: "laitstyles-owner-finance" },
    });
    const row = await prisma.$transaction(async (tx) => {
      const created = await tx.payout_recipients.create({
        data: {
          provider: "paystack",
          recipient_code: provider.recipientCode,
          recipient_type: provider.type,
          name: provider.name,
          account_name: resolved.accountName,
          bank_name: provider.account.bankName,
          bank_code: provider.account.bankCode,
          account_number_last4: accountNumber.slice(-4),
          account_number_ciphertext: encryptPayoutAccountNumber(accountNumber),
          account_fingerprint: fingerprint,
          currency: provider.currency,
          is_active: provider.active,
          provider_snapshot: {
            providerId: provider.id,
            active: provider.active,
            bankCode: provider.account.bankCode,
            maskedAccountNumber: provider.account.maskedNumber,
          },
          created_by_profile_id: actor.authUserId,
        },
      });
      await tx.audit_events.create({
        data: {
          actor_profile_id: actor.authUserId,
          action: "finance:recipient:create",
          target_table: "payout_recipients",
          target_id: created.id,
          metadata: {
            bank_code: created.bank_code,
            account_number_last4: created.account_number_last4,
            currency: created.currency,
          },
        },
      });
      return created;
    });
    return ok(toRecipientProjection(row));
  } catch (error: unknown) {
    if (isUniqueConstraintError(error)) {
      return err({
        code: "RECIPIENT_DUPLICATE",
        message: "This payout recipient already exists.",
      });
    }
    return providerFailure(error, "The payout recipient could not be created.");
  }
}

export async function updatePayoutRecipient(
  actor: StaffSession,
  recipientId: string,
  input: UpdateRecipientBody,
): Promise<Result<PayoutRecipientProjection, FinanceError>> {
  const denied = requireTransferCapability(actor);
  if (denied) return denied;
  const current = await prisma.payout_recipients.findFirst({
    where: { id: recipientId, deleted_at: null },
  });
  if (!current) {
    return err({ code: "RECIPIENT_NOT_FOUND", message: "The payout recipient could not be found." });
  }

  try {
    const provider = await updatePaystackRecipient(current.recipient_code, input);
    const row = await prisma.$transaction(async (tx) => {
      const updated = await tx.payout_recipients.update({
        where: { id: current.id },
        data: {
          name: provider.name,
          is_active: provider.active,
          provider_snapshot: {
            providerId: provider.id,
            active: provider.active,
            bankCode: provider.account.bankCode,
            maskedAccountNumber: provider.account.maskedNumber,
          },
        },
      });
      await tx.audit_events.create({
        data: {
          actor_profile_id: actor.authUserId,
          action: "finance:recipient:update",
          target_table: "payout_recipients",
          target_id: updated.id,
          metadata: { name: updated.name },
        },
      });
      return updated;
    });
    return ok(toRecipientProjection(row));
  } catch (error: unknown) {
    return providerFailure(error, "The payout recipient could not be updated.");
  }
}

export async function deletePayoutRecipient(
  actor: StaffSession,
  recipientId: string,
): Promise<Result<{ id: string; inactive: true }, FinanceError>> {
  const denied = requireTransferCapability(actor);
  if (denied) return denied;
  const current = await prisma.payout_recipients.findFirst({
    where: { id: recipientId, deleted_at: null },
  });
  if (!current) {
    return err({ code: "RECIPIENT_NOT_FOUND", message: "The payout recipient could not be found." });
  }
  const unresolved = await prisma.payout_transfers.count({
    where: { recipient_id: current.id, status: { in: [...unresolvedTransferStatuses] } },
  });
  if (unresolved > 0) {
    return err({
      code: "RECIPIENT_IN_USE",
      message: "Resolve the recipient's pending transfer before removing it.",
    });
  }

  try {
    await deletePaystackRecipient(current.recipient_code);
    await prisma.$transaction(async (tx) => {
      await tx.payout_recipients.update({
        where: { id: current.id },
        data: { is_active: false, deleted_at: new Date() },
      });
      await tx.audit_events.create({
        data: {
          actor_profile_id: actor.authUserId,
          action: "finance:recipient:delete",
          target_table: "payout_recipients",
          target_id: current.id,
          metadata: { recipient_code: current.recipient_code },
        },
      });
    });
    return ok({ id: current.id, inactive: true });
  } catch (error: unknown) {
    return providerFailure(error, "The payout recipient could not be removed.");
  }
}

function requireTransferCapability(actor: StaffSession): Result<never, FinanceError> | null {
  return hasCapability(actor.role, "finance:transfer")
    ? null
    : err({ code: "FORBIDDEN", message: "Only the store owner can manage payout recipients." });
}

function providerFailure<T>(error: unknown, message: string): Result<T, FinanceError> {
  if (error instanceof PaystackConfigurationError || error instanceof PaystackProviderError) {
    return err({ code: "FINANCE_PROVIDER_UNAVAILABLE", message });
  }
  throw error;
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
