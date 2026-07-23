import { koboToNaira } from "@/lib/money";
import type { ProductVariantOption } from "@/lib/storefront/types";
import { addCartLine, type CartLine, type CartSelection } from "./cart-lines";
import type { Product } from "./catalogue-data";

export const CART_STORAGE_KEY = "laitstyles-storefront:v2:cart";
export const LEGACY_CART_STORAGE_KEY = "laitstyles-storefront:v1:cart";
export const LEGACY_LOCAL_CART_STORAGE_KEY = "laitstyles-cart";

type VariantOptionsByProductId = Readonly<
  Record<string, readonly ProductVariantOption[]>
>;

interface ReadableStorage {
  getItem(key: string): string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function positiveQuantity(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : null;
}

function selectionFor(product: Product, variant: ProductVariantOption): CartSelection | null {
  if (variant.availability.available < 1) return null;
  return {
    variantId: variant.id,
    variantLabel: variant.label,
    colour: variant.colour,
    size: variant.size,
    unitPriceNaira: koboToNaira(variant.price ?? product.price * 100),
    maxQuantity: variant.availability.available,
  };
}

function resolveLegacyVariant(
  token: string,
  variants: readonly ProductVariantOption[],
): ProductVariantOption | null {
  const matches = variants.filter(
    (variant) => variant.id === token || variant.label === token || variant.size === token,
  );
  return matches.length === 1 ? (matches[0] ?? null) : null;
}

export function normalizePersistedCart(
  value: unknown,
  products: readonly Product[],
  variantOptionsByProductId: VariantOptionsByProductId,
): readonly CartLine[] {
  if (!Array.isArray(value)) return [];

  return value.reduce<readonly CartLine[]>((lines, candidate) => {
    if (!isRecord(candidate)) return lines;
    const quantity = positiveQuantity(candidate.qty);
    if (!quantity) return lines;

    const isV2 = typeof candidate.productId === "string";
    const productId = isV2
      ? candidate.productId
      : typeof candidate.id === "string"
        ? candidate.id
        : null;
    if (!productId) return lines;

    const product = products.find(
      (item) => item.id === productId || item.databaseId === productId,
    );
    if (!product) return lines;

    if (product.inventory !== "variant") {
      if (isV2 && candidate.variantId !== null) return lines;
      return addCartLine(lines, product, null, quantity);
    }

    const variants = variantOptionsByProductId[product.id] ?? [];
    const variant = isV2
      ? typeof candidate.variantId === "string"
        ? variants.find((option) => option.id === candidate.variantId) ?? null
        : null
      : typeof candidate.variant === "string"
        ? resolveLegacyVariant(candidate.variant, variants)
        : null;
    if (!variant) return lines;

    const selection = selectionFor(product, variant);
    return selection ? addCartLine(lines, product, selection, quantity) : lines;
  }, []);
}

export function loadPersistedCart(
  sessionStorage: ReadableStorage,
  localStorage: ReadableStorage,
  products: readonly Product[],
  variantOptionsByProductId: VariantOptionsByProductId,
): readonly CartLine[] {
  const serialized =
    sessionStorage.getItem(CART_STORAGE_KEY) ??
    sessionStorage.getItem(LEGACY_CART_STORAGE_KEY) ??
    localStorage.getItem(LEGACY_LOCAL_CART_STORAGE_KEY);
  if (!serialized) return [];

  try {
    return normalizePersistedCart(JSON.parse(serialized), products, variantOptionsByProductId);
  } catch {
    return [];
  }
}
