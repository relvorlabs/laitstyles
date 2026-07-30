export type FinanceError = {
  code:
    | "FORBIDDEN"
    | "FINANCE_PROVIDER_UNAVAILABLE"
    | "FINANCE_RECORD_NOT_FOUND"
    | "RECIPIENT_NOT_FOUND"
    | "RECIPIENT_DUPLICATE"
    | "RECIPIENT_IN_USE"
    | "TRANSFER_NOT_FOUND"
    | "TRANSFER_INVALID"
    | "TRANSFER_INVALID_STATE"
    | "TRANSFER_BALANCE_EXCEEDED"
    | "TRANSFER_RECONCILIATION_REQUIRED";
  message: string;
  availableAmountMinor?: number;
};

export type PayoutRecipientProjection = {
  id: string;
  providerRecipientCode: string;
  type: string;
  name: string;
  accountName: string | null;
  bankName: string | null;
  bankCode: string | null;
  maskedAccountNumber: string | null;
  currency: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PayoutTransferStatus =
  | "pending"
  | "otp_required"
  | "processing"
  | "needs_reconciliation"
  | "success"
  | "failed"
  | "reversed";

export type PayoutTransferProjection = {
  id: string;
  recipient: PayoutRecipientProjection;
  reference: string;
  providerTransferCode: string | null;
  providerStatus: string | null;
  idempotencyKey: string | null;
  amountMinor: number;
  currency: string;
  reason: string | null;
  status: PayoutTransferStatus;
  otpRequired: boolean;
  otpAttempts: number;
  reconciliationRequired: boolean;
  failureReason: string | null;
  initiatedBy: string | null;
  initiatedAt: string;
  lastOtpSentAt: string | null;
  lastProviderSyncAt: string | null;
  completedAt: string | null;
  events: Array<{
    id: string;
    kind: string;
    status: PayoutTransferStatus | null;
    note: string | null;
    occurredAt: string;
  }>;
};

export type SettlementProjection = {
  id: string;
  providerSettlementId: string;
  status: "failed" | "pending" | "processing" | "success";
  totalAmountMinor: number;
  effectiveAmountMinor: number;
  totalFeesMinor: number;
  totalProcessedMinor: number;
  currency: string;
  settlementAccountName: string | null;
  settlementAccountNumberLast4: string | null;
  lastProviderSyncAt: string | null;
  settledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ReconciliationOutcome =
  | "amount_mismatch"
  | "currency_mismatch"
  | "local_only"
  | "matched"
  | "provider_only"
  | "status_mismatch";

export type ReconciliationRecord = {
  outcome: ReconciliationOutcome;
  providerId: string | null;
  providerReference: string | null;
  localId: string | null;
  localReference: string | null;
  providerAmountMinor: number | null;
  localAmountMinor: number | null;
  providerCurrency: string | null;
  localCurrency: string | null;
  providerStatus: string | null;
  localStatus: string | null;
};
