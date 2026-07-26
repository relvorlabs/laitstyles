import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createEmptyProductEditorValues,
  createProductEditorValues,
} from "@/lib/admin/product-editor/product-editor-defaults";
import { prisma } from "@/lib/prisma";
import {
  archiveProduct,
  deleteProduct,
  restoreProduct,
  saveProduct,
} from "@/modules/products/server/commands";
import { getAdminProduct, listAdminProducts } from "@/modules/products/server/queries";
import { canManageProduct } from "@/modules/products/server/rules";
import { getPublishedProductBySlug } from "@/modules/products/server/storefront/queries";
import type { InventoryMode, ProductEditorValues } from "@/modules/products/types";
import {
  ACCEPTANCE_PREFIX,
  type AcceptanceSeed,
  assertDisposableAcceptanceDatabase,
  disconnectAcceptanceDatabase,
  resetAcceptanceData,
  runFreshProcessProbe,
  seedAcceptanceData,
} from "@/test/persistence-harness";

const inventoryModes = ["unique", "stocked", "variant"] as const satisfies readonly InventoryMode[];
const acceptanceDatabaseEnabled = process.env.LAITSTYLES_ACCEPTANCE_DATABASE === "1";
const describePersistence = acceptanceDatabaseEnabled ? describe : describe.skip;

describe("Product persistence source readiness", () => {
  it("keeps the acceptance matrix aligned with the three inventory modes", () => {
    expect(inventoryModes.map((mode) => buildProductValues(mode).inventoryMode)).toEqual([
      "unique",
      "stocked",
      "variant",
    ]);
  });

  it("preserves the manager and admin Product capability difference", () => {
    const admin = actor("admin");
    const manager = actor("manager");

    expect(canManageProduct(admin, "inventory:create")).toBe(true);
    expect(canManageProduct(manager, "inventory:create")).toBe(true);
    expect(canManageProduct(manager, "inventory:update")).toBe(true);
    expect(canManageProduct(manager, "inventory:archive")).toBe(true);
    expect(canManageProduct(manager, "inventory:delete")).toBe(false);
    expect(canManageProduct(admin, "inventory:delete")).toBe(true);
  });
});

describePersistence("Product persistence acceptance", () => {
  let seed: AcceptanceSeed;
  const createdProductIds = new Set<string>();

  beforeAll(async () => {
    assertDisposableAcceptanceDatabase();
    await cleanupCreatedProducts();
    seed = await seedAcceptanceData();
  });

  afterAll(async () => {
    await resetAcceptanceData();
    await cleanupCreatedProducts();
    await disconnectAcceptanceDatabase();
  });

  it.each(
    inventoryModes,
  )("persists a published %s Product through direct, domain, list, and fresh-process reads", async (mode) => {
    const values = buildProductValues(mode);
    const saved = await saveProduct(seed.actors.admin, values, "publish");

    expect(saved.ok).toBe(true);
    if (!saved.ok) throw new Error(saved.error.message);
    createdProductIds.add(saved.value.product.id);

    const direct = await prisma.products.findUniqueOrThrow({
      where: { id: saved.value.product.id },
    });
    expect(direct.inventory_mode).toBe(mode);
    expect(direct.lifecycle).toBe("active");
    expect(direct.publication).toBe("published");

    expect(await getAdminProduct(direct.id)).toMatchObject({
      id: direct.id,
      name: values.name,
      inventoryMode: mode,
      lifecycle: "active",
      publication: "published",
    });
    expect((await listAdminProducts({ page: 1, pageSize: 100 })).data).toContainEqual(
      expect.objectContaining({ id: direct.id, inventoryMode: mode }),
    );

    await disconnectAcceptanceDatabase();
    await expect(runFreshProcessProbe("products", { productId: direct.id })).resolves.toMatchObject(
      {
        productId: direct.id,
        inventoryMode: mode,
        lifecycle: "active",
        publication: "published",
      },
    );

    const updatedValues = createProductEditorValues(saved.value.product);
    updatedValues.name = `${values.name}-updated`;
    updatedValues.description = `${values.description} Updated through the canonical Product command.`;
    const updated = await saveProduct(seed.actors.admin, updatedValues, "publish");
    expect(updated.ok).toBe(true);
    if (!updated.ok) throw new Error(updated.error.message);

    expect(await prisma.products.findUniqueOrThrow({ where: { id: direct.id } })).toMatchObject({
      id: direct.id,
      name: updatedValues.name,
      slug: updated.value.product.slug,
      inventory_mode: mode,
    });
    expect(await getAdminProduct(direct.id)).toMatchObject({
      id: direct.id,
      name: updatedValues.name,
      inventoryMode: mode,
    });
    expect(await getPublishedProductBySlug(updated.value.product.slug)).toMatchObject({
      id: direct.id,
      slug: updated.value.product.slug,
      name: updatedValues.name,
      mode,
    });

    await disconnectAcceptanceDatabase();
    await expect(runFreshProcessProbe("products", { productId: direct.id })).resolves.toMatchObject(
      {
        productId: direct.id,
        inventoryMode: mode,
        lifecycle: "active",
        publication: "published",
      },
    );
  });

  it("persists archive and restore lifecycle changes", async () => {
    const productId = seed.uniqueProductId;

    expect(await archiveProduct(seed.actors.manager, productId)).toMatchObject({ ok: true });
    expect(await prisma.products.findUniqueOrThrow({ where: { id: productId } })).toMatchObject({
      lifecycle: "archived",
      publication: "unpublished",
    });
    expect(await getAdminProduct(productId)).toMatchObject({ lifecycle: "archived" });

    expect(await restoreProduct(seed.actors.manager, productId)).toMatchObject({ ok: true });
    expect(await prisma.products.findUniqueOrThrow({ where: { id: productId } })).toMatchObject({
      lifecycle: "active",
      publication: "unpublished",
    });

    await disconnectAcceptanceDatabase();
    await expect(runFreshProcessProbe("products", { productId })).resolves.toMatchObject({
      productId,
      lifecycle: "active",
      publication: "unpublished",
    });
  });

  it("denies manager deletion without changing the Product row", async () => {
    const before = await prisma.products.findUniqueOrThrow({ where: { id: seed.uniqueProductId } });

    expect(await deleteProduct(seed.actors.manager, seed.uniqueProductId)).toMatchObject({
      ok: false,
      error: { code: "product-not-found" },
    });

    expect(
      await prisma.products.findUniqueOrThrow({ where: { id: seed.uniqueProductId } }),
    ).toEqual(before);
  });

  it("rejects deletion when Product stock history makes deletion unsafe", async () => {
    const productId = createdProductIds.values().next().value;
    if (!productId) throw new Error("Product persistence matrix did not create a Product");

    expect(await deleteProduct(seed.actors.admin, productId)).toMatchObject({
      ok: false,
      error: { code: "product-in-use", productId },
    });
    await expect(prisma.products.findUnique({ where: { id: productId } })).resolves.not.toBeNull();
  });
});

function buildProductValues(mode: InventoryMode): ProductEditorValues {
  const base = createEmptyProductEditorValues(mode);
  const suffix = mode.toUpperCase();
  const common = {
    ...base,
    name: `${ACCEPTANCE_PREFIX}created-${mode}`,
    category: `${ACCEPTANCE_PREFIX}category`,
    brand: "Laitstyles acceptance",
    description: `Deterministic ${mode} Product used only by persistence acceptance.`,
    internalReference: `ACC-P45-${suffix}`,
    media: [
      {
        id: `acceptance-cover-${mode}`,
        url: `https://example.invalid/acceptance/${mode}.jpg`,
        alt: `${mode} acceptance Product`,
        kind: "cover" as const,
        position: 0,
        source: "url" as const,
      },
    ],
    sellingPrice: 10_000,
    referencePrice: 12_000,
    cost: 5_000,
    channels: ["storefront", "physical-store"] as ProductEditorValues["channels"],
  };

  if (mode === "unique") {
    return {
      ...common,
      inventoryMode: "unique",
      unique: {
        condition: "Excellent",
        size: "M",
        colour: "Black",
        measurements: [{ id: "acceptance-chest", label: "Chest", value: "96 cm" }],
      },
    };
  }

  if (mode === "stocked") {
    return {
      ...common,
      inventoryMode: "stocked",
      stocked: { sizeLabel: "M", colour: "Black", quantity: 4 },
    };
  }

  return {
    ...common,
    inventoryMode: "variant",
    variant: {
      optionNames: ["Size", "Colour"],
      variants: [
        {
          id: "acceptance-new-variant",
          label: "M / Black",
          sku: "ACC-P45-VARIANT-M-BLACK",
          size: "M",
          colour: "Black",
          imageUrl: "",
          price: null,
          cost: null,
          quantity: 3,
        },
      ],
    },
  };
}

function actor(role: "admin" | "manager") {
  return {
    kind: "staff" as const,
    authUserId: `source-readiness-${role}`,
    email: null,
    displayName: `Source readiness ${role}`,
    role,
  };
}

async function cleanupCreatedProducts(): Promise<void> {
  assertDisposableAcceptanceDatabase();
  const rows = await prisma.products.findMany({
    where: { name: { startsWith: `${ACCEPTANCE_PREFIX}created-` } },
    select: {
      id: true,
      product_media: { select: { asset_id: true } },
      product_variants: {
        select: { product_media: { select: { asset_id: true } } },
      },
    },
  });
  const productIds = rows.map(({ id }) => id);
  if (!productIds.length) return;
  const assetIds = rows.flatMap((row) => [
    ...row.product_media.map(({ asset_id }) => asset_id),
    ...row.product_variants.flatMap((variant) =>
      variant.product_media.map(({ asset_id }) => asset_id),
    ),
  ]);

  await prisma.$transaction(async (tx) => {
    await tx.stock_movements.deleteMany({ where: { product_id: { in: productIds } } });
    await tx.activity_events.deleteMany({ where: { product_id: { in: productIds } } });
    await tx.audit_events.deleteMany({
      where: { target_table: "products", target_id: { in: productIds } },
    });
    await tx.products.deleteMany({ where: { id: { in: productIds } } });
    if (assetIds.length) {
      await tx.cloudinary_assets.deleteMany({ where: { id: { in: assetIds } } });
    }
  });
}
