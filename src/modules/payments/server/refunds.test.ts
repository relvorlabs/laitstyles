import { beforeEach, describe, expect, it, vi } from "vitest";

const provider = vi.hoisted(() => ({ createRefund: vi.fn() }));

vi.mock("@/modules/payments/server/paystack", () => ({
  createRefund: provider.createRefund,
}));

import { Prisma } from "@/lib/prisma";

const paymentId = "11111111-1111-4111-8111-111111111111";
const orderId = "22222222-2222-4222-8222-222222222222";
const customerId = "33333333-3333-4333-8333-333333333333";
const actor = {
  kind: "staff" as const,
  authUserId: "44444444-4444-4444-8444-444444444444",
  email: "owner@example.com",
  displayName: "Owner",
  role: "admin" as const,
};
const manager = { ...actor, role: "manager" as const };

const state = vi.hoisted(() => ({
  refunds: [] as Array<Record<string, any>>,
  serial: Promise.resolve() as Promise<unknown>,
  orderRefunded: new Prisma.Decimal(0),
  lineRefunded: new Prisma.Decimal(0),
  lineUpdates: 0,
  orderUpdates: 0,
  paymentEvents: 0,
  audits: 0,
}));

const orderLine = {
  id: "55555555-5555-4555-8555-555555555555",
  order_id: orderId,
  product_id: "66666666-6666-4666-8666-666666666666",
  variant_id: null,
  product_name: "Dress",
  variant_label: null,
  sku: "DRESS-1",
  quantity: 1,
  unit_price: new Prisma.Decimal("1000.00"),
  stock_state: "committed",
  fulfilment_status: "delivered",
  delivered_quantity: 1,
  delivered_at: new Date("2026-07-29T10:00:00.000Z"),
  cancelled_quantity: 0,
  refund_status: "not_refunded",
  get refunded_amount() {
    return state.lineRefunded;
  },
  refunded_at: null,
};

function paymentRow() {
  return {
    id: paymentId,
    order_id: orderId,
    provider: "paystack",
    reference: "pay_refund_1",
    access_code: null,
    amount: new Prisma.Decimal("1000.00"),
    currency: "NGN",
    status: "success",
    provider_transaction_id: "9001",
    channel: "card",
    gateway_response: "Successful",
    raw_response: null,
    payment_authorization_id: null,
    provider_customer_code: null,
    verified_at: new Date("2026-07-30T09:00:00.000Z"),
    verification_source: "webhook",
    failure_code: null,
    failure_reason: null,
    paid_at: new Date("2026-07-30T09:00:00.000Z"),
    created_at: new Date("2026-07-30T08:59:00.000Z"),
    updated_at: new Date("2026-07-30T09:00:00.000Z"),
    orders: {
      id: orderId,
      order_number: "LS-1001",
      customer_id: customerId,
      total: new Prisma.Decimal("1000.00"),
      get refunded_amount() {
        return state.orderRefunded;
      },
      order_lines: [orderLine],
    },
    payment_refunds: state.refunds.filter((refund) =>
      ["pending", "processing", "needs_attention", "processed"].includes(refund.status),
    ),
  };
}

function refundRow(input: {
  id: string;
  amountMinor: number;
  key: string;
  status?: "pending" | "processing" | "needs_attention" | "processed" | "failed";
}) {
  const requested = new Prisma.Decimal(input.amountMinor).div(100);
  return {
    id: input.id,
    payment_id: paymentId,
    return_id: null,
    provider: "paystack",
    provider_reference: null,
    provider_status: null,
    idempotency_key: input.key,
    requested_amount: requested,
    processed_amount: new Prisma.Decimal(0),
    currency: "NGN",
    status: input.status ?? "pending",
    reason: "Customer return",
    failure_reason: null,
    retry_count: 0,
    requested_by_profile_id: actor.authUserId,
    requested_at: new Date("2026-07-30T10:00:00.000Z"),
    processed_at: null,
    failed_at: null,
    last_provider_sync_at: null,
    metadata: {
      source: "admin",
      lineAllocations: [{ orderLineId: orderLine.id, amountMinor: input.amountMinor }],
    },
    created_at: new Date("2026-07-30T10:00:00.000Z"),
    updated_at: new Date("2026-07-30T10:00:00.000Z"),
    payments: paymentRow(),
    returns: null,
    profiles: { display_name: "Owner", email: "owner@example.com" },
  };
}

const tx = {
  payments: {
    findUnique: vi.fn(async () => paymentRow()),
  },
  returns: {
    findFirst: vi.fn(async () => null),
    update: vi.fn(async () => ({})),
  },
  payment_refunds: {
    findFirst: vi.fn(async ({ where }: { where: Record<string, any> }) => {
      if (where.id) return state.refunds.find((refund) => refund.id === where.id) ?? null;
      if (where.provider_reference) {
        return state.refunds.find((refund) => refund.provider_reference === where.provider_reference) ?? null;
      }
      return null;
    }),
    create: vi.fn(async ({ data }: { data: Record<string, any> }) => {
      const row = refundRow({
        id: crypto.randomUUID(),
        amountMinor: data.requested_amount.mul(100).toNumber(),
        key: data.idempotency_key,
      });
      state.refunds.push(row);
      return row;
    }),
    update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, any> }) => {
      const row = state.refunds.find((refund) => refund.id === where.id);
      if (!row) throw new Error("refund missing");
      Object.assign(row, data, {
        processed_amount: data.processed_amount ?? row.processed_amount,
        processed_at: data.processed_at ?? row.processed_at,
        failed_at: data.failed_at ?? row.failed_at,
        metadata: data.metadata ?? row.metadata,
        updated_at: new Date(),
      });
      row.payments = paymentRow();
      return row;
    }),
  },
  order_lines: {
    update: vi.fn(async ({ data }: { data: Record<string, any> }) => {
      state.lineUpdates += 1;
      state.lineRefunded = data.refunded_amount;
      return {};
    }),
  },
  orders: {
    update: vi.fn(async ({ data }: { data: Record<string, any> }) => {
      state.orderUpdates += 1;
      state.orderRefunded = data.refunded_amount;
      return {};
    }),
  },
  order_payment_events: {
    create: vi.fn(async () => {
      state.paymentEvents += 1;
      return {};
    }),
  },
  audit_events: {
    create: vi.fn(async () => {
      state.audits += 1;
      return {};
    }),
  },
};

vi.mock("@/lib/prisma", async () => {
  const actual = await vi.importActual<typeof import("@/lib/prisma")>("@/lib/prisma");
  return {
    ...actual,
    prisma: {
      payment_refunds: {
        findFirst: vi.fn(async ({ where }: { where: Record<string, any> }) =>
          state.refunds.find(
            (refund) =>
              (where.id ? refund.id === where.id : true) &&
              (where.payment_id ? refund.payment_id === where.payment_id : true) &&
              (where.idempotency_key ? refund.idempotency_key === where.idempotency_key : true) &&
              (where.provider_reference
                ? refund.provider_reference === where.provider_reference
                : true),
          ) ?? null,
        ),
        findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
          state.refunds.find((refund) => refund.id === where.id) ?? null,
        ),
        findMany: vi.fn(async () => state.refunds),
        count: vi.fn(async () => state.refunds.length),
        update: tx.payment_refunds.update,
      },
      audit_events: tx.audit_events,
      $transaction: vi.fn((operation: unknown) => {
        if (Array.isArray(operation)) return Promise.all(operation);
        const run = state.serial.then(() => (operation as (value: typeof tx) => unknown)(tx));
        state.serial = run.catch(() => undefined);
        return run;
      }),
    },
  };
});

import {
  applyRefundProviderState,
  requestRefund,
} from "@/modules/payments/server/refunds";

beforeEach(() => {
  vi.clearAllMocks();
  state.refunds = [];
  state.serial = Promise.resolve();
  state.orderRefunded = new Prisma.Decimal(0);
  state.lineRefunded = new Prisma.Decimal(0);
  state.lineUpdates = 0;
  state.orderUpdates = 0;
  state.paymentEvents = 0;
  state.audits = 0;
  provider.createRefund.mockImplementation(async ({ merchantNote }: { merchantNote: string }) => ({
    id: merchantNote.split(" ").at(-1) ?? "refund",
    transactionId: "9001",
    transactionReference: "pay_refund_1",
    amountMinor: 0,
    deductedAmountMinor: 0,
    currency: "NGN",
    status: "pending",
    providerStatus: "pending",
    customerNote: null,
    merchantNote,
    refundedAt: null,
    expectedAt: null,
    createdAt: null,
    updatedAt: null,
  }));
});

describe("refund lifecycle", () => {
  it("denies managers from executing provider refunds", async () => {
    await expect(
      requestRefund(manager, {
        paymentId,
        amountMinor: 10_000,
        currency: "NGN",
        idempotencyKey: "refund-key-123",
      }),
    ).resolves.toEqual({
      ok: false,
      error: expect.objectContaining({ code: "FORBIDDEN" }),
    });
    expect(provider.createRefund).not.toHaveBeenCalled();
  });

  it("reserves the refund locally before calling Paystack", async () => {
    const result = await requestRefund(actor, {
      paymentId,
      amountMinor: 25_000,
      currency: "NGN",
      idempotencyKey: "refund-key-123",
      reason: "Customer return",
    });

    expect(result.ok).toBe(true);
    expect(state.refunds).toHaveLength(1);
    expect(provider.createRefund).toHaveBeenCalledTimes(1);
    expect(tx.payment_refunds.create.mock.invocationCallOrder[0]).toBeLessThan(
      provider.createRefund.mock.invocationCallOrder[0],
    );
  });

  it("allows only one concurrent ceiling claim when requests exceed the captured amount together", async () => {
    const [first, second] = await Promise.all([
      requestRefund(actor, {
        paymentId,
        amountMinor: 60_000,
        currency: "NGN",
        idempotencyKey: "refund-key-600",
      }),
      requestRefund(actor, {
        paymentId,
        amountMinor: 50_000,
        currency: "NGN",
        idempotencyKey: "refund-key-500",
      }),
    ]);

    expect([first, second].filter((result) => result.ok)).toHaveLength(1);
    expect([first, second].find((result) => !result.ok)).toEqual({
      ok: false,
      error: expect.objectContaining({
        code: "REFUND_LIMIT_EXCEEDED",
        remainingAmountMinor: 40_000,
      }),
    });
    expect(state.refunds).toHaveLength(1);
    expect(provider.createRefund).toHaveBeenCalledTimes(1);
  });

  it("applies a processed provider event exactly once", async () => {
    const refund = refundRow({
      id: "77777777-7777-4777-8777-777777777777",
      amountMinor: 25_000,
      key: "refund-key-processed",
    });
    state.refunds.push(refund);
    const processed = {
      id: "3018284",
      transactionId: "9001",
      transactionReference: "pay_refund_1",
      amountMinor: 25_000,
      deductedAmountMinor: 25_000,
      currency: "NGN" as const,
      status: "processed" as const,
      providerStatus: "processed",
      customerNote: null,
      merchantNote: `Laitstyles refund ${refund.id}`,
      refundedAt: "2026-07-30T12:00:00.000Z",
      expectedAt: null,
      createdAt: null,
      updatedAt: null,
    };

    await applyRefundProviderState({ refundId: refund.id, provider: processed });
    await applyRefundProviderState({ refundId: refund.id, provider: processed });

    expect(state.lineUpdates).toBe(1);
    expect(state.orderUpdates).toBe(1);
    expect(state.paymentEvents).toBe(1);
    expect(state.orderRefunded.toString()).toBe("250");
  });

  it("does not downgrade a processed refund after a late failed state", async () => {
    const refund = refundRow({
      id: "88888888-8888-4888-8888-888888888888",
      amountMinor: 10_000,
      key: "refund-key-terminal",
      status: "processed",
    });
    refund.provider_reference = "3018285";
    refund.provider_status = "processed";
    refund.processed_amount = new Prisma.Decimal("100.00");
    refund.processed_at = new Date("2026-07-30T12:00:00.000Z");
    state.refunds.push(refund);

    const result = await applyRefundProviderState({
      refundId: refund.id,
      provider: {
        id: "3018285",
        transactionId: "9001",
        transactionReference: "pay_refund_1",
        amountMinor: 10_000,
        deductedAmountMinor: 10_000,
        currency: "NGN",
        status: "failed",
        providerStatus: "failed",
        customerNote: null,
        merchantNote: `Laitstyles refund ${refund.id}`,
        refundedAt: null,
        expectedAt: null,
        createdAt: null,
        updatedAt: null,
      },
    });

    expect(result).toEqual({
      ok: true,
      value: expect.objectContaining({ status: "processed", providerStatus: "processed" }),
    });
    expect(state.lineUpdates).toBe(0);
    expect(state.orderUpdates).toBe(0);
  });
});
