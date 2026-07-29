import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    customer_addresses: {
      findMany: mocks.findMany,
    },
    $transaction: mocks.transaction,
  },
}));

import { ApiError } from "@/lib/errors/api-error";
import {
  createOwnedAddress,
  deleteOwnedAddress,
  listOwnedAddresses,
  updateOwnedAddress,
} from "@/modules/customers/server/addresses";

const identity = {
  kind: "consumer" as const,
  authUserId: "11111111-1111-4111-8111-111111111111",
  email: "ada@example.com",
  displayName: "Ada",
  phone: null,
  customerId: "22222222-2222-4222-8222-222222222222",
};

function addressRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "address-1",
    customer_id: identity.customerId,
    label: "Home",
    line1: "18 Example Road",
    line2: null,
    city: "Lagos",
    state: "Lagos",
    country: "Nigeria",
    is_default: true,
    delivery_notes: null,
    created_at: new Date("2026-01-01T00:00:00.000Z"),
    updated_at: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function createTx() {
  return {
    customer_addresses: {
      findFirst: mocks.findFirst,
      count: vi.fn().mockResolvedValue(0),
      updateMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listOwnedAddresses", () => {
  it("scopes the address list to the authenticated customer", async () => {
    mocks.findMany.mockResolvedValue([addressRow()]);

    const addresses = await listOwnedAddresses(identity);

    expect(mocks.findMany).toHaveBeenCalledWith({
      where: { customer_id: identity.customerId },
      orderBy: [{ is_default: "desc" }, { created_at: "asc" }],
    });
    expect(addresses).toHaveLength(1);
    expect(addresses[0]).toMatchObject({ id: "address-1", isDefault: true });
  });
});

describe("createOwnedAddress", () => {
  it("forces the first address for a customer to be the default", async () => {
    const tx = createTx();
    tx.customer_addresses.count.mockResolvedValue(0);
    tx.customer_addresses.create.mockResolvedValue(addressRow());
    mocks.transaction.mockImplementationOnce(async (callback: (client: typeof tx) => unknown) =>
      callback(tx),
    );

    await createOwnedAddress(identity, {
      line1: "18 Example Road",
      city: "Lagos",
    });

    expect(tx.customer_addresses.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        customer_id: identity.customerId,
        line1: "18 Example Road",
        city: "Lagos",
        is_default: true,
      }),
    });
  });

  it("replaces the previous default in one transaction when a later address is marked default", async () => {
    const tx = createTx();
    tx.customer_addresses.count.mockResolvedValue(1);
    tx.customer_addresses.create.mockResolvedValue(addressRow({ id: "address-2" }));
    mocks.transaction.mockImplementationOnce(async (callback: (client: typeof tx) => unknown) =>
      callback(tx),
    );

    await createOwnedAddress(identity, {
      line1: "2 Sample Avenue",
      city: "Lagos",
      isDefault: true,
    });

    expect(tx.customer_addresses.updateMany).toHaveBeenCalledWith({
      where: { customer_id: identity.customerId },
      data: { is_default: false },
    });
    expect(tx.customer_addresses.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ is_default: true }),
    });
  });
});

describe("updateOwnedAddress", () => {
  it("replaces the previous default in one transaction", async () => {
    const tx = createTx();
    mocks.findFirst.mockResolvedValue(addressRow({ id: "address-2", is_default: false }));
    tx.customer_addresses.update.mockResolvedValue(addressRow({ id: "address-2" }));
    mocks.transaction.mockImplementationOnce(async (callback: (client: typeof tx) => unknown) =>
      callback(tx),
    );

    await updateOwnedAddress(identity, "address-2", { isDefault: true });

    expect(tx.customer_addresses.updateMany).toHaveBeenCalledWith({
      where: { customer_id: identity.customerId, id: { not: "address-2" } },
      data: { is_default: false },
    });
  });

  it("does not unset the only default address", async () => {
    const tx = createTx();
    mocks.findFirst.mockResolvedValue(addressRow());
    tx.customer_addresses.update.mockResolvedValue(addressRow());
    mocks.transaction.mockImplementationOnce(async (callback: (client: typeof tx) => unknown) =>
      callback(tx),
    );

    await updateOwnedAddress(identity, "address-1", { isDefault: false });

    expect(tx.customer_addresses.update).toHaveBeenCalledWith({
      where: { id: "address-1" },
      data: {},
    });
  });

  it("conceals another customer's address as not found", async () => {
    const tx = createTx();
    mocks.findFirst.mockResolvedValue(null);
    mocks.transaction.mockImplementationOnce(async (callback: (client: typeof tx) => unknown) =>
      callback(tx),
    );

    await expect(
      updateOwnedAddress(identity, "other-address", { city: "Abuja" }),
    ).rejects.toMatchObject({ code: "ADDRESS_NOT_FOUND" });
  });

  it("throws an ApiError instance so route handlers map it consistently", async () => {
    const tx = createTx();
    mocks.findFirst.mockResolvedValue(null);
    mocks.transaction.mockImplementationOnce(async (callback: (client: typeof tx) => unknown) =>
      callback(tx),
    );

    await expect(
      updateOwnedAddress(identity, "other-address", { city: "Abuja" }),
    ).rejects.toBeInstanceOf(ApiError);
  });
});

describe("deleteOwnedAddress", () => {
  it("conceals another customer's address", async () => {
    const tx = createTx();
    mocks.findFirst.mockResolvedValue(null);
    mocks.transaction.mockImplementationOnce(async (callback: (client: typeof tx) => unknown) =>
      callback(tx),
    );

    await expect(deleteOwnedAddress(identity, "other-address")).rejects.toMatchObject({
      code: "ADDRESS_NOT_FOUND",
    });
  });

  it("deletes an owned address scoped to the customer", async () => {
    const tx = createTx();
    mocks.findFirst.mockResolvedValue(addressRow());
    mocks.transaction.mockImplementationOnce(async (callback: (client: typeof tx) => unknown) =>
      callback(tx),
    );

    await deleteOwnedAddress(identity, "address-1");

    expect(tx.customer_addresses.delete).toHaveBeenCalledWith({ where: { id: "address-1" } });
  });

  it("promotes the oldest remaining address when deleting the default", async () => {
    const tx = createTx();
    mocks.findFirst
      .mockResolvedValueOnce(addressRow())
      .mockResolvedValueOnce(addressRow({ id: "address-2", is_default: false }));
    mocks.transaction.mockImplementationOnce(async (callback: (client: typeof tx) => unknown) =>
      callback(tx),
    );

    await deleteOwnedAddress(identity, "address-1");

    expect(tx.customer_addresses.findFirst).toHaveBeenLastCalledWith({
      where: { customer_id: identity.customerId },
      orderBy: { created_at: "asc" },
      select: { id: true },
    });
    expect(tx.customer_addresses.update).toHaveBeenCalledWith({
      where: { id: "address-2" },
      data: { is_default: true },
    });
  });
});
