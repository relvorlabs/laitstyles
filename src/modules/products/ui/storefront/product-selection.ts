import type {
  Availability,
  ProductDetail,
  ProductImage,
  ProductVariantOption,
} from "@/lib/storefront/types";

export interface ProductSelectionState {
  selectedColour: string | null;
  selectedSize: string | null;
  quantity: number;
}

export type ProductSelectionEvent =
  | { type: "select_colour"; colour: string }
  | { type: "select_size"; size: string }
  | { type: "set_quantity"; quantity: number };

export interface ResolvedProductSelection {
  selectedColour: string | null;
  selectedSize: string | null;
  selectedVariantId: string | null;
  selectedVariant: ProductVariantOption | null;
  compatibleVariants: readonly ProductVariantOption[];
  compatibleSizes: readonly ProductVariantOption[];
  displayPrice: number;
  referencePrice: number | null;
  availability: Availability;
  available: boolean;
  availableQuantity: number;
  quantity: number;
  media: readonly ProductImage[];
}

const normalized = (value: string) => value.trim().toLowerCase();

function shopperSize(variant: ProductVariantOption) {
  return variant.size?.trim() || variant.label.trim();
}

function hasStock(variant: ProductVariantOption) {
  return variant.availability.available > 0;
}

function variantsForColour(
  variants: readonly ProductVariantOption[],
  selectedColour: string | null,
) {
  if (selectedColour === null) return [...variants];
  return variants.filter((variant) => variant.colour === selectedColour);
}

function uniqueSizes(variants: readonly ProductVariantOption[]) {
  const labels = new Set<string>();
  return variants.filter((variant) => {
    const label = normalized(shopperSize(variant));
    if (labels.has(label)) return false;
    labels.add(label);
    return true;
  });
}

function sortedUniqueMedia(media: readonly ProductImage[]) {
  const ids = new Set<string>();
  return [...media]
    .sort((left, right) => left.position - right.position)
    .filter((image) => {
      if (ids.has(image.id)) return false;
      ids.add(image.id);
      return true;
    });
}

function selectedMedia(
  detail: ProductDetail,
  selectedColour: string | null,
  selectedVariant: ProductVariantOption | null,
) {
  if (detail.mode !== "variant") return sortedUniqueMedia(detail.media);

  const exact = selectedVariant
    ? detail.media.filter((image) => image.variantId === selectedVariant.id)
    : [];
  const sameColourVariantIds = new Set(
    detail.variants
      .filter(
        (variant) =>
          variant.colour === selectedColour &&
          (selectedVariant === null || variant.id !== selectedVariant.id),
      )
      .map((variant) => variant.id),
  );
  const sameColour = detail.media.filter(
    (image) => image.variantId !== null && sameColourVariantIds.has(image.variantId),
  );

  if (exact.length === 0 && sameColour.length === 0) return sortedUniqueMedia(detail.media);

  const unscoped = detail.media.filter((image) => image.variantId === null);
  const ids = new Set<string>();
  return [exact, sameColour, unscoped]
    .flatMap((group) => [...group].sort((left, right) => left.position - right.position))
    .filter((image) => {
      if (ids.has(image.id)) return false;
      ids.add(image.id);
      return true;
    });
}

function clampedQuantity(quantity: number, availableQuantity: number) {
  const requested = Number.isFinite(quantity) ? Math.max(1, Math.floor(quantity)) : 1;
  return availableQuantity > 0 ? Math.min(requested, availableQuantity) : 1;
}

export function createProductSelection(detail: ProductDetail): ProductSelectionState {
  if (detail.mode !== "variant") {
    return {
      selectedColour: detail.colour,
      selectedSize: detail.sizeLabel,
      quantity: 1,
    };
  }

  const selectedColour =
    detail.variants.find((variant) => hasStock(variant) && variant.colour !== null)?.colour ??
    detail.variants.find((variant) => variant.colour !== null)?.colour ??
    null;
  const sizes = uniqueSizes(variantsForColour(detail.variants, selectedColour));

  return {
    selectedColour,
    selectedSize: sizes.length === 1 ? shopperSize(sizes[0]) : null,
    quantity: 1,
  };
}

export function transitionProductSelection(
  detail: ProductDetail,
  state: ProductSelectionState,
  event: ProductSelectionEvent,
): ProductSelectionState {
  if (event.type === "set_quantity") return { ...state, quantity: event.quantity };
  if (event.type === "select_size") return { ...state, selectedSize: event.size };

  const compatible =
    detail.mode === "variant" ? variantsForColour(detail.variants, event.colour) : [];
  const keepsSize =
    state.selectedSize !== null &&
    compatible.some(
      (variant) => normalized(shopperSize(variant)) === normalized(state.selectedSize ?? ""),
    );

  return {
    ...state,
    selectedColour: event.colour,
    selectedSize: keepsSize ? state.selectedSize : null,
  };
}

export function resolveProductSelection(
  detail: ProductDetail,
  state: ProductSelectionState,
): ResolvedProductSelection {
  if (detail.mode !== "variant") {
    const availableQuantity =
      detail.mode === "unique"
        ? Math.min(1, Math.max(0, detail.availability.available))
        : Math.max(0, detail.availability.available);
    return {
      selectedColour: state.selectedColour ?? detail.colour,
      selectedSize: state.selectedSize ?? detail.sizeLabel,
      selectedVariantId: null,
      selectedVariant: null,
      compatibleVariants: [],
      compatibleSizes: [],
      displayPrice: detail.price,
      referencePrice: detail.referencePrice,
      availability: detail.availability,
      available: availableQuantity > 0,
      availableQuantity,
      quantity: clampedQuantity(state.quantity, availableQuantity),
      media: selectedMedia(detail, state.selectedColour, null),
    };
  }

  const compatibleVariants = variantsForColour(detail.variants, state.selectedColour);
  const compatibleSizes = uniqueSizes(compatibleVariants);
  const exactMatches =
    state.selectedSize === null
      ? []
      : compatibleVariants.filter(
          (variant) => normalized(shopperSize(variant)) === normalized(state.selectedSize ?? ""),
        );
  const selectedVariant = exactMatches.length === 1 ? exactMatches[0] : null;
  const availableQuantity = selectedVariant
    ? Math.max(0, selectedVariant.availability.available)
    : 0;

  return {
    selectedColour: state.selectedColour,
    selectedSize: state.selectedSize,
    selectedVariantId: selectedVariant?.id ?? null,
    selectedVariant,
    compatibleVariants,
    compatibleSizes,
    displayPrice: selectedVariant?.price ?? detail.price,
    referencePrice: detail.referencePrice,
    availability: selectedVariant?.availability ?? detail.availability,
    available: selectedVariant !== null && availableQuantity > 0,
    availableQuantity,
    quantity: clampedQuantity(state.quantity, availableQuantity),
    media: selectedMedia(detail, state.selectedColour, selectedVariant),
  };
}
