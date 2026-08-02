import "server-only";

import { err } from "@/lib/errors";
import {
  createPaymentMethodSetup,
  deletePaymentMethod as deletePaymentMethodImplementation,
  getPaymentMethodSetup,
  listPaymentMethods,
  setDefaultPaymentMethod,
  verifyPaymentMethodSetup as verifyPaymentMethodSetupImplementation,
} from "@/modules/payments/server/payment-methods";
import {
  PaystackConfigurationError,
  PaystackProviderError,
} from "@/modules/payments/server/paystack";
import type { PaymentMethodError } from "@/modules/payments/types";

export { throwPaymentMethodApiError } from "@/modules/payments/server/api-errors";
export {
  createPaymentMethodSetup,
  getPaymentMethodSetup,
  listPaymentMethods,
  setDefaultPaymentMethod,
};

export async function verifyPaymentMethodSetup(
  ...args: Parameters<typeof verifyPaymentMethodSetupImplementation>
): Promise<Awaited<ReturnType<typeof verifyPaymentMethodSetupImplementation>>> {
  try {
    return await verifyPaymentMethodSetupImplementation(...args);
  } catch (error: unknown) {
    if (!isPaystackFailure(error)) throw error;
    return err({
      code: "PAYMENT_METHOD_PROVIDER_UNAVAILABLE",
      message: "Paystack could not verify the payment-method setup. Try again safely.",
    } satisfies PaymentMethodError);
  }
}

export async function deletePaymentMethod(
  ...args: Parameters<typeof deletePaymentMethodImplementation>
): Promise<Awaited<ReturnType<typeof deletePaymentMethodImplementation>>> {
  try {
    return await deletePaymentMethodImplementation(...args);
  } catch (error: unknown) {
    if (!isPaystackFailure(error)) throw error;
    return err({
      code: "PAYMENT_METHOD_PROVIDER_UNAVAILABLE",
      message: "Paystack could not deactivate this payment method, so it remains active locally.",
    } satisfies PaymentMethodError);
  }
}

function isPaystackFailure(
  error: unknown,
): error is PaystackProviderError | PaystackConfigurationError {
  return error instanceof PaystackProviderError || error instanceof PaystackConfigurationError;
}
