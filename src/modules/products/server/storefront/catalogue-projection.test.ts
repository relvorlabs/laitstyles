import { describe, expect, it } from "vitest";
import type {
  CategoryWithImage,
  ProductDetail,
  ProductImage,
  ProductSummary,
} from "@/lib/storefront/types";
import {
  buildStorefrontCatalogue,
  buildStorefrontShellCatalogue,
  measurementsCmFor,
  projectStorefrontProduct,
  projectStorefrontProductSummary,
} from "./catalogue-projection";

function image(url: string, kind: ProductImage["kind"] = "cover", position = 0): ProductImage {
  return {
    id: `img-${position}`,
    url,
    alt: "",
    kind,
    position,
    width: null,
    height: null,
    variantId: null,
  };
}

function summary(overrides: Partial<ProductSummary> = {}): ProductSummary {
  return {
    id: "prod-1",
    slug: "archive-silk-dress",
    name: "Archive Silk Dress",
    brand: "Maison",
    price: 4_900_000,
    referencePrice: 6_500_000,
    archiveNumber: "LS-001",
    condition: "Excellent",
    material: "Silk",
    fit: "Relaxed",
    style: "Archive",
    category: { id: "cat-1", slug: "dresses", name: "Dresses" },
    collection: { id: "col-1", slug: "women", name: "Women" },
    cover: image("https://img/cover.jpg"),
    mode: "unique",
    sizeLabel: "M",
    colour: "Ivory",
    availability: { state: "available", available: 1, isOneOfOne: true },
    ...overrides,
  };
}

function uniqueDetail(overrides: Partial<ProductDetail> = {}): ProductDetail {
  return {
    ...summary(),
    description: "One-of-one archive piece.",
    media: [image("https://img/cover.jpg"), image("https://img/detail.jpg", "detail", 1)],
    measurements: [
      { label: "Chest", value: "48 cm", position: 0 },
      { label: "Length", value: "71 cm", position: 1 },
      { label: "Weight", value: "300 g", position: 2 },
    ],
    reviewSummary: {
      average: 0,
      count: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    },
    careInstructions: "Dry clean only",
    flawNotes: "Small repaired seam",
    mode: "unique",
    sizeLabel: "M",
    colour: "Ivory",
    availability: { state: "available", available: 1, isOneOfOne: true },
    ...overrides,
  } as ProductDetail;
}

function variantDetail(): ProductDetail {
  return uniqueDetail({
    id: "prod-2",
    slug: "varsity-jacket",
    mode: "variant",
    sizeLabel: null,
    colour: null,
    variants: [
      {
        id: "var-1",
        label: "Medium",
        sku: null,
        size: "M",
        colour: "Navy",
        colourHex: null,
        price: null,
        availability: { state: "available", available: 3, isOneOfOne: false },
      },
      {
        id: "var-2",
        label: "Large",
        sku: null,
        size: "L",
        colour: "Navy",
        colourHex: null,
        price: 5_100_000,
        availability: { state: "sold_out", available: 0, isOneOfOne: false },
      },
    ],
    availability: { state: "available", available: 3, isOneOfOne: false },
  } as Partial<ProductDetail>);
}

function stockedDetail(): ProductDetail {
  return uniqueDetail({
    id: "prod-3",
    slug: "everyday-shirt",
    mode: "stocked",
    sizeLabel: "L",
    colour: "White",
    availability: { state: "low", available: 2, isOneOfOne: false },
  } as Partial<ProductDetail>);
}

const categories: CategoryWithImage[] = [
  {
    id: "cat-1",
    slug: "dresses",
    name: "Dresses",
    imageUrl: "https://img/cat.jpg",
    productCount: 1,
  },
  { id: "cat-2", slug: "jackets", name: "Jackets", imageUrl: null, productCount: 2 },
];

describe("storefront catalogue product projection", () => {
  it("maps canonical summaries without inventing detail media", () => {
    expect(projectStorefrontProductSummary(summary(), 19)).toMatchObject({
      id: "prod-1",
      databaseId: "prod-1",
      category: "Women",
      type: "Dresses",
      price: 49_000,
      referencePrice: 65_000,
      condition: "A+",
      inventory: "one-of-one",
      stock: 1,
      status: "available",
      new: true,
      images: ["https://img/cover.jpg"],
    });
    expect(projectStorefrontProductSummary(summary(), 20).new).toBe(false);
  });

  it("converts kobo prices and maps taxonomy into the storefront shape", () => {
    const product = projectStorefrontProduct(uniqueDetail(), 0);

    expect(product).toMatchObject({
      id: "prod-1",
      databaseId: "prod-1",
      price: 49_000,
      referencePrice: 65_000,
      category: "Women",
      type: "Dresses",
      condition: "A+",
      inventory: "one-of-one",
      status: "available",
      stock: 1,
      new: true,
    });
    expect(product.images).toEqual(["https://img/cover.jpg", "https://img/detail.jpg"]);
  });

  it("maps condition grades", () => {
    expect(projectStorefrontProduct(uniqueDetail({ condition: "Excellent" }), 0).condition).toBe(
      "A+",
    );
    expect(projectStorefrontProduct(uniqueDetail({ condition: "Good" }), 0).condition).toBe("A");
    expect(projectStorefrontProduct(uniqueDetail({ condition: "Fair" }), 0).condition).toBe("B+");
    expect(projectStorefrontProduct(uniqueDetail({ condition: null }), 0).condition).toBe("A");
  });

  it("maps availability states", () => {
    const sold = uniqueDetail({
      availability: { state: "sold_out", available: 0, isOneOfOne: true },
    });
    const reserved = uniqueDetail({
      availability: { state: "reserved_by_others", available: 0, isOneOfOne: true },
    });
    expect(projectStorefrontProduct(sold, 0).status).toBe("sold");
    expect(projectStorefrontProduct(reserved, 0).status).toBe("reserved");
  });

  it("derives size and variant labels for variant products", () => {
    const product = projectStorefrontProduct(variantDetail(), 25);

    expect(product.inventory).toBe("variant");
    expect(product.size).toBe("M–L");
    expect(product.variants).toEqual(["M", "L"]);
    expect(product.new).toBe(false);
  });

  it("keeps stocked inventory distinct", () => {
    const product = projectStorefrontProduct(stockedDetail(), 0);

    expect(product.inventory).toBe("matching-stock");
    expect(product.stock).toBe(2);
    expect(product.size).toBe("L");
    expect(product.variants).toBeUndefined();
  });
});

describe("storefront catalogue payload projection", () => {
  it("assembles products, categories, measurements and variant options", () => {
    const payload = buildStorefrontCatalogue([uniqueDetail(), variantDetail()], categories);

    expect(payload.products).toHaveLength(2);
    expect(payload.categories[0]).toEqual({
      id: "cat-1",
      slug: "dresses",
      name: "Dresses",
      imageUrl: "https://img/cat.jpg",
      productCount: 1,
    });
    expect(payload.categories[1].imageUrl).toBeNull();
    expect(payload.measurementsCm).toEqual({ Chest: 48, Length: 71 });
    expect(payload.variantOptionsByProductId["prod-1"]).toEqual([]);
    expect(payload.variantOptionsByProductId["prod-2"]).toHaveLength(2);
  });

  it("is safe on an empty catalogue", () => {
    const payload = buildStorefrontCatalogue([], []);
    expect(payload.products).toEqual([]);
    expect(measurementsCmFor(undefined)).toEqual({});
  });

  it("removes product-detail-only data from the global client boundary", () => {
    const full = buildStorefrontCatalogue([uniqueDetail(), variantDetail()], categories);
    const shell = buildStorefrontShellCatalogue(full);

    expect(shell.products).toHaveLength(2);
    expect(shell.products[0]).toMatchObject({
      id: "prod-1",
      images: ["https://img/cover.jpg"],
      flaw: "",
      careInstructions: "",
      fit: "M",
      variants: undefined,
    });
    expect(shell.products[1]?.images).toEqual(["https://img/cover.jpg"]);
    expect(shell.products[1]?.variants).toBeUndefined();
    expect(shell.variantOptionsByProductId["prod-2"]).toHaveLength(2);
    expect(shell.categories).toBe(full.categories);
    expect(shell.measurementsCm).toBe(full.measurementsCm);
  });

  it("does not mutate the server-owned full catalogue", () => {
    const full = buildStorefrontCatalogue([uniqueDetail(), variantDetail()], categories);
    const original = structuredClone(full);

    buildStorefrontShellCatalogue(full);

    expect(full).toEqual(original);
    expect(full.products[0]?.images).toHaveLength(2);
    expect(full.products[0]?.flaw).toBe("Small repaired seam");
    expect(full.products[0]?.careInstructions).toBe("Dry clean only");
    expect(full.products[1]?.variants).toEqual(["M", "L"]);
  });
});
