# Product Detail Section Parity, Variant Selection, and Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every PDP-owned section inside `main#main` match the approved handoff, add truthful colour-to-variant commerce behavior, reproduce the handoff's Motion behavior, and prove parity with deterministic Playwright evidence.

**Architecture:** Keep `ProductDetail` as the server composition root and introduce a pure product-selection model consumed by a focused client hook in `ProductHero`. Preserve canonical variant/media records through the data boundary, use variant-safe cart-line keys in the existing provider, and implement visual fidelity in exclusively owned section files that can run in parallel after the commerce foundation lands.

**Tech Stack:** Next.js 16.2 App Router, React 19.2, TypeScript 5, Tailwind CSS 4, Base UI-backed shadcn components, HugeIcons, `motion/react` 12, `next/image`, Vitest 4, Playwright 1.61, Biome, React Doctor.

## Global Constraints

- The approved design is `docs/superpowers/specs/2026-07-19-product-detail-section-parity-variant-motion-design.md`.
- The visual reference is `C:/Users/olaitan/OneDrive/Documents/Downloads/laitstyles-product-detail-hifi.html`.
- Change only PDP content inside `main#main` plus the data/cart functionality required for exact variants. Shared announcement, header, navigation, search/cart overlays, footer, and global toast presentation remain unchanged.
- Shared chrome remains unchanged; no section agent owns its visual markup.
- Preserve routing, metadata, JSON-LD, async params, catalogue loading, cart, wishlist, holds, quick view, image viewer, shared providers, and truthful data contracts.
- Use existing semantic theme tokens and Tailwind utilities. Add no raw theme colours, page-local style blocks, CSS modules, raw PDP selectors, or inline CSS presentation styles.
- Persisted product colour hex values are data and must render through SVG `fill`, not inline CSS.
- Use Manrope for sans, heading, and utility roles; use Newsreader for serif/display roles through the central root `next/font` loader.
- Complete the look renders at most two existing shared ProductCards in two columns.
- Final recommendations use the existing shared ProductCard.
- Product names clamp to two lines and shared card actions align at the bottom of each grid row.
- Campaign frames are 4:5 at 375px, 4:3 at 768px, and 16:9 at 1280px.
- Reviews use truthful aggregate, aggregate-only, or empty states. Write a review must clearly report that submission is unavailable.
- Use `motion/react`; do not add another animation package.
- Respect reduced motion, keyboard order, WCAG AA contrast, 44px minimum icon controls, and no horizontal page overflow.
- Preserve unrelated dirty Prisma, admin, asset, package, migration, `.pnpm-store`, and `.claude` work. Never stage those files.
- Do not claim exact parity until production-server Playwright evidence passes and paired screenshots have been reviewed at original resolution.
- The current pnpm command shim may fail to resolve local binaries. When it does, run `node_modules/.bin/vitest.CMD`, `node_modules/.bin/biome.CMD`, `node_modules/.bin/tsc.CMD`, `node_modules/.bin/next.CMD`, or `node_modules/.bin/playwright.CMD` directly and report the shim failure separately.

## Parallel Execution Map

The plan has one serial foundation followed by exclusive-file parallel waves:

1. **Foundation, serial:** Tasks 1-5. One commerce owner establishes canonical media/variant types, the selection model, cart-line identity, provider integration, and PDP controller contract.
2. **Visual Wave A, parallel:** Tasks 6-8. Separate agents own shared card/font corrections, gallery, and editorial/server sections.
3. **Visual Wave B, parallel:** Tasks 9-11. Separate agents own information/recommendations, campaign, and reviews.
4. **Integration, serial:** Task 12. The root agent alone owns `product-detail.tsx`, reveal composition, final shell geometry, and test hooks.
5. **Evidence, serial:** Tasks 13-15. The root agent owns deterministic servers, Playwright suites, screenshot review, corrections, and completion gates.

Parallel agents must not commit concurrently. Each agent reports a scoped diff and verification; the root integration owner reviews and commits each accepted task with the commit command specified below.

---

### Task 1: Preserve canonical variant colours and variant-linked media

**Files:**
- Modify: `src/lib/storefront/types.ts`
- Modify: `src/lib/storefront/catalog-data.ts`
- Modify: `src/lib/storefront/catalog-data.test.ts`
- Modify: `src/server/commerce/catalogue/mappers.ts`
- Modify: `src/server/commerce/catalogue/mappers.test.ts`

**Interfaces:**
- Produces: `ProductImage.variantId: string | null`.
- Produces: `ProductVariantOption.colourHex: string | null`.
- Produces: `StorefrontCatalogPayload.variantOptionsByProductId: Readonly<Record<string, readonly ProductVariantOption[]>>`.
- Prisma truth rule: return `colourHex: null` because the current Prisma model has no persisted `colour_hex` field; do not add a database migration.

- [ ] **Step 1: Write failing snapshot contract tests**

Add assertions to `catalog-data.test.ts` using the known multicolour fixture:

```ts
it("preserves variant colour hex and media variant identity", async () => {
  const details = await loadCatalogProductDetails();
  const product = details.find((candidate) => candidate.slug === "patterned-office-shirt-capsule");

  expect(product?.mode).toBe("variant");
  if (!product || product.mode !== "variant") throw new Error("Expected variant fixture");
  expect(product.variants.some((variant) => variant.colourHex !== null)).toBe(true);
  expect(product.media.every((media) => "variantId" in media)).toBe(true);
});

it("exposes canonical variants to the client catalogue provider", async () => {
  const catalog = await loadStorefrontCatalog();
  const product = catalog.products.find(
    (candidate) => candidate.slug === "patterned-office-shirt-capsule",
  );
  expect(product).toBeDefined();
  expect(catalog.variantOptionsByProductId[product?.id ?? ""]).toHaveLength(9);
});
```

- [ ] **Step 2: Run the snapshot tests and record red**

Run:

```text
node_modules/.bin/vitest.CMD run src/lib/storefront/catalog-data.test.ts
```

Expected: failures because `colourHex`, `variantId`, and `variantOptionsByProductId` do not exist.

- [ ] **Step 3: Extend canonical DTOs**

Update the interfaces exactly:

```ts
export interface ProductImage {
  id: string;
  url: string;
  alt: string;
  kind: ProductImageKind;
  position: number;
  width: number | null;
  height: number | null;
  variantId: string | null;
}

export interface ProductVariantOption {
  id: string;
  label: string;
  sku: string | null;
  size: string | null;
  colour: string | null;
  colourHex: string | null;
  price: Kobo | null;
  availability: Availability;
}
```

- [ ] **Step 4: Preserve snapshot fields**

Add `colour_hex: string | null` to `VariantRow`, map `row.variant_id` in `mediaFor`, and map `row.colour_hex` in `variantsFor`:

```ts
return {
  id: row.id,
  url: asset.delivery_url ?? asset.secure_url,
  alt: asset.alt,
  kind: row.role,
  position: row.position,
  width: asset.width,
  height: asset.height,
  variantId: row.variant_id,
};
```

```ts
colourHex: row.colour_hex,
```

Expose variants through the client payload:

```ts
export interface StorefrontCatalogPayload {
  products: Product[];
  categories: StorefrontCategory[];
  measurementsCm: Record<string, number>;
  variantOptionsByProductId: Readonly<Record<string, readonly ProductVariantOption[]>>;
}
```

Build it from `productDetails` by product ID and include it in `storefront`.

- [ ] **Step 5: Update Prisma mapper truthfully**

Map media variant identity and nullable colour hex:

```ts
variantId: media.variant_id,
```

```ts
colourHex: null,
```

Update mapper fixtures and expectations so both mapping paths satisfy the DTO without claiming a missing database column.

Search for typed `ProductImage` and `ProductVariantOption` fixtures and add explicit nullable fields where required:

```text
rg -n 'kind: "(cover|detail|defect)"|satisfies ProductImage|satisfies ProductVariantOption' src
```

- [ ] **Step 6: Run focused tests and static checks**

```text
node_modules/.bin/vitest.CMD run src/lib/storefront/catalog-data.test.ts src/server/commerce/catalogue/mappers.test.ts
node_modules/.bin/biome.CMD check src/lib/storefront/types.ts src/lib/storefront/catalog-data.ts src/lib/storefront/catalog-data.test.ts src/server/commerce/catalogue/mappers.ts src/server/commerce/catalogue/mappers.test.ts
```

Expected: all focused tests pass; Biome reports no errors.

- [ ] **Step 7: Commit the canonical contract**

```text
git add src/lib/storefront/types.ts src/lib/storefront/catalog-data.ts src/lib/storefront/catalog-data.test.ts src/server/commerce/catalogue/mappers.ts src/server/commerce/catalogue/mappers.test.ts
git commit -m "feat(storefront): preserve variant media and colour data"
```

---

### Task 2: Build the pure product-selection model

**Files:**
- Create: `src/features/storefront/product/product-selection.ts`
- Create: `src/features/storefront/product/product-selection.test.ts`

**Interfaces:**
- Consumes: canonical `ProductDetail`, `ProductImage`, and `ProductVariantOption`.
- Produces: `createProductSelection(detail)`, `transitionProductSelection(detail, state, event)`, and `resolveProductSelection(detail, state)`.
- All prices returned by this module remain canonical kobo.

```ts
export function createProductSelection(detail: ProductDetail): ProductSelectionState;
export function transitionProductSelection(
  detail: ProductDetail,
  state: ProductSelectionState,
  event: ProductSelectionEvent,
): ProductSelectionState;
export function resolveProductSelection(
  detail: ProductDetail,
  state: ProductSelectionState,
): ResolvedProductSelection;
```

- [ ] **Step 1: Define test fixtures and write failing behavior tests**

Cover initial state, colour changes, compatible-size preservation, incompatible-size clearing, exact variant resolution, variant-price fallback, quantity clamping, sold-out combinations, and media fallback. Define a complete `ProductDetail` fixture with at least these distinguishing records:

```ts
const detail = {
  id: "shirt-1",
  slug: "patterned-office-shirt-capsule",
  name: "Patterned Office Shirt Capsule",
  brand: "Laitstyles",
  price: 3_000_000,
  referencePrice: null,
  archiveNumber: null,
  condition: "Excellent",
  material: "Linen",
  fit: "Relaxed",
  style: "Resort",
  category: { id: "shirts", slug: "shirts", name: "Shirts" },
  collection: null,
  cover: null,
  description: "Canonical fixture",
  media: [
    {
      id: "stone-l-image",
      url: "/stone-l.jpg",
      alt: "Stone shirt",
      kind: "cover",
      position: 1,
      width: 1200,
      height: 1500,
      variantId: "stone-l",
    },
    {
      id: "product-image",
      url: "/product.jpg",
      alt: "Product fallback",
      kind: "detail",
      position: 2,
      width: 1200,
      height: 1500,
      variantId: null,
    },
  ],
  measurements: [],
  reviewSummary: {
    average: 0,
    count: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  },
  careInstructions: null,
  flawNotes: null,
  mode: "variant",
  variants: [
    {
      id: "black-m",
      label: "Black / M",
      sku: null,
      size: "M",
      colour: "Black",
      colourHex: "#202020",
      price: null,
      availability: { state: "available", available: 5, isOneOfOne: false },
    },
    {
      id: "stone-l",
      label: "Stone / L",
      sku: null,
      size: "L",
      colour: "Stone",
      colourHex: "#8d8a83",
      price: 3_250_000,
      availability: { state: "low", available: 3, isOneOfOne: false },
    },
  ],
  availability: { state: "available", available: 8, isOneOfOne: false },
} satisfies ProductDetail;
```

Then write the behavior assertions:

```ts
it("clears an incompatible size when colour changes", () => {
  const initial = { selectedColour: "Black", selectedSize: "M", quantity: 2 };
  const next = transitionProductSelection(detail, initial, {
    type: "select_colour",
    colour: "Stone",
  });
  expect(next).toEqual({ selectedColour: "Stone", selectedSize: null, quantity: 2 });
  expect(resolveProductSelection(detail, next).selectedVariantId).toBeNull();
});

it("resolves exact price, stock, and linked media", () => {
  const state = { selectedColour: "Stone", selectedSize: "L", quantity: 7 };
  const resolved = resolveProductSelection(detail, state);
  expect(resolved.selectedVariantId).toBe("stone-l");
  expect(resolved.displayPrice).toBe(3_250_000);
  expect(resolved.availableQuantity).toBe(3);
  expect(resolved.quantity).toBe(3);
  expect(resolved.media[0]?.variantId).toBe("stone-l");
});
```

- [ ] **Step 2: Run the tests and record red**

```text
node_modules/.bin/vitest.CMD run src/features/storefront/product/product-selection.test.ts
```

Expected: module-not-found failure.

- [ ] **Step 3: Implement the public types**

```ts
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
```

- [ ] **Step 4: Implement deterministic selection rules**

Use canonical array order. Choose the first colour with an available variant, fall back to the first canonical colour, preserve compatible sizes, clear incompatible sizes, resolve only one exact colour-size pair, and auto-select only a single unambiguous compatible size.

Media resolution must include exact-variant media first, selected-colour variant media second, then unscoped media, deduplicated by image ID.

- [ ] **Step 5: Run tests and Biome**

```text
node_modules/.bin/vitest.CMD run src/features/storefront/product/product-selection.test.ts
node_modules/.bin/biome.CMD check src/features/storefront/product/product-selection.ts src/features/storefront/product/product-selection.test.ts
```

Expected: all selection tests pass; Biome reports no errors.

- [ ] **Step 6: Commit the selection model**

```text
git add src/features/storefront/product/product-selection.ts src/features/storefront/product/product-selection.test.ts
git commit -m "feat(storefront): add canonical product selection model"
```

---

### Task 3: Add variant-safe cart-line primitives

**Files:**
- Create: `src/features/storefront/shared/cart-lines.ts`
- Create: `src/features/storefront/shared/cart-lines.test.ts`

**Interfaces:**
- Produces: `CartSelection`, `CartLine`, `cartLineKey`, `addCartLine`, `changeCartLineQuantity`, and `cartSubtotal`.
- Unit prices use legacy major-unit Naira inside the legacy shared cart, explicitly converted from canonical kobo at the PDP boundary.

```ts
export function cartLineKey(productId: string, variantId: string | null): string;
export function addCartLine(
  lines: readonly CartLine[],
  product: CartProduct,
  selection: CartSelection | null,
  quantity: number,
): CartLine[];
export function changeCartLineQuantity(
  lines: readonly CartLine[],
  lineKey: string,
  delta: number,
): CartLine[];
export function cartSubtotal(lines: readonly CartLine[]): number;
```

- [ ] **Step 1: Write failing cart identity tests**

Define exact fixtures:

```ts
const product = {
  id: "shirt-1",
  price: 30_000,
  stock: 6,
  status: "available",
  inventory: "variant",
} satisfies CartProduct;

const blackMedium = {
  variantId: "black-m",
  variantLabel: "Black / M",
  colour: "Black",
  size: "M",
  unitPriceNaira: 32_500,
  maxQuantity: 5,
} satisfies CartSelection;

const stoneMedium = {
  ...blackMedium,
  variantId: "stone-m",
  variantLabel: "Stone / M",
  colour: "Stone",
} satisfies CartSelection;
```

Then add the behavior tests:

```ts
it("keeps different variants as different cart lines", () => {
  const first = addCartLine([], product, blackMedium, 1);
  const second = addCartLine(first, product, stoneMedium, 1);
  expect(second.map((line) => line.key)).toEqual([
    `${product.id}:black-m`,
    `${product.id}:stone-m`,
  ]);
});

it("increments only the matching variant and uses its unit price", () => {
  const once = addCartLine([], product, blackMedium, 1);
  const twice = addCartLine(once, product, blackMedium, 2);
  expect(twice).toEqual([
    expect.objectContaining({ qty: 3, unitPriceNaira: 32_500 }),
  ]);
  expect(cartSubtotal(twice)).toBe(97_500);
});
```

- [ ] **Step 2: Run the cart tests and record red**

```text
node_modules/.bin/vitest.CMD run src/features/storefront/shared/cart-lines.test.ts
```

Expected: module-not-found failure.

- [ ] **Step 3: Implement explicit cart types**

```ts
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
```

`cartLineKey(productId, variantId)` returns `${productId}:${variantId ?? "default"}`. All mutations use `key`, never product ID alone.

- [ ] **Step 4: Implement pure immutable operations**

`addCartLine` must reject unavailable products, cap quantity to the line maximum, prevent duplicate unique pieces, and preserve distinct variants. `changeCartLineQuantity` clamps to `[1, maxQuantity]`. `cartSubtotal` multiplies line unit price by quantity.

- [ ] **Step 5: Run tests and Biome**

```text
node_modules/.bin/vitest.CMD run src/features/storefront/shared/cart-lines.test.ts
node_modules/.bin/biome.CMD check src/features/storefront/shared/cart-lines.ts src/features/storefront/shared/cart-lines.test.ts
```

- [ ] **Step 6: Commit cart primitives**

```text
git add src/features/storefront/shared/cart-lines.ts src/features/storefront/shared/cart-lines.test.ts
git commit -m "refactor(storefront): key cart lines by canonical variant"
```

---

### Task 4: Integrate variant-safe lines with the shared provider and quick view

**Files:**
- Modify: `src/features/storefront/shared/storefront-provider.tsx`
- Modify: `src/features/storefront/shared/overlays/legacy-cart-drawer.tsx`
- Modify: `src/features/storefront/shared/overlays/quick-view-overlay.tsx`

**Interfaces:**
- Consumes: Task 1 `variantOptionsByProductId` and Task 3 cart primitives.
- Produces provider methods:

```ts
addToCart(id: string, selection?: CartSelection, quantity?: number): void;
removeFromCart(lineKey: string): void;
changeQty(lineKey: string, delta: number): void;
openImageViewerFor(id: string, index?: number, images?: readonly string[]): void;
```

- [ ] **Step 1: Replace the provider's inline CartLine type**

Import Task 3 types/functions. Keep `selectedVariant` temporarily as the quick-view variant ID, not a size string.

- [ ] **Step 2: Replace add/remove/quantity logic with pure primitives**

`addToCart` resolves the product, requires a `CartSelection` for variant inventory, calls `addCartLine`, and emits existing truthful toast feedback. Non-variant calls synthesize the default line from legacy product price/stock.

- [ ] **Step 3: Derive displayed cart lines and subtotal from line data**

Expose:

```ts
cartLines: Array<{
  product: Product;
  lineKey: string;
  lineQty: number;
  variantId: string | null;
  variantLabel: string | null;
  colour: string | null;
  size: string | null;
  unitPriceNaira: number;
}>;
```

Use `cartSubtotal(cart)` rather than product-level prices.

- [ ] **Step 4: Update the unchanged cart-drawer presentation to address line keys**

Keep its layout intact. Show available selection truth as one compact line:

```tsx
{[colour, size].filter(Boolean).join(" · ") || variantLabel || "Standard"}
```

Remove and quantity buttons pass `lineKey`.

- [ ] **Step 5: Make quick view resolve canonical variants**

Read `catalog.variantOptionsByProductId[active.id]`. Render existing button geometry using `variant.label`; selection stores `variant.id`. Add passes:

```ts
{
  variantId: variant.id,
  variantLabel: variant.label,
  colour: variant.colour,
  size: variant.size,
  unitPriceNaira: koboToNaira(variant.price ?? nairaToKobo(active.price)),
  maxQuantity: variant.availability.available,
}
```

Disable unavailable variants. This is a functional correction only; do not redesign the shared overlay.

Extend `openImageViewerFor` so a PDP may pass resolved variant image URLs. Clone only the viewer's active product image list for that overlay session; keep the shared image-viewer markup unchanged.

- [ ] **Step 6: Run provider-adjacent tests and static checks**

```text
node_modules/.bin/vitest.CMD run src/features/storefront/shared/cart-lines.test.ts src/lib/storefront/catalog-data.test.ts
node_modules/.bin/biome.CMD check src/features/storefront/shared/storefront-provider.tsx src/features/storefront/shared/overlays/legacy-cart-drawer.tsx src/features/storefront/shared/overlays/quick-view-overlay.tsx
```

Expected: tests pass; no stale product-ID cart mutations remain.

- [ ] **Step 7: Commit provider integration**

```text
git add src/features/storefront/shared/storefront-provider.tsx src/features/storefront/shared/overlays/legacy-cart-drawer.tsx src/features/storefront/shared/overlays/quick-view-overlay.tsx
git commit -m "feat(storefront): preserve exact variants in cart"
```

---

### Task 5: Wire the selection controller into PDP purchase behavior

**Files:**
- Create: `src/features/storefront/product/use-product-selection.ts`
- Modify: `src/features/storefront/product/product-detail-presentation.ts`
- Modify: `src/features/storefront/product/product-detail-presentation.test.ts`
- Modify: `src/features/storefront/product/product-detail.tsx`
- Modify: `src/features/storefront/product/product-hero.tsx`
- Modify: `src/features/storefront/product/product-gallery.tsx`
- Modify: `src/features/storefront/product/product-purchase-panel.tsx`
- Modify: `src/features/storefront/product/mobile-buy-bar.tsx`

**Interfaces:**
- Consumes: Tasks 1-4 contracts.
- Produces: one `ProductSelectionController` shared by gallery, purchase panel, and mobile bar.

- [ ] **Step 1: Update presentation tests before production mapping**

Assert the presentation retains canonical variants rather than independent flattened selectors:

```ts
expect(result.variants).toEqual(detail.variants);
expect(result.colours).toEqual([
  { name: "Sand", hex: null },
]);
```

Keep the existing recommendation-cap, campaign, review, and truthfulness tests.

- [ ] **Step 2: Run presentation tests and record red**

```text
node_modules/.bin/vitest.CMD run src/features/storefront/product/product-detail-presentation.test.ts
```

- [ ] **Step 3: Update the presentation contract**

Expose canonical variants and unique colour descriptors:

```ts
variants: readonly ProductVariantOption[];
colours: readonly { name: string; hex: string | null }[];
```

Keep measurements, review summary, description, discount, and campaign frames unchanged.

- [ ] **Step 4: Implement the client hook**

`useProductSelection(detail)` uses Task 2 pure functions with React state and returns:

```ts
export interface ProductSelectionController extends ResolvedProductSelection {
  selectColour(colour: string): void;
  selectSize(size: string): void;
  setQuantity(quantity: number): void;
}
```

- [ ] **Step 5: Replace split state in ProductHero**

Pass canonical `detail` from `ProductDetail` into `ProductHero`. Remove local quantity plus global PDP size selection. Instantiate the controller once and pass it to the purchase panel and mobile bar. Add to bag converts canonical kobo with `koboToNaira` and calls:

```ts
storefront.addToCart(product.id, cartSelection, selection.quantity);
```

Variant purchase remains disabled until `selectedVariantId` resolves. Buy now invokes the same truthful cart command and existing cart flow; do not invent direct checkout.

Update `ProductGallery` minimally to accept `media: readonly ProductImage[]`, derive its URLs from that prop, and pass those URLs to the provider's optional viewer-image argument. Task 7 owns the subsequent visual and Motion rewrite.

When canonical `media` is empty, keep using `product.images`; never replace a working legacy gallery with an empty frame.

- [ ] **Step 6: Rebuild selectors as accessible controlled inputs**

Colour buttons use circular 32px SVG swatches:

```tsx
<svg aria-hidden="true" className="size-8" viewBox="0 0 32 32">
  <circle cx="16" cy="16" r="15" fill={colour.hex ?? "currentColor"} />
</svg>
```

The button supplies the semantic border/focus/selected outline and an accessible name. Size buttons come only from `compatibleSizes`, disable unavailable combinations, and display selection from the controller.

- [ ] **Step 7: Drive price, stock, quantity, and mobile bar from selection**

Use `formatNaira(selection.displayPrice)`. Quantity maximum is `availableQuantity`. Both desktop and mobile actions share `available` and exact selected price.

Match the handoff purchase-panel hierarchy in the same pass: 46px/56px Newsreader title, 34px current price, 48px wishlist control, three-column assurance strip, controlled swatches and sizes, quantity/Add to bag row, secondary Buy now, and delivery/inventory surface. Keep the panel sticky at `lg` with a 100px offset. Make the mobile bar fixed below `lg`, safe-area aware, and driven by the same selection even while the desktop controls are still visible.

- [ ] **Step 8: Add stable variant observability hooks**

On the hero/PDP interaction root expose:

```tsx
data-selected-colour={selection.selectedColour ?? ""}
data-selected-size={selection.selectedSize ?? ""}
data-selected-variant-id={selection.selectedVariantId ?? ""}
```

- [ ] **Step 9: Run focused tests and Biome**

```text
node_modules/.bin/vitest.CMD run src/features/storefront/product/product-selection.test.ts src/features/storefront/product/product-detail-presentation.test.ts src/features/storefront/shared/cart-lines.test.ts
node_modules/.bin/biome.CMD check src/features/storefront/product/use-product-selection.ts src/features/storefront/product/product-detail-presentation.ts src/features/storefront/product/product-detail-presentation.test.ts src/features/storefront/product/product-detail.tsx src/features/storefront/product/product-hero.tsx src/features/storefront/product/product-gallery.tsx src/features/storefront/product/product-purchase-panel.tsx src/features/storefront/product/mobile-buy-bar.tsx
```

- [ ] **Step 10: Commit PDP selection integration**

```text
git add src/features/storefront/product/use-product-selection.ts src/features/storefront/product/product-detail-presentation.ts src/features/storefront/product/product-detail-presentation.test.ts src/features/storefront/product/product-detail.tsx src/features/storefront/product/product-hero.tsx src/features/storefront/product/product-gallery.tsx src/features/storefront/product/product-purchase-panel.tsx src/features/storefront/product/mobile-buy-bar.tsx
git commit -m "feat(storefront): make product options variant aware"
```

---

### Task 6: Finalize global typography and shared-card alignment

**Files:**
- Modify: `src/features/storefront/shared/storefront-fonts.ts`
- Create or modify: `src/features/storefront/shared/storefront-fonts.test.ts`
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`
- Modify: `src/features/storefront/account/components/account-primitives.tsx`
- Modify: `src/features/storefront/shared/product-card.tsx`
- Modify: `src/features/storefront/catalogue/product-card.tsx`

**Interfaces:**
- Produces application-wide Manrope/Newsreader roles.
- Produces the two-line/full-height/bottom-action card contract used by all grids.

- [ ] **Step 1: Keep the existing font contract test red/green evidence**

The test must require `Manrope` and `Newsreader` and reject `Geist`, `Geist_Mono`, and `Instrument_Serif` in the central loader.

- [ ] **Step 2: Verify the central loader and token alias**

The loader contains only:

```ts
import { Manrope, Newsreader } from "next/font/google";
```

`globals.css` maps `--font-storefront-mono` to `--font-storefront-sans`; root layout applies both variables. Remove stale source comments naming Geist.

- [ ] **Step 3: Verify shared-card height propagation**

Shared interactive card:

```text
article: flex h-full flex-col
information: flex flex-1 flex-col
title: line-clamp-2 min-h-[2.5em]
action group: mt-auto pt-[11px]
```

Canonical catalogue card:

```text
article: h-full
Card: grid h-full grid-rows-[1fr_auto]
CardContent: flex min-h-0 flex-col
title: line-clamp-2 with stable minimum height
```

- [ ] **Step 4: Run focused checks**

```text
node_modules/.bin/vitest.CMD run src/features/storefront/shared/storefront-fonts.test.ts
node_modules/.bin/biome.CMD check src/features/storefront/shared/storefront-fonts.ts src/features/storefront/shared/storefront-fonts.test.ts src/app/layout.tsx src/features/storefront/account/components/account-primitives.tsx src/features/storefront/shared/product-card.tsx src/features/storefront/catalogue/product-card.tsx
rg -n "Geist|Geist_Mono|Instrument_Serif|Instrument Serif" src
```

Expected: test passes; only intentional negative assertions may mention removed font names.

- [ ] **Step 5: Commit typography and card corrections**

```text
git add src/features/storefront/shared/storefront-fonts.ts src/features/storefront/shared/storefront-fonts.test.ts src/app/globals.css src/app/layout.tsx src/features/storefront/account/components/account-primitives.tsx src/features/storefront/shared/product-card.tsx src/features/storefront/catalogue/product-card.tsx
git commit -m "feat(theme): align storefront typography and product cards"
```

---

### Task 7: Match gallery geometry and Motion behavior

**Files:**
- Modify: `src/features/storefront/product/product-gallery.tsx`

**Interfaces:**
- Consumes: Task 5 controlled `media` and selected state.
- Produces: `data-current-image-index` and stable gallery section hooks.
- Exclusive owner: gallery agent only.

- [ ] **Step 1: Convert the gallery to controlled media**

Accept `media: readonly ProductImage[]` and reset the active index only when the current image ID disappears after a variant change. Continue using the existing shared image viewer with the resolved media/product adapter.

- [ ] **Step 2: Match responsive geometry**

Use mobile horizontal `80x96` thumbnails, `sm` vertical `84x116` thumbnails, a 520px mobile primary frame, and a 760px `sm` frame. Keep `next/image`, accurate `sizes`, `object-cover`, restrained radius, semantic warm fallback, overlays, caption, and 44px controls.

- [ ] **Step 3: Match gallery Motion**

Use `LazyMotion`, `domAnimation`, `AnimatePresence`, and `m`:

```ts
const handoffEase = [0.2, 0.75, 0.25, 1] as const;
const transition = {
  opacity: { duration: 0.55 },
  scale: { duration: 0.95, ease: handoffEase },
};
```

Inactive/outgoing imagery fades and scales toward `1.018`; active settles to opacity 1/scale 1. Hover reaches `1.018`. Reduced motion uses duration zero and no transform travel.

- [ ] **Step 4: Add accessible/test state**

Expose active thumbnail `aria-current`, gallery index data, descriptive labels, and only one interactive active image.

- [ ] **Step 5: Run static checks**

```text
node_modules/.bin/biome.CMD check src/features/storefront/product/product-gallery.tsx
git diff --check -- src/features/storefront/product/product-gallery.tsx
```

- [ ] **Step 6: Commit the gallery**

```text
git add src/features/storefront/product/product-gallery.tsx
git commit -m "feat(storefront): match product gallery handoff"
```

---

### Task 8: Match breadcrumb, trust, editorial, size-guide, and service sections

**Files:**
- Modify: `src/features/storefront/product/product-detail-sections.tsx`

**Interfaces:**
- Consumes canonical product/presentation only.
- Produces semantic section IDs/hooks for breadcrumb, trust, why, size guide, and service benefits.
- Exclusive owner: editorial/server-sections agent only.

- [ ] **Step 1: Apply the 1380px shell and handoff spacing**

Replace PDP-local `max-w-[1500px]` containers in this file with `max-w-[1380px]` and use `px-3 md:px-4` where the handoff shell applies.

- [ ] **Step 2: Match the trust and Why layouts**

Trust: two columns mobile, four from `sm`, handoff divider geometry, truthful copy.

Why: one column below `md`, `md:grid-cols-[0.92fr_1.08fr]`, image minimum 360px, matching editorial heading/benefit/metadata rhythm, canonical content only.

- [ ] **Step 3: Match the size guide**

Use a horizontally scrollable 620px-minimum table and `lg:grid-cols-[1.15fr_0.85fr]`. Display missing values as em dashes and retain a 360px image/fit panel.

- [ ] **Step 4: Match the service strip**

Two columns mobile, four from `md`, breakpoint-correct dividers, semantic surfaces, truthful service copy.

- [ ] **Step 5: Add stable section hooks**

Use `data-pdp-section="why"`, `data-pdp-section="size-guide"`, and `data-pdp-section="service-benefits"` without styling through selectors.

- [ ] **Step 6: Run Biome and commit**

```text
node_modules/.bin/biome.CMD check src/features/storefront/product/product-detail-sections.tsx
git diff --check -- src/features/storefront/product/product-detail-sections.tsx
git add src/features/storefront/product/product-detail-sections.tsx
git commit -m "feat(storefront): match product editorial sections"
```

---

### Task 9: Match product information and recommendation surfaces

**Files:**
- Modify: `src/features/storefront/product/product-information.tsx`
- Modify: `src/features/storefront/product/product-recommendations.tsx`

**Interfaces:**
- Consumes existing presentation and shared ProductCard.
- Produces stable `information`, `complete-look`, and `recommendations` hooks.
- Exclusive owner: information/recommendations agent only.

- [ ] **Step 1: Match tab geometry and semantics**

Keep all four tabs, 56px minimum height, horizontal overflow on narrow screens, active semantic underline, 260px content minimum, 24px mobile and 32px `sm` padding. Preserve keyboard tab semantics and size-guide navigation.

- [ ] **Step 2: Match each editorial tab body**

Use responsive two-column editorial groups for Details, Fabric & care, Size & fit, and Shipping & returns. Use only canonical fields and existing truthful delivery/returns language; omit unsupported facts rather than filling the handoff's copy.

- [ ] **Step 3: Lock Complete the look to the approved exception**

Keep `styledWith: matching.slice(0, 2)` and styled grid `grid-cols-2`. Preserve the handoff heading, link, border, surface, and padding around the existing ProductCard.

- [ ] **Step 4: Preserve final recommendation layout**

Use two columns mobile, three at `md`, and six at `lg`; preserve truthful empty state and shared ProductCard.

- [ ] **Step 5: Run focused tests/static checks and commit**

```text
node_modules/.bin/vitest.CMD run src/features/storefront/product/product-detail-presentation.test.ts
node_modules/.bin/biome.CMD check src/features/storefront/product/product-information.tsx src/features/storefront/product/product-recommendations.tsx
git add src/features/storefront/product/product-information.tsx src/features/storefront/product/product-recommendations.tsx
git commit -m "feat(storefront): match product information sections"
```

---

### Task 10: Match campaign layout, autoplay, and cinematic Motion

**Files:**
- Modify: `src/features/storefront/product/product-campaign.tsx`

**Interfaces:**
- Consumes existing campaign frames.
- Produces `data-current-campaign-index` and `data-pdp-section="campaign"`.
- Exclusive owner: campaign agent only.

- [ ] **Step 1: Match campaign geometry**

Keep `aspect-[4/5] sm:aspect-[4/3] lg:aspect-[16/9]`. Move previous/next controls to the handoff top-right position, keep dots bottom-right, keep editorial copy bottom-left, and match caption controls below the stage.

- [ ] **Step 2: Implement exact slide transitions**

```ts
const handoffEase = [0.2, 0.75, 0.25, 1] as const;
const cinematicEase = [0.15, 0.6, 0.2, 1] as const;
```

Slide opacity is 0.9s; scale is 1.2s from `1.025` to 1. Active image scales `1.025` to `1.09` over 8s. Outgoing slide becomes noninteractive and `aria-hidden` immediately.

- [ ] **Step 3: Match autoplay state transitions**

Advance every 6200ms. Pause only while the stage is hovered. Mouse leave and every manual previous/next/dot/caption selection start a fresh interval. Continue pausing while the document is hidden.

- [ ] **Step 4: Implement reduced motion**

No autoplay, no transform travel, immediate stable slide state.

- [ ] **Step 5: Keep accessible synchronous state**

Update `aria-current`, `aria-pressed`, active caption surface, current frame index, and pointer state with the selected slide.

- [ ] **Step 6: Run checks and commit**

```text
node_modules/.bin/biome.CMD check src/features/storefront/product/product-campaign.tsx
git diff --check -- src/features/storefront/product/product-campaign.tsx
git add src/features/storefront/product/product-campaign.tsx
git commit -m "feat(storefront): match campaign motion and controls"
```

---

### Task 11: Match the full truthful reviews layout

**Files:**
- Modify: `src/features/storefront/product/product-reviews.tsx`

**Interfaces:**
- Consumes truthful `ReviewSummary` only.
- Produces `data-pdp-section="reviews"` and a clearly unavailable Write a review action.
- Exclusive owner: reviews agent only.

- [ ] **Step 1: Match aggregate header geometry**

Use the handoff inverse header, single column below `lg`, `lg:grid-cols-[1fr_auto]`, Newsreader heading, aggregate score/star/count hierarchy, and aligned review action.

- [ ] **Step 2: Match body geometry**

One column below `lg`; `lg:grid-cols-[0.72fr_1.28fr]`. Preserve rating breakdown, divider changes, and content surface.

- [ ] **Step 3: Preserve truthful states**

- Zero reviews: zero distribution plus purposeful full-layout empty state.
- Aggregate-only: state that individual reviews are unavailable.
- Do not show filters, sort, or load-more without real individual review records.
- Write a review opens no fake form; its visible message says submission is unavailable.

- [ ] **Step 4: Run presentation tests and Biome**

```text
node_modules/.bin/vitest.CMD run src/features/storefront/product/product-detail-presentation.test.ts
node_modules/.bin/biome.CMD check src/features/storefront/product/product-reviews.tsx
```

- [ ] **Step 5: Commit reviews**

```text
git add src/features/storefront/product/product-reviews.tsx
git commit -m "feat(storefront): match truthful product reviews layout"
```

---

### Task 12: Integrate shell geometry and PDP-specific section reveals

**Files:**
- Create: `src/features/storefront/product/product-motion.ts`
- Create: `src/features/storefront/product/product-reveal.tsx`
- Modify: `src/features/storefront/product/product-detail.tsx`
- Modify: `src/features/storefront/product/product-hero.tsx`

**Interfaces:**
- Consumes all accepted section components from Tasks 5-11.
- Produces the final section order, 1380px shell, readiness hook, and reusable PDP reveal contract.
- Exclusive owner: root integration agent only.

- [ ] **Step 1: Define shared Motion constants**

```ts
export const PDP_EASE = [0.2, 0.75, 0.25, 1] as const;
export const PDP_CINEMATIC_EASE = [0.15, 0.6, 0.2, 1] as const;
export const PDP_REVEAL_VIEWPORT = { once: true, amount: 0.12 } as const;
```

- [ ] **Step 2: Implement a focused reveal wrapper**

`ProductReveal` uses `LazyMotion`, `domAnimation`, `m`, and `useReducedMotion`:

```tsx
initial={reduceMotion ? false : { opacity: 0, y: 22 }}
whileInView={{ opacity: 1, y: 0 }}
viewport={PDP_REVEAL_VIEWPORT}
transition={
  reduceMotion
    ? { duration: 0 }
    : { opacity: { duration: 0.75 }, y: { duration: 0.95, ease: PDP_EASE } }
}
```

- [ ] **Step 3: Apply final section order and reveal coverage**

Order remains:

1. breadcrumb;
2. hero/gallery/purchase;
3. information plus Complete the look;
4. campaign;
5. size guide;
6. reviews;
7. service strip;
8. final recommendations.

Wrap Why, information/recommendations, campaign, size guide, reviews, service strip, and final recommendations without moving the page into a single client component.

- [ ] **Step 4: Add final stable root hooks**

```tsx
<main
  id="main"
  data-testid="pdp-root"
  data-pdp-ready="true"
  className={`${fontClassName} lst-catalogue`}
>
```

Add `data-pdp-section="hero"` to the hero boundary and verify every remaining section hook from the spec exists once.

- [ ] **Step 5: Run changed-scope checks and commit**

```text
node_modules/.bin/biome.CMD check src/features/storefront/product/product-motion.ts src/features/storefront/product/product-reveal.tsx src/features/storefront/product/product-detail.tsx src/features/storefront/product/product-hero.tsx
node_modules/.bin/vitest.CMD run src/features/storefront/product/product-selection.test.ts src/features/storefront/product/product-detail-presentation.test.ts
git add src/features/storefront/product/product-motion.ts src/features/storefront/product/product-reveal.tsx src/features/storefront/product/product-detail.tsx src/features/storefront/product/product-hero.tsx
git commit -m "feat(storefront): integrate product detail handoff sections"
```

---

### Task 13: Build deterministic production/reference Playwright infrastructure

**Files:**
- Create: `playwright.pdp.config.ts`
- Create: `scripts/checks/serve-product-detail-handoff.mjs`
- Create: `scripts/checks/record-product-detail-handoff.mjs`
- Create: `tests/e2e/fixtures/product-detail-approved-deviations.json`
- Replace: `tests/e2e/storefront-product-detail-parity.spec.ts`

**Interfaces:**
- Produces fixed app URL `http://127.0.0.1:4604` and reference URL `http://127.0.0.1:4605`.
- Consumes `HANDOFF_HTML_PATH`, `PLAYWRIGHT_PRODUCT_PATH`, and a recorded reference HAR under ignored `test-results/pdp-reference/reference.har`.

- [ ] **Step 1: Create the explicit approved-deviation manifest**

Include exactly:

```json
[
  "DEV-SHARED-CHROME",
  "DEV-PRODUCT-DATA",
  "DEV-THEME-TOKENS",
  "DEV-COMPLETE-LOOK-CARDS",
  "DEV-RECOMMENDATION-CARDS",
  "DEV-REVIEWS",
  "DEV-REVIEW-SUBMISSION",
  "DEV-CAMPAIGN-ASPECT",
  "DEV-UNSUPPORTED-COPY"
]
```

- [ ] **Step 2: Create the local reference server**

The Node script reads `HANDOFF_HTML_PATH`, serves it as UTF-8 HTML at `/`, exposes `/health`, rejects path traversal, and binds only to `127.0.0.1:4605`. It must not rewrite the source HTML.

```js
import { createServer } from "node:http";
import { readFileSync } from "node:fs";

const handoffPath = process.env.HANDOFF_HTML_PATH;
if (!handoffPath) throw new Error("HANDOFF_HTML_PATH is required");
const html = readFileSync(handoffPath);
const server = createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    response.end("ok");
    return;
  }
  if (request.url !== "/") {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("not found");
    return;
  }
  response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  response.end(html);
});
server.listen(4605, "127.0.0.1");
const close = () => server.close(() => process.exit(0));
process.on("SIGINT", close);
process.on("SIGTERM", close);
```

- [ ] **Step 3: Create the HAR recorder**

Launch Chromium with `recordHar`, open the local reference URL, scroll through the page, wait section-by-section for images/fonts, close the context, and write:

- `test-results/pdp-reference/reference.har`;
- `test-results/pdp-reference/source.sha256`;
- `test-results/pdp-reference/asset-manifest.json`.

Fail when Tailwind, Lucide, Manrope, Newsreader, or any required reference image is unavailable.

Core recorder lifecycle:

```js
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const outputDir = "test-results/pdp-reference";
const harPath = `${outputDir}/reference.har`;
const handoffPath = process.env.HANDOFF_HTML_PATH;
if (!handoffPath) throw new Error("HANDOFF_HTML_PATH is required");
mkdirSync(outputDir, { recursive: true });

const failures = [];
const browser = await chromium.launch();
const context = await browser.newContext({
  recordHar: {
    path: harPath,
    content: "embed",
    urlFilter: /^https?:\/\/(?!127\.0\.0\.1:4605)/,
  },
});
const page = await context.newPage();
page.on("requestfailed", (request) => failures.push(`${request.url()} ${request.failure()?.errorText}`));
await page.goto("http://127.0.0.1:4605/", { waitUntil: "domcontentloaded" });
for (const locator of ["#productMedia", "#fashionShowcase", "#sizeGuide", "#reviewsSection", "footer"]) {
  await page.locator(locator).scrollIntoViewIfNeeded();
}
await page.evaluate(async () => {
  await document.fonts.ready;
});
const assets = await page.evaluate(() => ({
  fonts: [...document.fonts].map((face) => ({ family: face.family, status: face.status })),
  images: [...document.images].map((image) => ({ src: image.currentSrc || image.src, width: image.naturalWidth })),
}));
if (!assets.fonts.some((face) => /Manrope/.test(face.family) && face.status === "loaded")) failures.push("Manrope did not load");
if (!assets.fonts.some((face) => /Newsreader/.test(face.family) && face.status === "loaded")) failures.push("Newsreader did not load");
for (const image of assets.images) if (image.width === 0) failures.push(`Image did not load: ${image.src}`);
await context.close();
await browser.close();
if (failures.length > 0) throw new Error(failures.join("\n"));

const source = readFileSync(handoffPath);
writeFileSync(`${outputDir}/source.sha256`, createHash("sha256").update(source).digest("hex"));
writeFileSync(`${outputDir}/asset-manifest.json`, JSON.stringify(assets, null, 2));
```

- [ ] **Step 4: Create the dedicated Playwright config**

Use one worker, `fullyParallel: false`, 120-second tests, 15-second assertions, fixed locale `en-NG`, timezone `Africa/Lagos`, light colour scheme, and the three exact viewport projects. Configure `webServer` entries for production `next start` and the reference server with `reuseExistingServer: false`.

Do not use Next dev, Portless, HMR, or `page.setContent()`.

Use this config structure:

```ts
import { defineConfig, devices } from "playwright/test";

const handoffPath = process.env.HANDOFF_HTML_PATH;
if (!handoffPath) throw new Error("HANDOFF_HTML_PATH is required");

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /storefront-product-detail-(parity|variant|motion)\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  outputDir: "test-results/pdp-parity",
  use: {
    baseURL: "http://127.0.0.1:4604",
    colorScheme: "light",
    locale: "en-NG",
    timezoneId: "Africa/Lagos",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  webServer: [
    {
      command: "node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 4604",
      url: "http://127.0.0.1:4604/products/patterned-office-shirt-capsule",
      reuseExistingServer: false,
      timeout: 180_000,
    },
    {
      command: "node scripts/checks/serve-product-detail-handoff.mjs",
      url: "http://127.0.0.1:4605/health",
      env: { HANDOFF_HTML_PATH: handoffPath },
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
  projects: [
    { name: "mobile-chromium", use: { ...devices["iPhone 13"], browserName: "chromium", viewport: { width: 375, height: 812 } } },
    { name: "tablet-chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 768, height: 1024 } } },
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
  ],
});
```

- [ ] **Step 5: Replace the prototype parity spec with shared helpers**

Use direct default path `/products/patterned-office-shirt-capsule`, overridable via `PLAYWRIGHT_PRODUCT_PATH`. Attach runtime listeners before the single navigation. Wait for PDP readiness, then only wait for images inside the section being tested.

Provide helpers for paired screenshot attachment, computed geometry/style JSON, font-face assertions, no overflow, and strict console/network errors.

For the reference page, install the recorded HAR before navigation:

```ts
await referenceContext.routeFromHAR(referenceHarPath, {
  notFound: "abort",
  update: false,
  url: /^https?:\/\/(?!127\.0\.0\.1:4605)/,
});
```

The localhost reference document itself remains served by the fixed reference server; external CSS, script, font, and image requests must resolve from the HAR.

- [ ] **Step 6: Type-check the harness**

```text
$env:HANDOFF_HTML_PATH = 'C:\Users\olaitan\OneDrive\Documents\Downloads\laitstyles-product-detail-hifi.html'
node_modules/.bin/tsc.CMD --noEmit --strict --target ES2022 --module NodeNext --moduleResolution NodeNext --lib ES2022,DOM,DOM.Iterable --types node --skipLibCheck tests/e2e/storefront-product-detail-parity.spec.ts
node_modules/.bin/playwright.CMD test --config=playwright.pdp.config.ts --list
```

Expected: three viewport projects list successfully; no TypeScript errors.

If Playwright reports a missing browser executable, run this exact prerequisite and repeat the listing:

```text
node_modules/.bin/playwright.CMD install chromium-headless-shell
```

- [ ] **Step 7: Commit deterministic infrastructure**

```text
git add playwright.pdp.config.ts scripts/checks/serve-product-detail-handoff.mjs scripts/checks/record-product-detail-handoff.mjs tests/e2e/fixtures/product-detail-approved-deviations.json tests/e2e/storefront-product-detail-parity.spec.ts
git commit -m "test(storefront): add deterministic product parity harness"
```

Do not commit HAR/image evidence unless repository policy explicitly approves its size and licensing.

---

### Task 14: Add section, variant, and Motion acceptance coverage

**Files:**
- Modify: `tests/e2e/storefront-product-detail-parity.spec.ts`
- Create: `tests/e2e/storefront-product-detail-variant.spec.ts`
- Create: `tests/e2e/storefront-product-detail-motion.spec.ts`

**Interfaces:**
- Consumes Task 13 harness and final PDP hooks.
- Produces paired screenshots, geometry/style JSON, interaction traces, and motion video.

- [ ] **Step 1: Add reduced-motion section parity cases**

At all three viewports capture reference and implementation for full page, breadcrumb, hero/gallery, trust, Why, purchase panel, all four tabs, Complete the look, campaign, size guide, reviews, service strip, final recommendations, and mobile bar.

Use `testInfo.outputPath()` with `parity/${section}/${state}/reference.png` and `parity/${section}/${state}/implementation.png`; attach every image and its geometry/style JSON to the Playwright report.

Assert shell/gaps within 2px, dimensions within 4px or 1%, fonts within 1px, campaign ratio within 2%, two styled grid tracks, card buttons within 2px, loaded fonts/images, and no overflow.

- [ ] **Step 2: Add canonical variant interaction cases**

Test alternate colour selection, compatible sizes, incompatible size clearing, exact `data-selected-variant-id`, variant price/stock/quantity, linked-media change only when present, sold-out disabling, distinct cart lines, exact colour/size/unit price, and keyboard order.

- [ ] **Step 3: Add normal-motion cases with controlled time**

Use Playwright Clock and normal motion. Assert gallery opacity/transform at initial, intermediate, and final checkpoints; reveal threshold and settled state; campaign 900ms opacity, 1200ms transform, 8000ms image scale, 6200ms autoplay, hover pause, manual restart, accessibility/pointer state, and reduced-motion immediate settlement.

- [ ] **Step 4: Record reference assets and build production app**

Run the reference server as a hidden bounded helper, record assets, and stop only that helper:

```powershell
$env:HANDOFF_HTML_PATH = 'C:\Users\olaitan\OneDrive\Documents\Downloads\laitstyles-product-detail-hifi.html'
$referenceProcess = Start-Process -FilePath 'node.exe' -ArgumentList @('scripts/checks/serve-product-detail-handoff.mjs') -WorkingDirectory 'C:\Users\olaitan\Dev\laitstyles' -WindowStyle Hidden -PassThru
try {
  node scripts/checks/record-product-detail-handoff.mjs
} finally {
  Stop-Process -Id $referenceProcess.Id -ErrorAction SilentlyContinue
}
node_modules/.bin/next.CMD build
```

If build is blocked by the pre-existing user-owned parse error in `src/lib/assets/public.ts`, stop and request authority; do not edit that unrelated file silently.

- [ ] **Step 5: Run all parity projects**

```text
$env:HANDOFF_HTML_PATH = 'C:\Users\olaitan\OneDrive\Documents\Downloads\laitstyles-product-detail-hifi.html'
node_modules/.bin/playwright.CMD test --config=playwright.pdp.config.ts
```

Expected: layout, variant, motion, runtime, network, asset, font, and screenshot cases pass at 375x812, 768x1024, and 1280x800.

- [ ] **Step 6: Commit acceptance coverage**

```text
git add tests/e2e/storefront-product-detail-parity.spec.ts tests/e2e/storefront-product-detail-variant.spec.ts tests/e2e/storefront-product-detail-motion.spec.ts
git commit -m "test(storefront): cover product detail visual and motion parity"
```

---

### Task 15: Review evidence, correct parity gaps, and run completion gates

**Files:**
- Modify only evidence-identified PDP files.
- Review all scoped commits from Tasks 1-14.
- Preserve all unrelated dirty files.

- [ ] **Step 1: Review paired screenshots at original resolution**

For 375x812, 768x1024, and 1280x800, compare every paired full-page and focused section image. Review container width, rhythm, typography, wrapping, imagery, controls, borders, radii, sticky behavior, tabs, empty states, and responsive transitions.

- [ ] **Step 2: Review variant and Motion evidence**

Inspect traces/video for colour-to-size behavior, exact cart lines, gallery transitions, section reveals, campaign progression, pause/restart, and reduced motion.

- [ ] **Step 3: Classify differences**

Only differences mapped to the approved deviation manifest are intentional. Any other material difference blocks completion.

- [ ] **Step 4: Correct unintentional differences in the smallest owning file**

Use semantic tokens/Tailwind only. Re-run the affected focused test after each correction, then re-run the full three-project suite.

- [ ] **Step 5: Run focused quality checks**

```text
node_modules/.bin/biome.CMD check src/features/storefront/product src/features/storefront/shared/cart-lines.ts src/features/storefront/shared/cart-lines.test.ts src/features/storefront/shared/product-card.tsx src/features/storefront/catalogue/product-card.tsx src/features/storefront/shared/storefront-fonts.ts src/features/storefront/shared/storefront-fonts.test.ts src/lib/storefront/types.ts src/lib/storefront/catalog-data.ts src/lib/storefront/catalog-data.test.ts src/server/commerce/catalogue/mappers.ts src/server/commerce/catalogue/mappers.test.ts tests/e2e
node_modules/.bin/vitest.CMD run src/features/storefront/product/product-detail-presentation.test.ts src/features/storefront/product/product-selection.test.ts src/features/storefront/shared/cart-lines.test.ts src/features/storefront/shared/storefront-fonts.test.ts src/lib/storefront/catalog-data.test.ts src/server/commerce/catalogue/mappers.test.ts
```

If Biome ignores `tests/e2e`, report that fact and rely on the isolated TypeScript compile plus Playwright parsing for those files.

Fetch the latest Web Interface Guidelines through the `web-design-guidelines` workflow and review every changed PDP UI file. Record each applicable pass/failure and resolve changed-scope failures before continuing.

- [ ] **Step 6: Run repository completion checks**

```text
pnpm lint
pnpm exec tsc --noEmit --pretty false --incremental false
pnpm exec vitest run --passWithNoTests
pnpm build
pnpm dlx react-doctor@latest . --verbose --diff
```

If pnpm's local-store database still prevents command resolution, repeat through direct local executables. Attribute pre-existing unrelated failures to their exact files; do not change them without authorization.

- [ ] **Step 7: Run the final deterministic Playwright suite**

```text
node_modules/.bin/playwright.CMD test --config=playwright.pdp.config.ts
```

Expected: all required viewport, section, variant, motion, reduced-motion, console, network, font, and image checks pass.

- [ ] **Step 8: Inspect scope and repository state**

```text
git diff --check
git status --short
git log --oneline --decorate -20
```

Confirm no shared-chrome visual changes, raw theme colours, inline presentation styles, fabricated data, or unrelated dirty files entered commits.

- [ ] **Step 9: Commit final evidence-driven corrections when the review changed files**

Review `git diff --name-only`, then stage only the following scoped paths that contain evidence-driven corrections:

```text
git add src/features/storefront/product src/features/storefront/shared/cart-lines.ts src/features/storefront/shared/cart-lines.test.ts src/features/storefront/shared/product-card.tsx src/features/storefront/catalogue/product-card.tsx src/lib/storefront/types.ts src/lib/storefront/catalog-data.ts src/server/commerce/catalogue/mappers.ts tests/e2e/storefront-product-detail-parity.spec.ts tests/e2e/storefront-product-detail-variant.spec.ts tests/e2e/storefront-product-detail-motion.spec.ts
git commit -m "fix(storefront): close product detail parity gaps"
```

Skip this commit when no corrections remain.

- [ ] **Step 10: Report completion precisely**

Include:

- scoped commits and files;
- unit/static/build/React Doctor results;
- Playwright project counts and results;
- screenshot, geometry, trace, and video paths;
- colour/variant/cart behavior proven;
- intentional deviation IDs;
- unresolved unrelated blockers;
- an exact-match statement only when reviewed evidence supports it.
