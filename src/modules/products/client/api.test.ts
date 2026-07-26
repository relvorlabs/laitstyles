import { afterEach, describe, expect, it, vi } from "vitest";
import { createEmptyProductEditorValues } from "@/lib/admin/product-editor/product-editor-defaults";
import {
  getAdminProduct,
  listAdminProducts,
  saveProductRequest,
} from "@/modules/products/client/api";

const fetchMock = vi.fn();

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe("product browser API", () => {
  it("requests the paginated versioned product collection with cancellation", async () => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: [{ id: "product-1" }],
        meta: { page: 1, pageSize: 500, total: 1, pageCount: 1 },
      }),
    );
    const controller = new AbortController();

    await expect(listAdminProducts(controller.signal)).resolves.toEqual([{ id: "product-1" }]);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/admin/products?page=1&pageSize=500",
      expect.objectContaining({ cache: "no-store", signal: controller.signal }),
    );
  });

  it("returns null only for a typed product-not-found response", async () => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ error: { code: "PRODUCT_NOT_FOUND", message: "Missing." } }, { status: 404 }),
    );

    await expect(getAdminProduct("product-1")).resolves.toBeNull();
  });

  it("uses POST for create and PATCH for update", async () => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ data: successPayload("created") }, { status: 201 }))
      .mockResolvedValueOnce(jsonResponse({ data: successPayload("updated") }));

    const createValues = createEmptyProductEditorValues("stocked");
    const createResult = await saveProductRequest({ values: createValues, intent: "draft" });
    expect(createResult.ok).toBe(true);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/v1/admin/products");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: "POST" });

    const updateValues = {
      ...createEmptyProductEditorValues("stocked"),
      productId: "019f65c1-74fe-7bd3-8400-000000000001",
    };
    const updateResult = await saveProductRequest({ values: updateValues, intent: "draft" });
    expect(updateResult.ok).toBe(true);
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "/api/v1/admin/products/019f65c1-74fe-7bd3-8400-000000000001",
    );
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: "PATCH" });
  });

  it("maps API field errors back to product-editor issues", async () => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          error: {
            code: "PRODUCT_VALIDATION_FAILED",
            message: "Review the product.",
            fieldErrors: {
              name: "Enter a name.",
              "variant.variants.0.sku": "Enter a SKU.",
            },
          },
        },
        { status: 422 },
      ),
    );

    const result = await saveProductRequest({
      values: createEmptyProductEditorValues("variant"),
      intent: "publish",
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "validation-failed",
        message: "Review the product.",
        issues: [
          { path: "name", message: "Enter a name.", step: "identity" },
          {
            path: "variant.variants.0.sku",
            message: "Enter a SKU.",
            step: "stock",
          },
        ],
      },
    });
  });
});

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: { "content-type": "application/json", "x-request-id": "request-1" },
  });
}

function successPayload(message: string) {
  return {
    product: { id: "product-1", slug: "product-1", name: "Product" },
    intent: "draft",
    message,
  };
}
