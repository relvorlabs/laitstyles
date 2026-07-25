import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  stockMutation: vi.fn(),
  mapHold: vi.fn((row: { id: string; status: string }) => ({ id: row.id, status: row.status })),
  mapOrder: vi.fn((row: { id: string; order_number: string }) => ({
    id: row.order_number,
    databaseId: row.id,
  })),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: mocks.transaction },
}));
vi.mock("@/modules/inventory/server/operational-stock", () => ({
  applyOperationalStockMutation: mocks.stockMutation,
  OperationalStockError: class OperationalStockError extends Error {},
}));
vi.mock("@/modules/holds/server/mappers", () => ({
  adminHoldInclude: {},
  mapAdminHoldRow: mocks.mapHold,
}));
vi.mock("@/modules/orders/server/mappers", () => ({
  adminOrderInclude: {},
  mapAdminOrderRow: mocks.mapOrder,
}));

import { convertHold, extendHold, releaseHold } from "@/modules/holds/server/commands";

const actor = {
  kind: "staff" as const,
  authUserId: "11111111-1111-4111-8111-111111111111",
  email: "admin@example.com",
  displayName: "Admin",
  role: "admin" as const,
};
const holdId = "22222222-2222-4222-8222-222222222222";
const activeHold = {
  id: holdId,
  customer_id: "33333333-3333-4333-8333-333333333333",
  product_id: "44444444-4444-4444-8444-444444444444",
  variant_id: null,
  quantity: 2,
  source: "physical-store",
  status: "active",
  expires_at: new Date("2099-07-25T12:00:00.000Z"),
  customers: {
    name: "Amara",
    email: "amara@example.com",
    phone: "+2348000000000",
  },
  products: {
    name: "Botanical Jeans",
    sku: "BJ-01",
    price: { mul: vi.fn(() => "50000.00") },
    product_variants: [],
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(createTx()));
});

describe("Holds commands", () => {
  it("extends only the persisted expiry and records an audit event", async () => {
    const tx = createTx();
    mocks.transaction.mockImplementationOnce(async (callback: (client: typeof tx) => unknown) =>
      callback(tx),
    );

    const result = await extendHold(actor, holdId, 30);

    expect(result.ok).toBe(true);
    expect(tx.holds.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: holdId },
        data: { expires_at: new Date("2099-07-25T12:30:00.000Z") },
      }),
    );
    expect(tx.audit_events.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "hold.extended",
        target_id: holdId,
        metadata: {
          minutes: 30,
          expiresAt: "2099-07-25T12:30:00.000Z",
        },
      }),
    });
  });

  it("releases only the exact reserved hold quantity", async () => {
    const tx = createTx();
    mocks.transaction.mockImplementationOnce(async (callback: (client: typeof tx) => unknown) =>
      callback(tx),
    );

    const result = await releaseHold(actor, holdId);

    expect(result.ok).toBe(true);
    expect(mocks.stockMutation).toHaveBeenCalledWith(tx, {
      productId: activeHold.product_id,
      quantity: 2,
      kind: "release-reserved",
      actorProfileId: actor.authUserId,
      note: "Released from the admin Holds workspace.",
      relatedHoldId: holdId,
      metadata: { operation: "hold-release" },
    });
    expect(tx.holds.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: holdId },
        data: expect.objectContaining({ status: "released" }),
      }),
    );
  });

  it("converts an active hold into a pending-payment order without selling stock", async () => {
    const tx = createTx();
    mocks.transaction.mockImplementationOnce(async (callback: (client: typeof tx) => unknown) =>
      callback(tx),
    );

    const result = await convertHold(actor, holdId, {
      deliveryCity: "Ikeja",
      notes: "Customer will complete payment later.",
    });

    expect(result.ok).toBe(true);
    expect(mocks.stockMutation).not.toHaveBeenCalled();
    expect(tx.orders.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        source: "hold-conversion",
        payment_status: "pending",
        payment_method: null,
        fulfilment_status: "unfulfilled",
        attention: "payment",
        order_lines: {
          create: expect.objectContaining({
            product_id: activeHold.product_id,
            quantity: 2,
            stock_state: "reserved",
          }),
        },
      }),
      include: {},
    });
    expect(tx.holds.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "converted",
          payment_progress: "pending",
          order_id: "55555555-5555-4555-8555-555555555555",
        }),
      }),
    );
  });
});

function createTx() {
  return {
    holds: {
      findUnique: vi.fn().mockResolvedValue(activeHold),
      update: vi.fn().mockImplementation(({ data }: { data: { status?: string } }) =>
        Promise.resolve({ ...activeHold, ...data }),
      ),
    },
    orders: {
      create: vi.fn().mockResolvedValue({
        id: "55555555-5555-4555-8555-555555555555",
        order_number: "LS-TEST1234",
      }),
    },
    activity_events: { create: vi.fn().mockResolvedValue({}) },
    audit_events: { create: vi.fn().mockResolvedValue({}) },
  };
}
