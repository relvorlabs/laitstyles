import { describe, expect, it } from "vitest";
import { convertEditorValuesToProduct } from "./product-editor-conversion";
import { createEmptyProductEditorValues } from "./product-editor-defaults";

describe("convertEditorValuesToProduct shopper fields", () => {
  it("carries material/fit/style/care/flaw into the domain product", () => {
    const values = {
      ...createEmptyProductEditorValues("unique"),
      name: "Jacket",
      material: "Wool",
      fit: "M–L",
      style: "Vintage",
      careInstructions: "Hang dry",
      flawNotes: "Small mark",
    };
    const product = convertEditorValuesToProduct(values, {
      intent: "draft",
      now: "2026-07-13T00:00:00Z",
    });
    expect(product).toMatchObject({
      material: "Wool",
      fit: "M–L",
      style: "Vintage",
      careInstructions: "Hang dry",
      flawNotes: "Small mark",
    });
  });

  it("normalizes empty shopper fields to null", () => {
    const product = convertEditorValuesToProduct(createEmptyProductEditorValues("unique"), {
      intent: "draft",
      now: "2026-07-13T00:00:00Z",
    });
    expect(product.material).toBeNull();
    expect(product.fit).toBeNull();
    expect(product.flawNotes).toBeNull();
  });
});
