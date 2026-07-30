import "server-only";

/**
 * Paystack provider facade.
 *
 * Provider HTTP calls, validation and normalization live under `server/paystack/**`.
 * Domain services import this facade or a focused provider module; this file contains
 * no persistence or duplicate transaction implementation.
 */
export {
  chargeAuthorization,
  deactivateAuthorization,
  type ChargeAuthorizationInput,
  type ChargeAuthorizationResult,
} from "@/modules/payments/server/paystack/authorizations";
export { fetchBalance, type PaystackBalance } from "@/modules/payments/server/paystack/balance";
export {
  listBanks,
  type ListBanksInput,
  resolveAccount,
} from "@/modules/payments/server/paystack/banks";
export {
  isPaystackConfigured,
  PaystackConfigurationError,
  PaystackProviderError,
  paystackRequest,
  type PaystackRequestOptions,
} from "@/modules/payments/server/paystack/client";
export {
  acceptDispute,
  addDisputeEvidence,
  type AddDisputeEvidenceInput,
  declineDispute,
  DISPUTE_EVIDENCE_CONTENT_TYPES,
  DISPUTE_EVIDENCE_MAX_BYTES,
  fetchDispute,
  getDisputeUploadUrl,
  listDisputes,
  type ListDisputesInput,
  mapPaystackDispute,
  type PaystackDispute,
  type PaystackDisputePagination,
  type PaystackDisputeStatus,
  resolveDispute,
  type ResolveDisputeInput,
  updateDispute,
  type UpdateDisputeInput,
  uploadDisputeEvidenceFile,
} from "@/modules/payments/server/paystack/disputes";
export {
  fetchBalanceLedger,
  type ListBalanceLedgerInput,
  type PaystackBalanceLedgerEntry,
} from "@/modules/payments/server/paystack/ledger";
export {
  createRecipient,
  type CreateRecipientInput,
  deleteRecipient,
  listRecipients,
  type ListRecipientsInput,
  type PaystackTransferRecipient,
  updateRecipient,
  type UpdateRecipientInput,
} from "@/modules/payments/server/paystack/recipients";
export {
  paystackAuthorizationSchema,
  paystackCustomerSchema,
  paystackDisputeEvidenceResponseSchema,
  paystackDisputeMutationResponseSchema,
  paystackDisputeResponseSchema,
  paystackDisputeSchema,
  paystackDisputeUploadResponseSchema,
  paystackInitializeResponseSchema,
  paystackListDisputesResponseSchema,
  paystackListRefundsResponseSchema,
  paystackListTransactionsResponseSchema,
  paystackPaginationSchema,
  paystackProviderIdSchema,
  paystackRefundResponseSchema,
  paystackRefundSchema,
  paystackSuccessEnvelope,
  paystackTransactionResponseSchema,
  paystackTransactionSchema,
} from "@/modules/payments/server/paystack/schemas";
export {
  listSettlements,
  type ListSettlementsInput,
  listSettlementTransactions,
  type ListSettlementTransactionsInput,
  type PaystackSettlement,
  type PaystackSettlementStatus,
} from "@/modules/payments/server/paystack/settlements";
export {
  createRefund,
  type CreateRefundInput,
  fetchRefund,
  listRefunds,
  type ListRefundsInput,
  mapPaystackRefund,
  type PaystackRefund,
  type PaystackRefundPagination,
  type PaystackRefundStatus,
} from "@/modules/payments/server/paystack/refunds";
export {
  fetchTransaction,
  fetchTransactionTimeline,
  fetchTransactionTotals,
  initializeTransaction,
  type InitializeTransactionInput,
  listTransactions,
  type ListTransactionsInput,
  mapPaystackTransaction,
  type PaystackAuthorization,
  type PaystackCustomer,
  type PaystackInitializedTransaction,
  type PaystackTransaction,
  type TransactionProjectionOptions,
  type TransactionTotalsInput,
  verifyTransaction,
} from "@/modules/payments/server/paystack/transactions";
export {
  fetchTransfer,
  finalizeTransferOtp,
  type FinalizeTransferOtpInput,
  initiateTransfer,
  type InitiateTransferInput,
  listTransfers,
  type ListTransfersInput,
  normalizeTransferEvent,
  type PaystackTransfer,
  type PaystackTransferStatus,
  resendTransferOtp,
  verifyTransfer,
} from "@/modules/payments/server/paystack/transfers";
export {
  isSupportedPaystackChargeEvent,
  isSupportedPaystackDisputeEvent,
  isSupportedPaystackFinancialEvent,
  isSupportedPaystackRefundEvent,
  parsePaystackChargeEvent,
  parsePaystackDisputeEvent,
  parsePaystackEventEnvelope,
  parsePaystackRefundEvent,
  PaystackWebhookSignatureError,
  verifyWebhookSignature,
} from "@/modules/payments/server/paystack/webhooks";
