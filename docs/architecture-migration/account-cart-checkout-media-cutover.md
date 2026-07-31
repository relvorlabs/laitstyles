# Storefront Production-Readiness Cutover

**Branch:** `agent/account-cart-checkout-media-cutover`  
**Base:** `main` at `9b607376da1faa406bba1cf19d1b7ae6492d65cb`  
**PR:** `#62`  
**Workflow:** orchestrator → planner → data engineer → domain engineer → UI engineer → reviewer  
**Status:** implementation reopened; source audit and remediation in progress; execution gates not passed

## Authority and execution contract

This work follows the fixed six-role fleet introduced by commit
`66433b46e164c60a5e1821de21ef964a4f6d7ba8`, `.agents/workflows/feature.md`, and the repository agent
roles. The orchestrator sequences handoffs; the planner owns this specification and task ledger; data,
domain and UI engineers change only their owned boundaries; the reviewer does not silently implement
missing work or represent unavailable checks as passing.

The plan of record uses the relevant `relvorlabs/agent-controller` guidance:

| Role / concern | Skill or MCP guidance | Application |
| --- | --- | --- |
| Orchestration | `using-superpowers`, repository workflow doctrine | Select the correct workflow, preserve role ownership and publish truthful handoffs. |
| Planning | `find-skills`, Next.js ownership doctrine | Inventory routes, APIs, runtime risks and exclusions before broad edits. |
| Data | `supabase`, `supabase-postgres-best-practices`, `prisma-cli` | Reuse existing persisted truth, add no browser-owned payment or customer truth, validate migrations locally. |
| Domain | `next-best-practices`, `vercel-react-best-practices` | Thin Route Handlers, typed contracts, server-owned authorization, stable query identities and explicit loading/error states. |
| UI | `ui-ux-pro-max`, shadcn MCP guidance | Use shared primitives, accessible contrast, correct link/button semantics, CloudImage and customer-facing language. |
| Review | `react-doctor`, `playwright-cli`, Chrome DevTools MCP guidance | Type/static checks, duplicate-key/runtime-console inspection, network/API verification and responsive/theme accessibility. |

### Tool policy

- The GitHub connector is the active repository and PR tool.
- No GitHub Actions workflow is created, triggered or used as evidence.
- Supabase MCP, shadcn MCP, Chrome DevTools MCP, Prisma CLI, React Doctor and Playwright remain
  required local/manual reviewer gates when unavailable through the connector.

## Existing completed foundation retained

The prior PR scope remains authoritative: module-owned `/account/**` composition, persisted
customer cart, stable identity-scoped cache, saved-account checkout data, server coupon/recovery,
remainder-safe settlement and canonical product cover media. This extension does not roll those
contracts back.

## Newly confirmed production-readiness defects

1. **Image boundary drift.** At least one active account security surface still imports `next/image`
   directly. `CloudImage` is not yet enforced as the only application image component.
2. **Render identity and unsafe collection assumptions.** Account/storefront collections can receive
   duplicate product/order/media identifiers from joins, projections or stale cache snapshots. JSX
   keys and list normalization must remain unique and null-safe. Runtime code must not dereference an
   optional item or array position without a guard.
3. **Button/link contrast drift.** Shared `outline` and `ghost` variants inherit foreground color.
   When `Button` renders a Next `Link`, or `buttonVariants()` is applied directly, content can inherit
   a matching parent/background color and disappear. Link semantics and foreground ownership must be
   explicit across Admin, storefront and account.
4. **Storefront boundary uncertainty.** The route ledger is historical and cannot be treated as proof
   that every current page is connected. Public/account pages, typed clients, Route Handlers and
   server-domain reads require a current source reconciliation.
5. **Prototype actions.** Any control that reports fake success, mutates only browser state when
   persisted truth exists, or uses placeholder records is not production-ready.
6. **Payment-state presentation.** Success must render only from a settled owned server order. Failed,
   abandoned and recoverable attempts must use persisted checkout/payment state and real retry/resume
   behavior; no browser-authored receipt or fake status transition is allowed.
7. **Developer-facing authentication copy.** User-visible auth/account security text must not mention
   Supabase, sessions as implementation objects, provider internals, factor/challenge terminology or
   keyboard/developer instructions. Copy must fit a fashion storefront or store-team workspace.

## Product contracts

### Application image contract

- `src/components/ui/cloud-image.tsx` is the only application-level image renderer permitted to import
  `next/image`.
- Admin, storefront, account and auth UI import `CloudImage`; direct `next/image`, raw `<img>` and
  direct `CldImage` usage outside the wrapper are forbidden unless explicitly allowlisted as a
  low-level primitive.
- `CloudImageProps` remains type-safe, requires accessible `alt`, accepts valid Next image sources and
  narrows Cloudinary delivery URLs before rendering `CldImage`.
- Missing optional media renders an intentional placeholder or no image; undefined media is never
  dereferenced.

### Type and runtime-safety contract

- No new explicit `any` is introduced in application code. External unknown data starts as `unknown`
  and is parsed/narrowed before use.
- Nullable domain fields remain explicit. UI converts nullable data into a deliberate empty, fallback
  or unavailable state rather than using non-null assertions.
- Repeated collections are normalized at a domain/UI boundary before mapping.
- JSX keys are stable and unique to the rendered identity. Variant/order-line/media keys include the
  owning record where a leaf id is not globally unique.
- No active storefront/account path uses unchecked `[0]`, `.find(...)!`, optional-object property
  access after an incomplete guard, or a possibly undefined mutation result.

### Button and link contract

- Every shared button variant owns a readable foreground in light and dark themes.
- `default`, `secondary`, `outline`, `ghost`, `destructive` and `link` have explicit foreground states
  for rest, hover, focus, expanded and disabled behavior.
- A navigation control renders a semantic link through the supported Base UI `render` contract or a
  typed shared `ButtonLink`; it is not a nested interactive element.
- Direct `buttonVariants()` links receive the same contrast-safe variant contract.
- Icon-only controls retain an accessible name; SVG content inherits the button foreground.

### Storefront API and page contract

- Browser mutations use typed `/api/v1/**` Route Handlers owned by the relevant module.
- Server Components may call server-domain functions directly when that avoids a redundant self-fetch;
  the same capability still exposes a typed Route Handler when browser or external consumption is
  required.
- Route files remain thin: authenticate/authorize, parse, call the domain operation and serialize.
- Public catalogue/product pages, saved items, account profile/addresses/orders/returns/reviews,
  preferences/notifications/support/privacy/security/payment methods, cart, checkout, coupon,
  verification/recovery and order confirmation must each have an explicit real-data owner.
- No active page imports prototype datasets or creates customer/order/payment truth in component state.
- Empty databases render honest empty states, not sample fashion products, customers or orders.

### Payment truth contract

- Checkout initialization, verification, webhook settlement and recovery remain server-authoritative.
- A success page requires an owned settled order and displays persisted order/payment/fulfilment data.
- A failed or abandoned payment displays the persisted attempt state, preserves the cart/checkout and
  offers a real retry/resume action where policy permits.
- A missing/invalid order reference renders a neutral unavailable state; it is never labelled success.

### Authentication language contract

- Customer copy uses terms such as account, sign in, verification code, authenticator app, trusted
  device and sign out.
- Staff copy uses store workspace, approved team account, owner/manager access and secure sign in.
- Provider names, database/auth implementation names, token/session/factor/challenge jargon and
  developer debugging language are excluded from user-visible copy.
- Technical diagnostics remain in logs/server responses, not product UI.

## Phased execution and agent handoffs

### Phase 6 — Orchestrator and planner: current-state reconciliation

- [x] Reopen PR #62 scope without changing the no-Actions policy.
- [x] Extend the durable spec with image, runtime, button, API, payment and auth-language contracts.
- [ ] Reconcile the current branch route tree against the endpoint ledger.
- [ ] Produce a file-level matrix for active Admin, storefront, account and auth surfaces.
- [ ] Classify every finding as data, domain, UI or reviewer-owned.

**Handoff:** this specification plus the updated PR plan comment.

### Phase 7 — Data engineer: persistence truth review

- [ ] Confirm every supposedly real account/storefront capability has persisted source-of-truth data.
- [ ] Identify remaining prototype-only rows/actions and whether existing schema already supports them.
- [ ] Add schema/migration work only where a product-approved persisted concept is genuinely missing.
- [ ] Preserve RLS, ownership, constraints, idempotency and payment transaction invariants.

**Handoff:** persistence-gap report and migrations, if required; no UI-owned substitute truth.

### Phase 8 — Domain engineer: typed API and payment completion

- [ ] Reconcile all active browser mutations with typed `/api/v1/**` clients and Route Handlers.
- [ ] Remove unsafe response assumptions; parse `unknown`, preserve nullability and publish stable ids.
- [ ] Normalize/dedupe repeated projections before they reach render loops where appropriate.
- [ ] Complete persisted failed/abandoned/recoverable payment presentation and retry/resume contracts.
- [ ] Add focused tests for route ownership, duplicate projection normalization and payment-state rules.

**Handoff:** typed contracts, endpoint matrix, error semantics and cache invalidation rules.

### Phase 9 — UI engineer: visual/runtime remediation

- [ ] Migrate all direct application image rendering to `CloudImage`.
- [ ] Fix shared button/link foreground ownership and migrate unsafe link-button call sites.
- [ ] Add stable composite keys and deliberate null/empty placeholders to account/storefront lists.
- [ ] Remove fake-success controls and wire real typed mutations or honest unavailable states.
- [ ] Replace developer/provider language across customer and staff auth/security surfaces.
- [ ] Preserve the established visual design while correcting contrast, semantics and responsive states.

**Handoff:** source-complete UI awaiting reviewer execution.

### Phase 10 — Reviewer: executable production-readiness gate

Required source scans and commands, not run through GitHub Actions:

```bash
rg -n 'from ["'"']next/image["'"']|from ["'"']next-cloudinary["'"']|<img\b' src \
  --glob '!src/components/ui/cloud-image.tsx'
rg -n '\bany\b|\!\.|\[[0-9]+\]' src/app/'(storefront)' src/app/admin src/modules \
  --glob '*.{ts,tsx}'
rg -n 'demo|dummy|simulat|not available yet|Promise\.resolve|sessionStorage|paystack\.shop' \
  src/app src/features src/modules src/providers --glob '!*.test.*'
pnpm audit:buttons
pnpm check:architecture
pnpm biome
pnpm typecheck
pnpm test
pnpm build
pnpm react-doctor
pnpm test:e2e
```

Manual browser review must cover 375×812, 768×1024 and 1280×800 in both themes, keyboard/focus,
all link-rendered button variants, icon visibility, duplicate-key warnings, uncaught exceptions,
network ownership, account/storefront empty and populated states, payment success/failure/recovery and
customer/staff auth copy.

## Acceptance criteria

- The only application import of `next/image` is the `CloudImage` wrapper.
- No active Admin/storefront/account/auth UI uses raw `<img>` or direct `CldImage`.
- Shared and direct-CVA link buttons retain readable text/icons in both themes and on branded surfaces.
- No duplicate-key warning is reproducible on account, saved, catalogue, search, cart, checkout or
  order-confirmation lists.
- No uncaught undefined-property error is reproducible in those flows.
- New/changed code contains no explicit `any`, unsafe non-null assertion or unchecked optional array
  element.
- Every active browser mutation maps to a typed `/api/v1/**` endpoint and real domain operation.
- Server-rendered pages use real domain data or an honest empty/unavailable state.
- Payment success/failed/recovery UI reflects persisted server state only.
- Customer and staff auth/security pages contain no provider or developer-facing terminology.
- Reviewer commands and browser gates are executed before the PR leaves draft; unavailable checks are
  never marked passed.

## Explicit exclusions

- No broad visual redesign.
- No replacement of Cloudinary, Supabase Auth or Paystack infrastructure.
- No client-owned customer, inventory, order, total or payment truth.
- No schema addition merely to avoid using an existing domain model.
- No unrelated legacy deletion without an active-route/import proof.
- No GitHub Actions execution or validation claim.
