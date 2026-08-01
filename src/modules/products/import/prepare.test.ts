import { describe, expect, it } from "vitest";
import { createEmptyProductEditorValues } from "@/modules/products/editor-defaults";
import {
  filterDuplicateProductImportChildren,
  prepareProductImport,
} from "@/modules/products/import/prepare";
import type { ProductImportChild } from "@/modules/products/import/types";

function child(importId: string, internalReference: string): ProductImportChild {
  return {
    importId,
    values: { ...createEmptyProductEditorValues("stocked"), name: importId, internalReference },
    issues: [],
    status: "ready",
    isDirty: false,
    persistence: null,
  };
}

describe("prepareProductImport", () => {
  it("maps a valid direct JSON file through the shared preparation path", () => {
    const result = prepareProductImport({
      fileName: "products.json",
      size: 64,
      text: JSON.stringify([{ mode: "stocked", name: "Linen coat", stock: 2 }]),
    });

    expect(result).toMatchObject({ ok: true, value: { ignoredAssetCount: 0 } });
    if (result.ok) expect(result.value.children[0]?.values.name).toBe("Linen coat");
  });

  it("maps a bounded relational snapshot through the same preparation path", () => {
    const text = JSON.stringify({
      catalogue_categories: [],
      catalogue_collections: [],
      products: [
        {
          id: "p1",
          category_id: null,
          collection_id: null,
          name: "Archive coat",
          description: "",
          inventory_mode: "stocked",
          price: 12000,
          low_stock_threshold: 2,
        },
      ],
      product_channels: [],
      product_variants: [],
      stock_levels: [{ product_id: "p1", variant_id: null, quantity_on_hand: 3 }],
      product_measurements: [],
      product_media: [],
      cloudinary_assets: [],
    });
    const result = prepareProductImport({ fileName: "snapshot.json", size: text.length, text });

    expect(result).toMatchObject({
      ok: true,
      value: { children: [{ values: { name: "Archive coat" } }] },
    });
  });

  it("preserves the row-limit issue for an oversized relational snapshot", () => {
    const text = JSON.stringify({ products: Array.from({ length: 1_001 }, () => ({})) });

    expect(prepareProductImport({ fileName: "snapshot.json", size: text.length, text })).toEqual({
      ok: false,
      error: {
        code: "too-many-products",
        message: "Import files may contain at most 1,000 products.",
      },
    });
  });
});

describe("filterDuplicateProductImportChildren", () => {
  it("skips trimmed case-insensitive references across the full queue and incoming file", () => {
    const result = filterDuplicateProductImportChildren(
      [child("existing", " Ref-01 ")],
      [child("direct-1", "ref-01"), child("direct-2", "REF-02"), child("direct-3", " ref-02 ")],
    );

    expect(result.skippedCount).toBe(2);
    expect(result.accepted.map((item) => item.values.internalReference)).toEqual(["REF-02"]);
  });

  it("retains blank references and makes colliding import IDs queue-unique", () => {
    const result = filterDuplicateProductImportChildren(
      [child("direct-1", "")],
      [child("direct-1", ""), child("direct-2", "   ")],
    );

    expect(result.skippedCount).toBe(0);
    expect(new Set(result.accepted.map((item) => item.importId)).size).toBe(2);
    expect(result.accepted.map((item) => item.importId)).toEqual(["direct-1-2", "direct-2"]);
    expect(result.accepted.every((item) => item.values.internalReference.trim() === "")).toBe(true);
  });
});
