import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  productFindUnique: vi.fn(),
  savedUpsert: vi.fn(),
  savedDeleteMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    customer_saved_products: {
      findMany: mocks.findMany,
      upsert: mocks.savedUpsert,
      deleteMany: mocks.savedDeleteMany,
    },
    products: {
      findUnique: mocks.productFindUnique,
    },
  },
}));

import { ApiError } from "@/lib/errors/api-error";
import {
  listOwnedSavedProductIds,
  removeOwnedSavedProduct,
  saveOwnedProduct,
} from "@/modules/customers/server/saved-products";

const identity = {
  kind: "consumer" as const,
  authUserId: "11111111-1111-4111-8111-111111111111",
  email: "ada@example.com",
  displayName: "Ada",
  phone: null,
  customerId: "22222222-2222-4222-8222-222222222222",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listOwnedSavedProductIds", () => {
  it("scopes saved products to the authenticated customer", async () => {
    mocks.findMany.mockResolvedValue([{ product_id: "product-a" }, { product_id: "product-b" }]);

    const ids = await listOwnedSavedProductIds(identity);

    expect(mocks.findMany).toHaveBeenCalledWith({
      where: { customer_id: identity.customerId },
      select: { product_id: true },
      orderBy: { created_at: "desc" },
    });
    expect(ids).toEqual(["product-a", "product-b"]);
  });
});

describe("saveOwnedProduct", () => {
  it("rejects a product that does not exist", async () => {
    mocks.productFindUnique.mockResolvedValue(null);

    await expect(saveOwnedProduct(identity, "missing-product")).rejects.toMatchObject({
      code: "PRODUCT_NOT_FOUND",
    });
    expect(mocks.savedUpsert).not.toHaveBeenCalled();
  });

  it("is idempotent when the product is already saved", async () => {
    mocks.productFindUnique.mockResolvedValue({ id: "product-a" });

    await saveOwnedProduct(identity, "product-a");

    expect(mocks.savedUpsert).toHaveBeenCalledWith({
      where: {
        customer_id_product_id: { customer_id: identity.customerId, product_id: "product-a" },
      },
      update: {},
      create: { customer_id: identity.customerId, product_id: "product-a" },
    });
  });

  it("throws an ApiError instance for a missing product", async () => {
    mocks.productFindUnique.mockResolvedValue(null);

    await expect(saveOwnedProduct(identity, "missing-product")).rejects.toBeInstanceOf(ApiError);
  });
});

describe("removeOwnedSavedProduct", () => {
  it("deletes only the authenticated customer's saved relation", async () => {
    await removeOwnedSavedProduct(identity, "product-a");

    expect(mocks.savedDeleteMany).toHaveBeenCalledWith({
      where: { customer_id: identity.customerId, product_id: "product-a" },
    });
  });
});
