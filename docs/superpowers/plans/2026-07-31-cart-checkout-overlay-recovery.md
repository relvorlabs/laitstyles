# Cart, Checkout, Paystack, and Overlay Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve cart intent through catalogue failures, restore a clear cart-to-checkout-to-Paystack flow, and make every nested modal render and dismiss correctly.

**Architecture:** Cart intent is projected into renderable lines only when a ready catalogue exists. The cart remains a presentation Sheet; checkout becomes a sibling Dialog; Paystack launches only after the internal Dialog closes. Overlay primitives share a semantic layer scale.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Zustand, TanStack Query, Base UI/shadcn, Tailwind CSS 4, Vitest, Testing Library, Playwright, Paystack Inline JS.

## Global Constraints

- Use the six repository Codex agents from `.codex/agents/**`; the orchestrator dispatches planner, domain engineer, UI engineer, data engineer only when needed, and reviewer.
- Use `ui-ux-pro-max`, `shadcn`, and `next-best-practices` for UI and Next.js implementation.
- Use TDD: each behaviour change begins with a failing test and is committed independently.
- Keep the PR draft until Biome, typecheck, tests, build, and browser gates pass.
- Cart CTA copy is `Checkout · ₦<subtotal>`; payment CTA copy is `Pay ₦<total>` or `Resume payment · ₦<total>`.
- No simulated Paystack success and no clearing cart before server verification.
- No feature-level arbitrary z-index classes.

---

### Task 1: Preserve unresolved cart intent

**Owner:** `laitstyles-domain-engineer`

**Files:**
- Create: `src/modules/cart/cart-projection.ts`
- Create: `src/modules/cart/cart-projection.test.ts`
- Modify: `src/modules/cart/cart-restoration.ts`

**Interfaces:**
- Consumes: `StorefrontCartIntent`, `Product`, `ProductVariantOption`, `CartLine`.
- Produces:

```ts
export type CartProjectionResult = {
  lines: readonly CartLine[];
  unresolved: readonly StorefrontCartIntent[];
};

export function projectCartIntents(
  intents: readonly StorefrontCartIntent[],
  products: readonly Product[],
  variantOptionsByProductId: Readonly<Record<string, readonly ProductVariantOption[]>>,
): CartProjectionResult;
```

- [ ] **Step 1: Write failing projection tests**

Cover:

```ts
it("reports a cart intent as unresolved when its product is absent", () => {
  expect(projectCartIntents([intent], [], {})).toEqual({ lines: [], unresolved: [intent] });
});

it("projects a matching product and variant without unresolved intent", () => {
  expect(projectCartIntents([intent], [product], variants)).toMatchObject({
    lines: [expect.objectContaining({ productId: intent.productId })],
    unresolved: [],
  });
});
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run:

```bash
pnpm exec vitest run src/modules/cart/cart-projection.test.ts
```

Expected: FAIL because `projectCartIntents` does not exist.

- [ ] **Step 3: Implement the pure projection**

Move the current product/variant resolution logic from `restoreCartLines` into `projectCartIntents`. Do not silently discard unresolved intent.

Keep `restoreCartLines` as a compatibility wrapper:

```ts
export function restoreCartLines(...) {
  return projectCartIntents(...).lines;
}
```

- [ ] **Step 4: Run the focused test and confirm GREEN**

- [ ] **Step 5: Commit**

```bash
git add src/modules/cart/cart-projection.ts src/modules/cart/cart-projection.test.ts src/modules/cart/cart-restoration.ts
git commit -m "fix(cart): preserve unresolved cart intent"
```

### Task 2: Make hydration catalogue-aware and retryable

**Owner:** `laitstyles-ui-engineer` for client state; domain engineer reviews the projection contract.

**Files:**
- Create: `src/providers/storefront-cart-hydration.ts`
- Create: `src/providers/storefront-cart-hydration.test.ts`
- Modify: `src/providers/storefront-state-hydrator.tsx`

**Interfaces:**
- Consumes: `CartProjectionResult`, catalogue `availability`, owned cart snapshot, identity key.
- Produces a pure decision:

```ts
export type CartHydrationDecision =
  | { kind: "wait"; unresolved: readonly StorefrontCartIntent[] }
  | { kind: "hydrate"; lines: readonly CartLine[]; signature: string };
```

- [ ] **Step 1: Write failing decision tests**

Cover:

- temporarily unavailable catalogue returns `wait`
- ready catalogue with unresolved server intent returns `wait`
- ready catalogue with all intent resolved returns `hydrate`
- a later ready catalogue can hydrate previously unresolved intent

- [ ] **Step 2: Run the focused test and confirm RED**

```bash
pnpm exec vitest run src/providers/storefront-cart-hydration.test.ts
```

- [ ] **Step 3: Extract the pure decision and update the hydrator**

Required behaviour:

- do not set `clientStateReady` from a temporarily unavailable catalogue
- do not call `cartStore.hydrate([])` as a consequence of unavailable catalogue data
- do not set `ownedCartConfirmed` or `hydratedIdentity` while server intent is unresolved
- preserve current browser lines while waiting
- re-run automatically when `catalogue.data.availability` or product data changes
- persist signed-in empty browser cart only after a fully resolved server snapshot confirms it is genuinely empty

- [ ] **Step 4: Run focused tests and existing cart tests**

```bash
pnpm exec vitest run src/providers/storefront-cart-hydration.test.ts src/modules/cart/cart-projection.test.ts src/modules/cart/server/owned-cart.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/providers/storefront-cart-hydration.ts src/providers/storefront-cart-hydration.test.ts src/providers/storefront-state-hydrator.tsx
git commit -m "fix(cart): retry hydration after catalogue recovery"
```

### Task 3: Add a cart availability presentation contract

**Owner:** `laitstyles-ui-engineer`

**Files:**
- Create: `src/modules/storefront-shell/ui/storefront-cart-state.ts`
- Create: `src/modules/storefront-shell/ui/storefront-cart-state.test.ts`
- Modify: `src/modules/storefront-shell/client/storefront-runtime.ts`

**Interfaces:**

```ts
export type StorefrontCartPresentationState =
  | { kind: "loading" }
  | { kind: "unavailable"; hasIntent: boolean }
  | { kind: "empty" }
  | { kind: "ready" };
```

- [ ] **Step 1: Write failing tests distinguishing unavailable from empty**
- [ ] **Step 2: Confirm RED with Vitest**
- [ ] **Step 3: Expose catalogue availability and raw line intent from `useStorefrontCart`**
- [ ] **Step 4: Implement and confirm GREEN**
- [ ] **Step 5: Commit**

```bash
git commit -m "fix(cart): distinguish unavailable and empty states"
```

### Task 4: Replace the vibe-coded cart Sheet with a clear commerce flow

**Owner:** `laitstyles-ui-engineer`

**Required skills:** `ui-ux-pro-max`, `shadcn`, `next-best-practices`.

**Files:**
- Modify: `src/modules/storefront-shell/ui/storefront-cart-sheet.tsx`
- Create or modify: `src/modules/storefront-shell/ui/storefront-cart-sheet.test.tsx`
- Verify: `src/components/ui/button.tsx`, `src/components/ui/sheet.tsx`, `components.json`

**Design system context:** shadcn `base-mira`, Base UI primitives, Hugeicons, semantic CSS variables.

- [ ] **Step 1: Write failing UI tests**

Assert:

- title is `Your cart`
- unavailable cart intent renders retry copy, not empty state
- ready cart renders each stable line
- primary CTA matches `/Checkout · ₦/`
- recommendations and the copy `private edit`, `atelier`, `Arrange delivery & payment` are absent
- quantity, save-for-later, remove, and continue-shopping controls have accessible names

- [ ] **Step 2: Confirm RED**

```bash
pnpm exec vitest run src/modules/storefront-shell/ui/storefront-cart-sheet.test.tsx
```

- [ ] **Step 3: Implement the cart Sheet**

Use:

- `SheetHeader`, `SheetTitle`, `SheetDescription`
- a simple scrollable line list
- one sticky summary footer
- `Button` variants rather than custom button styling
- semantic tokens and `gap-*`
- 44px minimum mobile actions
- desktop width no greater than 520px

Remove the recommendation grid and decorative nested subtotal card.

- [ ] **Step 4: Confirm GREEN and run button audit**

```bash
pnpm exec vitest run src/modules/storefront-shell/ui/storefront-cart-sheet.test.tsx
pnpm audit:buttons
```

- [ ] **Step 5: Commit**

```bash
git commit -m "fix(storefront): simplify the cart sheet experience"
```

### Task 5: Centralize overlay layers

**Owner:** `laitstyles-ui-engineer`

**Files:**
- Create: `src/components/ui/overlay-layers.ts`
- Create: `src/components/ui/overlay-layers.test.ts`
- Modify: `src/components/ui/sheet.tsx`
- Modify: `src/components/ui/dialog.tsx`
- Modify: `src/components/ui/alert-dialog.tsx`
- Audit: Popover, Select, DropdownMenu, Command, Tooltip, Sonner primitives under `src/components/ui/**`

**Interfaces:**

```ts
export const overlayLayer = {
  sheetBackdrop: "z-[60]",
  sheetContent: "z-[70]",
  dialogBackdrop: "z-[80]",
  dialogContent: "z-[90]",
  floating: "z-[100]",
  toast: "z-[110]",
} as const;
```

- [ ] **Step 1: Write a failing primitive contract test**

The test reads primitive source or rendered classes and proves AlertDialog content is above Sheet content.

- [ ] **Step 2: Confirm RED**
- [ ] **Step 3: Apply semantic layers to all overlay primitives**

Do not add feature-level z-index overrides.

- [ ] **Step 4: Add a nested admin interaction test**

Render `OrderDetailSheet`, open `Cancel order`, assert the AlertDialog is visible and closing it leaves the Sheet open.

- [ ] **Step 5: Run tests and confirm GREEN**
- [ ] **Step 6: Commit**

```bash
git commit -m "fix(ui): establish nested overlay layer order"
```

### Task 6: Separate cart Sheet and checkout Dialog

**Owner:** `laitstyles-ui-engineer`

**Files:**
- Create: `src/modules/checkout/ui/storefront/storefront-checkout-dialog.tsx`
- Create: `src/modules/checkout/ui/storefront/storefront-checkout-dialog.test.tsx`
- Modify: `src/modules/checkout/ui/storefront/checkout-sheet.tsx` and rename/export as a content panel if practical
- Modify: `src/modules/storefront-shell/ui/storefront-cart-sheet.tsx`
- Modify: `src/stores/storefront-ui.store.ts`
- Modify: `src/modules/checkout/client/recovery-events.ts`
- Modify: storefront shell composition file that mounts overlay hosts

**Interfaces:**

- Add `checkoutDialog` to `StorefrontOverlayId`.
- `requestStorefrontCheckoutResume()` opens `checkoutDialog` directly.
- Cart CTA closes `cartDrawer` and opens `checkoutDialog` on the next animation frame or after close completion.

- [ ] **Step 1: Write failing overlay-transition tests**

Assert:

- cart and checkout are never open simultaneously
- cart CTA closes cart before checkout opens
- checkout recovery opens checkout even when no cart view can currently project
- closing checkout does not clear cart or active checkout

- [ ] **Step 2: Confirm RED**
- [ ] **Step 3: Implement sibling overlay ownership**
- [ ] **Step 4: Update checkout copy**

Use `Checkout`, `Pay ₦<total>`, and `Resume payment · ₦<total>`. Remove “private checkout”, “delivery atelier”, “your edit” and numbered editorial labels.

- [ ] **Step 5: Run cart and checkout tests**
- [ ] **Step 6: Commit**

```bash
git commit -m "fix(checkout): separate checkout from the cart sheet"
```

### Task 7: Make Paystack launch retryable and modal-safe

**Owner:** `laitstyles-domain-engineer` for adapter; UI engineer for handoff.

**Files:**
- Modify: `src/modules/payments/client/paystack-popup.ts`
- Create: `src/modules/payments/client/paystack-popup.test.ts`
- Modify: `src/modules/checkout/ui/storefront/storefront-checkout-dialog.tsx`
- Modify: `src/modules/checkout/ui/storefront/checkout-sheet.test.tsx` or replacement test

**Interfaces:**

```ts
export async function preloadPaystackConstructor(): Promise<PaystackConstructor>;
export async function resumePaystackTransaction(accessCode: string): Promise<PaystackOutcome>;
```

- [ ] **Step 1: Write failing adapter tests**

Cover:

- rejected dynamic import resets cache and a second attempt can succeed
- two launches construct two Paystack instances
- callback errors retain a safe message category

- [ ] **Step 2: Confirm RED**
- [ ] **Step 3: Cache the constructor, not the instance**
- [ ] **Step 4: Implement Dialog-to-external-popup handoff**

Persist active checkout, close Dialog, wait for exit, launch Paystack, reopen on cancel/error, verify on success.

- [ ] **Step 5: Run focused checkout and payment tests**
- [ ] **Step 6: Commit**

```bash
git commit -m "fix(payments): make Paystack popup launches recoverable"
```

### Task 8: Reviewer certification

**Owner:** `laitstyles-reviewer`

- [ ] **Step 1: Run static gates under Node 25.x**

```bash
pnpm check:architecture
pnpm check:storefront-production
pnpm biome
pnpm typecheck
```

- [ ] **Step 2: Run focused and full tests**

```bash
pnpm exec vitest run src/modules/cart src/providers/storefront-cart-hydration.test.ts src/modules/storefront-shell/ui/storefront-cart-sheet.test.tsx src/components/ui/overlay-layers.test.ts src/modules/checkout/ui/storefront src/modules/payments/client/paystack-popup.test.ts
pnpm test
```

- [ ] **Step 3: Run build and React review**

```bash
pnpm build
pnpm react-doctor
```

- [ ] **Step 4: Run browser gates**

```bash
pnpm validate:browser
```

Manually verify 375×812, 768×1024 and 1280×800, nested admin confirmations, cart recovery, Paystack open/cancel/retry, focus return, Escape and reduced motion.

- [ ] **Step 5: Update PR #64**

Record exact commands, exit codes, screenshots, remaining blockers, and keep draft if any gate is unavailable or fails.
