import "server-only";

import { err, ok, type Result } from "@/lib/errors";
import type { Prisma } from "@/lib/prisma";
import {
  decimalToMinor,
  type RefundError,
  type RefundLineAllocation,
  type RefundRow,
  minorToDecimal,
} from "@/modules/payments/server/refund-projection";

export function buildRefundLineAllocations(input: {
  amountMinor: number;
  requested?: RefundLineAllocation[];
  orderLines: Array<{
    id: string;
    quantity: number;
    unit_price: Prisma.Decimal;
    refunded_amount: Prisma.Decimal;
  }>;
  allowedLineIds: Set<string> | null;
}): Result<RefundLineAllocation[], RefundError> {
  const lines = input.orderLines.filter(
    (line) => !input.allowedLineIds || input.allowedLineIds.has(line.id),
  );
  const availableByLine = new Map(
    lines.map((line) => [
      line.id,
      Math.max(0, decimalToMinor(line.unit_price.mul(line.quantity).sub(line.refunded_amount))),
    ]),
  );

  if (input.requested?.length) {
    const seen = new Set<string>();
    let total = 0;
    for (const allocation of input.requested) {
      const available = availableByLine.get(allocation.orderLineId);
      if (
        seen.has(allocation.orderLineId) ||
        available === undefined ||
        !Number.isSafeInteger(allocation.amountMinor) ||
        allocation.amountMinor <= 0 ||
        allocation.amountMinor > available
      ) {
        return err({
          code: "REFUND_INVALID",
          message: "One or more refund line allocations are invalid for this order.",
        });
      }
      seen.add(allocation.orderLineId);
      total += allocation.amountMinor;
    }
    if (total > input.amountMinor) {
      return err({
        code: "REFUND_INVALID",
        message: "Refund line allocations cannot exceed the requested refund amount.",
      });
    }
    return ok(input.requested);
  }

  let remaining = input.amountMinor;
  const allocations: RefundLineAllocation[] = [];
  for (const line of lines) {
    const available = availableByLine.get(line.id) ?? 0;
    const amountMinor = Math.min(available, remaining);
    if (amountMinor > 0) allocations.push({ orderLineId: line.id, amountMinor });
    remaining -= amountMinor;
    if (remaining === 0) break;
  }
  return ok(allocations);
}

export async function applyRefundLineAllocations(
  tx: Prisma.TransactionClient,
  refund: RefundRow,
  allocations: RefundLineAllocation[],
) {
  const orderLines = new Map(refund.payments.orders.order_lines.map((line) => [line.id, line]));
  for (const allocation of allocations) {
    const line = orderLines.get(allocation.orderLineId);
    if (!line) continue;
    const amount = minorToDecimal(allocation.amountMinor);
    const next = line.refunded_amount.add(amount);
    const lineTotal = line.unit_price.mul(line.quantity);
    await tx.order_lines.update({
      where: { id: line.id },
      data: {
        refunded_amount: next,
        refund_status: next.gte(lineTotal) ? "refunded" : "partially_refunded",
        refunded_at: new Date(),
      },
    });
  }
}
