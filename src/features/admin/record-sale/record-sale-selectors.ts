import type { RecordSaleValues } from "@/features/admin/record-sale/record-sale-types";
import type { AdminOrderCustomer } from "@/modules/orders/types";
import type { AdminProduct } from "@/modules/products/types";

export function createRecordSaleDefaults(
  products: AdminProduct[],
  customers: AdminOrderCustomer[],
): RecordSaleValues {
  const firstProduct = getSellableProducts(products)[0];
  const firstVariant =
    firstProduct?.inventoryMode === "variant"
      ? firstProduct.variants.find((variant) => variant.stock.available > 0)
      : undefined;
  const firstPaystackCustomer = customers[0];

  return {
    productId: firstProduct?.id ?? "",
    variantId: firstVariant?.id ?? "",
    quantity: 1,
    unitPrice: firstVariant?.price ?? firstProduct?.price ?? 0,
    channel: "physical-store",
    customerMode: firstPaystackCustomer ? "existing" : "new",
    customerId: firstPaystackCustomer?.id ?? "",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerCity: "Lagos",
    notes: "",
  };
}

export function getSellableProducts(products: AdminProduct[]) {
  return products.filter(
    (product) =>
      product.lifecycle === "active" &&
      product.publication === "published" &&
      getAvailableForSale(product) > 0,
  );
}

export function getAvailableForSale(product: AdminProduct, variantId?: string) {
  if (product.inventoryMode !== "variant") return product.stock.available;
  if (!variantId) {
    return product.variants.reduce((total, variant) => total + variant.stock.available, 0);
  }
  return product.variants.find((variant) => variant.id === variantId)?.stock.available ?? 0;
}

export function getSelectedSaleProduct(products: AdminProduct[], productId: string) {
  return products.find((product) => product.id === productId) ?? null;
}

export function getSelectedSaleVariant(product: AdminProduct | null, variantId: string) {
  if (!product || product.inventoryMode !== "variant") return null;
  return product.variants.find((variant) => variant.id === variantId) ?? null;
}

export function getSaleUnitPrice(product: AdminProduct | null, variantId: string) {
  if (!product) return 0;
  const variant = getSelectedSaleVariant(product, variantId);
  return variant?.price ?? product.price;
}
