import { describe, expect, it } from "vitest";
import { productFixtureFileSchema, productFixtureSchema } from "./inventory-fixture-schema";

const validUnique = {
  slug: "vintage-levis-jacket",
  name: "Vintage Levi's Jacket",
  description: "A one-of-one trucker jacket.",
  mode: "unique" as const,
  price: 34000,
  categorySlug: "jackets-coats",
  categoryName: "Jackets & Coats",
  archiveNumber: "0099",
  cover: {
    publicId: "cover-1",
    secureUrl: "https://res.cloudinary.com/demo/image/upload/cover-1.jpg",
    alt: "Jacket",
  },
};

describe("productFixtureSchema", () => {
  it("accepts a complete unique-mode fixture", () => {
    const result = productFixtureSchema.safeParse(validUnique);
    expect(result.success).toBe(true);
  });

  it("rejects a fixture that carries an id field", () => {
    const result = productFixtureSchema.safeParse({ ...validUnique, id: "not-allowed" });
    expect(result.success).toBe(false);
  });

  it("rejects unique mode without an archiveNumber", () => {
    const { archiveNumber, ...withoutArchiveNumber } = validUnique;
    const result = productFixtureSchema.safeParse(withoutArchiveNumber);
    expect(result.success).toBe(false);
  });

  it("rejects stocked mode without a stock count", () => {
    const result = productFixtureSchema.safeParse({
      ...validUnique,
      mode: "stocked",
      sku: "SKU-1",
      archiveNumber: undefined,
    });
    expect(result.success).toBe(false);
  });

  it("accepts stocked mode with a stock count", () => {
    const { archiveNumber, ...withoutArchiveNumber } = validUnique;
    const result = productFixtureSchema.safeParse({
      ...withoutArchiveNumber,
      mode: "stocked",
      sku: "SKU-1",
      stock: 4,
    });
    expect(result.success).toBe(true);
  });

  it("rejects variant mode with a variant missing stock", () => {
    const result = productFixtureSchema.safeParse({
      ...validUnique,
      mode: "variant",
      archiveNumber: undefined,
      variants: [{ label: "Small", size: "S" }],
    });
    expect(result.success).toBe(false);
  });

  it("requires categoryName when categorySlug has no matching well-known slug hint", () => {
    const { categoryName, ...withoutCategoryName } = validUnique;
    const result = productFixtureSchema.safeParse(withoutCategoryName);
    expect(result.success).toBe(false);
  });

  it("parses a file as an array of fixtures", () => {
    const result = productFixtureFileSchema.safeParse([validUnique]);
    expect(result.success).toBe(true);
  });
});
