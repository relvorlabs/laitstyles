import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/errors/api-error";

const mocks = vi.hoisted(() => ({
  requireApiConsumer: vi.fn(),
  listOwnedSavedProductIds: vi.fn(),
  saveOwnedProduct: vi.fn(),
}));

vi.mock("@/lib/http/auth", () => ({ requireApiConsumer: mocks.requireApiConsumer }));
vi.mock("@/modules/customers/server/saved-products", () => ({
  listOwnedSavedProductIds: mocks.listOwnedSavedProductIds,
  saveOwnedProduct: mocks.saveOwnedProduct,
}));

import { GET, POST } from "./route";

const identity = {
  kind: "consumer" as const,
  authUserId: "user-a",
  email: "ada@example.com",
  displayName: "Ada",
  phone: null,
  customerId: "customer-a",
};

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/v1/account/saved-products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireApiConsumer.mockResolvedValue(identity);
  mocks.listOwnedSavedProductIds.mockResolvedValue(["product-a"]);
  mocks.saveOwnedProduct.mockResolvedValue(undefined);
});

describe("GET /api/v1/account/saved-products", () => {
  it("requires an authenticated consumer", async () => {
    mocks.requireApiConsumer.mockRejectedValueOnce(
      new ApiError({ code: "AUTHENTICATION_REQUIRED", message: "Sign in.", status: 401 }),
    );

    const response = await GET(new Request("http://localhost/api/v1/account/saved-products"));

    expect(response.status).toBe(401);
  });

  it("lists the authenticated customer's saved product ids", async () => {
    const response = await GET(new Request("http://localhost/api/v1/account/saved-products"));

    expect(response.status).toBe(200);
    expect(mocks.listOwnedSavedProductIds).toHaveBeenCalledWith(identity);
    await expect(response.json()).resolves.toEqual({ data: ["product-a"] });
  });
});

describe("POST /api/v1/account/saved-products", () => {
  it("rejects a missing product id", async () => {
    const response = await POST(jsonRequest({}));

    expect(response.status).toBe(422);
    expect(mocks.saveOwnedProduct).not.toHaveBeenCalled();
  });

  it("saves the product for the authenticated customer", async () => {
    const response = await POST(jsonRequest({ productId: "product-a" }));

    expect(response.status).toBe(201);
    expect(mocks.saveOwnedProduct).toHaveBeenCalledWith(identity, "product-a");
  });
});
