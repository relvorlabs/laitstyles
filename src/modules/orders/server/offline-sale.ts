import "server-only";

import { err, ok, type Result } from "@/lib/errors";
import {
  cancelFailedOfflineSaleDraft,
  finalizeInitializedCheckout,
} from "@/modules/orders/server/offline-sale-checkout";
import { createOfflineSaleDraft } from "@/modules/orders/server/offline-sale-draft";
import { mapAdminOrderRow } from "@/modules/orders/server/mappers";
import type {
  OfflineSaleInput,
  OfflineSaleSuccess,
  SalesActionError,
} from "@/modules/orders/types";
import {
  initializePaystackTransaction,
  isPaystackConfigured,
  PaystackConfigurationError,
  PaystackInitializationError,
  type PaystackCheckout,
} from "@/modules/payments/server/paystack";
import type { StaffSession } from "@/server/auth/session";

export async function recordOfflineSale(
  actor: StaffSession,
  input: OfflineSaleInput,
): Promise<Result<OfflineSaleSuccess, SalesActionError>> {
  if (!isPaystackConfigured()) {
    return err({
      code: "paystack-not-configured",
      message:
        "Paystack checkout is not configured yet. No order or stock reservation was created.",
    });
  }

  const draftResult = await createOfflineSaleDraft(actor, input);
  if (!draftResult.ok) return draftResult;
  const draft = draftResult.value;

  let checkout: PaystackCheckout;
  try {
    checkout = await initializePaystackTransaction({
      email: draft.customerEmail,
      amountKobo: draft.amountKobo,
      reference: draft.reference,
      metadata: {
        orderId: draft.orderId,
        orderNumber: draft.orderNumber,
        source: "in-person-admin-sale",
        channel: input.channel,
      },
    });

    if (checkout.reference !== draft.reference) {
      throw new PaystackInitializationError(
        "Paystack returned a transaction reference that does not match the recorded payment attempt.",
        checkout.rawResponse,
      );
    }
  } catch (error) {
    await cancelFailedOfflineSaleDraft(actor, draft, error);
    if (error instanceof PaystackConfigurationError) {
      return err({
        code: "paystack-not-configured",
        message: "Paystack checkout is not configured for this environment.",
      });
    }
    if (error instanceof PaystackInitializationError) {
      return err({
        code: "paystack-initialization-failed",
        message: `Paystack checkout could not be generated. ${error.message}`,
        orderId: draft.orderNumber,
      });
    }
    throw error;
  }

  // After Paystack has created a transaction, a local persistence failure must
  // not release the reservation: the customer may still complete that checkout.
  // The initializing payment/reference remains available for Phase 8 reconciliation.
  const updated = await finalizeInitializedCheckout(actor, input, draft, checkout);
  const order = mapAdminOrderRow(updated);
  return ok({
    order,
    customerId: draft.customerId,
    checkout: {
      authorizationUrl: checkout.authorizationUrl,
      accessCode: checkout.accessCode,
      reference: checkout.reference,
    },
    message: `Paystack checkout generated for ${draft.customerName}.`,
  });
}
