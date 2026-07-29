import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/errors/api-error";

const mocks = vi.hoisted(() => ({
  requireApiConsumer: vi.fn(),
  removeOwnedSavedProduct: vi.fn(),
}));

vi.mock("@/lib/http/auth", () => ({ requireApiConsumer: mocks.requireApiConsumer }));
vi.mock("@/modules/customers/server/saved-products", () => ({
  removeOwnedSavedProduct: mocks.removeOwnedSavedProduct,
}));

import { DELETE } from "./route";

const identity = {
  kind: "consumer" as const,
  authUserId: "user-a",
  email: "ada@example.com",
  displayName: "Ada",
  phone: null,
  customerId: "customer-a",
};

function request() {
  return new Request("http://localhost/api/v1/account/saved-products/product-a", {
    method: "DELETE",
  });
}

function context(productId = "product-a") {
  return { params: Promise.resolve({ productId }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireApiConsumer.mockResolvedValue(identity);
  mocks.removeOwnedSavedProduct.mockResolvedValue(undefined);
});

describe("DELETE /api/v1/account/saved-products/[productId]", () => {
  it("requires an authenticated consumer", async () => {
    mocks.requireApiConsumer.mockRejectedValueOnce(
      new ApiError({ code: "AUTHENTICATION_REQUIRED", message: "Sign in.", status: 401 }),
    );

    const response = await DELETE(request(), context());

    expect(response.status).toBe(401);
    expect(mocks.removeOwnedSavedProduct).not.toHaveBeenCalled();
  });

  it("removes only the authenticated customer's saved relation", async () => {
    const response = await DELETE(request(), context());

    expect(response.status).toBe(200);
    expect(mocks.removeOwnedSavedProduct).toHaveBeenCalledWith(identity, "product-a");
  });
});
