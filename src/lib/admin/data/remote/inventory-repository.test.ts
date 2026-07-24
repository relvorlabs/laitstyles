import { afterEach, describe, expect, it, vi } from "vitest";
import { createFetchAdminInventoryRepository } from "./inventory-repository";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createFetchAdminInventoryRepository", () => {
  it("fetches products without browser caching", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [{ id: "product-1" }],
    });
    vi.stubGlobal("fetch", fetchMock);

    const products = await createFetchAdminInventoryRepository().listProducts();

    expect(fetchMock).toHaveBeenCalledWith("/api/admin/inventory/products", {
      cache: "no-store",
    });
    expect(products).toEqual([{ id: "product-1" }]);
  });

  it("encodes product ids and returns null for a 404", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    vi.stubGlobal("fetch", fetchMock);

    const product = await createFetchAdminInventoryRepository().getProduct("a/b");

    expect(fetchMock).toHaveBeenCalledWith("/api/admin/inventory/products/a%2Fb", {
      cache: "no-store",
    });
    expect(product).toBeNull();
  });

  it("surfaces authorization failures instead of falling back to browser memory", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403 }));

    await expect(createFetchAdminInventoryRepository().listProducts()).rejects.toThrow("403");
  });

  it("fetches product-scoped movement history", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [],
    });
    vi.stubGlobal("fetch", fetchMock);

    await createFetchAdminInventoryRepository().listStockMovements("product 1");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/inventory/stock-movements?productId=product%201",
      { cache: "no-store" },
    );
  });
});
