export type PayoutRecipientRecord = {
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

export type PayoutTransferRecord = {
  id: string;
  recipient: PayoutRecipientRecord;
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

export type FinanceOverviewRecord = {
  balances: Array<{ currency: string; availableAmountMinor: number }>;
  totals: {
    totalTransactions: number;
    totalVolumeMinor: number;
    totalVolumeByCurrency: Array<{ currency: string; amountMinor: number }>;
    pendingTransfersMinor: number;
    pendingTransfersByCurrency: Array<{ currency: string; amountMinor: number }>;
  };
  unresolvedTransfers: number;
  pendingSettlements: number;
};

export type FinanceLedgerRecord = {
  id: string;
  balanceMinor: number;
  differenceMinor: number;
  direction: "credit" | "debit";
  currency: string;
  reason: string | null;
  sourceType: string;
  sourceId: string | null;
  createdAt: string;
  updatedAt: string | null;
};

export type SettlementRecord = {
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

export type PayoutBankRecord = {
  id: string;
  name: string;
  slug: string;
  code: string;
  gateway: string | null;
  supportsTransfer: boolean;
  active: boolean;
  country: string;
  currency: string;
  type: string;
};

export type PageMeta = {
  page: number;
  perPage: number;
  total: number;
  pageCount?: number;
  skipped?: number;
};
