import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  count: vi.fn(),
  findDispute: vi.fn(),
  upsertDispute: vi.fn(),
  findPayment: vi.fn(),
  updateOrder: vi.fn(),
  createAudit: vi.fn(),
  findIdempotency: vi.fn(),
  createIdempotency: vi.fn(),
  updateIdempotency: vi.fn(),
  fetchDispute: vi.fn(),
  updateProviderDispute: vi.fn(),
  addEvidence: vi.fn(),
  uploadUrl: vi.fn(),
  uploadFile: vi.fn(),
  accept: vi.fn(),
  decline: vi.fn(),
}));

vi.mock("@/lib/prisma", async () => {
  const actual = await vi.importActual<typeof import("@/lib/prisma")>("@/lib/prisma");
  const transaction = vi.fn(async (operation: unknown) => {
    if (Array.isArray(operation)) return Promise.all(operation);
    if (typeof operation === "function") {
      return operation({
        payment_disputes: {
          findUnique: mocks.findDispute,
          upsert: mocks.upsertDispute,
          count: mocks.count,
        },
        payments: { findFirst: mocks.findPayment },
        orders: { update: mocks.updateOrder },
        audit_events: { create: mocks.createAudit },
        idempotency_records: {
          create: mocks.createIdempotency,
          update: mocks.updateIdempotency,
        },
      });
    }
    return operation;
  });
  return {
    ...actual,
    prisma: {
      payment_disputes: {
        findMany: mocks.list,
        count: mocks.count,
        findUnique: mocks.findDispute,
      },
      idempotency_records: {
        findUnique: mocks.findIdempotency,
        update: mocks.updateIdempotency,
      },
      $transaction: transaction,
    },
  };
});

vi.mock("@/modules/payments/server/paystack/disputes", () => ({
  fetchDispute: mocks.fetchDispute,
  updateDispute: mocks.updateProviderDispute,
  addDisputeEvidence: mocks.addEvidence,
  getDisputeUploadUrl: mocks.uploadUrl,
  uploadDisputeEvidenceFile: mocks.uploadFile,
  acceptDispute: mocks.accept,
  declineDispute: mocks.decline,
}));

import { Prisma } from "@/lib/prisma";
import {
  acceptPaymentDispute,
  applyDisputeProviderState,
  listPaymentDisputes,
} from "@/modules/payments/server/disputes";

const admin = {
  kind: "staff" as const,
  authUserId: "11111111-1111-4111-8111-111111111111",
  email: "owner@example.com",
  displayName: "Owner",
  role: "admin" as const,
};
const manager = { ...admin, role: "manager" as const };
const payment = {
  id: "22222222-2222-4222-8222-222222222222",
  order_id: "33333333-3333-4333-8333-333333333333",
  status: "success",
  orders: {
    id: "33333333-3333-4333-8333-333333333333",
    order_number: "LS-1001",
    customer_id: "44444444-4444-4444-8444-444444444444",
    customer_name: "Buyer",
    customer: { name: "Buyer" },
  },
};
const localEvidence = {
  evidenceId: "7",
  providerFilename: "proof.pdf",
  originalFilename: "proof.pdf",
  contentType: "application/pdf",
  size: 1024,
  submittedByProfileId: admin.authUserId,
  submittedAt: "2026-07-30T11:00:00.000Z",
};
const row = {
  id: "55555555-5555-4555-8555-555555555555",
  payment_id: payment.id,
  provider: "paystack",
  provider_dispute_id: "42",
  provider_status: "awaiting-merchant-feedback",
  status: "awaiting_evidence",
  category: "transaction_not_received",
  amount: new Prisma.Decimal("250.00"),
  currency: "NGN",
  reason: "Customer says delivery was not received",
  evidence: [],
  evidence_due_at: new Date("2026-08-02T12:00:00.000Z"),
  resolved_at: null,
  resolution_note: null,
  last_provider_sync_at: new Date("2026-07-30T12:00:00.000Z"),
  metadata: {
    provider: {
      transactionId: "9001",
      transactionReference: "pay_dispute_1",
      createdAt: "2026-07-30T10:00:00.000Z",
      updatedAt: "2026-07-30T12:00:00.000Z",
    },
    localEvidence: [localEvidence],
  },
  created_at: new Date("2026-07-30T10:00:00.000Z"),
  updated_at: new Date("2026-07-30T12:00:00.000Z"),
  payments: payment,
};
const provider = {
  id: "42",
  transactionId: "9001",
  transactionReference: "pay_dispute_1",
  status: "awaiting-merchant-feedback" as const,
  providerStatus: "awaiting-merchant-feedback",
  resolution: null,
  category: "transaction_not_received",
  amountMinor: 25_000,
  currency: "NGN",
  reason: "Customer says delivery was not received",
  dueAt: "2026-08-02T12:00:00.000Z",
  resolvedAt: null,
  evidence: null,
  attachments: null,
  createdAt: "2026-07-30T10:00:00.000Z",
  updatedAt: "2026-07-30T12:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.list.mockResolvedValue([row]);
  mocks.count.mockResolvedValue(1);
  mocks.findDispute.mockResolvedValue(row);
  mocks.findPayment.mockResolvedValue(payment);
  mocks.upsertDispute.mockResolvedValue(row);
  mocks.updateOrder.mockResolvedValue({});
  mocks.createAudit.mockResolvedValue({});
});

describe("dispute lifecycle", () => {
  it("allows finance readers to list safe local dispute projections", async () => {
    await expect(listPaymentDisputes(manager, { page: 1, perPage: 25 })).resolves.toEqual({
      ok: true,
      value: expect.objectContaining({
        total: 1,
        items: [
          expect.objectContaining({
            id: row.id,
            paymentId: payment.id,
            orderNumber: "LS-1001",
            amountMinor: 25_000,
            status: "awaiting_evidence",
            evidence: [localEvidence],
          }),
        ],
      }),
    });
  });

  it("denies manager decisions even though managers may read finance", async () => {
    await expect(
      acceptPaymentDispute(manager, row.id, {
        idempotencyKey: "decision-key-123",
        message: "Accept chargeback",
        refundAmountMinor: 25_000,
      }),
    ).resolves.toEqual({
      ok: false,
      error: expect.objectContaining({ code: "FORBIDDEN" }),
    });
    expect(mocks.findDispute).not.toHaveBeenCalled();
  });

  it("treats an identical signed provider replay as a no-op", async () => {
    await expect(applyDisputeProviderState({ provider })).resolves.toEqual({
      ok: true,
      value: expect.objectContaining({ id: row.id, status: "awaiting_evidence" }),
    });
    expect(mocks.upsertDispute).not.toHaveBeenCalled();
    expect(mocks.updateOrder).not.toHaveBeenCalled();
    expect(mocks.createAudit).not.toHaveBeenCalled();
  });

  it("correlates a new provider dispute to a local payment and marks its order for review", async () => {
    mocks.findDispute.mockResolvedValueOnce(null);
    const created = { ...row, last_provider_sync_at: new Date() };
    mocks.upsertDispute.mockResolvedValueOnce(created);

    await expect(applyDisputeProviderState({ provider })).resolves.toEqual({
      ok: true,
      value: expect.objectContaining({ id: row.id, orderId: payment.order_id }),
    });
    expect(mocks.findPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: expect.arrayContaining([
            { provider: "paystack", provider_transaction_id: "9001" },
            { reference: "pay_dispute_1" },
          ]),
        },
      }),
    );
    expect(mocks.updateOrder).toHaveBeenCalledWith({
      where: { id: payment.order_id },
      data: {
        payment_status: "review_required",
        attention: "Paystack dispute 42 requires review.",
      },
    });
    expect(mocks.createAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "payments:dispute:awaiting_evidence",
          target_id: row.id,
        }),
      }),
    );
  });
});
