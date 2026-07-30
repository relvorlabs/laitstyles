import type {
  PayoutRecipientRecord,
  PayoutTransferRecord,
  PayoutTransferStatus,
  ReconciliationOutcome,
  ReconciliationRecord,
  SettlementRecord,
} from "@/modules/payments/finance-contract";

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

export type PayoutRecipientProjection = PayoutRecipientRecord;
export type PayoutTransferProjection = PayoutTransferRecord;
export type SettlementProjection = SettlementRecord;
export type { PayoutTransferStatus, ReconciliationOutcome, ReconciliationRecord };
