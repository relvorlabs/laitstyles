# Product Detail Handoff Replacement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completely replace the storefront product-detail presentation with the approved high-fidelity handoff while preserving existing routing, catalogue, cart, wishlist, hold, image-viewer, and shared-card behavior.

**Architecture:** Add one server-side page bundle that exposes the legacy commerce `Product` together with its canonical `ProductDetail`, then map those sources into a typed presentation model. Compose the handoff from focused feature-local React components; keep the route server-rendered and isolate gallery, selection, campaign, tab, review, and sticky-CTA interaction inside client boundaries.

**Tech Stack:** Next.js 16.2 App Router, React 19.2, TypeScript 5, Tailwind CSS 4, Base UI-backed shadcn primitives, HugeIcons, Motion 12, Vitest 4, next/image.

## Global Constraints

- The attached `laitstyles-product-detail-hifi.html` is authoritative for section order, proportions, hierarchy, responsive behavior, and interaction presentation.
- Existing `SiteChrome` owns the announcement bar, header, navigation, search, account, cart shell, and footer; do not duplicate those elements.
- `Styled with` and `You may also like` must render the existing `src/features/storefront/shared/product-card.tsx` without forking or duplicating its JSX.
- Render exactly one ratings-and-reviews section; use real aggregates or a truthful empty state, and report review submission as unavailable.
- Use existing semantic theme tokens and Tailwind utilities only. Do not add hardcoded colours, page-local style blocks, CSS modules, raw product-detail CSS selectors, or inline presentation styles.
- Use the existing HugeIcons dependency or HugeIcons-based storefront wrappers; do not add Lucide icons or CDN assets.
- Purchasable prices, discounts, stock, colours, sizes, variants, and measurements must come from catalogue data; descriptive fallbacks may be deterministic but cannot claim unsupported facts or persistence.
- Preserve async `params`, metadata, JSON-LD, `notFound()`, Suspense, static params, cart, wishlist, hold, and shared overlay behavior.
- Do not modify `src/features/storefront/shared/product-card.tsx`, global theme tokens, Prisma, Supabase, APIs, or unrelated files.

---

### Task 1: Expose a server-safe product page bundle

**Files:**
- Modify: `src/lib/storefront/catalog-data.ts`
- Modify: `src/app/products/[slug]/page.tsx`

**Interfaces:**
- Consumes: existing `getBuiltCatalog()`, legacy `Product`, and canonical `ProductDetail`.
- Produces: `StorefrontProductPageData` and `loadStorefrontProductPageBySlug(slug: string): Promise<StorefrontProductPageData | null>`.

- [ ] **Step 1: Add the page-bundle type and loader**

Add beside the existing public loader exports in `catalog-data.ts`:

```ts
export interface StorefrontProductPageData {
  product: Product;
  detail: ProductDetail;
}

export async function loadStorefrontProductPageBySlug(
  slug: string,
): Promise<StorefrontProductPageData | null> {
  const catalog = await getBuiltCatalog();
  const product = catalog.storefront.products.find((candidate) => candidate.slug === slug);
  const detail = catalog.productDetails.find((candidate) => candidate.slug === slug);
  return product && detail ? { product, detail } : null;
}
```

Import the canonical type with the existing storefront type imports:

```ts
import type { ProductDetail } from "@/lib/storefront/types";
```

- [ ] **Step 2: Update the route content loader**

Replace the content read in `page.tsx` with the bundle loader while leaving metadata and structured-data behavior intact:

```tsx
async function ProductDetailContent({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const pageData = await loadStorefrontProductPageBySlug(slug);
  if (!pageData) notFound();

  const { product, detail } = pageData;
  // Existing Product and Breadcrumb JSON-LD remain here.
  return (
    <>
      {/* Existing escaped JSON-LD scripts remain unchanged. */}
      <ProductDetail
        detail={detail}
        fontClassName={storefrontFontClassName}
        product={product}
      />
    </>
  );
}
```

- [ ] **Step 3: Run focused type validation**

Run: `pnpm exec tsc --noEmit --pretty false --incremental false`

Expected: exit code `0`; no server/client serialization or import errors.

- [ ] **Step 4: Commit the server bundle**

```text
git add src/lib/storefront/catalog-data.ts src/app/products/[slug]/page.tsx
git commit -m "refactor(storefront): expose product page detail bundle"
```

---

### Task 2: Build and test the typed presentation adapter

**Files:**
- Create: `src/features/storefront/product/product-detail-presentation.ts`
- Create: `src/features/storefront/product/product-detail-presentation.test.ts`

**Interfaces:**
- Consumes: `Product` and canonical `ProductDetail`.
- Produces: `ProductDetailPresentation` and `buildProductDetailPresentation(product, detail)`.

- [ ] **Step 1: Write failing adapter tests**

Create table-driven tests covering real values, missing measurements, zero reviews, single-colour products, available/unavailable variants, discount calculation, and campaign-frame reuse:

```ts
import { describe, expect, it } from "vitest";
import type { Product } from "@/features/storefront/shared/catalogue-data";
import type { ProductDetail } from "@/lib/storefront/types";
import { buildProductDetailPresentation } from "./product-detail-presentation";

const product = {
  id: "shirt-1",
  databaseId: "shirt-1",
  slug: "linen-shirt",
  name: "Linen Shirt",
  brand: "Laitstyles",
  brandStatus: "Branded",
  category: "Resort",
  type: "Shirts",
  style: "Relaxed",
  price: 30000,
  referencePrice: 40000,
  condition: "A+",
  size: "M",
  fit: "Relaxed",
  colour: "Sand",
  inventory: "variant",
  stock: 2,
  status: "available",
  new: true,
  saved: 0,
  flaw: "None",
  material: "Linen",
  careInstructions: "Cold wash",
  images: ["/shirt-1.jpg"],
  variants: ["S", "M"],
} satisfies Product;

const detail = {
  id: "shirt-1",
  slug: "linen-shirt",
  name: "Linen Shirt",
  brand: "Laitstyles",
  price: 3_000_000,
  referencePrice: 4_000_000,
  archiveNumber: null,
  condition: "Excellent",
  material: "Linen",
  fit: "Relaxed",
  style: "Relaxed",
  category: { id: "shirts", slug: "shirts", name: "Shirts" },
  collection: { id: "resort", slug: "resort", name: "Resort" },
  cover: null,
  description: "Breathable and relaxed.",
  media: [],
  measurements: [],
  reviewSummary: {
    average: 0,
    count: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  },
  careInstructions: "Cold wash",
  flawNotes: null,
  mode: "variant",
  variants: [
    {
      id: "s",
      label: "Small",
      sku: null,
      size: "S",
      colour: "Sand",
      price: null,
      availability: { state: "available", available: 1, isOneOfOne: false },
    },
    {
      id: "m",
      label: "Medium",
      sku: null,
      size: "M",
      colour: "Sand",
      price: null,
      availability: { state: "sold_out", available: 0, isOneOfOne: false },
    },
  ],
  availability: { state: "low", available: 1, isOneOfOne: false },
} satisfies ProductDetail;

describe("buildProductDetailPresentation", () => {
  it("uses real commerce and canonical detail values without inventing facts", () => {
    const result = buildProductDetailPresentation(product, detail);
    expect(result.description).toBe("Breathable and relaxed.");
    expect(result.discountPercent).toBe(25);
    expect(result.colours).toEqual(["Sand"]);
    expect(result.sizes).toEqual([
      { label: "S", value: "S", available: true },
      { label: "M", value: "M", available: false },
    ]);
    expect(result.measurements).toEqual([]);
    expect(result.reviewSummary.count).toBe(0);
    expect(result.campaignFrames).toHaveLength(3);
    expect(result.campaignFrames.every((frame) => frame.image === "/shirt-1.jpg")).toBe(true);
  });
});
```

- [ ] **Step 2: Run the adapter test and verify failure**

Run: `pnpm exec vitest run src/features/storefront/product/product-detail-presentation.test.ts`

Expected: FAIL because `product-detail-presentation.ts` does not exist.

- [ ] **Step 3: Implement the presentation model**

Create explicit serializable interfaces and deterministic mapping helpers:

```ts
import type { Product } from "@/features/storefront/shared/catalogue-data";
import type { ProductDetail, ReviewSummary } from "@/lib/storefront/types";

export interface ProductOptionPresentation {
  label: string;
  value: string;
  available: boolean;
}

export interface CampaignFramePresentation {
  id: string;
  eyebrow: string;
  headline: string;
  caption: string;
  image: string;
}

export interface ProductDetailPresentation {
  description: string;
  discountPercent: number | null;
  colours: readonly string[];
  sizes: readonly ProductOptionPresentation[];
  measurements: ProductDetail["measurements"];
  reviewSummary: ReviewSummary;
  campaignFrames: readonly CampaignFramePresentation[];
}

const unique = <Value,>(values: readonly Value[]) => [...new Set(values)];

export function buildProductDetailPresentation(
  product: Product,
  detail: ProductDetail,
): ProductDetailPresentation {
  const variants = detail.mode === "variant" ? detail.variants : [];
  const images = product.images.length ? product.images : [""];
  const discountPercent =
    product.referencePrice && product.referencePrice > product.price
      ? Math.round((1 - product.price / product.referencePrice) * 100)
      : null;
  const sizes = detail.mode === "variant"
    ? variants.map((variant) => ({
        label: variant.size ?? variant.label,
        value: variant.size ?? variant.label,
        available: variant.availability.available > 0,
      }))
    : [{ label: product.size || "One size", value: product.size || "One size", available: product.status === "available" }];
  const colours = unique(
    (detail.mode === "variant" ? variants.map((variant) => variant.colour) : [detail.colour])
      .filter((colour): colour is string => Boolean(colour)),
  );
  const frameHeadlines = [
    `${product.fit} form, without compromise.`,
    `${product.material} with presence.`,
    `Designed for considered movement.`,
  ];

  return {
    description:
      detail.description.trim() ||
      `${product.material} in a ${product.style.toLowerCase()} silhouette with a ${product.fit.toLowerCase()} fit.`,
    discountPercent,
    colours: colours.length ? colours : [product.colour || "Not specified"],
    sizes,
    measurements: [...detail.measurements].sort((left, right) => left.position - right.position),
    reviewSummary: detail.reviewSummary,
    campaignFrames: frameHeadlines.map((headline, index) => ({
      id: `frame-${index + 1}`,
      eyebrow: `Frame ${String(index + 1).padStart(2, "0")}`,
      headline,
      caption: ["Silhouette study", "Material study", "Movement study"][index],
      image: images[index % images.length],
    })),
  };
}
```

- [ ] **Step 4: Run the adapter tests**

Run: `pnpm exec vitest run src/features/storefront/product/product-detail-presentation.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the adapter**

```text
git add src/features/storefront/product/product-detail-presentation.ts src/features/storefront/product/product-detail-presentation.test.ts
git commit -m "feat(storefront): add product detail presentation model"
```

---

### Task 3: Replace the gallery and purchase hero

**Files:**
- Modify: `src/features/storefront/product/product-gallery.tsx`
- Modify: `src/features/storefront/product/product-purchase-panel.tsx`
- Modify: `src/features/storefront/product/mobile-buy-bar.tsx`

**Interfaces:**
- Consumes: `Product`, `ProductDetailPresentation`, existing `useStorefront()`, and the shared image viewer.
- Produces: handoff-faithful `ProductGallery`, `ProductPurchasePanel`, and `MobileBuyBar` components.

- [ ] **Step 1: Replace the gallery geometry and behavior**

Implement the `84px / media` desktop rail, horizontal mobile rail, token-backed cinematic stage, current-frame metadata, and existing image viewer. Use `AnimatePresence`, `motion`, `useReducedMotion`, `Image`, and `Button`; omit previous/next controls when `images.length === 1`. Use only semantic classes such as `bg-surface-sunken`, `text-surface-inverse-foreground`, `border-border`, `shadow-storefront-2`, and token-backed gradients.

The public signature remains:

```ts
export function ProductGallery({ product }: { product: Product }): React.JSX.Element;
```

The enlarge action remains:

```ts
storefront.openImageViewerFor(product.id, index);
```

- [ ] **Step 2: Replace the purchase panel**

Change the signature to accept the presentation model and quantity contract:

```ts
export interface ProductPurchasePanelProps {
  product: Product;
  presentation: ProductDetailPresentation;
  anchorRef: RefObject<HTMLDivElement | null>;
  canAdd: boolean;
  quantity: number;
  onQuantityChange: (nextQuantity: number) => void;
  onAdd: () => void;
  onBuyNow: () => void;
}
```

Implement the handoff order: identity, wishlist, real review anchor, price/reference price/discount, assurances, colour choices, size choices, quantity, add-to-bag, buy-now, and delivery/availability card. Size selection calls `storefront.setSelectedVariant(value)` and clears `quickError`; colour controls are truthful display/selection controls and never alter unsupported cart data. Quantity decrement/increment clamps to `1..Math.max(1, product.stock)` and stays at one for one-of-one products.

- [ ] **Step 3: Match the mobile sticky action**

Keep the existing intersection-driven `visible` prop and change the copy/geometry to the handoff. Render name, real price, selected quantity when greater than one, and the shared `onAdd` callback. Preserve safe-area padding and reduced-motion behavior.

- [ ] **Step 4: Run component-level static checks**

Run:

```text
pnpm exec biome check src/features/storefront/product/product-gallery.tsx src/features/storefront/product/product-purchase-panel.tsx src/features/storefront/product/mobile-buy-bar.tsx
pnpm exec tsc --noEmit --pretty false --incremental false
```

Expected: both commands exit `0`.

- [ ] **Step 5: Commit the hero replacement**

```text
git add src/features/storefront/product/product-gallery.tsx src/features/storefront/product/product-purchase-panel.tsx src/features/storefront/product/mobile-buy-bar.tsx
git commit -m "feat(storefront): rebuild product detail hero"
```

---

### Task 4: Add handoff editorial, tab, and recommendation sections

**Files:**
- Create: `src/features/storefront/product/product-detail-sections.tsx`
- Create: `src/features/storefront/product/product-recommendations.tsx`

**Interfaces:**
- Consumes: `Product`, `ProductDetailPresentation`, current storefront catalogue/actions, and shared `ProductCard`.
- Produces: `ProductBreadcrumb`, `ProductTrustStrip`, `ProductWhySection`, `ProductInformation`, `ServiceStrip`, and `ProductRecommendations`.

- [ ] **Step 1: Implement the static editorial sections**

Create data-driven trust and service arrays whose icons are HugeIcons and whose text follows current storefront policy. Export:

```ts
export function ProductBreadcrumb({ product }: { product: Product }): React.JSX.Element;
export function ProductTrustStrip({ product }: { product: Product }): React.JSX.Element;
export function ProductWhySection({ product }: { product: Product }): React.JSX.Element;
export function ServiceStrip(): React.JSX.Element;
```

`ProductBreadcrumb` renders Home, catalogue, category/type, and the current product with semantic navigation and links to `/` and `/products`. Use bordered two-column/four-column grids matching the handoff and semantic token classes only.

- [ ] **Step 2: Implement accessible product-information tabs**

Export:

```ts
export function ProductInformation({
  product,
  presentation,
}: {
  product: Product;
  presentation: ProductDetailPresentation;
}): React.JSX.Element;
```

Use the existing `Tabs`, `TabsList`, `TabsTrigger`, and `TabsContent` primitives for `details`, `fabric`, `fit`, and `shipping`. The fit panel scrolls to `#size-guide` with reduced-motion-aware behavior. Do not add a Reviews tab.

- [ ] **Step 3: Implement both shared-card recommendation regions**

Create one component with two variants:

```ts
export function ProductRecommendations({
  title,
  eyebrow,
  products,
  columns,
}: {
  title: string;
  eyebrow: string;
  products: readonly Product[];
  columns: "styled" | "related";
}): React.JSX.Element;
```

Map every product through the existing `ProductCard` with the complete action contract:

```tsx
<ProductCard
  holdSeconds={holdSecondsByProduct[candidate.id] ?? null}
  isHeld={candidate.id in holdSecondsByProduct}
  isSaved={storefront.saved.has(candidate.id)}
  key={candidate.id}
  onAdd={(id) => {
    releaseProduct(id);
    storefront.addToCart(id);
  }}
  onHold={(id) => {
    const target = storefront.productById(id);
    if (target) holdProduct(productToHoldable(target));
  }}
  onQuickView={storefront.openQuick}
  onRelease={releaseProduct}
  onSave={storefront.toggleSaved}
  product={candidate}
/>
```

Render an honest bordered empty message when `products.length === 0`.

- [ ] **Step 4: Verify no card fork or raw theme styling**

Run:

```text
rg -n "function ProductCard|const ProductCard|#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\(|<style|style=\{" src/features/storefront/product
pnpm exec biome check src/features/storefront/product/product-detail-sections.tsx src/features/storefront/product/product-recommendations.tsx
```

Expected: the grep returns no local card definition, hardcoded colour, style block, or inline style match; Biome exits `0`.

- [ ] **Step 5: Commit the editorial sections**

```text
git add src/features/storefront/product/product-detail-sections.tsx src/features/storefront/product/product-recommendations.tsx
git commit -m "feat(storefront): add product editorial sections"
```

---

### Task 5: Implement the cinematic campaign slider

**Files:**
- Create: `src/features/storefront/product/product-campaign.tsx`

**Interfaces:**
- Consumes: `ProductDetailPresentation["campaignFrames"]`.
- Produces: `ProductCampaign` with manual controls, autoplay, visibility pause, focus/hover pause, and reduced-motion behavior.

- [ ] **Step 1: Implement deterministic slider state**

Export:

```ts
export function ProductCampaign({
  frames,
}: {
  frames: ProductDetailPresentation["campaignFrames"];
}): React.JSX.Element;
```

Use `useState`, `useEffect`, `useRef`, and `useReducedMotion`. Advance every `6200` milliseconds only when the stage is visible, the document is visible, reduced motion is false, and hover/focus pause is false. Wrap indices with:

```ts
const wrap = (value: number) => (value + frames.length) % frames.length;
```

Render `AnimatePresence` crossfades, token-backed inverse surfaces, full-bleed `next/image`, previous/next buttons, progress buttons, and caption buttons. Use `opacity` and `scale` only; no spring or parallax.

- [ ] **Step 2: Add lifecycle cleanup**

Every interval, document visibility listener, and IntersectionObserver must be cleared in its effect cleanup. Pause on `onMouseEnter`, `onMouseLeave`, `onFocusCapture`, and `onBlurCapture`.

- [ ] **Step 3: Run static checks**

Run:

```text
pnpm exec biome check src/features/storefront/product/product-campaign.tsx
pnpm exec tsc --noEmit --pretty false --incremental false
```

Expected: both commands exit `0`.

- [ ] **Step 4: Commit the campaign slider**

```text
git add src/features/storefront/product/product-campaign.tsx
git commit -m "feat(storefront): add cinematic product campaign"
```

---

### Task 6: Implement the size guide and truthful reviews

**Files:**
- Create: `src/features/storefront/product/product-size-guide.tsx`
- Create: `src/features/storefront/product/product-reviews.tsx`

**Interfaces:**
- Consumes: `Product`, `ProductDetailPresentation.measurements`, and `ProductDetailPresentation.reviewSummary`.
- Produces: `ProductSizeGuide` and `ProductReviews`.

- [ ] **Step 1: Implement the size-guide structure**

Export:

```ts
export function ProductSizeGuide({
  product,
  presentation,
}: {
  product: Product;
  presentation: ProductDetailPresentation;
}): React.JSX.Element;
```

Render `id="size-guide"`, the handoff heading, a horizontally contained semantic table, em-dash cells when measurements are absent, and an image-led fit note using the active product's last available image. Do not invent dimensions or model height.

- [ ] **Step 2: Implement aggregate calculations**

In `product-reviews.tsx`, calculate percentages without mutation:

```ts
function distributionPercent(count: number, total: number) {
  return total > 0 ? Math.round((count / total) * 100) : 0;
}
```

Use the existing `Progress` primitive for each rating band so widths are data-driven without inline styles.

- [ ] **Step 3: Implement the single truthful review section**

Export:

```ts
export function ProductReviews({
  product,
  presentation,
}: {
  product: Product;
  presentation: ProductDetailPresentation;
}): React.JSX.Element;
```

Render `id="reviews"`, dark inverse header, average/count, distribution, disabled topic filters and sort when records are unavailable, and a designed first-review state. The action must be:

```ts
const onWriteReview = () => {
  storefront.showToast("Review submission is not available yet.");
};
```

Do not render reviewer cards, reviewer identities, testimonials, fake verification, a review dialog, or a success mutation.

- [ ] **Step 4: Run focused checks**

Run:

```text
pnpm exec biome check src/features/storefront/product/product-size-guide.tsx src/features/storefront/product/product-reviews.tsx
pnpm exec tsc --noEmit --pretty false --incremental false
```

Expected: both commands exit `0`.

- [ ] **Step 5: Commit size and review sections**

```text
git add src/features/storefront/product/product-size-guide.tsx src/features/storefront/product/product-reviews.tsx
git commit -m "feat(storefront): add size guide and review states"
```

---

### Task 7: Compose the complete replacement page

**Files:**
- Modify: `src/features/storefront/product/product-detail.tsx`

**Interfaces:**
- Consumes: every component from Tasks 2-6, `Product`, `ProductDetail`, existing storefront and hold providers.
- Produces: the final twelve-section product-detail page and shared purchase behavior.

- [ ] **Step 1: Replace the old component composition**

Change the public signature:

```ts
import type { ProductDetail as CanonicalProductDetail } from "@/lib/storefront/types";

export function ProductDetail({
  product,
  detail,
  fontClassName,
}: {
  product: Product;
  detail: CanonicalProductDetail;
  fontClassName: string;
}): React.JSX.Element;
```

Build `presentation` with `useMemo`, reset selected variant per product, track `quantity`, and retain the IntersectionObserver for the mobile bar.

- [ ] **Step 2: Centralize purchase behavior**

Use one validation path for desktop, buy-now, and mobile:

```ts
const validateSelection = () => {
  if (product.inventory === "variant" && !storefront.selectedVariant) {
    storefront.setQuickError("Choose an available size before adding this piece.");
    return false;
  }
  return product.status === "available";
};

const addSelectedQuantity = () => {
  if (!validateSelection()) return false;
  storefront.addToCart(product.id);
  if (quantity > 1 && product.inventory !== "one-of-one") {
    storefront.changeQty(product.id, quantity - 1);
  }
  return true;
};

const handleAdd = () => {
  if (addSelectedQuantity()) storefront.open("cartDrawer");
};

const handleBuyNow = () => {
  if (addSelectedQuantity()) router.push("/cart");
};
```

Clamp one-of-one quantity to one and stock-backed quantity to available stock.

- [ ] **Step 3: Compose the exact handoff order**

Render:

```tsx
<main id="main" className={cn("min-w-0 bg-background text-foreground", fontClassName)}>
  <ProductBreadcrumb product={product} />
  <section>{/* Gallery/Trust/Why + sticky Purchase Panel */}</section>
  <section>{/* ProductInformation + Styled with ProductRecommendations */}</section>
  <ProductCampaign frames={presentation.campaignFrames} />
  <ProductSizeGuide presentation={presentation} product={product} />
  <ProductReviews presentation={presentation} product={product} />
  <ServiceStrip />
  <ProductRecommendations
    columns="related"
    eyebrow="Continue the edit"
    products={related}
    title="You may also like"
  />
</main>
<MobileBuyBar canAdd={canAdd} onAdd={handleAdd} product={product} visible={showBar} />
```

Derive `styled` and `related` deterministically from `relatedProducts(storefront.products, product, 9)`, taking the first three for styled and the remaining six for related. If fewer products exist, do not duplicate a candidate across sections.

- [ ] **Step 4: Remove obsolete page-local primitives**

Delete imports and usage of the old accordion/review/support sections. Remove `product-detail-primitives.tsx` only if `rg -n "product-detail-primitives" src` confirms there are no consumers.

- [ ] **Step 5: Run focused validation**

Run:

```text
pnpm exec biome check src/features/storefront/product src/app/products/[slug]/page.tsx
pnpm exec tsc --noEmit --pretty false --incremental false
pnpm exec vitest run src/features/storefront/product/product-detail-presentation.test.ts
```

Expected: all commands exit `0`.

- [ ] **Step 6: Commit the complete composition**

```text
git add src/features/storefront/product src/app/products/[slug]/page.tsx
git commit -m "feat(storefront): replace product detail experience"
```

---

### Task 8: Match loading geometry and complete validation

**Files:**
- Modify: `src/app/products/[slug]/loading.tsx`
- Inspect: all changed product-detail files

**Interfaces:**
- Consumes: final component geometry.
- Produces: stable route loading UI and completion evidence.

- [ ] **Step 1: Replace the loading boundary**

Use the existing `Skeleton` primitive to mirror breadcrumb, `1.18fr / 0.82fr` hero, media rail, sticky purchase stack, trust strip, editorial block, tabs, dark campaign stage, size guide, review header/body, service strip, and both recommendation grids. Use semantic surfaces and no custom CSS.

- [ ] **Step 2: Run theme and structural audits**

Run:

```text
rg -n "#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\(|<style|style=\{" src/features/storefront/product src/app/products/[slug]
rg -n "ProductCard" src/features/storefront/product
rg -n "Reviews|reviews" src/features/storefront/product
```

Expected:

- no hardcoded colour, raw CSS style block, or inline presentation style matches;
- both recommendation regions resolve to the shared `ProductCard` import;
- exactly one primary reviews section and no Reviews tab.

- [ ] **Step 3: Run executable completion checks**

Run:

```text
pnpm lint
pnpm exec tsc --noEmit
pnpm exec vitest run --passWithNoTests
pnpm build
pnpm dlx react-doctor@latest . --verbose --diff
```

Expected: every command exits `0`; changed-scope React Doctor findings are resolved.

- [ ] **Step 4: Review the latest Web Interface Guidelines**

Fetch the current guideline source required by the `web-design-guidelines` skill and review every changed UI file. Record any fixes in the changed components and rerun Biome/typecheck.

- [ ] **Step 5: Validate in a real browser**

At `375 x 812`, `768 x 1024`, `1280 x 800`, and `1440` desktop width, verify:

- no horizontal page overflow;
- no duplicate global shell or review section;
- desktop sticky panel clears the header and remains usable at short height;
- mobile sticky CTA does not cover footer/content;
- gallery thumbnails, previous/next, and image viewer work by keyboard and pointer;
- wishlist, size selection, quantity, add-to-bag, buy-now, and ProductCard actions use existing commerce state;
- tabs and size-guide/review links work;
- campaign autoplay pauses on hover/focus/hidden document and stops under reduced motion;
- zero-review controls are truthful and `Write a review` reports unavailable;
- sold, reserved, one-of-one, variant, single-image, missing-reference-price, and missing-measurement states remain coherent;
- console and network contain no changed-workflow errors.

Capture and visually inspect screenshots at each viewport. If browser tooling is unavailable, record browser validation as blocked rather than passing.

- [ ] **Step 6: Review the final diff**

Run:

```text
git diff --check
git diff --stat HEAD~8..HEAD
git status --short
```

Expected: no whitespace errors, no unrelated product-detail scope drift, and all pre-existing unrelated working-tree changes remain preserved.

- [ ] **Step 7: Commit loading and validation fixes**

```text
git add src/app/products/[slug]/loading.tsx src/features/storefront/product src/app/products/[slug]/page.tsx src/lib/storefront/catalog-data.ts
git commit -m "test(storefront): validate product detail replacement"
```
