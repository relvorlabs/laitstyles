import "server-only";

import { err, ok, type Result } from "@/lib/errors";
import { Prisma, prisma } from "@/lib/prisma";
import { hasCapability } from "@/modules/auth/permissions";
import type { StaffSession } from "@/modules/auth/server/session";

const paymentInclude = {
  orders: {
    select: {
      id: true,
      order_number: true,
      customer_id: true,
      customer_name: true,
      customer_email: true,
      payment_status: true,
      total: true,
      refunded_amount: true,
      placed_at: true,
    },
  },
  payment_refunds: {
    orderBy: { requested_at: "desc" },
    select: {
      id: true,
      requested_amount: true,
      processed_amount: true,
      currency: true,
      status: true,
      provider_reference: true,
      provider_status: true,
      requested_at: true,
      processed_at: true,
      failed_at: true,
    },
  },
  payment_disputes: {
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      provider_dispute_id: true,
      provider_status: true,
      status: true,
      category: true,
      amount: true,
      currency: true,
      evidence_due_at: true,
      resolved_at: true,
      created_at: true,
    },
  },
} satisfies Prisma.paymentsInclude;

type PaymentRow = Prisma.paymentsGetPayload<{ include: typeof paymentInclude }>;

export type AdminPaymentProjection = {
  id: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string | null;
  customerEmail: string | null;
  provider: string;
  reference: string;
  providerTransactionId: string | null;
  amountMinor: number;
  refundableAmountMinor: number;
  currency: string;
  status: string;
  orderPaymentStatus: string;
  channel: string | null;
  gatewayResponse: string | null;
  verifiedAt: string | null;
  failureCode: string | null;
  failureReason: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  refunds: Array<{
    id: string;
    requestedAmountMinor: number;
    processedAmountMinor: number;
    status: string;
    providerReference: string | null;
    providerStatus: string | null;
    requestedAt: string;
    processedAt: string | null;
    failedAt: string | null;
  }>;
  disputes: Array<{
    id: string;
    providerDisputeId: string;
    providerStatus: string | null;
    status: string;
    category: string | null;
    amountMinor: number;
    currency: string;
    evidenceDueAt: string | null;
    resolvedAt: string | null;
    createdAt: string;
  }>;
};

export type AdminPaymentError = {
  code: "FORBIDDEN" | "PAYMENT_NOT_FOUND";
  message: string;
};

export async function listAdminPayments(
  actor: StaffSession,
  query: { page?: number; perPage?: number; status?: string; orderId?: string; reference?: string } = {},
): Promise<
  Result<{ items: AdminPaymentProjection[]; page: number; perPage: number; total: number }, AdminPaymentError>
> {
  if (!hasCapability(actor.role, "finance:read")) {
    return err({ code: "FORBIDDEN", message: "You do not have permission to view payments." });
  }
  const page = Number.isInteger(query.page) && (query.page ?? 0) > 0 ? query.page! : 1;
  const perPage =
    Number.isInteger(query.perPage) && (query.perPage ?? 0) > 0
      ? Math.min(query.perPage!, 100)
      : 25;
  const where: Prisma.paymentsWhereInput = {
    ...(query.status ? { status: query.status as Prisma.EnumPayment_attempt_statusFilter["equals"] } : {}),
    ...(query.orderId ? { order_id: query.orderId } : {}),
    ...(query.reference
      ? { reference: { contains: query.reference.trim(), mode: "insensitive" } }
      : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.payments.findMany({
      where,
      include: paymentInclude,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.payments.count({ where }),
  ]);
  return ok({ items: items.map(toAdminPayment), page, perPage, total });
}

export async function getAdminPayment(
  actor: StaffSession,
  paymentId: string,
): Promise<Result<AdminPaymentProjection, AdminPaymentError>> {
  if (!hasCapability(actor.role, "finance:read")) {
    return err({ code: "FORBIDDEN", message: "You do not have permission to view payments." });
  }
  const row = await prisma.payments.findUnique({ where: { id: paymentId }, include: paymentInclude });
  return row
    ? ok(toAdminPayment(row))
    : err({ code: "PAYMENT_NOT_FOUND", message: "The payment could not be found." });
}

export async function getAdminPaymentTimeline(actor: StaffSession, paymentId: string) {
  if (!hasCapability(actor.role, "finance:read")) {
    return err<AdminPaymentError>({
      code: "FORBIDDEN",
      message: "You do not have permission to view payment history.",
    });
  }
  const payment = await prisma.payments.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      order_payment_events: {
        orderBy: { occurred_at: "desc" },
        select: {
          id: true,
          kind: true,
          status: true,
          amount: true,
          currency: true,
          occurred_at: true,
          note: true,
          metadata: true,
        },
      },
      payment_refunds: {
        select: {
          id: true,
          status: true,
          requested_amount: true,
          processed_amount: true,
          currency: true,
          requested_at: true,
          processed_at: true,
          failed_at: true,
        },
      },
      payment_disputes: {
        select: {
          id: true,
          status: true,
          amount: true,
          currency: true,
          created_at: true,
          resolved_at: true,
          evidence_due_at: true,
        },
      },
    },
  });
  if (!payment) {
    return err<AdminPaymentError>({
      code: "PAYMENT_NOT_FOUND",
      message: "The payment could not be found.",
    });
  }

  const timeline = [
    ...payment.order_payment_events.map((event) => ({
      id: event.id,
      kind: event.kind,
      status: event.status,
      amountMinor: decimalToMinor(event.amount),
      currency: event.currency,
      occurredAt: event.occurred_at.toISOString(),
      note: event.note,
      metadata: event.metadata,
    })),
    ...payment.payment_refunds.flatMap((refund) => {
      const events = [
        {
          id: `${refund.id}:requested`,
          kind: "refund_requested",
          status: refund.status,
          amountMinor: decimalToMinor(refund.requested_amount),
          currency: refund.currency,
          occurredAt: refund.requested_at.toISOString(),
          note: null,
          metadata: { refundId: refund.id },
        },
      ];
      const terminalAt = refund.processed_at ?? refund.failed_at;
      if (terminalAt) {
        events.push({
          id: `${refund.id}:terminal`,
          kind: refund.processed_at ? "refund_processed" : "refund_failed",
          status: refund.status,
          amountMinor: decimalToMinor(refund.processed_amount),
          currency: refund.currency,
          occurredAt: terminalAt.toISOString(),
          note: null,
          metadata: { refundId: refund.id },
        });
      }
      return events;
    }),
    ...payment.payment_disputes.flatMap((dispute) => {
      const events = [
        {
          id: `${dispute.id}:created`,
          kind: "dispute_created",
          status: dispute.status,
          amountMinor: decimalToMinor(dispute.amount),
          currency: dispute.currency,
          occurredAt: dispute.created_at.toISOString(),
          note: null,
          metadata: { disputeId: dispute.id, evidenceDueAt: dispute.evidence_due_at?.toISOString() ?? null },
        },
      ];
      if (dispute.resolved_at) {
        events.push({
          id: `${dispute.id}:resolved`,
          kind: "dispute_resolved",
          status: dispute.status,
          amountMinor: decimalToMinor(dispute.amount),
          currency: dispute.currency,
          occurredAt: dispute.resolved_at.toISOString(),
          note: null,
          metadata: { disputeId: dispute.id },
        });
      }
      return events;
    }),
  ].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));

  return ok(timeline);
}

function toAdminPayment(row: PaymentRow): AdminPaymentProjection {
  const reserved = row.payment_refunds.reduce((total, refund) => {
    return total.add(refund.status === "processed" ? refund.processed_amount : refund.requested_amount);
  }, new Prisma.Decimal(0));
  return {
    id: row.id,
    orderId: row.order_id,
    orderNumber: row.orders.order_number,
    customerId: row.orders.customer_id,
    customerName: row.orders.customer_name,
    customerEmail: row.orders.customer_email,
    provider: row.provider,
    reference: row.reference,
    providerTransactionId: row.provider_transaction_id,
    amountMinor: decimalToMinor(row.amount),
    refundableAmountMinor: Math.max(0, decimalToMinor(row.amount.sub(reserved))),
    currency: row.currency,
    status: row.status,
    orderPaymentStatus: row.orders.payment_status,
    channel: row.channel,
    gatewayResponse: row.gateway_response,
    verifiedAt: row.verified_at?.toISOString() ?? null,
    failureCode: row.failure_code,
    failureReason: row.failure_reason,
    paidAt: row.paid_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    refunds: row.payment_refunds.map((refund) => ({
      id: refund.id,
      requestedAmountMinor: decimalToMinor(refund.requested_amount),
      processedAmountMinor: decimalToMinor(refund.processed_amount),
      status: refund.status,
      providerReference: refund.provider_reference,
      providerStatus: refund.provider_status,
      requestedAt: refund.requested_at.toISOString(),
      processedAt: refund.processed_at?.toISOString() ?? null,
      failedAt: refund.failed_at?.toISOString() ?? null,
    })),
    disputes: row.payment_disputes.map((dispute) => ({
      id: dispute.id,
      providerDisputeId: dispute.provider_dispute_id,
      providerStatus: dispute.provider_status,
      status: dispute.status,
      category: dispute.category,
      amountMinor: decimalToMinor(dispute.amount),
      currency: dispute.currency,
      evidenceDueAt: dispute.evidence_due_at?.toISOString() ?? null,
      resolvedAt: dispute.resolved_at?.toISOString() ?? null,
      createdAt: dispute.created_at.toISOString(),
    })),
  };
}

function decimalToMinor(amount: Prisma.Decimal) {
  return amount.mul(100).toDecimalPlaces(0).toNumber();
}
