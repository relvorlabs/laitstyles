import { describe, expect, it } from "vitest";
import { createAdminStore } from "@/features/admin/state/admin-store";
import { createInMemoryAdminRepositories } from "@/lib/admin/data/in-memory/admin-repositories";
import { activeAdminSeed } from "@/lib/admin/shared/admin-seed";
import { getOverviewSnapshot } from "@/lib/admin/shared/selectors";

const now = "2026-07-10T13:00:00+01:00";

describe("in-memory Admin repositories", () => {
  it("reads cloned records without duplicating the source of truth", async () => {
    const store = createAdminStore(activeAdminSeed, () => now);
    const repositories = createInMemoryAdminRepositories(store);

    const products = await repositories.inventory.listProducts();
    const sourceLength = store.getSnapshot().products.length;

    expect(products).not.toBe(store.getSnapshot().products);
    products.pop();
    expect(store.getSnapshot().products).toHaveLength(sourceLength);
  });

  it("reflects later store writes instead of retaining a stale adapter snapshot", async () => {
    const store = createAdminStore(activeAdminSeed, () => now);
    const repositories = createInMemoryAdminRepositories(store);
    const product = store.getSnapshot().products[0];
    if (!product) throw new Error("Expected a seeded product");

    expect((await repositories.inventory.getProduct(product.id))?.lifecycle).toBe(
      product.lifecycle,
    );

    const archived = store.archiveProduct(product.id);
    expect(archived.ok).toBe(true);
    expect((await repositories.inventory.getProduct(product.id))?.lifecycle).toBe("archived");
  });

  it("derives Overview data from the same current records", async () => {
    const store = createAdminStore(activeAdminSeed, () => now);
    const repositories = createInMemoryAdminRepositories(store);
    const resource = await repositories.overview.getOverview();

    expect(resource.snapshot).toEqual(getOverviewSnapshot(store.getSnapshot()));
    expect(resource.reportingDate).toBe(store.getSnapshot().reportingDate);
    expect(resource.openOrders.every((order) => order.fulfilmentStatus !== "delivered")).toBe(true);
  });

  it("returns null for missing detail records", async () => {
    const store = createAdminStore(activeAdminSeed, () => now);
    const repositories = createInMemoryAdminRepositories(store);

    await expect(repositories.inventory.getProduct("missing-product")).resolves.toBeNull();
    await expect(repositories.orders.getOrder("missing-order")).resolves.toBeNull();
    await expect(repositories.customers.getCustomer("missing-customer")).resolves.toBeNull();
  });
});
