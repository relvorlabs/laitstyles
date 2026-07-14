import { describe, expect, it } from "vitest";
import { mapProductDetail, mapProductSummary } from "./mappers";

type DetailRow = Parameters<typeof mapProductDetail>[0];
type SummaryRow = Parameters<typeof mapProductSummary>[0];

// Minimal Prisma.Decimal stand-in (only the methods the mappers call).
const decimal = (n: number) => ({
  toNumber: () => n,
  lessThanOrEqualTo: (other: { toNumber: () => number }) => n <= other.toNumber(),
});

function baseRow() {
  return {
    id: "p1",
    slug: "wool-jacket",
    name: "Wool Jacket",
    brand: "Archive",
    price: decimal(48000),
    reference_price: null,
    archive_number: null,
    condition: "Good",
    material: "Wool",
    fit: "M–L",
    style: "Vintage",
    care_instructions: "Hang dry",
    flaw_notes: "Small mark",
    inventory_mode: "unique",
    low_stock_threshold: 1,
    size_label: "L",
    colour: "Sage",
    // Internal — must never surface in a storefront view model.
    cost: decimal(20000),
    catalogue_categories: { id: "c", slug: "men", name: "Men" },
    catalogue_collections: null,
    description: "A wool jacket",
    product_media: [],
    product_measurements: [],
    stock_levels: [],
    product_variants: [],
    product_reviews: [],
  };
}

describe("mapProductDetail", () => {
  it("maps shopper attributes and never leaks internal cost", () => {
    const out = mapProductDetail(baseRow() as unknown as DetailRow);
    expect(out).toMatchObject({
      material: "Wool",
      fit: "M–L",
      style: "Vintage",
      careInstructions: "Hang dry",
      flawNotes: "Small mark",
    });
    expect("cost" in out).toBe(false);
    expect(JSON.stringify(out)).not.toContain("20000");
  });
});

describe("mapProductSummary", () => {
  it("carries material/fit/style onto the card model", () => {
    const out = mapProductSummary(baseRow() as unknown as SummaryRow);
    expect(out).toMatchObject({ material: "Wool", fit: "M–L", style: "Vintage" });
    expect("cost" in out).toBe(false);
  });
});
