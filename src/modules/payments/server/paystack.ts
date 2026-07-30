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
  initializeTransaction,
  type InitializeTransactionInput,
  listTransactions,
  type ListTransactionsInput,
  type PaystackAuthorization,
  type PaystackCustomer,
  type PaystackInitializedTransaction,
  type PaystackTransaction,
  verifyTransaction,
} from "@/modules/payments/server/paystack/transactions";
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
