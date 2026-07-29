import "server-only";

import {
  PaystackProviderError,
  paystackRequest,
} from "@/modules/payments/server/paystack/client";
import { paystackInitializeResponseSchema } from "@/modules/payments/server/paystack/schemas";

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
  paystackAuthorizationSchema,
  paystackCustomerSchema,
  paystackListTransactionsResponseSchema,
  paystackPaginationSchema,
  paystackProviderIdSchema,
  paystackSuccessEnvelope,
  paystackTransactionSchema,
} from "@/modules/payments/server/paystack/schemas";
export {
  fetchTransaction,
  initializeTransaction,
  listTransactions,
  type InitializeTransactionInput,
  type ListTransactionsInput,
  type PaystackAuthorization,
  type PaystackCustomer,
  type PaystackInitializedTransaction,
  type PaystackTransaction,
  verifyTransaction,
} from "@/modules/payments/server/paystack/transactions";
export {
  PaystackWebhookSignatureError,
  verifyWebhookSignature,
} from "@/modules/payments/server/paystack/webhooks";

export type PaystackCheckout = {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
  rawResponse: Awaited<ReturnType<typeof initializeLegacyTransactionRequest>>;
};

export class PaystackInitializationError extends Error {
  constructor(
    message: string,
    readonly rawResponse: unknown = null,
  ) {
    super(message);
    this.name = "PaystackInitializationError";
  }
}

export type InitializePaystackTransactionInput = {
  email: string;
  amountKobo: number;
  reference: string;
  metadata: Record<string, string>;
};

/**
 * Compatibility adapter for the Phase 5 offline-sale consumer. New payment
 * flows use initializeTransaction and minor-unit naming directly.
 */
export async function initializePaystackTransaction(
  input: InitializePaystackTransactionInput,
  fetchImplementation: typeof fetch = fetch,
): Promise<PaystackCheckout> {
  if (!Number.isSafeInteger(input.amountKobo) || input.amountKobo < 1) {
    throw new TypeError("Paystack amount must be a positive integer in kobo.");
  }

  let response: Awaited<ReturnType<typeof initializeLegacyTransactionRequest>>;
  try {
    response = await initializeLegacyTransactionRequest(input, fetchImplementation);
  } catch (error) {
    if (error instanceof PaystackProviderError) {
      throw new PaystackInitializationError(error.message);
    }
    throw error;
  }

  return {
    authorizationUrl: response.data.authorization_url,
    accessCode: response.data.access_code,
    reference: response.data.reference,
    rawResponse: response,
  };
}

function initializeLegacyTransactionRequest(
  input: InitializePaystackTransactionInput,
  fetchImplementation: typeof fetch,
) {
  return paystackRequest({
    operation: "initialize",
    path: "/transaction/initialize",
    method: "POST",
    schema: paystackInitializeResponseSchema,
    fetchImplementation,
    body: {
      email: input.email,
      amount: String(input.amountKobo),
      currency: "NGN",
      reference: input.reference,
      metadata: JSON.stringify(input.metadata),
    },
  });
}
