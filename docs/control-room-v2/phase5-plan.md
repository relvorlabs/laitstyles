# Laitstyle Control Room V2 — Phase 5 Customers Plan

## Status

**Phase 5 started by explicit user override.**

Phase 4 remains implemented but unaccepted because the repository workflows still fail before checkout with zero steps and no logs. This override permits Phase 5 work to begin; it does not convert Phase 4 into a passing or accepted phase.

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
- Default, loading, empty, error, validation, success and confirmation states
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
- Internal notes are prototype session state only and must say so in the interface.
- The Customers destination remains hidden until its useful default, empty, loading and error states are implemented.

## Batches

### Batch 5A — customer truth and selectors

- Extend the typed customer profile without duplicating operational totals
- Add customer metrics, segments, attention reasons and relationship selectors
- Add customer timeline, product relationship and delivery-history selectors
- Add focused tests for connected totals, offline sales, holds and returns
- Keep Customers navigation and route hidden

### Batch 5B — responsive Customers workspace

- Add `/admin/customers`, loading and error boundaries
- Add URL-backed search, saved views, type filter and sorting
- Add summary strip, desktop table, tablet composition and mobile cards
- Add default and empty states
- Expose desktop and mobile People navigation only after the route is complete

### Batch 5C — customer detail and notes

- Add deep-linkable detail sheet/workspace
- Add summary, timeline, products, addresses and delivery sections
- Add internal note creation through one typed store action
- Add recoverable validation, dirty-state handling where relevant and visible success feedback
- Verify offline sales, holds, returns and notes update the open workspace

### Batch 5D — consolidated acceptance

- ESLint
- TypeScript
- Full Vitest suite
- Production build
- React Doctor changed-scope review
- Latest Web Interface Guidelines review
- Required browser viewport matrix
- Customer search, filtering, detail, note creation and cross-workspace regression scripts
- Screenshot review
- Tracker and PR update

## Batch 5A acceptance criteria

- Amara Okafor’s spend and order totals derive from her connected paid orders.
- Failed-payment and delivery attention derive from Nneka Obi’s connected orders.
- Active holds derive from hold state and the Control Room clock.
- Offline purchases enter the customer timeline without a second customer-history write.
- Return records enter customer metrics and timeline when connected by `customerId`.
- Product relationships distinguish purchased, held, saved and reviewed context.
- No route, sidebar item or unfinished action is exposed.
- Required static checks and tests pass when an executable validation environment is available.
