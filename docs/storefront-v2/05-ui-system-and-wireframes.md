# 05 — UI System & Wireframes

The dedicated design/layout/interaction document. **Wireframe-first:** these greyscale structures are validated before any high-fidelity work. Implementation skills (`ui-ux-pro-max`, `web-design-guidelines`, `frontend-design`, `shadcn`) are loaded at Phase 2 (point of use), per AGENTS.md.

## 1. Aesthetic direction
Editorial, tactile, confident, warm, image-led — a real fashion thrift destination. **Must not** look like: a SaaS dashboard, an admin panel, a Tailwind component gallery, a purple-gradient AI landing page, uniform rounded-card grids, or a database UI.

## 2. Design system (tokens)

### 2.1 Typography — **keep the repo's system** (verified in `src/app/layout.tsx`)
- **UI/body:** `Instrument Sans` (`--font-instrument-sans`). **Display/editorial:** `Newsreader` (serif, optical-size axis) — the editorial voice. **Data/labels/kickers:** `Geist Mono`.
- This overrides the generic "Geist + Instrument Serif" default: the repo pairing is already coherent and non-generic; forcing a swap would reskin without gain. The anti-slop *principles* still apply.
- Rules: display letter-spacing −0.015…−0.025em; UPPERCASE kicker tracking +0.06…+0.1em (mono); body 0, line-height ~1.6, max-width ~65ch; `text-wrap: balance` headings / `pretty` paragraphs; `tabular-nums` for prices/countdowns/quantities.

### 2.2 Colour — **centralized semantic OKLCH tokens** (replace pervasive raw hex)
- Intentional **off-white** and **off-black** neutrals (never `#000`/`#fff`). One **restrained signal accent** used only for primary CTA + focus ring + brand mark (the existing warm-green `accent` / oxblood-adjacent palette is compatible — formalize as tokens).
- Roles: `background, surface, surface-raised, foreground, muted-foreground, border, input, accent, accent-foreground, chip-bg, chip-border, success, warning, danger, focus`. **No raw hex in JSX** — the current `#8A887E`/`#4A5540`/`#B04A45` sprawl becomes tokens. Store identity values may come from **safe** `store_settings` (logo, campaign image), but **arbitrary CSS never comes from the database**.
- Light and dark designed as a **paired system** (not mechanical inversion): dark lifts surfaces per elevation rather than darkening with shadows; accent may shift for contrast.

### 2.3 Spacing, radius, elevation, motion
- 4px base scale (4/8/12/16/24/32/48/64/96). Touch targets **≥44×44px**.
- **One** non-default radius chosen and used consistently (the repo already leans ~10–14px; formalize one token; `rounded-full` for pills/avatars).
- 3 elevation tiers, multi-layer shadow from one light source; on dark, lift not shadow.
- Motion: `transform`/`opacity` only; standard 200–250ms `cubic-bezier(0.33,1,0.68,1)`; frequency rule (nav/search/cart ≤100ms, cards/dropdowns 150–250ms, modals/hero 300–600ms); **`prefers-reduced-motion` always honored**; **no fade-in on every section**, no bouncy springs on routine controls. Skeletons preserve layout (no CLS).

### 2.4 Icons — **HugeIcons** (migrate storefront off Lucide) for parity with Control Room.

### 2.5 Dark mode — **audit result**
The repo ships a storefront light/dark toggle. **Recommendation: keep dark mode but demote it** — a fashion/editorial brand is image-led and light-first; dark mode is a nice-to-have, not a headline. Keep the toggle (users expect it, accessibility benefit), design both as a paired system, but the brand's canonical, marketing-facing look is **light**. Do not invest in dark-only flourishes. (Reversible — ADR-08.)

## 3. Design-system enforcement (binding for all UI code)
**BANNED:** Inter/Roboto/Open Sans/Lato/DM Sans/Poppins (body)/Playfair Display; pure `#000`/`#fff`; purple/indigo/blue gradients; Tailwind slate defaults as the brand; **random inline hex in JSX**; centred-everything; generic 3-card grids; default radius on everything; lorem ipsum; "seamless/robust/supercharge/build the future"; generic stock photography; fade-in on every section; bouncy motion on routine controls; missing reduced-motion.
**REQUIRED:** centralized semantic OKLCH tokens; intentional off-white/off-black; one restrained accent; the repo's Instrument Sans + Newsreader + Geist Mono; strong product-image hierarchy; deliberate type scale; mobile-first; ≥44px targets; WCAG AA contrast; visible focus; reduced-motion; transform/opacity motion; **real product/customer copy**; consistent spacing/radius; **all five states** (default/loading/empty/error/success) everywhere.

### 3.1 Two binding build rules (see [`08`](08-integrations-and-environments.md) §5)
- **Tokens only — no hardcoded/inline theme or style.** No raw hex, no inline colour/spacing/type literals in JSX, no per-page bespoke theme. Every visual value comes from the semantic token layer (§2.2). A review/lint check flags raw hex + inline style colour and **fails the phase gate** (`07` §10). Store identity (logo/campaign image) may come from *safe* `store_settings`; arbitrary CSS never from the DB.
- **shadcn-first.** Before building any custom component, confirm shadcn (base-mira / Base UI) does not already provide it — use the `shadcn` skill + shadcn MCP registry search and inspect `components.json` + `src/components/ui/*`. If a primitive is missing, **add it via shadcn first**, then compose. A "custom" component is expected to be a **deep composition of shadcn primitives** (e.g. `ProductCard` = `Card`+`Badge`+`Button`+`AspectRatio`), never a hand-rolled reinvention. Hand-rolled `fixed inset-0` modals / bespoke popovers / custom form controls where a shadcn/Base UI primitive exists are rejected.

## 4. Shared component contracts (one contract, variants — no per-surface duplicates)
- **`ProductCard`** — single contract; variants: `feed` (home), `grid` (PLP/search), `compact` (rails/recs), `saved` (wishlist w/ remove), `rehomed` (sold archive). Props include mode-aware availability + `heldByMe|heldByOthers`. One card, not five.
- **`AvailabilityBadge`** — renders `available|low|reserved_by_others|reserved_by_me|sold_out` with **icon + text** (never colour-only), `aria-live` for live changes.
- **`PriceBlock`** — price + valid compare-at + reduction%; `tabular-nums`; hides compare-at when invalid.
- **`HoldCountdown`** — reads server `expiresAt`, displays remaining; display-only.
- **`ProductGallery`**, **`VariantSelector`** (disables impossible combos), **`QuantityStepper`** (stocked only), **`FacetPanel`** (sidebar + sheet reuse), **`FilterChips`**, **`SortMenu`** (popover), **`EmptyState`**, **`SkeletonGrid`**, **`ErrorState`** (retry), **`AuthDialog`**, **`CartSheet`**, **`SearchCommand`**.
- All dialogs/sheets: accessible title, focus trap, Escape/close, Base UI primitives (no hand-rolled `fixed inset-0`).

## 5. Wireframes

Notation: `[IMG]` image zone · `★` primary action · `{sheet}`/`{dialog}`/`{popover}` overlay boundary · states listed per surface. Every surface has mobile (375) + desktop (1280). Where structure repeats, compact specs + explicit state lists are given.

### 5.1 Storefront shell
```
MOBILE 375                              DESKTOP 1280
┌───────────────────────────┐          ┌────────────────────────────────────────────────┐
│ [≡]   LAITSTYLE     [♡][cart]         │ LAITSTYLE  New in · Coats · Denim · Collections  │
│ [ Search one-of-one … 🔍 ]│          │        [ Search one-of-one pieces 🔍 ] [☾][♡][account][cart n]
├───────────────────────────┤          ├────────────────────────────────────────────────┤
│  (page content)           │          │  (page content, max-w 1240, editorial gutters)   │
├───────────────────────────┤          ├────────────────────────────────────────────────┤
│ Footer: Shop · Help ·     │          │ Footer: Shop | Support | Delivery&Returns |      │
│ Track order · Legal · ✉   │          │ Track order | Social | Newsletter | Legal | ©    │
└───────────────────────────┘          └────────────────────────────────────────────────┘
[≡]→{menu sheet}  [cart]→{cart sheet}  [🔍]→{search dialog}  account→/account or {auth dialog}
```

### 5.2 Home
```
DESKTOP
┌ HERO ──────────────────────────────────────────────┐
│ kicker: SECOND-HAND, FIRST CHOICE · LAGOS           │
│ H1 (Newsreader) editorial line     [IMG hero 16:9]  │
│ [Shop New in ★]  [How it works]                     │
├ NEW IN ─────────────────────────────────────────────┤
│ ● New in — the moment they land   (real recency)    │
│ [card][card][card][card][card]      → /shop         │
├ FEATURED COLLECTION ── [IMG] + copy → /collections/x┤
├ SHOP BY CATEGORY ── tiles w/ real counts → category ┤
├ EDITORIAL FEATURE ── flagged collection story       │
├ TRUST / GRADING ── 4-point grade + one-of-one       │
├ DELIVERY / PICKUP value prop                        │
├ RECENTLY REDUCED (only if valid compare-at)         │
├ NEWSLETTER ✉  ├─ FOOTER                             │
```
States: **default** (rails populated) · **loading** per-section skeleton (Suspense) · **empty** ("First pieces land soon" + newsletter) · **error** per-rail inline retry (never blank the page) · **success** n/a. Mobile: single column, hero image-first, rails horizontal-scroll or stacked.

### 5.3 Shop / PLP (also category, collection)
```
DESKTOP                                          MOBILE
┌ breadcrumb  Home / Shop / [context] ──────┐    ┌───────────────────────────┐
│ H1 context  — {n} pieces (real count)     │    │ Home / Shop / ctx          │
├───────────┬───────────────────────────────┤    │ H1 ctx — n pieces          │
│ FACETS    │  [n pieces]        [Sort ▾]{pop}    │ [Filters n]{sheet} [Sort]  │
│ Category  │  [chip ×][chip ×]  Clear all  │    │ [chip ×][chip ×] clear     │
│ Collection│  ┌card┐┌card┐┌card┐┌card┐     │    │ ┌card┐┌card┐               │
│ Brand     │  ┌card┐┌card┐┌card┐┌card┐     │    │ ┌card┐┌card┐               │
│ Size      │  [ Load more · page 2 ★ ]     │    │ [Load more]                │
│ Colour    │  (Rehomed rail — sold archive)│    │                            │
│ Condition │                               │    └───────────────────────────┘
│ Price     │                               │
│ Availab.  │                               │
└───────────┴───────────────────────────────┘
```
URL state: `?category=&collection=&brand=&size=&colour=&condition=&price=&availability=&new=&reduced=&pickup=&sort=&page=`. States: **default** grid · **loading** SkeletonGrid (stable) · **empty/no-results** designed recovery (spelling for search, broaden, "Shop New in", suggested pieces) · **error** retry (keeps prior results while refetching = stale) · **success** n/a.

### 5.4 Search
- **Overlay {dialog, command}:** input · recent · trending · category suggestions · product suggestions (thumb+name+price) · keyboard nav · states: idle/loading/empty/error · "View all results ★" → `/search?q=`.
- **`/search?q=` results** = PLP grid variant (noindex). Zero-result → suggestions + popular pieces.

### 5.5 PDP `/products/[slug]`
```
DESKTOP
┌ № 0007 —— ONE OF ONE ······· Home / Coats / Name ─────────────┐
│ ┌ GALLERY ─────────────┐   ┌ INFO (sticky) ───────────────┐   │
│ │ [IMG cover 4:5] {zoom}│   │ CATEGORY · BRAND · ERA        │   │
│ │ [thumb][thumb][thumb] │   │ H1 Name (Newsreader italic)   │   │
│ └───────────────────────┘   │ story lead · description      │   │
│                             │ ₦price  ₦compare  −xx%        │   │
│                             │ [Condition grade] [Size·Colour]   │
│                             │ ● Availability (icon+text)    │   │
│                             │ [Reserve · hold 15:00 ★]      │   │  ← expiry from server
│                             │ [Measurements]{dialog} [♡][share] │
│                             │ ✓ Inspected · 7-day returns   │   │
│                             └───────────────────────────────┘   │
├ THE PLACARD — condition grade + measurements + defect note ─────┤
├ WHY ONLY ONE (editorial band)                                   │
├ WEARS WELL WITH (rail) · MORE FROM SHELF (rail)                 │
├ REVIEWS (real, verified marker, aggregate) [Write a review]{dialog}
├ FAQ / Before you reserve                                        │
└ JSON-LD: Product + Offer + AggregateRating(real) + Breadcrumb ──┘
```
Overlays: lightbox{dialog}, size guide{dialog}, condition guide{dialog}, delivery estimate{popover}, notify-me{dialog}, sign-in{dialog}. **Variant mode:** VariantSelector with disabled impossible combos. States: default · skeleton · **not-found** (unpublished/archived/invalid → 404 + alternatives) · error retry · success (added → cart sheet). Mobile: single column, gallery first, **sticky bottom CTA bar** (price + Reserve).

### 5.6 Cart — sheet + `/cart` page
```
CART {sheet}                                   /cart PAGE (deep-link, noindex)
┌ On hold for you (n)         [×] ┐            same content, full-width, + recommendations
│ ✓ free delivery on this bag     │            + continue shopping
│ [IMG] Name  ₦   Held 14:32  rm  │            + empty state links to /shop
│ [IMG] Name  ₦   qty[- 1 +] rm   │  (stocked)
│ …unavailable line: greyed + note│
│ ── Subtotal ₦ · delivery est ── │
│ [ Checkout ★ ]  [View full bag] │→ /cart
└─────────────────────────────────┘
```
States: default · loading · **empty** ("Your bag is empty" → Shop New in) · **mutation error** (release/qty failed, inline) · line-level unavailable/price-changed/stock-changed handling · guest & authenticated persistence · **merge after sign-in**. **No optimistic "held" before server success.**

### 5.7 Checkout `/checkout` (state machine)
```
Steps: Contact → Delivery(address/pickup) → Method → Payment → Review → Processing → Success | Failure
┌ LAITSTYLE (minimal chrome, noindex) ── Order summary (server-computed) ┐
│ ①Contact  ②Delivery  ③Method  ④Payment  ⑤Review     [ items · ₦subtotal ]
│  (active step form)                                  [ delivery ₦ (zone) ]
│  server-computed prices & fees · hold timer (server) [ VAT · Total ₦    ]
│  [ Back ]                    [ Continue / Pay ₦ ★ ]  [ hold: 12:40       ]
└──────────────────────────────────────────────────────────────────────┘
Processing{dialog}: provider redirect/session → webhook authoritative
Success → /checkout/success/[orderNumber]   Failure → recovery (retry / change method)
```
Required behaviour (per `04` §10): server-computed prices/fees; server-verified stock/holds; order draft + idempotency key; duplicate-submit prevention; payment attempt; signed webhook; idempotent processing; amount/currency verification; atomic order+stock conversion; retry after failure; abandoned-checkout handling; expired-hold recovery; delivery-zone/pickup validation; unsupported-address handling; terms acceptance; receipt; clear cart only after authoritative success. States: default/loading/empty(cart empty→shop)/error(declined,pending,zone disabled)/success. **Explicit "payment pending" boundary if no provider configured — never fake PAID.**

### 5.8 Order confirmation `/checkout/success/[orderNumber]`
Order number · items (price snapshot) · delivery-to · totals paid · "Track order" → `/account/orders/[n]` or `/track-order` · "View my orders" · receipt. Refresh-safe (idempotent). Guest sees claim-account prompt.

### 5.9 Account
- **Overview** `/account`: cards (active orders / arriving next / expiring hold / saved / action-required) → deep links; recently saved rail. **Real session; no fake `signedIn`.**
- **Orders** `/account/orders`: list (number, date, item summary, total, payment+fulfilment consumer copy, latest update, reorder). → detail.
- **Order detail** `/account/orders/[orderNumber]`: lines+snapshot, address snapshot, payment summary, **fulfilment timeline**, courier+tracking, support, cancel eligibility, return eligibility, receipt. Return → {dialog} → `/account/returns`.
- **Saved** `/account/saved`, **Addresses** (add/edit{dialog}, delete{AlertDialog}), **Returns**, **Profile**, **Security** (password/email, sign-out).
- Account data from **authenticated server queries**; mutations via Query. All five states each.

### 5.10 Public tracking `/track-order`
Form: order number + email/token → {loading} → timeline (safe fields only) | not-found | rate-limited. No customer-data leakage; enumeration-resistant.

### 5.11 Review form {dialog} & Return request {dialog/step}
- Review: rating, title, body, fit, size ordered; verified-purchase gate; submit → pending; states default/submitting/success/error/ineligible.
- Return: eligibility check, reason, line-level qty, (evidence if required), submit → status; ineligible messaging explicit.

## 6. Overlay usage summary (deep-linkable info never modal-only)
Sheets: mobile menu, cart, mobile filters, address add/edit, order quick summary. Dialogs: lightbox, size/condition guide, delete confirm, release-hold confirm (only if needed), review form, return confirm, auth, search. Popovers: sort, account menu, compact variant selector (only where safe). Full pages: search results, shop, category, collection, PDP, checkout, account sections, order detail, tracking, help/policy.

## 7. Responsive & a11y (every wireframe)
Viewports 375/390/768/1024/1280/1440. No horizontal overflow; mobile **restructures** tasks (not shrunken tables); ≥44px targets; keyboard order matches visual; focus trap in overlays; icon-only controls have names; status never colour-only; WCAG AA; reduced motion; predictable Escape/close. Screenshots + visual review are Phase-gate evidence (`07`).
