import { describe, expect, it } from "vitest";
import { createControlRoomStore } from "@/features/control-room/state/control-room-store";
import { activeControlRoomSeed } from "@/lib/control-room/seed";

const now = "2026-07-10T12:00:00+01:00";

describe("Catalogue taxonomy management", () => {
  it("hydrates product categories and collections into managed choices", () => {
    const store = createControlRoomStore(activeControlRoomSeed, () => now);
    const taxonomy = store.getSnapshot().catalogueTaxonomy ?? [];

    expect(taxonomy.some((item) => item.kind === "category")).toBe(true);
    expect(taxonomy.some((item) => item.kind === "collection")).toBe(true);
  });

  it("creates and deletes an unused collection", () => {
    const store = createControlRoomStore(activeControlRoomSeed, () => now);
    const created = store.createCatalogueTaxonomy({
      kind: "collection",
      name: "Weekend Denim",
    });

    expect(created.ok).toBe(true);
    if (!created.ok || !created.value.item) throw new Error("Collection was not created");
    expect(store.getSnapshot().catalogueTaxonomy).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "collection", name: "Weekend Denim" }),
      ]),
    );

    const deleted = store.deleteCatalogueTaxonomy(created.value.item.id);
    expect(deleted.ok).toBe(true);
    expect(
      store
        .getSnapshot()
        .catalogueTaxonomy?.some((item) => item.id === created.value.item?.id),
    ).toBe(false);
  });

  it("renames a category across connected products and blocks deletion while used", () => {
    const store = createControlRoomStore(activeControlRoomSeed, () => now);
    const current = store
      .getSnapshot()
      .catalogueTaxonomy?.find((item) => item.kind === "category");
    if (!current) throw new Error("Expected a seeded category");

    const nextName = `${current.name} Edit`;
    const renamed = store.renameCatalogueTaxonomy(current.id, nextName);
    expect(renamed.ok).toBe(true);
    expect(
      store.getSnapshot().products.some((product) => product.category === nextName),
    ).toBe(true);

    const deletion = store.deleteCatalogueTaxonomy(current.id);
    expect(deletion.ok).toBe(false);
    if (deletion.ok) throw new Error("Used category should not be deleted");
    expect(deletion.error.code).toBe("taxonomy-in-use");
  });

  it("rejects duplicate names without changing the store", () => {
    const store = createControlRoomStore(activeControlRoomSeed, () => now);
    const current = store
      .getSnapshot()
      .catalogueTaxonomy?.find((item) => item.kind === "category");
    if (!current) throw new Error("Expected a seeded category");
    const before = store.getSnapshot().catalogueTaxonomy?.length;

    const duplicate = store.createCatalogueTaxonomy({
      kind: "category",
      name: `  ${current.name.toUpperCase()}  `,
    });

    expect(duplicate.ok).toBe(false);
    if (duplicate.ok) throw new Error("Duplicate category should be rejected");
    expect(duplicate.error.code).toBe("duplicate-name");
    expect(store.getSnapshot().catalogueTaxonomy).toHaveLength(before ?? 0);
  });
});
