import "server-only";

import { prisma } from "@/lib/prisma";
import type { PaystackRefund } from "@/modules/payments/server/paystack/refunds";
import { applyRefundProviderState } from "@/modules/payments/server/refunds";

const refundIdPattern = /Laitstyles refund ([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/i;

export async function applyRefundWebhookState(provider: PaystackRefund) {
  const explicitRefundId = provider.merchantNote?.match(refundIdPattern)?.[1] ?? null;
  if (explicitRefundId) {
    return applyRefundProviderState({ refundId: explicitRefundId, provider });
  }

  if (provider.transactionReference) {
    const requestedAmount = provider.amountMinor / 100;
    const candidate = await prisma.payment_refunds.findFirst({
      where: {
        provider: "paystack",
        provider_reference: null,
        requested_amount: requestedAmount,
        status: { in: ["pending", "processing", "needs_attention"] },
        payments: { reference: provider.transactionReference },
      },
      orderBy: { requested_at: "asc" },
      select: { id: true },
    });
    if (candidate) {
      return applyRefundProviderState({ refundId: candidate.id, provider });
    }
  }

  return applyRefundProviderState({ provider });
}
