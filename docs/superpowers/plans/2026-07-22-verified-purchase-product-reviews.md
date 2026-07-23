# Verified-purchase Product Reviews Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Prisma-backed, customer-owned review flow that begins at a delivered order line and remove generic review creation from product detail.

**Architecture:** Prisma stores public order identity, per-line fulfilment/refund truth, and one review per order line. Pure policy functions return discriminated eligibility results; owned repositories recheck them transactionally. Server-composed account routes pass allow-listed DTOs to focused interactive components and Server Actions.

**Tech Stack:** Next.js 16.2, React 19.2, TypeScript 5, Prisma 7.8/PostgreSQL, Supabase Auth, React Hook Form, Zod 4, shadcn/Base UI, HugeIcons, Vitest, Playwright.

## Global Constraints

- Work on `codex/verified-purchase-reviews`; preserve `.claude/settings.local.json` and unrelated changes.
- Use red-green-refactor; observe each focused test fail for the expected missing behavior before production code.
- Review creation exists only at `/account/orders/[orderNumber]/items/[orderLineId]/review`.
- Scope private Prisma queries by `orders.customer_id`; never fetch then authorize.
- Keep one review per order line as a database unique invariant.
- Use an inclusive 90-day window from the line's first `delivered_at`.
- Fully returned/refunded lines are ineligible before submission; already-published reviews survive later returns/refunds with an honest marker.
- No fake orders, delays, transitions, success, or client-owned eligibility.
- Dynamic `params`/`searchParams` are promises in Next.js 16 and must be awaited.
- Treat Server Actions as directly POST-reachable and re-authorize inside each action/repository transaction.
- Do not use `use cache` for private account reads or mutations.
- Use current `base-mira`, Base UI, Tailwind 4, semantic tokens, HugeIcons, and existing typography.
- Maintain 44px targets, visible labels/focus, non-colour status text, WCAG AA, reduced motion, and no horizontal overflow.
- Do not apply migrations to production.

## Parallel execution waves

- **Wave 1:** Tasks 1, 2, and 7 in parallel.
- **Wave 2:** Tasks 3 and 4 in parallel after Tasks 1-2.
- **Wave 3:** Tasks 5 and 6 in parallel after Tasks 3-4.
- **Wave 4:** Task 8 integration and verification.

Workers do not commit concurrently. The primary agent reviews each slice, runs focused checks, then commits before releasing dependent work.

---

### Task 1: Prisma state foundation

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260722150000_verified_purchase_reviews/migration.sql`
- Regenerate: `prisma/generated/prisma/**`

**Interfaces:**
- Produces `order_line_fulfilment_status`, `order_line_refund_status`, `review_fit`, revised `review_status`, public order number, line delivery/refund fields, and review metadata.

- [ ] **Step 1: Add schema fields and enums**

Add `orders.order_number String @unique(map: "orders_order_number_unique")`.

Add to `order_lines`:

```prisma
fulfilment_status order_line_fulfilment_status @default(unfulfilled)
delivered_quantity Int                           @default(0)
delivered_at       DateTime?                     @db.Timestamptz(6)
cancelled_quantity Int                           @default(0)
refund_status      order_line_refund_status      @default(not_refunded)
refunded_amount    Decimal                       @default(0) @db.Decimal(12, 2)
refunded_at        DateTime?                     @db.Timestamptz(6)
```

Add to `product_reviews`:

```prisma
fit          review_fit?
size_ordered String?
submitted_at DateTime    @default(now()) @db.Timestamptz(6)
published_at DateTime?   @db.Timestamptz(6)
```

Define exact enums:

```prisma
enum order_line_fulfilment_status {
  unfulfilled
  processing
  ready_for_dispatch
  dispatched
  partially_delivered
  delivered
  partially_cancelled
  cancelled
  partially_returned
  returned
  @@schema("public")
}

enum order_line_refund_status {
  not_refunded
  partially_refunded
  refunded
  @@schema("public")
}

enum review_fit {
  runs_small
  true_to_size
  runs_large
  not_applicable
  @@schema("public")
}

enum review_status {
  pending
  published
  rejected
  withdrawn
  @@schema("public")
}
```

- [ ] **Step 2: Write the data-preserving migration**

The SQL renames `review_status.approved` to `published`, adds `withdrawn`, creates the three new enum types, and adds the schema columns. Backfill order numbers deterministically:

```sql
ALTER TABLE "public"."orders" ADD COLUMN "order_number" TEXT;
UPDATE "public"."orders"
SET "order_number" = 'LS-' || upper(substr(replace("id"::text, '-', ''), 1, 10));
ALTER TABLE "public"."orders" ALTER COLUMN "order_number" SET NOT NULL;
CREATE UNIQUE INDEX "orders_order_number_unique" ON "public"."orders"("order_number");
```

Add check constraints:

```sql
CHECK ("delivered_quantity" >= 0 AND "delivered_quantity" <= "quantity")
CHECK ("cancelled_quantity" >= 0 AND "cancelled_quantity" <= "quantity")
CHECK ("refunded_amount" >= 0)
```

Backfill `product_reviews.submitted_at = created_at` and `published_at = reviewed_at` only for migrated published rows. Do not infer historical line delivery from the aggregate order.

- [ ] **Step 3: Validate and generate**

Run:

```bash
pnpm prisma:format
pnpm prisma:validate
pnpm prisma:generate
git diff --check
```

Expected: exit 0 and generated exports include all new fields/enums.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260722150000_verified_purchase_reviews prisma/generated/prisma
git commit -m "feat(db): model verified-purchase review eligibility"
```

---

### Task 2: Eligibility, lifecycle, and validation contracts

**Files:**
- Create: `src/server/commerce/reviews/review-types.ts`
- Create: `src/server/commerce/reviews/review-policy.ts`
- Create: `src/server/commerce/reviews/review-policy.test.ts`
- Create: `src/server/commerce/reviews/review-schema.ts`
- Create: `src/server/commerce/reviews/review-schema.test.ts`

**Interfaces:**
- Produces `ReviewEligibility`, `ReviewActionState`, `getReviewEligibility()`, `canTransitionReview()`, `reviewInputSchema`, and `REVIEW_WINDOW_DAYS`.

- [ ] **Step 1: Write failing policy tests**

Use this baseline and table cases:

```ts
const delivered = {
  owned: true,
  fulfilmentStatus: "delivered" as const,
  deliveredQuantity: 1,
  deliveredAt: new Date("2026-07-01T12:00:00Z"),
  refundStatus: "not_refunded" as const,
  completedReturnedQuantity: 0,
  purchasedQuantity: 1,
  hasReview: false,
};

it.each([
  [{ ...delivered, owned: false }, "order_line_not_found"],
  [{ ...delivered, fulfilmentStatus: "dispatched", deliveredQuantity: 0, deliveredAt: null }, "awaiting_delivery"],
  [{ ...delivered, fulfilmentStatus: "cancelled" }, "cancelled"],
  [{ ...delivered, fulfilmentStatus: "returned", completedReturnedQuantity: 1 }, "fully_returned"],
  [{ ...delivered, refundStatus: "refunded" }, "fully_refunded"],
  [{ ...delivered, hasReview: true }, "already_reviewed"],
])("returns the expected reason", (input, reason) => {
  expect(getReviewEligibility(input, new Date("2026-07-20T12:00:00Z"))).toEqual({
    eligible: false,
    reason,
  });
});
```

Also test day 90 eligible/day 91 expired, partial delivery eligible, partial return eligible only when retained quantity remains, and another purchase line independently eligible.

Run: `pnpm exec vitest run src/server/commerce/reviews/review-policy.test.ts`

Expected: FAIL because the module is absent.

- [ ] **Step 2: Implement policy types and functions**

```ts
export const REVIEW_WINDOW_DAYS = 90;

export type ReviewEligibilityReason =
  | "order_line_not_found"
  | "awaiting_delivery"
  | "cancelled"
  | "fully_returned"
  | "fully_refunded"
  | "review_window_expired"
  | "already_reviewed";

export type ReviewAccessFailureReason =
  | "authentication_required"
  | "customer_record_required"
  | ReviewEligibilityReason;

export type ReviewEligibility =
  | { eligible: true; expiresAt: Date }
  | { eligible: false; reason: ReviewEligibilityReason };
```

`getReviewEligibility(input, now)` checks ownership, cancellation, delivery evidence, full return, full refund, duplicate, then inclusive deadline using `date-fns/addDays`. Session/action wrappers return the two access failures before invoking the line policy.

Lifecycle transition table:

```ts
const transitions = {
  pending: ["withdrawn"],
  published: ["pending", "withdrawn"],
  rejected: ["pending", "withdrawn"],
  withdrawn: ["pending"],
} as const;
```

- [ ] **Step 3: Write failing schema tests**

Assert rating is integer 1-5; title max 120; body 20-2000; fit is one of four enum values; empty optional title normalizes to `undefined`.

Run: `pnpm exec vitest run src/server/commerce/reviews/review-schema.test.ts`

Expected: FAIL because schema is absent.

- [ ] **Step 4: Implement schema/action state and run tests**

```ts
export const reviewInputSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional().transform((value) => value || undefined),
  body: z.string().trim().min(20).max(2000),
  fit: z.enum(["runs_small", "true_to_size", "runs_large", "not_applicable"]),
});

export type ReviewActionState =
  | { status: "idle" }
  | { status: "error"; message: string; fieldErrors?: Partial<Record<keyof ReviewInput, string[]>> };
```

Run: `pnpm exec vitest run src/server/commerce/reviews/review-policy.test.ts src/server/commerce/reviews/review-schema.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/commerce/reviews
git commit -m "feat(reviews): define verified-purchase policy"
```

---

### Task 3: Owned review repository and Server Actions

**Files:**
- Create: `src/server/commerce/reviews/review-repository.ts`
- Create: `src/server/commerce/reviews/review-repository.test.ts`
- Create: `src/features/storefront/account/reviews/review-actions.ts`
- Create: `src/features/storefront/account/reviews/review-actions.test.ts`

**Interfaces:**
- Produces `getOwnedReviewContext()`, `submitReview()`, `withdrawReview()`, `submitReviewAction()`, and `withdrawReviewAction()`.

- [ ] **Step 1: Write failing repository tests**

Assert the ownership query includes:

```ts
where: {
  id: "line-a",
  orders: { order_number: "LS-1001", customer_id: "customer-a" },
}
```

Cover missing/foreign as the same result, server-derived product/size/status, transaction-time stale delivery/return/refund, `P2002 -> already_reviewed`, published edit back to pending, rejected/withdrawn resubmission, and owned withdrawal.

Run: `pnpm exec vitest run src/server/commerce/reviews/review-repository.test.ts`

Expected: FAIL because repository is absent.

- [ ] **Step 2: Implement owned context and mutations**

```ts
export async function submitReview(args: {
  customerId: string;
  orderNumber: string;
  orderLineId: string;
  input: ReviewInput;
  now?: Date;
}): Promise<SubmitReviewResult>;
```

Inside `prisma.$transaction`, repeat the ownership-scoped read. Create uses actual `hasReview`; update/resubmit passes `hasReview: false` so the existing row does not block itself. Derive `size_ordered` from `variant_label`. Map expected errors to typed results.

- [ ] **Step 3: Write failing action tests**

Cover consumer/customer requirement, FormData allow-list, field errors, eligibility errors, success redirect to order detail, `revalidatePath` for order and product, and withdrawal notice.

Run: `pnpm exec vitest run src/features/storefront/account/reviews/review-actions.test.ts`

Expected: FAIL because actions are absent.

- [ ] **Step 4: Implement thin actions**

```ts
"use server";

export async function submitReviewAction(
  _previous: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState>;

export async function withdrawReviewAction(formData: FormData): Promise<void>;
```

Validate identifiers/input, call `requireStorefrontSession()`, require `customerId`, delegate authorization to repository, and redirect only after success.

- [ ] **Step 5: Verify and commit**

Run: `pnpm exec vitest run src/server/commerce/reviews/review-repository.test.ts src/features/storefront/account/reviews/review-actions.test.ts`

Expected: PASS.

```bash
git add src/server/commerce/reviews src/features/storefront/account/reviews
git commit -m "feat(reviews): enforce owned review mutations"
```

---

### Task 4: Prisma-backed account order DTOs

**Files:**
- Create: `src/features/storefront/account/orders/order-types.ts`
- Create: `src/server/commerce/orders/account-orders.ts`
- Create: `src/server/commerce/orders/account-orders.test.ts`

**Interfaces:**
- Produces `AccountOrderSummary`, `AccountOrderDetail`, `AccountOrderLine`, `getAccountOrders()`, and `getAccountOrder()`.

- [ ] **Step 1: Define DTO union and failing tests**

```ts
export type AccountLineReviewState =
  | { kind: "eligible"; expiresAt: string }
  | { kind: "pending"; reviewId: string }
  | { kind: "published"; reviewId: string; lifecycleMarker?: "returned" | "refunded" }
  | { kind: "rejected"; reviewId: string; reason: string; canResubmit: boolean }
  | { kind: "withdrawn"; reviewId: string; canResubmit: boolean }
  | { kind: "ineligible"; reason: ReviewEligibilityReason };
```

Test mixed order reviewable count, foreign order scoping, empty list, archived historical product, Decimal/Date serialization, and omission of cost/notes/profile IDs.

Run: `pnpm exec vitest run src/server/commerce/orders/account-orders.test.ts`

Expected: FAIL because module is absent.

- [ ] **Step 2: Implement exhaustive status copy and owned reads**

Use `satisfies Record<generatedEnum, string>` for payment/order/line status mappings. `getAccountOrders(customerId)` filters by `customer_id`, newest first. `getAccountOrder(customerId, orderNumber)` uses one `findFirst` containing both identifiers. Map money to integer kobo and dates to ISO strings.

- [ ] **Step 3: Run test and commit**

Run: `pnpm exec vitest run src/server/commerce/orders/account-orders.test.ts`

Expected: PASS.

```bash
git add src/features/storefront/account/orders src/server/commerce/orders
git commit -m "feat(account): read customer-owned orders"
```

---

### Task 5: Dynamic account order routes and responsive UX

**Files:**
- Modify: `src/app/account/orders/page.tsx`
- Create: `src/app/account/orders/loading.tsx`
- Create: `src/app/account/orders/error.tsx`
- Modify: `src/app/account/orders/detail/page.tsx`
- Create: `src/app/account/orders/[orderNumber]/page.tsx`
- Create: `src/app/account/orders/[orderNumber]/loading.tsx`
- Create: `src/app/account/orders/[orderNumber]/error.tsx`
- Modify: `src/features/storefront/account/sections/orders-section.tsx`
- Modify: `src/features/storefront/account/sections/order-detail-section.tsx`
- Modify: `src/features/storefront/account/account-nav.ts`
- Create: `src/features/storefront/account/orders/order-state-copy.ts`
- Create: `src/features/storefront/account/orders/order-state-copy.test.ts`

**Interfaces:**
- Consumes account order DTO/read functions and produces real list/detail pages with per-line review actions.

- [ ] **Step 1: Write failing exhaustive copy tests**

Assert exact text for every review state, including:

```ts
expect(reviewStateCopy({ kind: "ineligible", reason: "awaiting_delivery" })).toBe(
  "You can review this piece after it is delivered.",
);
expect(reviewStateCopy({ kind: "pending", reviewId: "r1" })).toBe(
  "Your review is awaiting moderation.",
);
```

Run focused Vitest; expect missing module failure.

- [ ] **Step 2: Make routes server-composed**

List route requires session and calls `getAccountOrders`. Dynamic route awaits params/search params, requires customer, queries by owned public number, and calls `notFound()` for missing/foreign. Legacy `/detail` redirects to `/account/orders`.

- [ ] **Step 3: Replace hardcoded order list/detail**

List renders empty/error-safe DTO data, real filters, consumer status copy, `next/image`, `Review N items` only when eligible, and canonical details links. Detail renders timeline/snapshots and per-line actions. Eligible links use:

```tsx
<Link href={`/account/orders/${encodeURIComponent(order.orderNumber)}/items/${line.id}/review`}>
  Write a review
</Link>
```

Pending is read-only. Published and rejected states link to the same route; withdrawn links only when `canResubmit` is true. Ineligible states show explanatory text instead of disabled buttons. Remove dead fake tracking/cancellation success.

- [ ] **Step 4: Add stable loading and recoverable error boundaries**

Use `Skeleton` for layout-stable loading and Client error boundaries with `reset()`. Preserve mobile content priority and 44px actions.

- [ ] **Step 5: Verify and commit**

```bash
pnpm exec vitest run src/features/storefront/account/orders/order-state-copy.test.ts
pnpm exec tsc --noEmit --pretty false --incremental false
pnpm audit:buttons
git add src/app/account/orders src/features/storefront/account/sections src/features/storefront/account/account-nav.ts src/features/storefront/account/orders
git commit -m "feat(account): show reviewable order items"
```

---

### Task 6: Review route and accessible form

**Files:**
- Create: `src/app/account/orders/[orderNumber]/items/[orderLineId]/review/page.tsx`
- Create: `src/app/account/orders/[orderNumber]/items/[orderLineId]/review/loading.tsx`
- Create: `src/app/account/orders/[orderNumber]/items/[orderLineId]/review/error.tsx`
- Create: `src/features/storefront/account/reviews/review-page.tsx`
- Create: `src/features/storefront/account/reviews/review-form.tsx`
- Create: `src/features/storefront/account/reviews/review-form.test.tsx`
- Modify: `vitest.config.ts`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Consumes owned context and Server Actions; produces create/edit/revise/withdraw experience.

- [ ] **Step 1: Install and configure the DOM test harness**

Run:

```bash
pnpm add -D @testing-library/react @testing-library/user-event jsdom
```

Add `"src/**/*.test.tsx"` to `vitest.config.ts`'s `test.include` array. Start the form test with `// @vitest-environment jsdom`.

- [ ] **Step 2: Write failing form behavior tests**

Test a visible Rating legend, five named radios, keyboard labels, visible title/body/fit labels, inline errors, pending submit copy, server field errors, edit prefilling, and separate confirmed withdrawal.

Run: `pnpm exec vitest run src/features/storefront/account/reviews/review-form.test.tsx`

Expected: FAIL because form is absent. If DOM testing dependencies are absent, add the minimum React Testing Library packages with pnpm and commit the lockfile in this task.

- [ ] **Step 3: Implement owned server route**

Await params, require consumer/customer, load `getOwnedReviewContext`, and `notFound()` missing/foreign lines. Ineligible create renders reason without a form; pending is read-only; eligible/published/rejected/withdrawn render allowed actions.

- [ ] **Step 4: Implement RHF + Zod + action form**

```tsx
const form = useForm<ReviewInput>({ resolver: zodResolver(reviewInputSchema), defaultValues });
const [state, formAction, pending] = useActionState(submitReviewAction, { status: "idle" });

const onSubmit = form.handleSubmit((values) => {
  const data = new FormData();
  data.set("orderNumber", orderNumber);
  data.set("orderLineId", orderLineId);
  data.set("rating", String(values.rating));
  data.set("title", values.title ?? "");
  data.set("body", values.body);
  data.set("fit", values.fit);
  startTransition(() => formAction(data));
});
```

Use semantic fieldset/legend radios with HugeIcons stars, existing Field/Textarea/Button/Alert, `current/2000` body count, inline `role="alert"`, one primary submit action, purchase context, back link, and withdrawal confirmation.

- [ ] **Step 5: Verify and commit**

```bash
pnpm exec vitest run src/features/storefront/account/reviews/review-form.test.tsx
pnpm exec tsc --noEmit --pretty false --incremental false
pnpm audit:buttons
git add src/app/account/orders/[orderNumber]/items src/features/storefront/account/reviews vitest.config.ts package.json pnpm-lock.yaml
git commit -m "feat(reviews): add delivered-item review form"
```

---

### Task 7: Remove PDP review creation

**Files:**
- Modify: `src/features/storefront/product/product-reviews.tsx`
- Modify: `src/features/storefront/product/product-detail-presentation.ts`
- Modify: `src/features/storefront/product/product-detail-presentation.test.ts`

**Interfaces:**
- Produces read-only review browsing and guidance; independent of other Wave 1 tasks.

- [ ] **Step 1: Write failing copy test**

```ts
expect(productReviewAccessCopy).toBe(
  "Reviews can be written from delivered items in your order history.",
);
```

Run focused presentation test; expect missing export failure.

- [ ] **Step 2: Remove generic write action**

Delete `PencilEdit01Icon`, `useStorefront`, write button, toast, and unavailable copy. Keep summary/distribution/public empty state and purchase-panel scroll anchor. Add read-only account-order guidance without implying eligibility. Remove `"use client"`; no browser behavior remains after the action is deleted.

- [ ] **Step 3: Verify and commit**

```bash
pnpm exec vitest run src/features/storefront/product/product-detail-presentation.test.ts
pnpm exec tsc --noEmit --pretty false --incremental false
pnpm audit:buttons
git add src/features/storefront/product
git commit -m "fix(storefront): move review creation to delivered orders"
```

---

### Task 8: Public projection, E2E, and completion gates

**Files:**
- Create: `src/server/commerce/reviews/public-reviews.ts`
- Create: `src/server/commerce/reviews/public-reviews.test.ts`
- Modify: `src/app/products/[slug]/page.tsx`
- Modify: `src/features/storefront/product/product-detail.tsx`
- Modify: `src/features/storefront/product/product-reviews.tsx`
- Create: `tests/e2e/storefront-verified-review.spec.ts`
- Modify: `docs/storefront-v2/phase-2-3N-status.md`

**Interfaces:**
- Produces published-only public aggregates/list DTOs, return/refund markers, acceptance evidence, and tracker disclosure.

- [ ] **Step 1: Write failing public projection tests**

Test published-only inclusion; exclusion of pending/rejected/withdrawn; retained returned/refunded markers; privacy-safe author data; public-product visibility; correct zero/one/multiple average and 1-5 distribution.

Run: `pnpm exec vitest run src/server/commerce/reviews/public-reviews.test.ts`

Expected: FAIL because module is absent.

- [ ] **Step 2: Implement/integrate public projection**

```ts
export async function getPublishedProductReviews(slug: string): Promise<{
  average: number;
  count: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
  reviews: PublicProductReview[];
}>;
```

Compose the repository's public product visibility predicate, select `status: "published"`, derive line lifecycle marker, and integrate in the server loader without making the page client-rendered or caching private data.

- [ ] **Step 3: Add Playwright flow**

Cover delivered line -> form -> submit -> pending account state, plus undelivered and fully returned denial. Use the established test auth/data boundary; never add production fake identity/data.

- [ ] **Step 4: Run executable quality gates**

```bash
pnpm prisma:format
pnpm prisma:validate
pnpm prisma:generate
pnpm audit:buttons
pnpm lint
pnpm exec tsc --noEmit --pretty false --incremental false
pnpm exec vitest run --passWithNoTests
pnpm build
pnpm dlx react-doctor@latest . --verbose --diff
```

Expected: changed scope passes; exact pre-existing repository failures are recorded, never represented as passing.

- [ ] **Step 5: Browser/accessibility review**

Validate 375x812, 768x1024, 1280x800; empty/mixed/eligible/pending/published/rejected/withdrawn/returned/refunded/expired states; keyboard star selection/focus/confirmation; no overflow; 44px targets; contrast; console/network; screenshots. Mark browser checks blocked if tooling is unavailable.

- [ ] **Step 6: Guidelines, tracker, and final diff**

Load the latest `web-design-guidelines`, review every changed UI file, and update `phase-2-3N-status.md` with owner override, implemented scope, evidence, exclusions, and unrelated blockers.

```bash
git diff --check
git status --short
git diff --stat
```

Confirm `.claude/settings.local.json` remains untouched.

- [ ] **Step 7: Commit**

```bash
git add src/server/commerce/reviews tests/e2e/storefront-verified-review.spec.ts docs/storefront-v2/phase-2-3N-status.md
git commit -m "test(storefront): verify delivered-item reviews"
```
