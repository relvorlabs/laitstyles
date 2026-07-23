import type { Product } from "./catalogue-data";

export interface CartSelection {
  variantId: string;
  variantLabel: string;
  colour: string | null;
  size: string | null;
  unitPriceNaira: number;
  maxQuantity: number;
}

export interface CartLine {
  key: string;
  productId: string;
  qty: number;
  variantId: string | null;
  variantLabel: string | null;
  colour: string | null;
  size: string | null;
  unitPriceNaira: number;
  maxQuantity: number;
}

export type CartProduct = Pick<Product, "id" | "price" | "stock" | "status" | "inventory">;

export function cartLineKey(productId: string, variantId: string | null) {
  return `${productId}:${variantId ?? "default"}`;
}

export function addCartLine(
  lines: readonly CartLine[],
  product: CartProduct,
  selection: CartSelection | null,
  quantity: number,
): readonly CartLine[] {
  if (product.status !== "available") return lines;
  if (product.inventory === "variant" && !selection) return lines;

  const selected = product.inventory === "variant" ? selection : null;
  const maxQuantity =
    product.inventory === "one-of-one" ? 1 : (selected?.maxQuantity ?? product.stock);
  if (maxQuantity < 1) return lines;

  const key = cartLineKey(product.id, selected?.variantId ?? null);
  const existing = lines.find((line) => line.key === key);
  if (product.inventory === "one-of-one" && existing) return lines;

  const addedQuantity = Math.max(1, Math.floor(quantity));
  if (existing) {
    const nextQuantity = Math.min(existing.maxQuantity, existing.qty + addedQuantity);
    if (nextQuantity === existing.qty) return lines;
    return lines.map((line) => (line.key === key ? { ...line, qty: nextQuantity } : line));
  }

  return [
    ...lines,
    {
      key,
      productId: product.id,
      qty: Math.min(addedQuantity, maxQuantity),
      variantId: selected?.variantId ?? null,
      variantLabel: selected?.variantLabel ?? null,
      colour: selected?.colour ?? null,
      size: selected?.size ?? null,
      unitPriceNaira: selected?.unitPriceNaira ?? product.price,
      maxQuantity,
    },
  ];
}

export function changeCartLineQuantity(
  lines: readonly CartLine[],
  lineKey: string,
  delta: number,
): readonly CartLine[] {
  const target = lines.find((line) => line.key === lineKey);
  if (!target) return lines;

  const quantity = Math.max(1, Math.min(target.maxQuantity, target.qty + delta));
  if (quantity === target.qty) return lines;
  return lines.map((line) => (line.key === lineKey ? { ...line, qty: quantity } : line));
}

export function cartSubtotal(lines: readonly CartLine[]) {
  return lines.reduce((subtotal, line) => subtotal + line.unitPriceNaira * line.qty, 0);
}
