# Laitstyle Control Room V2 — Phase 6 Store Settings Plan

## Status

**Phase 6 started by explicit user override.**

Phase 5 is implemented but not accepted because both required GitHub Actions workflows still fail before checkout with zero steps and no logs. The override permits Phase 6 work; it does not mark Phase 4 or Phase 5 as passing.

## Goal

Deliver a polished store-configuration experience that lets a non-technical Laitstyle operator understand and change store behaviour using plain business language.

Settings should feel like one coherent operating surface with distinct sections, not six unrelated generic forms. Every section must explain the customer or store outcome of a choice and preserve truthful prototype boundaries.

## Locked scope

### In scope

- `/admin/settings`
- Section navigation for Store identity, Selling preferences, Delivery, Payments, Notifications and Team
- Store name, description, contact details, social accounts and visual identity preview
- Currency, hold duration, low-stock threshold, default product mode and pay-on-delivery preference
- Delivery zones, pickup locations, rates and estimated times
- Accepted payment methods, bank-transfer instructions, pay-on-delivery deposit and refund preference
- Order, hold, stock, payment and delivery notification preferences
- Team member, role and permission boundary without production authentication claims
- React Hook Form and Zod validation
- Dirty-state protection, explicit save feedback and session-only shared-store updates
- Default, loading, error, validation, success and truthful restricted states
- Responsive verification at 375 × 812, 768 × 1024 and 1280 × 800

### Out of scope

- Payment-provider API setup
- Courier-provider API setup
- Webhooks or event subscriptions
- Production file upload or logo storage
- Database/admin infrastructure
- Real staff authentication, invitation delivery or permission enforcement
- Phase 7 integration hardening

## Product rules

- Labels describe business outcomes, not implementation details.
- Do not expose API keys, webhooks, cache, database, provider configuration or sync terminology.
- Configuration uses one typed store-settings record; sections must not maintain independent canonical values.
- Save actions are session-only and must say so.
- Visual previews are read-only demonstrations of current form values.
- Team controls may demonstrate roles and boundaries, but cannot claim real access enforcement.
- Settings navigation remains hidden until the useful route, loading, error and mobile states exist.

## Batches

### Batch 6A — settings domain and validation — active

- Define the typed store-settings model
- Define deterministic prototype defaults
- Add Zod schemas and section-level validation helpers
- Add safe normalization for values captured from HTML controls
- Add focused tests for valid defaults and invalid business inputs
- Add one typed save-result boundary without exposing the route

### Batch 6B — Settings route and responsive shell

- Add `/admin/settings`, loading and error boundaries
- Add desktop side navigation and mobile section navigation
- Add section overview and unsaved-state summary
- Expose Store → Settings navigation only after route states are complete

### Batch 6C — identity, selling and delivery forms

- Store identity form and storefront preview
- Selling preferences form with business-language helper text
- Delivery zones and pickup locations with validation
- Dirty-close/section-switch protection and contextual save feedback

### Batch 6D — payments, notifications and team boundary

- Payment method and instruction form
- Notification preference controls
- Team member, role and permission boundary with explicit prototype limits
- Shared-store update verification

### Batch 6E — consolidated acceptance

- ESLint
- TypeScript
- Full Vitest suite
- Production build
- React Doctor changed-scope review
- Latest Web Interface Guidelines review
- Required browser viewport matrix
- Settings validation, save, dirty-state and navigation interactions
- Screenshot review
- Tracker and PR update

## Batch 6A acceptance criteria

- One settings type owns all section values.
- Prototype defaults satisfy the full Zod schema.
- Invalid store contact details, hold duration, stock threshold, delivery rates, estimated times and deposit percentages produce understandable field errors.
- At least one delivery option and one payment method remain enabled.
- Team data cannot imply production authentication or enforced permissions.
- No unfinished Settings route or sidebar item is exposed.
- Required checks pass when an executable validation environment is available.
