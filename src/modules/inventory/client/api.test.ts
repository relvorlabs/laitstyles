import { afterEach, describe, expect, it, vi } from "vitest";
import {
  adjustInventoryStockRequest,
  listInventoryProductPage,
} from "@/modules/inventory/client/api";

const fetchMock = vi.fn();
const productId = "22222222-2222-4222-8222-222222222222";

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe("inventory browser API", () => {
  it("sends every result-affecting URL value and returns server metadata", async () => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [{ id: "product-1" }],
          meta: {
            page: 3,
            pageSize: 25,
            total: 61,
            pageCount: 3,
            summary: {
              totalProducts: 90,
              liveProducts: 40,
              availableUnits: 200,
              reservedUnits: 12,
              soldUnits: 180,
              lowStockProducts: 5,
              outOfStockProducts: 4,
              intakeProducts: 3,
            },
            viewCounts: {
              all: 90,
              live: 40,
              drafts: 7,
              intake: 3,
              "low-stock": 5,
              "out-of-stock": 4,
              held: 6,
              sold: 22,
              unpublished: 16,
              "needs-attention": 21,
            },
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const controller = new AbortController();

    const result = await listInventoryProductPage(
      {
        view: "needs-attention",
        q: "blue denim",
        mode: "variant",
        stock: "low-stock",
        category: "Jeans",
        collection: "Weekend",
        channel: "physical-store",
        sort: "stock-asc",
        page: 3,
        pageSize: 25,
      },
      controller.signal,
    );

    const [requestUrl, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const url = new URL(requestUrl, "http://localhost");
    expect(url.pathname).toBe("/api/v1/admin/inventory");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      view: "needs-attention",
      q: "blue denim",
      mode: "variant",
      stock: "low-stock",
      category: "Jeans",
      collection: "Weekend",
      channel: "physical-store",
      sort: "stock-asc",
      page: "3",
      pageSize: "25",
    });
    expect(init).toMatchObject({ cache: "no-store", signal: controller.signal });
    expect(result.pagination).toEqual({
      page: 3,
      pageSize: 25,
      total: 61,
      pageCount: 3,
    });
    expect(result.products).toEqual([{ id: "product-1" }]);
    expect(result.summary.totalProducts).toBe(90);
    expect(result.viewCounts["needs-attention"]).toBe(21);
  });

  it("posts stock adjustments through the versioned inventory boundary", async () => {
    vi.stubGlobal("fetch", fetchMock);
    const outcome = {
      balance: {
        totalReceived: 12,
        available: 8,
        reserved: 1,
        committed: 1,
        sold: 2,
        returned: 0,
        damaged: 0,
      },
      movement: {
        id: "33333333-3333-4333-8333-333333333333",
        productId,
        variantId: null,
        kind: "adjusted",
        quantity: 2,
        occurredAt: "2026-07-25T08:00:00.000Z",
        actor: "Admin",
        note: "Cycle count correction",
      },
    };
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: outcome }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const result = await adjustInventoryStockRequest({
      productId,
      variantId: null,
      quantityDelta: 2,
      note: "Cycle count correction",
    });

    const [requestUrl, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new URL(requestUrl, "http://localhost").pathname).toBe(
      "/api/v1/admin/inventory/adjustments",
    );
    expect(init).toMatchObject({
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    expect(JSON.parse(String(init.body))).toEqual({
      productId,
      variantId: null,
      quantityDelta: 2,
      note: "Cycle count correction",
    });
    expect(result).toEqual({ ok: true, value: outcome });
  });

  it("maps adjustment conflict envelopes back to the domain error contract", async () => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: {
            code: "INVENTORY_ADJUSTMENT_CONFLICT",
            message: "This adjustment would create an invalid stock balance.",
          },
        }),
        { status: 409, headers: { "content-type": "application/json" } },
      ),
    );

    const result = await adjustInventoryStockRequest({
      productId,
      variantId: null,
      quantityDelta: -20,
      note: "Cycle count correction",
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "invalid-adjustment",
        message: "This adjustment would create an invalid stock balance.",
      },
    });
  });
});
