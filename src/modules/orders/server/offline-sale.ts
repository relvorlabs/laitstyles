import "server-only";

import { err, ok, type Result } from "@/lib/errors";
import type { StaffSession } from "@/modules/auth/server/session";
import { getConfiguredAuthOrigin } from "@/modules/auth/server/redirects";
import { mapAdminOrderRow } from "@/modules/orders/server/mappers";
import {
  cancelFailedOfflineSaleDraft,
  finalizeInitializedCheckout,
} from "@/modules/orders/server/offline-sale-checkout";
import { createOfflineSaleDraft } from "@/modules/orders/server/offline-sale-draft";
import type {
  OfflineSaleInput,
  OfflineSaleSuccess,
  SalesActionError,
} from "@/modules/orders/types";
import {
  initializeTransaction,
  isPaystackConfigured,
  PaystackConfigurationError,
  PaystackProviderError,
} from "@/modules/payments/server/paystack";

export async function recordOfflineSale(
  actor: StaffSession,
  input: OfflineSaleInput,
): Promise<Result<OfflineSaleSuccess, SalesActionError>> {
  const origin = getConfiguredAuthOrigin();
  if (!isPaystackConfigured() || !origin) {
    return err({
      code: "paystack-not-configured",
      message:
        "Paystack checkout is not configured yet. No order or stock reservation was created.",
    });
  }

  const draftResult = await createOfflineSaleDraft(actor, input);
  if (!draftResult.ok) return draftResult;
  const draft = draftResult.value;

  let checkout: Awaited<ReturnType<typeof initializeTransaction>>;
  try {
    checkout = await initializeTransaction({
      email: draft.customerEmail,
      amountMinor: draft.amountKobo,
      reference: draft.reference,
      callbackUrl: new URL(
        `/admin/orders?order=${encodeURIComponent(draft.orderNumber)}`,
        `${origin}/`,
      ).toString(),
      currency: "NGN",
      metadata: {
        orderId: draft.orderId,
        orderNumber: draft.orderNumber,
        paymentId: draft.paymentId,
        source: "in-person-admin-sale",
        channel: input.channel,
      },
    });

    if (checkout.reference !== draft.reference) {
      throw new PaystackProviderError(
        "Paystack returned a transaction reference that does not match the recorded payment attempt.",
        "initialize",
        null,
        "PAYSTACK_REFERENCE_MISMATCH",
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
    return err({
      code: "paystack-initialization-failed",
      message:
        error instanceof PaystackProviderError
          ? `Paystack checkout could not be generated. ${error.message}`
          : "Paystack checkout could not be generated.",
      orderId: draft.orderNumber,
    });
  }

  // After Paystack has created a transaction, a local persistence failure must
  // not release the reservation: the customer may still complete that checkout.
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
