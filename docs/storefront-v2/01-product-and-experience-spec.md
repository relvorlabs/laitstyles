# 01 — Product & Experience Spec

Defines *what the storefront must do for the customer* and how it behaves. Route/rendering/wiring is in [`02`](02-information-architecture-and-routes.md); data shapes in [`03`](03-commerce-domain-and-data-contract.md); visuals in [`05`](05-ui-system-and-wireframes.md).

## 1. The customer journey (end to end)

```
discovery → search & filtering → category/collection browsing → product evaluation
→ variant or unique-piece selection → cart or timed hold → auth where required
→ delivery selection → payment → verified order creation → fulfilment updates
→ order tracking → returns where eligible → verified reviews → repeat purchase & account
```

Every stage below defines: purpose · required behaviour · states (default/loading/empty/error/success) · consumer copy · what is server-authoritative.

## 2. Consumer language (binding)

Use: **Shop, New in, Pieces, Products, Collections, Available, Only one left, In your cart, Reserved for you, Sold out, Delivery, Order, Track order, Saved items, Returns.**
Never surface internally: *inventory, stock movement, intake, publication state, lifecycle, control room, channel, SKU (except where a shopper genuinely needs a reference), reserved/available counts as raw numbers.* Map admin status strings to consumer copy (§9.4). A one-of-one piece is "the only one" / "Only one left" — never "stock: 1".

## 3. Brand & experience principles

Editorial, tactile, confident, warm, image-led — a real fashion thrift destination, not a SaaS template. Product **imagery, fit, measurements, condition, defects, price, availability, delivery expectation, and return eligibility** drive the experience. Trust is a first-class feature (grading honesty, defect disclosure, one-of-one scarcity that is *real*, secure checkout, clear returns).

## 4. Homepage

Sections, all **driven by live DB + safe admin merchandising settings** (never random, never fabricated counts):
1. **Hero / campaign** — image-led, one clear primary action ("Shop New in"); campaign image + copy from `store_settings` (safe fields only).
2. **New in** — most recently published storefront-visible products (real query).
3. **Featured collection** — admin-selected collection (setting) or newest active collection.
4. **Shop by category** — categories with **counts computed from storefront-visible products only** (0-count categories hidden).
5. **Editorial/styling feature** — derived from a flagged collection (Journal descoped, `03`).
6. **Trust & condition grading** — explains the 4-point grade + one-of-one model.
7. **Delivery / pickup value prop** — from `delivery_zones`/`pickup_locations` presence.
8. **Recently reduced / last pieces** — *only if* `reference_price > price` (valid compare-at) or `available` low; else omitted.
9. **Newsletter** — real capture (§10).
10. **Announcement bar** (optional, dismissible, admin-configurable, never blocks checkout, accessible, no marquee).

States: skeleton per section (Suspense); empty → "First pieces land soon" with newsletter; error → inline retry per section (a failed rail must not blank the page).

## 5. Discovery — search, filter, browse

### 5.1 Shop / PLP (`/shop`, `/shop/category/[slug]`, `/collections/[slug]`)
- Shows **all storefront-visible products** for the context; real total count; sorting; filtering; pagination decision per surface (`02` §pagination); mobile filter **sheet**, desktop filter region; removable filter **chips** + clear-all; **shareable URL state** preserved across back/forward; recently viewed where useful.
- **Filters (shopper-facing only):** category, collection, brand, size, colour, condition, price range, availability, new arrivals, reduced price, pickup availability. *Inventory mode* only if genuinely useful (e.g. "one-of-one only"). Never surface lifecycle/publication.
- **Sorting:** newest, price low→high, price high→low, most relevant (search), biggest reduction (only if valid compare-at), last-chance (only if logic supports).
- **States:** default grid · skeleton grid (stable layout, no CLS) · **designed** no-results with recovery (spelling, broaden, "Shop New in", suggested pieces) · query error retry · stale-while-refetch keeps prior results visible.

### 5.2 Search (`/search?q=`) + search overlay
- Overlay = **command-style dialog/sheet**: autocomplete, recent searches, trending/featured, category & product suggestions, keyboard nav, loading/empty/error, "View all results" → `/search?q=`.
- **Real search** replaces the hardcoded `typoMap`. Strategy (evaluated in `04` §search): PostgreSQL FTS (`tsvector`) + `pg_trgm` similarity for typo tolerance over name/description/category/collection/brand/colour/size/condition(+tags if added). Define ranking, typo tolerance, result highlighting, query analytics, abuse/rate limits. Zero-result state offers suggestions + popular pieces.

### 5.3 Product card (one contract, variants — see `05`)
Cover image (+ deliberate alternate on hover where available), name, price, valid compare-at + reduction %, condition, size/variant summary, stock message, one-of-one message, saved state, sold state, unavailable state, **hold owned by me** vs **hold owned by another shopper**, quick-add only when selection is unambiguous, link to canonical PDP, responsive image sizes, keyboard focus, accessible labels. No separate incompatible cards per surface.

## 6. Product detail (`/products/[slug]`)

Server-composed from the DB. Includes: breadcrumbs; media gallery (cover/detail/defect via Cloudinary) with **zoom/lightbox dialog**; name; category/collection/brand; selling price + valid compare-at; condition grade; **explicit defect disclosure**; description; **mode-aware selection** (unique / stocked qty / variant options); size; colour; measurements; fit guidance; quantity rules; **real stock & reservation status**; delivery estimate by destination/zone; pickup availability; **return eligibility stated before purchase**; secure-checkout reassurance; save; share; add-to-cart / reserve; **hold expiry derived from server `expiresAt`** (not a client timer); reviews (verified-purchase marker); related products; recently viewed; **Product JSON-LD** + `AggregateRating` only from real published reviews; sold-out → alternatives.

Overlays (never hide core info in them): size guide dialog, measurements explanation dialog, image lightbox dialog, delivery-estimate popover/sheet, condition-guide dialog, sign-in encouragement dialog, notify-me capture. **Variant selection must never allow an impossible or out-of-stock combination** (disabled/greyed with reason).

States: default · skeleton (gallery + info) · not-found (unpublished/archived/invalid slug → 404 or "no longer available" with alternatives) · error retry · success (added/held confirmation).

## 7. Cart & timed holds (concurrency-safe, real)

Cart is a **side sheet** (fast surface, in header) + **`/cart` page** (deep-linkable, accessible fallback). The 15-minute reservation implied by the current UI must become **real and concurrency-safe**, sourced from `holds.expires_at` on the server.

### 7.1 Reservation semantics (decisions — ADRs in `04`)
- **Unique product:** adding to cart **immediately creates a hold** (it is the only one; browsing→cart is the commitment point).
- **Stocked/variant product:** reserve quantity **at cart** (hold created with quantity) so scarcity is honest; re-validated at checkout and at payment initiation.
- **Hold duration:** single default (e.g. 15 min) at cart stage; **extended/refreshed** when checkout starts and while payment is in progress (stage-aware `holds.stage`), never silently infinite.
- **Guest holds:** owned by a **guest session** (signed token cookie, `03`/`04`); merged into the customer's holds on sign-in (dedupe lines).
- **Limits:** max cart quantity per line (stocked); one active hold per unique piece; a sane max hold count per session (abuse guard).
- **Browser close / multi-device:** hold persists server-side until `expiresAt`; visible on any device once authenticated; a background query refreshes remaining time and detects loss.
- **Another shopper acquires it:** the item's availability query flips to `reserved_by_others`/`sold_out`; the UI shows it inline (not a fake toast), offers notify-me/alternatives.
- **Expired hold at checkout:** blocked with a clear "your hold expired — re-hold" recovery; never silently charge.
- **Admin-created holds** (source `admin`) and storefront holds share the `holds` table and the same stock accounting.

### 7.2 Atomicity (required)
Reserve/release/expire/convert/cancel are **transactional and idempotent**. Reserve, in one transaction: (1) verify available stock; (2) acquire row lock / safe conditional update; (3) create hold; (4) decrement `available`, increment `reserved`; (5) write `stock_movements`; (6) commit. Two simultaneous customers must **never** both obtain an active hold on the same unique piece. **Client timer is display only; server `expiresAt` is truth.** (Test matrix `07` — racing users.)

### 7.3 Cart UI
Product image, product/variant identity, condition/measurements summary, unit price, quantity control (stocked only), hold expiry, remove/release, unavailable-line handling, price-change handling, stock-change handling, subtotal, real discounts only, delivery-estimate notice, continue shopping, checkout, empty, loading, mutation failure, guest persistence, authenticated cross-device persistence, **cart merge after sign-in**. No local-array cart truth; **no optimistic "held" claim before the server transaction succeeds.**

## 8. Authentication & account policy

One Supabase Auth system; one customer identity (`customers.profile_id = auth.uid()`). Reuse existing routes/actions; **do not reproduce auth in `account/page.tsx`.**

- Browsing, search, cart do **not** require an account.
- **Checkout supports guest purchase** (reduce friction); email captured for receipt/tracking.
- **Saved items, persistent addresses, review submission, full order history require an account.**
- Guest order **claimable** after auth when email ownership verified; guest cart + active holds **merge** safely after sign-in.
- **Order tracking** possible via order number + verified email or secure token (no account needed).
- Flows to cover: email/password sign-up, email confirmation, sign-in, Google OAuth, forgot/reset password, sign-out, invalid/expired callback handling, safe `next` redirects, protected account routes, session refresh, account deactivation/deletion policy, profile creation, **link auth user → customer record**, duplicate-email reconciliation, auth errors, loading/success states.

## 9. Orders, tracking, fulfilment

### 9.1 Account order list
Order number, date, item summary, total, payment status (consumer copy), fulfilment status (consumer copy), latest update, reorder/similar where appropriate.

### 9.2 Order detail (`/account/orders/[orderNumber]`)
Order lines with **price snapshot**, delivery address snapshot, payment summary, **fulfilment timeline** (`order_timeline_events`), courier + tracking number, contact support, cancellation eligibility, return eligibility, printable/downloadable receipt.

### 9.3 Public tracking (`/track-order`)
Secure lookup by order number + email or secure token; **no customer-data leakage** (safe timeline fields only); rate-limited; enumeration-resistant.

### 9.4 Canonical status model (map admin → consumer copy)
Order received · Payment confirmed · Preparing your order · Ready for pickup · Handed to courier · Out for delivery · Delivered · Cancelled · Return requested · Returned · Refunded. Never expose raw DB status strings. (Mapping table maintained in `03` §Order.)

## 10. Saved items & notifications

- Guest local saves vs authenticated persistent saves (`customer_saved_products`); **merge after sign-in**; save/remove mutations; sold-product behaviour; **back-in-stock** (stocked/variant) and **released-hold** (unique) notifications; email consent; unsubscribe; duplicate-subscription prevention; notification expiry; rate limiting. **Do not promise notifications without defining delivery mechanism + persistence.** Mechanism is now defined: **Resend** email (`RESEND_API_KEY` added — `08` §3), gated on `laitstyles.com` DNS (SPF/DKIM/DMARC) being verified. V1 default: auth-gated wishlist; back-in-stock/released-hold as opt-in email, persisted, deduped, expiring; newsletter double opt-in + unsubscribe.

## 11. Reviews (verified)

Verified-purchase requirement; eligible order status; review window; **one review per eligible order line**; rating; title; body; fit feedback (needs `fit`/`size_ordered` columns — `03`/`04`); moderation status (`pending`→`published`); published aggregation (`AggregateRating` real); edit/deletion policy; abuse handling; empty state; pagination; structured review data. **Remove all hardcoded reviews from the PDP.**

## 12. Returns

Eligibility rules; request deadline; excluded conditions (e.g. certain final-sale/thrift items if policy says so); reason selection; line-level return quantity; evidence upload only if required; status timeline; refund status; restock-vs-damaged disposition; customer communication; admin handoff; delivery/drop-off instruction. **Return policy must be explicit before payment** and honest — do not imply all one-of-one/thrift items are returnable if policy excludes them.

## 13. Explicit prototype boundaries (labeled, never faked)

- **Payments:** **Paystack test mode is configured** (`08` §2) — checkout runs the real init → callback → **authoritative webhook** flow against test keys; an order is marked paid only by the verified `charge.success` webhook, never by the browser. Where test config is incomplete, an explicit "payment pending" boundary is shown — **never a fake PAID screen**.
- **Courier tracking:** timeline from `order_timeline_events` (written by admin); no live courier API polling in V1.
- **Admin persistence:** only product create/publish→DB is migrated in this effort (`00` §I, `06` Phase 1); other admin domains remain transitional.
- **Notifications:** only implemented if the delivery mechanism is defined; otherwise the CTA is captured + persisted, not falsely "sent".
