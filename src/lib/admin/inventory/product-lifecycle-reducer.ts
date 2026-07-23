import { err, ok, type Result } from "@/lib/admin/shared/result";
import type { ControlRoomState } from "@/lib/admin/shared/types";

export type ProductLifecycleActionError = {
  code: "product-not-found" | "product-in-use";
  message: string;
  productId: string;
};

export type ProductLifecycleActionSuccess = {
  productId: string;
  deleted: boolean;
  message: string;
};

type ProductLifecycleStateResult = {
  state: ControlRoomState;
  action: ProductLifecycleActionSuccess;
};

export function applyArchiveProduct(
  state: ControlRoomState,
  productId: string,
  now: string,
  idFactory: (prefix: string) => string = createActionId,
): Result<ProductLifecycleStateResult, ProductLifecycleActionError> {
  const product = state.products.find((entry) => entry.id === productId);
  if (!product) return productNotFound(productId);

  const nextProduct = {
    ...product,
    lifecycle: "archived" as const,
    publication: "unpublished" as const,
    channels: [],
    updatedAt: now,
  };

  return ok({
    state: {
      ...state,
      asOf: now,
      products: state.products.map((entry) => (entry.id === productId ? nextProduct : entry)),
      activities: [
        {
          id: idFactory("activity"),
          kind: "inventory",
          title: `${product.name} archived`,
          detail: "The product remains in operational history but is no longer available for sale.",
          occurredAt: now,
          productId,
        },
        ...state.activities,
      ],
    },
    action: {
      productId,
      deleted: false,
      message: `${product.name} archived and removed from selling channels.`,
    },
  });
}

export function applyRestoreProduct(
  state: ControlRoomState,
  productId: string,
  now: string,
  idFactory: (prefix: string) => string = createActionId,
): Result<ProductLifecycleStateResult, ProductLifecycleActionError> {
  const product = state.products.find((entry) => entry.id === productId);
  if (!product) return productNotFound(productId);

  const nextProduct = {
    ...product,
    lifecycle: "active" as const,
    publication: "unpublished" as const,
    updatedAt: now,
  };

  return ok({
    state: {
      ...state,
      asOf: now,
      products: state.products.map((entry) => (entry.id === productId ? nextProduct : entry)),
      activities: [
        {
          id: idFactory("activity"),
          kind: "inventory",
          title: `${product.name} restored`,
          detail: "The product is active again and must be reviewed before publishing.",
          occurredAt: now,
          productId,
        },
        ...state.activities,
      ],
    },
    action: {
      productId,
      deleted: false,
      message: `${product.name} restored as an unpublished product.`,
    },
  });
}

export function applyDeleteProduct(
  state: ControlRoomState,
  productId: string,
  now: string,
  idFactory: (prefix: string) => string = createActionId,
): Result<ProductLifecycleStateResult, ProductLifecycleActionError> {
  const product = state.products.find((entry) => entry.id === productId);
  if (!product) return productNotFound(productId);

  const dependencies = getProductDependencies(state, productId);
  if (dependencies.length) {
    return err({
      code: "product-in-use",
      productId,
      message: `${product.name} cannot be permanently deleted because it has ${dependencies.join(", ")}. Archive it instead to preserve store history.`,
    });
  }

  return ok({
    state: {
      ...state,
      asOf: now,
      products: state.products.filter((entry) => entry.id !== productId),
      intake: (state.intake ?? []).filter((record) => record.productId !== productId),
      activities: [
        {
          id: idFactory("activity"),
          kind: "inventory",
          title: `${product.name} deleted`,
          detail: "Unused catalogue record permanently removed from this prototype session.",
          occurredAt: now,
        },
        ...state.activities.filter((activity) => activity.productId !== productId),
      ],
    },
    action: {
      productId,
      deleted: true,
      message: `${product.name} permanently deleted.`,
    },
  });
}

function getProductDependencies(state: ControlRoomState, productId: string) {
  const dependencies: string[] = [];
  if (state.orders.some((order) => order.lines.some((line) => line.productId === productId))) {
    dependencies.push("order history");
  }
  if (state.holds.some((hold) => hold.productId === productId)) {
    dependencies.push("hold history");
  }
  if (state.stockMovements.some((movement) => movement.productId === productId)) {
    dependencies.push("stock movements");
  }
  if (state.reviews.some((review) => review.productId === productId)) {
    dependencies.push("reviews");
  }
  if (
    (state.returns ?? []).some((record) =>
      record.lines.some((line) => line.productId === productId),
    )
  ) {
    dependencies.push("return history");
  }
  if (state.customers.some((customer) => customer.savedProductIds?.includes(productId))) {
    dependencies.push("customer saves");
  }
  return dependencies;
}

function productNotFound(productId: string): Result<never, ProductLifecycleActionError> {
  return err({
    code: "product-not-found",
    productId,
    message: "The selected product could not be found.",
  });
}

function createActionId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}
