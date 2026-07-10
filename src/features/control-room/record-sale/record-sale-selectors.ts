import type {
  ControlRoomState,
  InventoryProduct,
} from "@/lib/control-room/types";
import type { RecordSaleValues } from "@/features/control-room/record-sale/record-sale-types";

export function createRecordSaleDefaults(
  state: ControlRoomState,
): RecordSaleValues {
  const firstProduct = getSellableProducts(state)[0];
  const firstVariant =
    firstProduct?.inventoryMode === "variant"
      ? firstProduct.variants.find((variant) => variant.stock.available > 0)
      : undefined;

  return {
    productId: firstProduct?.id ?? "",
    variantId: firstVariant?.id ?? "",
    quantity: 1,
    unitPrice: firstVariant?.price ?? firstProduct?.price ?? 0,
    channel: "physical-store",
    customerMode: "existing",
    customerId: state.customers[0]?.id ?? "",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerCity: "Lagos",
    paymentMethod: "pos",
    paymentStatus: "paid",
    notes: "",
  };
}

export function getSellableProducts(state: ControlRoomState) {
  return state.products.filter(
    (product) =>
      product.lifecycle === "active" &&
      product.publication === "published" &&
      getAvailableForSale(product) > 0,
  );
}

export function getAvailableForSale(
  product: InventoryProduct,
  variantId?: string,
) {
  if (product.inventoryMode !== "variant") return product.stock.available;
  if (!variantId) {
    return product.variants.reduce(
      (total, variant) => total + variant.stock.available,
      0,
    );
  }
  return (
    product.variants.find((variant) => variant.id === variantId)?.stock.available ??
    0
  );
}

export function getSelectedSaleProduct(
  state: ControlRoomState,
  productId: string,
) {
  return state.products.find((product) => product.id === productId) ?? null;
}

export function getSelectedSaleVariant(
  product: InventoryProduct | null,
  variantId: string,
) {
  if (!product || product.inventoryMode !== "variant") return null;
  return product.variants.find((variant) => variant.id === variantId) ?? null;
}

export function getSaleUnitPrice(
  product: InventoryProduct | null,
  variantId: string,
) {
  if (!product) return 0;
  const variant = getSelectedSaleVariant(product, variantId);
  return variant?.price ?? product.price;
}
