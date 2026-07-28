# Core Customer Account Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect profile, addresses, saved products, customer order actions, returns and reviews to domain-owned persistence and typed APIs while preserving direct Server Component reads.

**Architecture:** Reuse existing customer/order/return/review server logic, move direct page Prisma mutations into domain commands, publish only browser-needed HTTP transports, then migrate legacy account UI into owning modules without redesign.

**Tech Stack:** Next.js 16, React 19, Prisma, TanStack Query, Zod, Vitest, Testing Library, Playwright.

## Global Constraints

- Plan 1 must pass first.
- Re-run `git status --short` before touching account address/return files; preserve the active user changes listed in the index.
- Keep Server Component reads direct. APIs exist for interactive refresh/mutations and external machine consumers.
- Do not create a new generic `account` persistence domain when an existing `customers`, `orders`, `returns` or `reviews` module owns the rule.

---

### Task 1: Move Profile and Address Rules into Customer Domain Commands

**Owner:** Laitstyles domain engineer

**Files:**
- Modify: `src/modules/customers/schema.ts`
- Modify: `src/modules/customers/types.ts`
- Create: `src/modules/customers/server/account-profile.ts`
- Create: `src/modules/customers/server/account-profile.test.ts`
- Create: `src/modules/customers/server/addresses.ts`
- Create: `src/modules/customers/server/addresses.test.ts`
- Modify: `src/app/(storefront)/account/profile/actions.ts`
- Modify after dirty-work reconciliation: `src/app/(storefront)/account/addresses/actions.ts`

**Interfaces:**
- Produces `getOwnedProfile(identity)`, `updateOwnedProfile(identity, input)`.
- Produces `listOwnedAddresses`, `createOwnedAddress`, `updateOwnedAddress`, `deleteOwnedAddress`.

- [ ] **Step 1: Write failing ownership and default-address tests**

```ts
it("replaces the previous default in one transaction", async () => {
  await updateOwnedAddress(identity, "address-2", { isDefault: true });
  expect(tx.customer_addresses.updateMany).toHaveBeenCalledWith({
    where: { customer_id: identity.customerId, id: { not: "address-2" } },
    data: { is_default: false },
  });
});

it("conceals another customer's address", async () => {
  mocks.findFirst.mockResolvedValue(null);
  await expect(deleteOwnedAddress(identity, "other-address"))
    .rejects.toMatchObject({ code: "ADDRESS_NOT_FOUND" });
});
```

- [ ] **Step 2: Verify RED**

Run: `pnpm test src/modules/customers/server/account-profile.test.ts src/modules/customers/server/addresses.test.ts`

Expected: FAIL because the domain files do not exist.

- [ ] **Step 3: Implement transport-neutral commands**

Move validation, ownership, profile/profile-details/customer synchronization and address default invariants out of app files. Keep thin actions that parse `FormData`, call the command and revalidate/redirect.

- [ ] **Step 4: Verify GREEN**

```bash
pnpm test src/modules/customers/server/account-profile.test.ts src/modules/customers/server/addresses.test.ts
pnpm typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/modules/customers src/app/(storefront)/account/profile/actions.ts src/app/(storefront)/account/addresses/actions.ts
git commit -m "refactor(customers): own profile and address commands"
```

### Task 2: Publish Profile, Address and Saved-Product APIs

**Owner:** Laitstyles domain engineer

**Files:**
- Create: `src/app/api/v1/account/profile/route.ts`
- Create: `src/app/api/v1/account/profile/route.test.ts`
- Create: `src/app/api/v1/account/addresses/route.ts`
- Create: `src/app/api/v1/account/addresses/[addressId]/route.ts`
- Create: colocated `route.test.ts` files.
- Create: `src/app/api/v1/account/saved-products/route.ts`
- Create: `src/app/api/v1/account/saved-products/[productId]/route.ts`
- Create: `src/modules/customers/client/account-api.ts`
- Create: `src/modules/customers/client/account-hooks.ts`
- Create: `src/modules/customers/client/account-keys.ts`

**Interfaces:**
- Standard success/error envelopes; every route calls `requireApiConsumer()` and domain ownership policy.

- [ ] **Step 1: Write failing route tests**

```ts
it("rejects an unauthenticated profile update", async () => {
  mocks.requireApiConsumer.mockRejectedValue(unauthenticatedApiError);
  const response = await PATCH(jsonRequest(validProfile));
  expect(response.status).toBe(401);
});

it("does not accept customer_id from an address payload", async () => {
  const response = await POST(jsonRequest({ ...validAddress, customer_id: "other" }));
  expect(response.status).toBe(400);
});
```

- [ ] **Step 2: Verify RED**

Run: `pnpm test src/app/api/v1/account/profile src/app/api/v1/account/addresses src/app/api/v1/account/saved-products`

- [ ] **Step 3: Implement thin handlers and typed browser calls**

Collection routes colocate `GET/POST`; address resource route colocates `PATCH/DELETE`. `POST /saved-products` accepts `{ productId }`; resource `DELETE` removes only the authenticated customer's relation. Browser clients use `apiRequest` and import no server module.

- [ ] **Step 4: Add query invalidation**

Profile/address mutations replace the returned resource then invalidate account overview. Saved-product mutations update `accountCustomerKeys.savedProducts()` and reconcile the authenticated saved-items store without making Zustand authoritative.

- [ ] **Step 5: Verify GREEN**

```bash
pnpm test src/app/api/v1/account src/modules/customers/client
pnpm check:architecture
pnpm typecheck
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/v1/account src/modules/customers/client
git commit -m "feat(account): expose profile address and saved APIs"
```

### Task 3: Add Customer Order, Return and Review Transports

**Owner:** Laitstyles domain engineer

**Files:**
- Modify: `src/modules/orders/schema.ts`
- Modify: `src/modules/orders/client/api.ts`
- Modify: `src/modules/orders/client/hooks.ts`
- Create: `src/app/api/v1/account/orders/route.ts`
- Create: `src/app/api/v1/account/orders/[orderNumber]/route.ts`
- Create: `src/app/api/v1/account/orders/[orderNumber]/cancellation-requests/route.ts`
- Modify after reconciliation: `src/modules/returns/**`
- Create: `src/app/api/v1/account/returns/route.ts`
- Create: `src/app/api/v1/account/returns/[returnId]/route.ts`
- Create: `src/modules/reviews/client/{api,hooks,keys}.ts`
- Create: `src/app/api/v1/account/reviews/route.ts`
- Create: `src/app/api/v1/account/reviews/[reviewId]/route.ts`
- Create: focused tests beside routes and commands.

**Interfaces:**
- Reuses `getAccountOrders`, `getAccountOrder`, account return queries and review policy/commands.
- Produces one cancellation-request command that does not directly cancel an ineligible paid/fulfilled order.

- [ ] **Step 1: Write failing ownership and lifecycle tests**

```ts
it("conceals an order not owned by the consumer", async () => {
  mocks.getAccountOrder.mockResolvedValue(null);
  const response = await GET(ownedRequest, { params: Promise.resolve({ orderNumber: "LS-1" }) });
  expect(response.status).toBe(404);
});

it("rejects a return for an undelivered line", async () => {
  await expect(createCustomerReturn(identity, undeliveredInput))
    .rejects.toMatchObject({ code: "RETURN_NOT_ELIGIBLE" });
});
```

- [ ] **Step 2: Verify RED**

Run: `pnpm test src/app/api/v1/account/orders src/app/api/v1/account/returns src/app/api/v1/account/reviews`

- [ ] **Step 3: Implement routes over existing domain operations**

Keep list/detail reads direct for Server Components. Browser APIs serialize the same audience-specific contracts. Cancellation, return and review mutations validate identifiers and consumer ownership on the server.

- [ ] **Step 4: Verify review transport parity**

Run existing review action tests plus new Route Handler tests. Expected: the Server Action and HTTP adapter return equivalent domain failure codes without importing one another.

- [ ] **Step 5: Commit**

```bash
git add src/modules/orders src/modules/returns src/modules/reviews src/app/api/v1/account
git commit -m "feat(account): expose order return and review operations"
```

### Task 4: Cut Over Core Account UI and Move Ownership

**Owner:** Laitstyles UI engineer

**Files:**
- Move relevant files from `src/features/storefront/account/sections/**` to owning `src/modules/{customers,orders,returns,reviews}/ui/storefront/**`.
- Modify: `src/app/(storefront)/account/**/page.tsx`
- Modify: `src/stores/saved-items.store.ts`
- Delete migrated legacy section files only after consumer scan.

**Interfaces:**
- Consumes server props for initial reads and typed hooks only for interactive remote state.

- [ ] **Step 1: Write failing interaction tests**

Test profile save pending/error/success, default-address mutation, saved-product sign-in synchronization, cancellation request, return submission and review withdrawal. Assert no success toast appears before the mocked API resolves.

- [ ] **Step 2: Verify RED**

Run: `pnpm test src/modules/customers/ui src/modules/orders/ui src/modules/returns/ui src/modules/reviews/ui`

- [ ] **Step 3: Move components mechanically, then connect hooks**

Preserve JSX/classes. Replace direct prototype callbacks with mutations. Retain Server Component data as initial props and avoid copying it into Context/Zustand.

- [ ] **Step 4: Delete only migrated files**

Run:

```bash
rg "@/features/storefront/account" src/app src/modules
```

Expected: no consumer for the moved core sections. Keep unrelated extended/security/payment prototype files for later plans.

- [ ] **Step 5: Verify UI and commit**

```bash
pnpm test src/modules/customers src/modules/orders src/modules/returns src/modules/reviews
pnpm check:architecture
pnpm typecheck
git add src/app src/modules src/features/storefront/account src/stores/saved-items.store.ts
git commit -m "refactor(account): connect core customer workflows"
```

### Task 5: Core Account Reviewer Gate

**Owner:** Laitstyles reviewer

- [ ] **Step 1: Run focused and full static gates**

```bash
pnpm test src/app/api/v1/account src/modules/customers src/modules/orders src/modules/returns src/modules/reviews
pnpm check:architecture
pnpm biome
pnpm typecheck
pnpm react-doctor
```

- [ ] **Step 2: Run browser acceptance**

At all required viewports/themes, verify profile, address, saved products, order detail/cancellation, return and review workflows; inspect console/network/server logs and screenshot parity.

- [ ] **Step 3: Record evidence**

Update the endpoint ledger rows to `consumer-complete` only for executed flows, then commit documentation with `docs(account): record core API evidence`.

