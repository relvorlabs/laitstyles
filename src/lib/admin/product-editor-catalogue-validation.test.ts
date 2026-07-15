import { describe, expect, it } from "vitest";
import { createEmptyProductEditorValues } from "@/lib/admin/product-editor-defaults";
import { validateProductEditorStep } from "@/lib/admin/product-editor-schema";

describe("Product editor catalogue edge cases", () => {
  it("rejects duplicate images and more than one featured cover", () => {
    const values = createEmptyProductEditorValues("stocked");
    values.media = [
      {
        id: "media-1",
        url: "/product-placeholder.svg",
        alt: "Front view",
        kind: "cover",
        position: 0,
        source: "url",
      },
      {
        id: "media-2",
        url: "/product-placeholder.svg",
        alt: "Repeated front view",
        kind: "cover",
        position: 1,
        source: "url",
      },
    ];

    const issues = validateProductEditorStep(values, "images");

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "media" }),
        expect.objectContaining({ path: "media.1.url" }),
      ]),
    );
  });

  it("rejects a compare-at price that does not represent a discount", () => {
    const values = createEmptyProductEditorValues("stocked");
    values.sellingPrice = 30000;
    values.referencePrice = 28000;
    values.cost = null;

    expect(validateProductEditorStep(values, "pricing")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "referencePrice",
          message: "Compare-at price must be higher than the selling price.",
        }),
      ]),
    );
  });

  it("requires unique variant SKUs and at least one received unit", () => {
    const values = createEmptyProductEditorValues("variant");
    if (values.inventoryMode !== "variant") throw new Error("Expected variants");
    values.variant.variants = [
      {
        id: "variant-1",
        label: "Indigo / M",
        sku: "LS-VAR-DENIM-M",
        size: "M",
        colour: "Indigo",
        imageUrl: "",
        price: null,
        cost: null,
        quantity: 0,
      },
      {
        id: "variant-2",
        label: "Indigo / L",
        sku: "LS-VAR-DENIM-M",
        size: "L",
        colour: "Indigo",
        imageUrl: "",
        price: null,
        cost: null,
        quantity: 0,
      },
    ];

    const issues = validateProductEditorStep(values, "stock");

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "variant.variants.1.sku" }),
        expect.objectContaining({ path: "variant.variants" }),
      ]),
    );
  });
});
