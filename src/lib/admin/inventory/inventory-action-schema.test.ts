import { describe, expect, it } from "vitest";
import {
  catalogueTaxonomyIdSchema,
  catalogueTaxonomyInputSchema,
  catalogueTaxonomyRenameSchema,
  inventoryProductIdSchema,
  productEditorIntentSchema,
} from "@/lib/admin/inventory/inventory-action-schema";

const uuid = "123e4567-e89b-42d3-a456-426614174000";

describe("inventory action schemas", () => {
  it("accepts canonical product and encoded taxonomy identifiers", () => {
    expect(inventoryProductIdSchema.parse(uuid)).toBe(uuid);
    expect(catalogueTaxonomyIdSchema.parse(`category:${uuid}`)).toBe(`category:${uuid}`);
    expect(catalogueTaxonomyIdSchema.parse(`collection:${uuid}`)).toBe(`collection:${uuid}`);
  });

  it("rejects malformed or untyped identifiers", () => {
    expect(inventoryProductIdSchema.safeParse("product-1").success).toBe(false);
    expect(catalogueTaxonomyIdSchema.safeParse(`other:${uuid}`).success).toBe(false);
    expect(catalogueTaxonomyIdSchema.safeParse("category:not-a-uuid").success).toBe(false);
  });

  it("normalizes taxonomy names and restricts kinds", () => {
    expect(
      catalogueTaxonomyInputSchema.parse({ kind: "category", name: "  Evening Wear  " }),
    ).toEqual({
      kind: "category",
      name: "Evening Wear",
    });
    expect(
      catalogueTaxonomyInputSchema.safeParse({ kind: "tag", name: "Archive" }).success,
    ).toBe(false);
    expect(
      catalogueTaxonomyRenameSchema.safeParse({
        taxonomyId: `category:${uuid}`,
        name: "",
      }).success,
    ).toBe(false);
  });

  it("allows only declared product save intents", () => {
    expect(productEditorIntentSchema.parse("publish")).toBe("publish");
    expect(productEditorIntentSchema.safeParse("delete").success).toBe(false);
  });
});
