import { describe, expect, it } from "vitest";
import { generateProductSku, generateVariantSku } from "@/lib/admin/sku";

describe("SKU generation", () => {
  it("creates a stocked catalogue SKU without assigning one SKU per unit", () => {
    expect(
      generateProductSku({
        mode: "stocked",
        name: "Adidas relaxed denim jeans",
        brand: "Adidas",
        category: "Jeans",
      }),
    ).toBe("LS-STK-ADI-JEA-ARDJ");
  });

  it("adds a deterministic suffix when the generated product reference is used", () => {
    expect(
      generateProductSku({
        mode: "stocked",
        name: "Adidas relaxed denim jeans",
        brand: "Adidas",
        category: "Jeans",
        existingReferences: ["LS-STK-ADI-JEA-ARDJ", "LS-STK-ADI-JEA-ARDJ-2"],
      }),
    ).toBe("LS-STK-ADI-JEA-ARDJ-3");
  });

  it("creates readable separate SKUs for variant option combinations", () => {
    const first = generateVariantSku("LS-VAR-ADI-JEA-DENI", "Indigo / M", "M", "Indigo");
    const second = generateVariantSku("LS-VAR-ADI-JEA-DENI", "Indigo / M", "M", "Indigo", [first]);

    expect(first).toBe("LS-VAR-ADI-JEA-DENI-IND-M");
    expect(second).toBe(`${first}-2`);
  });

  it("falls back to a label code when size and colour are not used", () => {
    expect(generateVariantSku("LS-VAR-BAG", "Large strap", "", "")).toBe("LS-VAR-BAG-LS");
  });
});
