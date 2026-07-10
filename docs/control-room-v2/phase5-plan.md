# Laitstyle Control Room V2 — Phase 5 Customers Plan

## Status

**Phase 5 implementation complete — consolidated acceptance blocked.**

Phase 5 began by explicit user override and all scoped batches are now implemented. Phase 4 remains implemented but unaccepted because the repository workflows still fail before checkout with zero steps and no logs. The override permitted implementation; it does not convert Phase 4 or Phase 5 into passing or accepted phases.

## Goal

Deliver an operational customer relationship workspace derived from the same orders, holds, returns, reviews, products and activity records already used across Control Room V2.

The workspace must feel like a fashion-store relationship ledger, not a generic CRM. Customer identity and current attention lead; commerce history, product context and delivery preferences support the next operational decision.

## Locked scope

### In scope

- `/admin/customers`
- Search, operational segments, customer-type filter and sorting
- Desktop customer table and task-focused mobile cards
- Deep-linkable customer detail workspace
- Derived lifetime spend, average order value, order count, returns, cancellations and active holds
- Relationship timeline covering orders, offline sales, holds, returns, reviews, payments and delivery events
- Purchased, held, saved and reviewed product context
- Saved addresses, delivery history and delivery preferences
- Session-only internal notes through the shared Control Room store
- Default, loading, empty, error, validation and success states
- Responsive verification targets at 375 × 812, 768 × 1024 and 1280 × 800

### Out of scope

- Marketing automation or campaigns
- Messaging, WhatsApp or email integration
- Enterprise CRM stages, pipelines or lead scoring
- Loyalty points, rewards or vouchers
- Production persistence, authentication or staff permissions
- Phase 6 Store Settings

## Product and data rules

- Customer totals are always derived from connected records; do not store lifetime-spend or order-count snapshots on the customer.
- Offline sales appear automatically because they create connected orders with `customerId`.
- Holds and returns appear automatically when their records reference the customer.
- Stable profile information may live on the customer: customer type, saved addresses, contact/delivery preferences, saved product IDs and internal notes.
- Failed payments, delivery exceptions, open returns and risky active holds create explicit attention reasons; status is never conveyed by colour alone.
- Prototype segment rules are deterministic and selector-owned: `returning` means at least 2 connected orders, `new` means fewer than 2, and `high-value` means at least ₦50,000 net paid spend. A customer may belong to more than one segment.
- Internal notes are prototype session state only and say so in the interface.
- People navigation was exposed only after the Customers route had useful default, empty, loading and error states.

## Implemented batches

### Batch 5A — customer truth and selectors — implemented

- Dedicated typed customer profile domain
- Derived customer metrics, segments and attention reasons
- Connected timeline, product relationship and delivery-history selectors
- Stable profile hydration for customer type, addresses, preferences, saved products and notes
- Focused tests for totals, offline sales, holds, returns and product relationships

### Batch 5B — responsive Customers workspace — implemented

- `/admin/customers`, loading and error boundaries
- URL-backed search, saved views, type filter and sorting
- Relationship summary strip
- Desktop operational table
- Tablet two-column composition
- Mobile task-focused customer cards
- Default and empty states
- People navigation in desktop and mobile navigation surfaces

### Batch 5C — customer detail and notes — implemented

- Deep-linkable customer detail sheet
- Full-viewport mobile detail target
- Overview, timeline, products and delivery tabs
- Summary metrics, contact preferences, addresses and delivery history
- Session-only internal note action through the shared Control Room store
- Field validation and sticky success/error feedback inside the active sheet
- Links back to connected Order and Inventory records

### Batch 5D — consolidated acceptance — encoded, execution blocked

- [x] Scope and changed-file audit
- [x] Latest Web Interface Guidelines review and changed-scope hardening
- [x] Focused selector, URL and customer-action tests added
- [x] Customer search, attention, detail, note and Record Sale regression browser script added
- [x] Required route/detail screenshots encoded at 375 × 812, 768 × 1024 and 1280 × 800
- [x] Exact mobile sheet geometry and horizontal-overflow assertions encoded
- [ ] ESLint executed on final head
- [ ] TypeScript executed on final head
- [ ] Full Vitest suite executed on final head
- [ ] Production build executed on final head
- [ ] React Doctor executed on final head
- [ ] Browser interactions and screenshots executed on final head
- [ ] Screenshot review completed

## Acceptance criteria coverage

- Amara Okafor’s spend and order totals derive from her connected paid orders.
- Failed-payment and delivery attention derive from Nneka Obi’s connected orders.
- Active holds derive from hold state and the Control Room clock.
- Offline purchases enter the customer timeline without a second customer-history write.
- Return records enter customer metrics and timeline when connected by `customerId`.
- Product relationships distinguish purchased, held, saved and reviewed context.
- Notes update the subscribed customer workspace through one typed shared-store action.
- Mobile detail uses focused tabs rather than one compressed desktop composition.
- No marketing, messaging, loyalty or enterprise CRM surface is exposed.

## Current blocker

Both required private-repository workflows continue to create a `verify` job with no steps and no log URL. No lint, TypeScript, tests, build, React Doctor, browser or screenshot result exists for the final Phase 5 head, so Phase 5 is implemented but not accepted.