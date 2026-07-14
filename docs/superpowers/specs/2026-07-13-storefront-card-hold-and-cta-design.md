# Storefront product card — hold/release + emphasized Add-to-bag

**Date:** 2026-07-13
**Branch:** feat/storefront-v2-spec
**Surface:** `/products` (home-lab prototype card) — `src/features/storefront/home-lab/product-card.tsx`

## Goal

Bring the `/products` product card back to the interaction model of the card-lab
reference and the account card:

1. **Clicking anywhere on the image opens the quick-view dialog** (today it navigates
   to the PDP).
2. **The hover button becomes a Hold / Release control** with a real 15-minute
   countdown — the same "hold a one-of-one piece" mechanic the account
   Reservations / Wishlist cards use.
3. **The persistent bottom CTA ("Add to bag") is promoted** to a bold, attention-
   grabbing primary button whose label changes with the piece's inventory/stock.

Hold and Add-to-bag are **distinct actions**: Hold is a lighter temporary reserve
with a countdown; Add-to-bag is the commit-toward-checkout action (adds to the bag
via the existing `addToCart`, which shows the confirmation toast). Opening the cart
drawer on add is an optional emphasis we can enable.

## Background / current state

- The card was migrated (BLOCKER 2-3N-01) from scoped CSS classes to Tailwind v4
  arbitrary utilities. A separate fix already restored the hover reveal (a
  `transform` vs `translate` property mismatch that kept the button clipped).
- Provider tree (from `src/app/layout.tsx` → `SiteChrome`):
  `StorefrontExperienceProvider` (root) → `StorefrontProvider` (`.lst-lab`,
  `useStorefront`) → `/products` grid → `ProductCard`.
- **Hold system today** lives in `StorefrontExperienceProvider`
  (`storefront-experience-provider.tsx`): a 1-second `setInterval` decrements
  `secondsLeft` on every `items[]` entry whose `st === "resYou"`; `heldItems`,
  `holdCount`, `soonestHoldSeconds` are derived; the global `StorefrontHoldAlert`
  banner and the account Reservations tab both render from that state. But `items`
  is a **fixed 8-item account seed** (`StorefrontAccountItem[]`), not the full
  `/products` catalogue.
- The card is presentational: `catalogue-lab.tsx` and `storefront-lab.tsx` render
  `ProductCard` and pass `isSaved` + `{onQuickView, onSave, onAdd}` handlers.

## Approved decisions

| Decision | Choice |
|---|---|
| Hold-state location | **B — unify on `StorefrontExperienceProvider`** so the global hold banner + Reservations tab reflect storefront holds |
| Held countdown visibility | **Persistent "Held · MM:SS" chip on the card** (not hover-only) |
| Variant pieces | Hover button says **"Choose options"**; the bottom CTA says **"Select size"** (distinct labels, both open quick view; no size-less hold) |
| Reload survival | **Yes** — storefront holds persist to `sessionStorage` as absolute expiry timestamps and rehydrate on mount |

## Architecture

### Key insight

In Approach B, **holding a storefront product = upserting a `resYou`
`StorefrontAccountItem` into the provider's existing `items[]`**. This reuses the
existing countdown interval, the `heldItems` / `holdCount` / `soonestHoldSeconds`
derivations, the global `StorefrontHoldAlert`, and the account Reservations tab with
no new timer or banner code.

### 1. `StorefrontExperienceProvider` (shared)

Add a hold-a-piece API that maps a minimal, home-lab-agnostic shape into the item
list. To keep the shared layer from depending on the home-lab `Product` type, define
the input shape in the shared layer:

```ts
// storefront-experience-data.ts
export type HoldablePiece = {
  id: string;        // stable product id, e.g. "p3"
  name: string;
  cat: string;
  size: string;
  color: string;
  cond: string;
  priceNum: number;
  origNum: number;
  img: string;
};

export const HOLD_SECONDS = 15 * 60;

// Pure helpers (unit-testable, no React):
export function applyHold(items, piece, seconds = HOLD_SECONDS): StorefrontAccountItem[];
export function applyRelease(items, id: string): StorefrontAccountItem[];
export function tickHolds(items): StorefrontAccountItem[]; // extract current interval body
```

- `applyHold`: if an item with `piece.id` exists, set `st: "resYou"`,
  `secondsLeft: seconds`; otherwise append a new `resYou` item built from `piece`
  (`removed: false`). Idempotent re-hold resets the timer.
- `applyRelease`: for a **storefront-originated** item (id not in the `w{n}` seed
  namespace) remove it entirely; for a seed item set `st: "available"`,
  `secondsLeft: undefined` (mirrors the account `release()`). Distinguish by
  membership in the original seed id set.
- `tickHolds`: the existing interval body, extracted so it is covered by tests.

New context surface:

```ts
actions.holdProduct(piece: HoldablePiece): void   // applyHold + revealHoldAlert + toast
actions.releaseProduct(id: string): void          // applyRelease + toast
state.holdSecondsByProduct: Record<string, number> // { [productId]: secondsLeft } for resYou items
```

`holdCount` / `soonestHoldSeconds` already include the new `resYou` items, so the
global banner "You're holding N pieces" updates automatically. The 1-second interval
switches to call `tickHolds(items)`.

### 2. `ProductCard` (presentational, prop-driven)

Keep the card presentational — extend the prop contract exactly like the existing
`isSaved` / `onSave` pair:

```ts
type Props = {
  product: Product; isSaved: boolean;
  isHeld: boolean; holdSeconds: number | null;   // NEW
  onQuickView; onSave; onAdd;
  onHold: (id: string) => void; onRelease: (id: string) => void; // NEW
};
```

Card changes:

- **Image click → quick view.** Replace the full-bleed PDP `<Link>` overlay with a
  `<button aria-label="Quick view {name}" onClick={() => onQuickView(p.id)}>`. The
  product **name** stays a PDP `<Link>` so the canonical page remains reachable.
- **Persistent held chip.** When `isHeld`, render a mono chip in the top-left badge
  stack: `Held · MM:SS` (accent/sage styling), visible at rest.
- **Hover button (state machine):**
  | State | Label | Action |
  |---|---|---|
  | `isHeld` | `Release hold` | `onRelease(id)` |
  | available & `inventory !== "variant"` | `Hold piece` | `onHold(id)` |
  | available & `inventory === "variant"` | `Choose options` | `onQuickView(id)` |
  | `reserved` / `sold` | — (no button) | — |
- **Bottom "Add to bag" — promoted + dynamic label.** From the underline text-link
  (`card-add`) to a bold filled primary with a bag icon. Label helper
  `addToBagLabel(product)`:
  | Condition | Label |
  |---|---|
  | `status === "sold"` | `Sold` (disabled) |
  | `status === "reserved"` | `Reserved` (disabled) |
  | `inventory === "variant"` | `Select size` |
  | `inventory === "one-of-one"` | `Grab it — the only one` |
  | `stock === 1` | `Grab it — last one` |
  | `stock <= 3` | `Add to bag · {stock} left` |
  | otherwise | `Add to bag` |
  Action = `onAdd(id)` for buyable/stock cases (`addToCart` + toast), `onQuickView(id)`
  for variant. Adding to bag **clears any active hold** for the piece.

### 3. Wiring (`catalogue-lab.tsx`, `storefront-lab.tsx`)

Both parents already build `cardHandlers` from `useStorefront()`. They additionally
consume `useStorefrontExperience()` and, per product, compute
`isHeld = product.id in holdSecondsByProduct`, `holdSeconds`, and pass `onHold`
(maps `Product → HoldablePiece`, calls `holdProduct`) and `onRelease`
(`releaseProduct`). The `onAdd` handler is wrapped to also `releaseProduct(id)` so
add-to-bag supersedes a hold. The per-second re-render of the grid (≤ 12 cards) is
acceptable for this prototype surface.

### Product → HoldablePiece mapping

`id: product.id`, `name`, `cat: product.category`, `size: product.size`,
`color: ""` (no color field on `Product`), `cond: product.condition`,
`priceNum: product.price`, `origNum: product.price` (no separate reference price),
`img: product.images[0]`.

## Edge cases

- **Expired hold:** existing interval sets `st: "available"`, `secondsLeft:
  undefined` at 0. For storefront-originated items this means they linger in `items`
  as `available` (harmless — not `resYou`, so not counted/shown). Optional cleanup:
  `tickHolds` may drop storefront-origin items that hit 0. Chosen: **drop them** to
  avoid unbounded growth.
- **Add-to-bag while held:** releases the hold, then adds to cart.
- **Re-hold:** resets the 15:00 timer (idempotent).
- **Reserved/sold pieces:** no hover button; CTA disabled with status label.
- **Persistence (reload survival):** storefront holds persist to `sessionStorage`
  under `laitstyles-storefront:v1:holds` as `{ [productId]: { expiresAt: number,
  piece: HoldablePiece } }` (absolute epoch ms, so the countdown stays accurate
  across reloads). On provider mount, entries with `expiresAt > now` rehydrate as
  `resYou` items with `secondsLeft = ceil((expiresAt - now) / 1000)`; expired entries
  are dropped. `holdProduct` writes the entry, `releaseProduct` and auto-expiry
  remove it. The 8-item account **seed** remains session-lived as today (unchanged).

## Testing

- **Vitest, pure helpers** (`storefront-experience-data.ts`): `applyHold` (append +
  reset), `applyRelease` (remove storefront item vs reset seed item), `tickHolds`
  (decrement, auto-release/drop at 0), `addToBagLabel` table test across
  inventory/stock/status, and `holdsToItems` (rehydrate unexpired at correct
  `secondsLeft`, drop expired) with a fixed `now`.
- **Interaction check** in the running dev app: hover reveals Hold; clicking Hold
  shows the persistent countdown chip + global banner increments; Release clears it;
  image click opens quick view; CTA labels match state.

## Out of scope

- Real backend persistence of holds (Prisma/Supabase) — this is the frozen home-lab
  prototype surface.
- Changing the real `/shop` (`catalogue/product-card.tsx`) card.
- Reworking the account Reservations tab beyond it now also listing storefront holds.

## Files touched

- `src/features/storefront/shared/storefront-experience-data.ts` — `HoldablePiece`,
  `HOLD_SECONDS`, `applyHold` / `applyRelease` / `tickHolds`, and pure
  `readPersistedHolds` / `writePersistedHolds` / `holdsToItems` helpers for the
  sessionStorage layer.
- `src/features/storefront/shared/storefront-experience-provider.tsx` —
  `holdProduct` / `releaseProduct` actions, `holdSecondsByProduct`, interval uses
  `tickHolds`, mount rehydration + write-through to `sessionStorage`.
- `src/features/storefront/home-lab/product-card.tsx` — image→quick-view, held chip,
  hover state machine, promoted dynamic CTA, `addToBagLabel`.
- `src/features/storefront/home-lab/catalogue-lab.tsx` &
  `src/features/storefront/home-lab/storefront-lab.tsx` — pass hold props, wrap
  `onAdd` to release.
- Tests: `storefront-experience-data.test.ts` (new).
