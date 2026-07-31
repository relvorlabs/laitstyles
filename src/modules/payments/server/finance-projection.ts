import "server-only";

import type { Prisma } from "@/lib/prisma";
import { decimalToMinor } from "@/modules/payments/server/refund-projection";
import type {
  PayoutRecipientProjection,
  PayoutTransferProjection,
  SettlementProjection,
} from "@/modules/payments/server/finance-types";

export const payoutTransferInclude = {
  payout_recipients: true,
  profiles: { select: { display_name: true, email: true } },
  payout_transfer_events: { orderBy: { occurred_at: "desc" as const } },
} satisfies Prisma.payout_transfersInclude;

export type PayoutTransferRow = Prisma.payout_transfersGetPayload<{
  include: typeof payoutTransferInclude;
}>;
export type PayoutRecipientRow = Prisma.payout_recipientsGetPayload<Record<string, never>>;
export type SettlementRow = Prisma.provider_settlementsGetPayload<Record<string, never>>;

export function toRecipientProjection(row: PayoutRecipientRow): PayoutRecipientProjection {
  return {
    id: row.id,
    providerRecipientCode: row.recipient_code,
    type: row.recipient_type,
    name: row.name,
    accountName: row.account_name,
    bankName: row.bank_name,
    bankCode: row.bank_code,
    maskedAccountNumber: row.account_number_last4 ? `****${row.account_number_last4}` : null,
    currency: row.currency,
    active: row.is_active && row.deleted_at === null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export function toTransferProjection(row: PayoutTransferRow): PayoutTransferProjection {
  return {
    id: row.id,
    recipient: toRecipientProjection(row.payout_recipients),
    reference: row.reference,
    providerTransferCode: row.provider_transfer_code,
    providerStatus: row.provider_status,
    idempotencyKey: row.idempotency_key,
    amountMinor: decimalToMinor(row.amount),
    currency: row.currency,
    reason: row.reason,
    status: row.status,
    otpRequired: row.otp_required,
    otpAttempts: row.otp_attempts,
    reconciliationRequired: row.reconciliation_required,
    failureReason: row.failure_reason,
    initiatedBy: row.profiles?.display_name ?? row.profiles?.email ?? null,
    initiatedAt: row.initiated_at.toISOString(),
    lastOtpSentAt: row.last_otp_sent_at?.toISOString() ?? null,
    lastProviderSyncAt: row.last_provider_sync_at?.toISOString() ?? null,
    completedAt: row.completed_at?.toISOString() ?? null,
    events: row.payout_transfer_events.map((event) => ({
      id: event.id,
      kind: event.kind,
      status: event.status,
      note: event.note,
      occurredAt: event.occurred_at.toISOString(),
    })),
  };
}

export function toSettlementProjection(row: SettlementRow): SettlementProjection {
  return {
    id: row.id,
    providerSettlementId: row.provider_settlement_id,
    status: row.status,
    totalAmountMinor: decimalToMinor(row.total_amount),
    effectiveAmountMinor: decimalToMinor(row.effective_amount),
    totalFeesMinor: decimalToMinor(row.total_fees),
    totalProcessedMinor: decimalToMinor(row.total_processed),
    currency: row.currency,
    settlementAccountName: row.settlement_account_name,
    settlementAccountNumberLast4: row.settlement_account_number_last4,
    lastProviderSyncAt: row.last_provider_sync_at?.toISOString() ?? null,
    settledAt: row.settled_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}
