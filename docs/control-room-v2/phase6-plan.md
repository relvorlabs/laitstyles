# Laitstyle Control Room V2 — Phase 6 Store Settings Plan

## Status

**Phase 6 implementation complete — consolidated acceptance blocked.**

Phase 6 was completed under the user’s explicit override while Phase 4 and Phase 5 remained implemented but unaccepted. Both required private-repository workflows still fail before checkout with zero steps and no logs. The override permits implementation; it does not mark any blocked phase or check as passing.

## Goal

Deliver a polished store-configuration experience that lets a non-technical Laitstyle admin understand and change store behaviour using plain business language.

Settings is one coherent operating surface with distinct sections rather than six unrelated generic forms. Every section explains the customer or store outcome of a choice and preserves truthful boundaries.

## Locked scope

### In scope

- `/admin/settings`
- Section navigation for Store identity, Selling preferences, Delivery, Payments, Notifications and Team
- Store name, description, contact details, social accounts and visual identity preview
- Currency, hold duration, low-stock threshold, default product mode and pay-on-delivery preference
- Delivery zones, pickup locations, rates and estimated times
- Accepted payment methods, bank-transfer instructions, pay-on-delivery deposit and refund preference
- Order, hold, stock, payment and delivery notification preferences
- Team member, role and responsibility boundary without staff-access claims
- React Hook Form and Zod validation
- Dirty-state protection, explicit save feedback and session-only shared-store updates
- Default, loading, error, validation, success and truthful restricted states
- Responsive coverage at 375 × 812, 768 × 1024 and 1280 × 800

### Out of scope

- Payment-provider setup
- Courier-provider setup
- Webhooks or event subscriptions
- Production file upload or logo storage
- Database/admin infrastructure
- Real staff authentication, invitation delivery or permission enforcement
- Phase 7 integration hardening

## Product rules

- Labels describe business outcomes, not implementation details.
- Do not expose API keys, webhooks, cache, database, provider configuration or sync terminology.
- Configuration uses one typed store-settings record; sections do not maintain independent canonical values.
- Save actions remain session-only and say so.
- Visual previews are read-only demonstrations of current form values.
- Team controls document roles and responsibilities but do not claim real access enforcement.
- Settings navigation is exposed only after the useful route, loading, error and mobile states exist.

## Batches

### Batch 6A — settings domain and validation — implemented

- [x] Typed store-settings model
- [x] Deterministic defaults
- [x] Focused Zod section schemas and full-record validation
- [x] Safe numeric normalization for form controls
- [x] Focused valid-default and invalid-business-input tests
- [x] One typed save-result boundary through the shared Control Room store
- [x] Subscriber, state and invalid-save regression tests

### Batch 6B — Settings route and responsive shell — implemented

- [x] `/admin/settings`, loading and error boundaries
- [x] Desktop settings rail
- [x] Mobile section selector
- [x] URL-backed section state
- [x] Current-section, dirty-state and last-changed summary
- [x] Store → Settings navigation exposed after route completion

### Batch 6C — identity, selling and delivery forms — implemented

- [x] Store identity form and live storefront preview
- [x] Selling preferences with business-language helper text
- [x] Delivery zones and pickup locations with dynamic rows
- [x] Live checkout-choice preview
- [x] Dirty-value preservation across section changes
- [x] Before-unload protection and discard confirmation
- [x] Contextual save feedback

### Batch 6D — payments, notifications and team boundary — implemented

- [x] Accepted payment methods, instructions, deposit and refund preference
- [x] Pay-on-delivery synchronization across Selling and Payments
- [x] Notification preference controls and attention summary
- [x] Team roles, responsibility map and unsent-invite boundary
- [x] At-least-one-owner validation
- [x] Atomic shared-store update and visible saved state

### Batch 6E — consolidated acceptance — coverage encoded, execution blocked

- [x] Scope and changed-file responsibility audit
- [x] Business-language and truthful-boundary audit
- [x] Focused settings URL test
- [x] Existing settings schema and shared-action tests retained
- [x] Browser validation, navigation, dirty-state, save and team checks encoded
- [x] Required screenshots encoded at 375 × 812, 768 × 1024 and 1280 × 800
- [x] Horizontal-overflow assertions encoded
- [x] Mobile sticky-save geometry assertion encoded
- [ ] ESLint executed on final implementation head
- [ ] TypeScript executed on final implementation head
- [ ] Full Vitest suite executed on final implementation head
- [ ] Production build executed on final implementation head
- [ ] React Doctor executed on final implementation head
- [ ] Browser interactions executed on final implementation head
- [ ] Screenshot review completed
- [ ] Phase 6 marked accepted

## Acceptance criteria status

- [x] All labels describe store or customer outcomes.
- [x] No API, webhook, cache, database or provider-configuration language is visible in the Settings interface.
- [x] Save feedback is explicit, contextual and truthful about refresh behaviour.
- [x] Settings sections remain visually distinct inside one coherent workspace.
- [x] One settings record owns every section value.
- [x] Invalid contact, selling, delivery, payment and team inputs receive recoverable errors.
- [x] At least one delivery option, payment method and store owner remain required.
- [x] Desktop, tablet and mobile coverage is encoded.
- [ ] Complete executable phase checks pass.

## Gate decision

- Phase 6 implementation complete: **Yes**
- Phase 6 accepted: **No**
- Pull request ready for review: **No**
- Phase 7 permitted by normal gate: **No**

Phase 7 remains locked until an executable environment runs the consolidated checks successfully or the user explicitly overrides the gate again.
