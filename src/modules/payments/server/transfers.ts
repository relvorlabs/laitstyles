import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { err, ok, type Result } from "@/lib/errors";
import { Prisma, prisma } from "@/lib/prisma";
import { runSerializable } from "@/lib/prisma/serializable";
import { hasCapability } from "@/modules/auth/permissions";
import type { StaffSession } from "@/modules/auth/server/session";
import type { InitiateTransferBody, TransferListQuery } from "@/modules/payments/finance-schema";
import {
  type PayoutTransferRow,
  payoutTransferInclude,
  toTransferProjection,
} from "@/modules/payments/server/finance-projection";
import type {
  FinanceError,
  PayoutTransferProjection,
  PayoutTransferStatus,
} from "@/modules/payments/server/finance-types";
import {
  fetchBalance,
  finalizeTransferOtp as finalizePaystackTransferOtp,
  initiateTransfer as initiatePaystackTransfer,
  PaystackConfigurationError,
  PaystackProviderError,
  type PaystackTransfer,
  resendTransferOtp as resendPaystackTransferOtp,
  verifyTransfer,
} from "@/modules/payments/server/paystack";
import { requireRecentFinancialAuthentication } from "@/modules/payments/server/recent-auth";
import { decimalToMinor, minorToDecimal } from "@/modules/payments/server/refund-projection";

const unresolvedStatuses = [
  "pending",
  "otp_required",
  "processing",
  "needs_reconciliation",
] as const;
const terminalStatuses = ["failed", "reversed", "success"] as const;
const OTP_RESEND_COOLDOWN_MS = 60_000;
const MAX_OTP_RESENDS = 5;

type PersistedTransferIntent = Pick<
  PayoutTransferRow,
  | "amount"
  | "currency"
  | "id"
  | "last_provider_sync_at"
  | "payout_recipients"
  | "provider_status"
  | "provider_transfer_code"
  | "reason"
  | "reference"
  | "status"
>;

export async function initiatePayoutTransfer(
  actor: StaffSession,
  input: InitiateTransferBody & { idempotencyKey: string },
): Promise<Result<PayoutTransferProjection, FinanceError>> {
  const denied = requireTransferCapability(actor);
  if (denied) return denied;
  await requireRecentFinancialAuthentication();

  const requestHash = hashTransferRequest(input);
  const replay = await prisma.payout_transfers.findFirst({
    where: { provider: "paystack", idempotency_key: input.idempotencyKey },
    include: payoutTransferInclude,
  });
  if (replay) {
    if (replay.request_hash !== requestHash) {
      return err({
        code: "TRANSFER_INVALID",
        message: "This idempotency key was already used for a different transfer.",
      });
    }
    return shouldResumePersistedTransferIntent(replay)
      ? resumePersistedTransferIntent(replay, actor.authUserId)
      : ok(toTransferProjection(replay));
  }

  const recipient = await prisma.payout_recipients.findFirst({
    where: { id: input.recipientId, is_active: true, deleted_at: null },
  });
  if (!recipient) {
    return err({ code: "RECIPIENT_NOT_FOUND", message: "Select an active payout recipient." });
  }
  if (recipient.currency !== input.currency) {
    return err({
      code: "TRANSFER_INVALID",
      message: "The transfer currency must match the payout recipient currency.",
    });
  }

  let availableAmountMinor: number;
  try {
    const balance = await fetchBalance();
    availableAmountMinor =
      balance.find((entry) => entry.currency === input.currency)?.availableMinor ?? 0;
  } catch (error: unknown) {
    return providerFailure(error, "Paystack balance could not be confirmed before this transfer.");
  }

  const reference = createTransferReference();
  let intent: PayoutTransferRow;
  try {
    const command = await runSerializable(
      async (tx): Promise<Result<PayoutTransferRow, FinanceError>> => {
        const outstanding = await tx.payout_transfers.aggregate({
          where: { currency: input.currency, status: { in: [...unresolvedStatuses] } },
          _sum: { amount: true },
        });
        const outstandingMinor = outstanding._sum.amount
          ? decimalToMinor(outstanding._sum.amount)
          : 0;
        if (input.amountMinor + outstandingMinor > availableAmountMinor) {
          return err({
            code: "TRANSFER_BALANCE_EXCEEDED",
            message: "This transfer exceeds the confirmed available Paystack balance.",
            availableAmountMinor: Math.max(0, availableAmountMinor - outstandingMinor),
          });
        }

        const created = await tx.payout_transfers.create({
          data: {
            recipient_id: recipient.id,
            provider: "paystack",
            reference,
            idempotency_key: input.idempotencyKey,
            request_hash: requestHash,
            amount: minorToDecimal(input.amountMinor),
            currency: input.currency,
            reason: input.reason,
            status: "pending",
            initiated_by_profile_id: actor.authUserId,
          },
          include: payoutTransferInclude,
        });
        await tx.payout_transfer_events.create({
          data: {
            transfer_id: created.id,
            kind: "initiated",
            status: "pending",
            actor_profile_id: actor.authUserId,
            note: "Owner confirmed manual transfer intent.",
            metadata: { idempotencyKey: input.idempotencyKey },
          },
        });
        await tx.audit_events.create({
          data: {
            actor_profile_id: actor.authUserId,
            action: "finance:transfer:initiate",
            target_table: "payout_transfers",
            target_id: created.id,
            metadata: {
              recipient_id: recipient.id,
              reference,
              amount_minor: input.amountMinor,
              currency: input.currency,
            },
          },
        });
        return ok(created);
      },
    );
    if (!command.ok) return command;
    intent = command.value;
  } catch (error: unknown) {
    if (isUniqueConstraintError(error)) {
      const raced = await prisma.payout_transfers.findFirst({
        where: { provider: "paystack", idempotency_key: input.idempotencyKey },
        include: payoutTransferInclude,
      });
      if (raced?.request_hash === requestHash) {
        return shouldResumePersistedTransferIntent(raced)
          ? resumePersistedTransferIntent(raced, actor.authUserId)
          : ok(toTransferProjection(raced));
      }
      return err({
        code: "TRANSFER_INVALID",
        message: "This transfer request is already being processed.",
      });
    }
    throw error;
  }

  return submitPersistedTransferIntent(intent, actor.authUserId, false);
}

export function shouldResumePersistedTransferIntent(
  intent: Pick<
    PersistedTransferIntent,
    "last_provider_sync_at" | "provider_status" | "provider_transfer_code" | "status"
  >,
): boolean {
  return (
    intent.status === "pending" &&
    intent.provider_transfer_code === null &&
    intent.provider_status === null &&
    intent.last_provider_sync_at === null
  );
}

export function buildPersistedTransferCommand(intent: PersistedTransferIntent) {
  if (!intent.reason?.trim()) {
    throw new TypeError("A persisted payout transfer must retain its original reason.");
  }
  return {
    amountMinor: decimalToMinor(intent.amount),
    recipientCode: intent.payout_recipients.recipient_code,
    reference: intent.reference,
    reason: intent.reason,
    currency: intent.currency,
  };
}

async function resumePersistedTransferIntent(
  intent: PayoutTransferRow,
  actorProfileId: string,
): Promise<Result<PayoutTransferProjection, FinanceError>> {
  try {
    const provider = await verifyTransfer(intent.reference);
    return applyTransferProviderState({
      transferId: intent.id,
      provider,
      actorProfileId,
      eventNote: "Recovered a persisted transfer intent from its original provider reference.",
    });
  } catch (error: unknown) {
    if (isMissingProviderTransfer(error)) {
      return submitPersistedTransferIntent(intent, actorProfileId, true);
    }
    if (error instanceof PaystackConfigurationError || error instanceof PaystackProviderError) {
      return markTransferForReconciliation(intent.id, actorProfileId);
    }
    throw error;
  }
}

async function submitPersistedTransferIntent(
  intent: PayoutTransferRow,
  actorProfileId: string,
  resumed: boolean,
): Promise<Result<PayoutTransferProjection, FinanceError>> {
  try {
    const providerResult = await initiatePaystackTransfer(buildPersistedTransferCommand(intent));
    if (providerResult.kind === "needs_reconciliation") {
      return markTransferForReconciliation(intent.id, actorProfileId);
    }
    return applyTransferProviderState({
      transferId: intent.id,
      provider: providerResult.transfer,
      actorProfileId,
      eventNote:
        providerResult.kind === "recovered"
          ? "Provider state recovered by exact reference after an ambiguous response."
          : resumed
            ? "Resumed the persisted transfer intent using its original provider reference."
            : "Provider accepted the transfer command.",
    });
  } catch (error: unknown) {
    if (error instanceof PaystackConfigurationError || error instanceof PaystackProviderError) {
      return markTransferForReconciliation(intent.id, actorProfileId);
    }
    throw error;
  }
}

export async function listPayoutTransfers(
  actor: StaffSession,
  query: TransferListQuery,
): Promise<
  Result<
    { items: PayoutTransferProjection[]; page: number; perPage: number; total: number },
    FinanceError
  >
> {
  if (!hasCapability(actor.role, "finance:read")) {
    return err({ code: "FORBIDDEN", message: "You do not have permission to view transfers." });
  }
  const where: Prisma.payout_transfersWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.recipientId ? { recipient_id: query.recipientId } : {}),
  };
  const [rows, total] = await prisma.$transaction([
    prisma.payout_transfers.findMany({
      where,
      include: payoutTransferInclude,
      orderBy: { initiated_at: "desc" },
      skip: (query.page - 1) * query.perPage,
      take: query.perPage,
    }),
    prisma.payout_transfers.count({ where }),
  ]);
  return ok({
    items: rows.map(toTransferProjection),
    page: query.page,
    perPage: query.perPage,
    total,
  });
}

export async function getPayoutTransfer(
  actor: StaffSession,
  transferId: string,
): Promise<Result<PayoutTransferProjection, FinanceError>> {
  if (!hasCapability(actor.role, "finance:read")) {
    return err({ code: "FORBIDDEN", message: "You do not have permission to view transfers." });
  }
  const row = await prisma.payout_transfers.findUnique({
    where: { id: transferId },
    include: payoutTransferInclude,
  });
  return row
    ? ok(toTransferProjection(row))
    : err({ code: "TRANSFER_NOT_FOUND", message: "The payout transfer could not be found." });
}

export async function finalizePayoutTransferOtp(
  actor: StaffSession,
  transferId: string,
  otp: string,
): Promise<Result<PayoutTransferProjection, FinanceError>> {
  const denied = requireTransferCapability(actor);
  if (denied) return denied;
  await requireRecentFinancialAuthentication();

  const current = await prisma.payout_transfers.findUnique({
    where: { id: transferId },
    include: payoutTransferInclude,
  });
  if (!current) {
    return err({ code: "TRANSFER_NOT_FOUND", message: "The payout transfer could not be found." });
  }
  if (current.status !== "otp_required" || !current.provider_transfer_code) {
    if (isTerminalStatus(current.status)) return ok(toTransferProjection(current));
    return err({
      code: "TRANSFER_INVALID_STATE",
      message: "This transfer is not waiting for an OTP.",
    });
  }

  try {
    const provider = await finalizePaystackTransferOtp({
      transferCode: current.provider_transfer_code,
      otp,
    });
    return applyTransferProviderState({
      transferId: current.id,
      provider,
      actorProfileId: actor.authUserId,
      eventKind: "otp_verified",
      eventNote: "Owner submitted the Paystack transfer OTP.",
    });
  } catch (error: unknown) {
    if (error instanceof PaystackConfigurationError || error instanceof PaystackProviderError) {
      if (error instanceof PaystackProviderError && error.status !== null && error.status < 500) {
        return err({
          code: "TRANSFER_INVALID",
          message: "Paystack rejected the transfer OTP.",
        });
      }
      return markTransferForReconciliation(current.id, actor.authUserId);
    }
    throw error;
  }
}

export async function resendPayoutTransferOtp(
  actor: StaffSession,
  transferId: string,
): Promise<Result<PayoutTransferProjection, FinanceError>> {
  const denied = requireTransferCapability(actor);
  if (denied) return denied;
  await requireRecentFinancialAuthentication();

  const current = await prisma.payout_transfers.findUnique({
    where: { id: transferId },
    include: payoutTransferInclude,
  });
  if (!current) {
    return err({ code: "TRANSFER_NOT_FOUND", message: "The payout transfer could not be found." });
  }
  if (current.status !== "otp_required" || !current.provider_transfer_code) {
    return err({
      code: "TRANSFER_INVALID_STATE",
      message: "This transfer is not waiting for an OTP.",
    });
  }
  if (current.otp_attempts >= MAX_OTP_RESENDS) {
    return err({
      code: "TRANSFER_INVALID_STATE",
      message: "The OTP resend limit has been reached. Reconcile the transfer before continuing.",
    });
  }
  if (
    current.last_otp_sent_at &&
    Date.now() - current.last_otp_sent_at.getTime() < OTP_RESEND_COOLDOWN_MS
  ) {
    return err({
      code: "TRANSFER_INVALID_STATE",
      message: "Wait before requesting another transfer OTP.",
    });
  }

  try {
    await resendPaystackTransferOtp(current.provider_transfer_code);
    const row = await prisma.$transaction(async (tx) => {
      await tx.payout_transfer_events.create({
        data: {
          transfer_id: current.id,
          kind: "otp_requested",
          status: "otp_required",
          actor_profile_id: actor.authUserId,
          note: "Owner requested another Paystack transfer OTP.",
        },
      });
      await tx.audit_events.create({
        data: {
          actor_profile_id: actor.authUserId,
          action: "finance:transfer:resend-otp",
          target_table: "payout_transfers",
          target_id: current.id,
          metadata: { reference: current.reference },
        },
      });
      return tx.payout_transfers.update({
        where: { id: current.id },
        data: {
          otp_attempts: { increment: 1 },
          last_otp_sent_at: new Date(),
        },
        include: payoutTransferInclude,
      });
    });
    return ok(toTransferProjection(row));
  } catch (error: unknown) {
    return providerFailure(error, "The transfer OTP could not be resent.");
  }
}

export async function reconcilePayoutTransfer(
  actor: StaffSession,
  transferId: string,
): Promise<Result<PayoutTransferProjection, FinanceError>> {
  const denied = requireTransferCapability(actor);
  if (denied) return denied;
  const current = await prisma.payout_transfers.findUnique({
    where: { id: transferId },
    include: payoutTransferInclude,
  });
  if (!current) {
    return err({ code: "TRANSFER_NOT_FOUND", message: "The payout transfer could not be found." });
  }
  try {
    const provider = await verifyTransfer(current.reference);
    return applyTransferProviderState({
      transferId: current.id,
      provider,
      actorProfileId: actor.authUserId,
      eventKind: "reconciliation_requested",
      eventNote: "Owner reconciled the transfer by its original provider reference.",
    });
  } catch (error: unknown) {
    return providerFailure(error, "Paystack could not confirm the transfer state.");
  }
}

export async function applyTransferProviderState(input: {
  transferId?: string;
  reference?: string;
  provider: PaystackTransfer;
  actorProfileId?: string | null;
  providerEventId?: string | null;
  eventKind?: "otp_verified" | "reconciliation_requested";
  eventNote?: string | null;
}): Promise<Result<PayoutTransferProjection, FinanceError>> {
  const row = await prisma.$transaction(async (tx) => {
    if (input.providerEventId) {
      const replay = await tx.payout_transfer_events.findFirst({
        where: { provider_event_id: input.providerEventId },
        include: { payout_transfers: { include: payoutTransferInclude } },
      });
      if (replay) return replay.payout_transfers;
    }
    const current = await tx.payout_transfers.findFirst({
      where: input.transferId
        ? { id: input.transferId }
        : { provider: "paystack", reference: input.reference ?? input.provider.reference },
      include: payoutTransferInclude,
    });
    if (!current) return null;

    const nextStatus = mapProviderTransferStatus(input.provider.status);
    const allowed = canApplyProviderStatus(current.status, nextStatus);
    const appliedStatus = allowed ? nextStatus : current.status;
    const completedAt = isTerminalStatus(appliedStatus) ? new Date() : current.completed_at;
    const updated = await tx.payout_transfers.update({
      where: { id: current.id },
      data: {
        provider_transfer_code: input.provider.transferCode,
        provider_status: input.provider.status,
        status: appliedStatus,
        otp_required: appliedStatus === "otp_required",
        reconciliation_required: false,
        failure_reason:
          appliedStatus === "failed" ? "Paystack marked the transfer as failed." : null,
        provider_response: safeProviderSnapshot(input.provider),
        last_provider_sync_at: new Date(),
        completed_at: completedAt,
      },
      include: payoutTransferInclude,
    });
    if (current.status !== appliedStatus || input.providerEventId || input.eventKind) {
      await tx.payout_transfer_events.create({
        data: {
          transfer_id: current.id,
          kind: input.eventKind ?? eventKindForStatus(appliedStatus),
          status: appliedStatus,
          provider_event_id: input.providerEventId ?? null,
          actor_profile_id: input.actorProfileId ?? null,
          note: input.eventNote ?? `Paystack reported transfer status ${input.provider.status}.`,
          provider_snapshot: safeProviderSnapshot(input.provider),
        },
      });
      await tx.outbox_messages.create({
        data: {
          topic: "finance.transfer.updated",
          payload: {
            transferId: current.id,
            reference: current.reference,
            status: appliedStatus,
          },
        },
      });
    }
    return updated;
  });

  return row
    ? ok(toTransferProjection(row))
    : err({ code: "TRANSFER_NOT_FOUND", message: "The payout transfer could not be found." });
}

async function markTransferForReconciliation(
  transferId: string,
  actorProfileId: string,
): Promise<Result<PayoutTransferProjection, FinanceError>> {
  const row = await prisma.$transaction(async (tx) => {
    await tx.payout_transfer_events.create({
      data: {
        transfer_id: transferId,
        kind: "reconciliation_requested",
        status: "needs_reconciliation",
        actor_profile_id: actorProfileId,
        note: "Provider truth was ambiguous; verify using the original reference before retrying.",
      },
    });
    return tx.payout_transfers.update({
      where: { id: transferId },
      data: {
        status: "needs_reconciliation",
        reconciliation_required: true,
        failure_reason: "Paystack did not return a conclusive transfer result.",
        last_provider_sync_at: new Date(),
      },
      include: payoutTransferInclude,
    });
  });
  return ok(toTransferProjection(row));
}

function mapProviderTransferStatus(status: PaystackTransfer["status"]): PayoutTransferStatus {
  if (status === "otp") return "otp_required";
  if (status === "success") return "success";
  if (status === "reversed") return "reversed";
  if (["abandoned", "blocked", "failed", "rejected"].includes(status)) return "failed";
  if (status === "received") return "processing";
  return "pending";
}

function canApplyProviderStatus(
  current: PayoutTransferStatus,
  next: PayoutTransferStatus,
): boolean {
  if (current === next) return true;
  if (current === "reversed") return false;
  if (current === "success") return next === "reversed";
  if (current === "failed") return false;
  return true;
}

function eventKindForStatus(status: PayoutTransferStatus) {
  if (status === "success") return "success" as const;
  if (status === "failed") return "failed" as const;
  if (status === "reversed") return "reversed" as const;
  if (status === "otp_required") return "otp_requested" as const;
  if (status === "needs_reconciliation") return "reconciliation_requested" as const;
  return "note" as const;
}

function safeProviderSnapshot(provider: PaystackTransfer) {
  return {
    id: provider.id,
    transferCode: provider.transferCode,
    reference: provider.reference,
    amountMinor: provider.amountMinor,
    currency: provider.currency,
    status: provider.status,
    recipientCode: provider.recipientCode,
    transferredAt: provider.transferredAt,
  };
}

function createTransferReference(): string {
  return `lt_${randomUUID().replaceAll("-", "").slice(0, 32)}`;
}

function hashTransferRequest(input: InitiateTransferBody): string {
  return createHash("sha256")
    .update(`${input.recipientId}:${input.amountMinor}:${input.currency}:${input.reason}`)
    .digest("hex");
}

function requireTransferCapability(actor: StaffSession): Result<never, FinanceError> | null {
  return hasCapability(actor.role, "finance:transfer")
    ? null
    : err({ code: "FORBIDDEN", message: "Only the store owner can move store funds." });
}

function providerFailure<T>(error: unknown, message: string): Result<T, FinanceError> {
  if (error instanceof PaystackConfigurationError || error instanceof PaystackProviderError) {
    return err({ code: "FINANCE_PROVIDER_UNAVAILABLE", message });
  }
  throw error;
}

function isMissingProviderTransfer(error: unknown): boolean {
  return error instanceof PaystackProviderError && error.status === 404;
}

function isTerminalStatus(status: PayoutTransferStatus): boolean {
  return terminalStatuses.includes(status as (typeof terminalStatuses)[number]);
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
