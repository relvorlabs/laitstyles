import { describe, expect, it, vi } from "vitest";

// Record what the write path sends to Prisma so we can assert the new shopper
// attributes and measurements are persisted (docs Task B1).
const recorded: {
  products: Record<string, unknown>[];
  measurements: Record<string, unknown>[];
} = { products: [], measurements: [] };

vi.mock("@/lib/prisma", () => ({
  Prisma: { PrismaClientKnownRequestError: class PrismaClientKnownRequestError {} },
  prisma: {
    profiles: { findUnique: vi.fn().mockResolvedValue({ role: "admin" }) },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        products: {
          create: async ({ data }: { data: Record<string, unknown> }) => {
            recorded.products.push(data);
            return { id: "prod-1", slug: data.slug };
          },
        },
        cloudinary_assets: { upsert: async () => ({ id: "asset-1" }) },
        product_media: { create: async () => ({}) },
        product_channels: { create: async () => ({}) },
        product_measurements: {
          create: async ({ data }: { data: Record<string, unknown> }) => {
            recorded.measurements.push(data);
            return {};
          },
        },
        stock_levels: { create: async () => ({}) },
        audit_events: { create: async () => ({}) },
      }),
  },
}));

import { createPublishedProduct } from "./product-write";

describe("createPublishedProduct", () => {
  it("persists shopper attributes and measurements", async () => {
    const result = await createPublishedProduct(
      { profileId: "user-1" },
      {
        slug: "wool-jacket",
        name: "Wool Jacket",
        description: "A wool jacket",
        mode: "unique",
        priceKobo: 4_800_000,
        cover: { publicId: "cover-1", secureUrl: "https://example/cover.jpg", alt: "cover" },
        material: "Wool",
        fit: "M–L",
        style: "Vintage",
        flawNotes: "Small mark inside the left cuff",
        measurements: [{ label: "Chest", value: "112cm" }],
      },
    );

    expect(result.ok).toBe(true);
    expect(recorded.products[0]).toMatchObject({
      material: "Wool",
      fit: "M–L",
      style: "Vintage",
      flaw_notes: "Small mark inside the left cuff",
    });
    expect(recorded.measurements[0]).toMatchObject({
      label: "Chest",
      value: "112cm",
      position: 0,
    });
  });
});
