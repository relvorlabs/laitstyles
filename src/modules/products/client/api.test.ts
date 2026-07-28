import { afterEach, describe, expect, it, vi } from "vitest";
import { createEmptyProductEditorValues } from "@/lib/admin/product-editor/product-editor-defaults";
import { inventoryKeys } from "@/modules/inventory/client/keys";
import {
  createProductTaxonomyRequest,
  getAdminProduct,
  listAdminProducts,
  reorderProductTaxonomyRequest,
  saveProductRequest,
  updateProductTaxonomyRequest,
} from "@/modules/products/client/api";
import {
  useCreateProductTaxonomy,
  useDeleteProductTaxonomy,
  useReorderProductTaxonomy,
  useUpdateProductTaxonomy,
} from "@/modules/products/client/hooks";
import { productKeys } from "@/modules/products/client/keys";

const hookHarness = vi.hoisted(() => ({
  queryClient: {
    invalidateQueries: vi.fn(),
    setQueryData: vi.fn(),
  },
}));

vi.mock("@tanstack/react-query", () => ({
  queryOptions: (options: unknown) => options,
  useMutation: (options: unknown) => options,
  useQueryClient: () => hookHarness.queryClient,
}));

const fetchMock = vi.fn();

afterEach(() => {
  vi.clearAllMocks();
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

  it("sends richer taxonomy updates and atomic reorder requests", async () => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ data: { item: { id: "category:one" } } }))
      .mockResolvedValueOnce(jsonResponse({ data: { message: "Order updated." } }));
    const updateInput = {
      kind: "category" as const,
      name: "Denim",
      imageUrl: null,
      position: 2,
    };
    const reorderInput = {
      kind: "category" as const,
      orderedIds: ["category:019f65c1-74fe-7bd3-8400-000000000011"],
    };

    await updateProductTaxonomyRequest({ taxonomyId: "category:one", input: updateInput });
    await reorderProductTaxonomyRequest(reorderInput);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/v1/admin/products/taxonomy/category%3Aone",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify(updateInput),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/v1/admin/products/taxonomy/reorder",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(reorderInput),
      }),
    );
  });

  it("sends the complete atomic Collection create contract", async () => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        { data: { item: { id: "collection:one" }, message: "Created." } },
        { status: 201 },
      ),
    );
    const input = {
      kind: "collection" as const,
      name: "New season",
      position: 3,
      productIds: ["019f65c1-74fe-7bd3-8400-000000000021"],
    };

    await createProductTaxonomyRequest(input);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/admin/products/taxonomy",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(input),
      }),
    );
  });

  it("loads every product page so exact collection membership is never truncated", async () => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          data: [{ id: "product-1" }],
          meta: { page: 1, pageSize: 500, total: 501, pageCount: 2 },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: [{ id: "product-501" }],
          meta: { page: 2, pageSize: 500, total: 501, pageCount: 2 },
        }),
      );

    await expect(listAdminProducts()).resolves.toEqual([
      { id: "product-1" },
      { id: "product-501" },
    ]);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/v1/admin/products?page=2&pageSize=500",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("maps taxonomy update and reorder API failures to typed Results", async () => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(
          { error: { code: "TAXONOMY_NAME_CONFLICT", message: "Already exists." } },
          { status: 409 },
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          { error: { code: "TAXONOMY_NOT_FOUND", message: "Order is out of date." } },
          { status: 404 },
        ),
      );

    await expect(
      updateProductTaxonomyRequest({
        taxonomyId: "category:one",
        input: { kind: "category", name: "Denim", imageUrl: null, position: 0 },
      }),
    ).resolves.toEqual({
      ok: false,
      error: {
        code: "duplicate-name",
        taxonomyId: "category:one",
        message: "Already exists.",
      },
    });
    await expect(
      reorderProductTaxonomyRequest({ kind: "category", orderedIds: [] }),
    ).resolves.toEqual({
      ok: false,
      error: { code: "taxonomy-not-found", message: "Order is out of date." },
    });
  });
});

describe("taxonomy mutation cache policy", () => {
  it.each([
    {
      label: "create",
      useHook: useCreateProductTaxonomy,
      result: { ok: true, value: { item: { id: "category:one" }, message: "Created." } },
    },
    {
      label: "update",
      useHook: useUpdateProductTaxonomy,
      result: { ok: true, value: { item: { id: "category:one" }, message: "Updated." } },
    },
    {
      label: "delete",
      useHook: useDeleteProductTaxonomy,
      result: { ok: true, value: { deletedId: "category:one", message: "Deleted." } },
    },
    {
      label: "reorder",
      useHook: useReorderProductTaxonomy,
      result: { ok: true, value: { message: "Reordered." } },
    },
  ])("invalidates all dependent queries after successful $label", ({ useHook, result }) => {
    const mutation = useHook() as unknown as {
      onSuccess: (value: typeof result) => void;
    };

    mutation.onSuccess(result);

    expect(hookHarness.queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: productKeys.taxonomy(),
    });
    expect(hookHarness.queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: productKeys.list(),
    });
    expect(hookHarness.queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: inventoryKeys.all,
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
