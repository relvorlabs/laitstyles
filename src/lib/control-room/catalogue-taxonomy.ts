import type { InventoryProduct } from "@/lib/control-room/inventory-types";
import { err, ok, type Result } from "@/lib/control-room/result";
import type { ControlRoomState } from "@/lib/control-room/types";

export type CatalogueTaxonomyKind = "category" | "collection";

export type CatalogueTaxonomyItem = {
  id: string;
  kind: CatalogueTaxonomyKind;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
};

export type CatalogueTaxonomyInput = {
  kind: CatalogueTaxonomyKind;
  name: string;
};

export type CatalogueTaxonomyActionError = {
  code: "empty-name" | "duplicate-name" | "taxonomy-not-found" | "taxonomy-in-use";
  message: string;
  taxonomyId?: string;
};

export type CatalogueTaxonomyActionSuccess = {
  item?: CatalogueTaxonomyItem;
  deletedId?: string;
  message: string;
};

type CatalogueTaxonomyStateResult = {
  state: ControlRoomState;
  action: CatalogueTaxonomyActionSuccess;
};

export function hydrateCatalogueTaxonomy(
  products: InventoryProduct[],
  existing: CatalogueTaxonomyItem[] | undefined,
  now: string,
  idFactory: (prefix: string) => string,
) {
  const items = [...(existing ?? [])];
  const seen = new Set(items.map((item) => `${item.kind}:${normaliseName(item.name)}`));

  for (const product of products) {
    addSeedItem(items, seen, "category", product.category, now, idFactory);
    if (product.collection) {
      addSeedItem(items, seen, "collection", product.collection, now, idFactory);
    }
  }

  return items.toSorted(compareTaxonomy);
}

export function applyCreateCatalogueTaxonomy(
  state: ControlRoomState,
  input: CatalogueTaxonomyInput,
  now: string,
  idFactory: (prefix: string) => string = createActionId,
): Result<CatalogueTaxonomyStateResult, CatalogueTaxonomyActionError> {
  const name = cleanName(input.name);
  const validation = validateName(state, input.kind, name);
  if (validation) return err(validation);

  const item: CatalogueTaxonomyItem = {
    id: idFactory(input.kind),
    kind: input.kind,
    name,
    slug: createSlug(name),
    createdAt: now,
    updatedAt: now,
  };

  return ok({
    state: withTaxonomyActivity(
      state,
      [...(state.catalogueTaxonomy ?? []), item].toSorted(compareTaxonomy),
      now,
      `${labelFor(input.kind)} created`,
      `${name} is now available in product forms and Inventory filters.`,
      idFactory,
    ),
    action: { item, message: `${labelFor(input.kind)} “${name}” created.` },
  });
}

export function applyRenameCatalogueTaxonomy(
  state: ControlRoomState,
  taxonomyId: string,
  nextName: string,
  now: string,
  idFactory: (prefix: string) => string = createActionId,
): Result<CatalogueTaxonomyStateResult, CatalogueTaxonomyActionError> {
  const current = state.catalogueTaxonomy?.find((item) => item.id === taxonomyId);
  if (!current) {
    return err({
      code: "taxonomy-not-found",
      taxonomyId,
      message: "The selected catalogue group could not be found.",
    });
  }

  const name = cleanName(nextName);
  const validation = validateName(state, current.kind, name, taxonomyId);
  if (validation) return err(validation);

  const item = { ...current, name, slug: createSlug(name), updatedAt: now };
  const products = state.products.map((product) =>
    renameProductTaxonomy(product, current.kind, current.name, name),
  );

  return ok({
    state: withTaxonomyActivity(
      { ...state, products },
      (state.catalogueTaxonomy ?? [])
        .map((entry) => (entry.id === taxonomyId ? item : entry))
        .toSorted(compareTaxonomy),
      now,
      `${labelFor(current.kind)} renamed`,
      `${current.name} is now ${name} across connected products.`,
      idFactory,
    ),
    action: { item, message: `${labelFor(current.kind)} renamed to “${name}”.` },
  });
}

export function applyDeleteCatalogueTaxonomy(
  state: ControlRoomState,
  taxonomyId: string,
  now: string,
  idFactory: (prefix: string) => string = createActionId,
): Result<CatalogueTaxonomyStateResult, CatalogueTaxonomyActionError> {
  const current = state.catalogueTaxonomy?.find((item) => item.id === taxonomyId);
  if (!current) {
    return err({
      code: "taxonomy-not-found",
      taxonomyId,
      message: "The selected catalogue group could not be found.",
    });
  }

  const usageCount = countUsage(state.products, current);
  if (usageCount > 0) {
    return err({
      code: "taxonomy-in-use",
      taxonomyId,
      message: `${current.name} is used by ${usageCount} product${usageCount === 1 ? "" : "s"}. Reassign those products before deleting it.`,
    });
  }

  return ok({
    state: withTaxonomyActivity(
      state,
      (state.catalogueTaxonomy ?? []).filter((item) => item.id !== taxonomyId),
      now,
      `${labelFor(current.kind)} deleted`,
      `${current.name} was removed from catalogue choices.`,
      idFactory,
    ),
    action: {
      deletedId: taxonomyId,
      message: `${labelFor(current.kind)} “${current.name}” deleted.`,
    },
  });
}

function validateName(
  state: ControlRoomState,
  kind: CatalogueTaxonomyKind,
  name: string,
  excludedId?: string,
): CatalogueTaxonomyActionError | null {
  if (!name) return { code: "empty-name", message: `Enter a ${kind} name.` };
  const duplicate = state.catalogueTaxonomy?.find(
    (item) =>
      item.id !== excludedId &&
      item.kind === kind &&
      normaliseName(item.name) === normaliseName(name),
  );
  return duplicate
    ? { code: "duplicate-name", message: `${labelFor(kind)} “${duplicate.name}” already exists.` }
    : null;
}

function addSeedItem(
  items: CatalogueTaxonomyItem[],
  seen: Set<string>,
  kind: CatalogueTaxonomyKind,
  value: string,
  now: string,
  idFactory: (prefix: string) => string,
) {
  const name = cleanName(value);
  const key = `${kind}:${normaliseName(name)}`;
  if (!name || seen.has(key)) return;
  seen.add(key);
  items.push({ id: idFactory(kind), kind, name, slug: createSlug(name), createdAt: now, updatedAt: now });
}

function renameProductTaxonomy(
  product: InventoryProduct,
  kind: CatalogueTaxonomyKind,
  previousName: string,
  nextName: string,
): InventoryProduct {
  if (kind === "category" && product.category === previousName) {
    return { ...product, category: nextName };
  }
  if (kind === "collection" && product.collection === previousName) {
    return { ...product, collection: nextName };
  }
  return product;
}

function countUsage(products: InventoryProduct[], item: CatalogueTaxonomyItem) {
  return products.filter((product) =>
    item.kind === "category"
      ? product.category === item.name
      : product.collection === item.name,
  ).length;
}

function withTaxonomyActivity(
  state: ControlRoomState,
  catalogueTaxonomy: CatalogueTaxonomyItem[],
  now: string,
  title: string,
  detail: string,
  idFactory: (prefix: string) => string,
): ControlRoomState {
  return {
    ...state,
    asOf: now,
    catalogueTaxonomy,
    activities: [
      { id: idFactory("activity"), kind: "inventory", title, detail, occurredAt: now },
      ...state.activities,
    ],
  };
}

function compareTaxonomy(left: CatalogueTaxonomyItem, right: CatalogueTaxonomyItem) {
  return left.kind.localeCompare(right.kind) || left.name.localeCompare(right.name, "en-NG");
}

function cleanName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normaliseName(value: string) {
  return cleanName(value).toLocaleLowerCase("en-NG");
}

function createSlug(value: string) {
  return normaliseName(value).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function labelFor(kind: CatalogueTaxonomyKind) {
  return kind === "category" ? "Category" : "Collection";
}

function createActionId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}
