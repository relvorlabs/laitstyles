# Storefront Production-Readiness Cutover

**Branch:** `agent/account-cart-checkout-media-cutover`  
**Base:** `main` at `9b607376da1faa406bba1cf19d1b7ae6492d65cb`  
**PR:** `#62`  
**Workflow:** orchestrator → planner → data engineer → domain engineer → UI engineer → reviewer  
**Status:** source remediation implemented and connector-reviewed; executable and browser gates not passed

## Authority and execution contract

This work follows the fixed six-role fleet introduced by commit
`66433b46e164c60a5e1821de21ef964a4f6d7ba8`, `.agents/workflows/feature.md`, and the repository agent
roles. The orchestrator sequences handoffs; the planner owns this specification and task ledger; data,
domain and UI engineers change only their owned boundaries; the reviewer reports unavailable checks
as blocked rather than passed.

The plan of record uses the relevant `relvorlabs/agent-controller` guidance:

| Role / concern | Skill or MCP guidance | Application |
| --- | --- | --- |
| Orchestration | `using-superpowers`, repository workflow doctrine | Select the feature workflow, preserve role ownership and publish truthful handoffs. |
| Planning | `find-skills`, Next.js ownership doctrine | Inventory routes, APIs, runtime risks and exclusions before broad edits. |
| Data | `supabase`, `supabase-postgres-best-practices`, `prisma-cli` | Reuse persisted truth, preserve ownership/security invariants and validate locally. |
| Domain | `next-best-practices`, `vercel-react-best-practices` | Thin Route Handlers, typed clients, server authorization, stable identities and explicit errors. |
| UI | `ui-ux-pro-max`, shadcn MCP guidance | Shared primitives, accessible contrast, correct link semantics, CloudImage and product language. |
| Review | `react-doctor`, `playwright-cli`, Chrome DevTools MCP guidance | Static checks, runtime console/network review, responsive/theme/accessibility verification. |

### Tool policy

- The GitHub connector is the active repository and PR tool.
- No GitHub Actions workflow is created, triggered or used as evidence.
- Supabase MCP, shadcn MCP, Chrome DevTools MCP, Prisma CLI, React Doctor and Playwright remain
  required local/manual reviewer gates when unavailable through the connector.

## Existing foundation retained

The earlier PR scope remains authoritative: module-owned `/account/**` composition, persisted customer
cart, stable identity-scoped cache, account-backed checkout context, server coupon/recovery,
remainder-safe settlement and canonical product cover media.

## Production contracts

### Application image contract

- `src/components/ui/cloud-image.tsx` is the only application-level image renderer permitted to import
  `next/image` or `next-cloudinary`.
- Admin, storefront, account and auth UI use `CloudImage`; raw `<img>` is forbidden in application UI.
- `CloudImageProps` remains type-safe, requires `alt`, accepts valid Next image sources and narrows
  Cloudinary delivery URLs before rendering `CldImage`.
- Missing media renders an intentional placeholder or no image; undefined media is never dereferenced.

### Type and runtime-safety contract

- No explicit `any` in application source. External data begins as `unknown` or passes through the
  shared typed API client and server parser.
- Nullable values produce deliberate fallback, empty or unavailable states.
- Repeated projections are normalized before rendering.
- JSX keys identify the rendered owner and leaf record; order-line, media and variant ids are composite
  where a leaf id is not guaranteed globally unique.
- Active customer flows do not use fixed numeric collection indexes, unsafe non-null assertions or
  incomplete optional-object guards.

### Button and link contract

- Every shared button variant owns a readable foreground in light and dark themes.
- `default`, `secondary`, `outline`, `ghost`, `destructive` and `link` define explicit foreground states.
- SVG content inherits the button foreground with `text-current`.
- Navigation controls use the supported Base UI `render` contract or direct `buttonVariants()` link
  classes; no nested interactive elements.
- Direct-CVA links receive the same contrast-safe shared variant contract.

### Storefront API and page contract

- Browser mutations use typed `/api/v1/**` Route Handlers and shared `apiRequest` clients.
- Server Components may call server-domain functions directly when self-fetching would add a redundant
  HTTP hop; persisted truth and authorization still remain server-owned.
- Route files authenticate/authorize, parse, call the domain operation and serialize a standard envelope.
- Active pages use real domain data or honest empty/unavailable states, not sample customer/order/payment
  records or browser-authored truth.
- Retired `@/features/storefront/account/**` composition must not be imported by active application code.

### Payment truth contract

- Checkout initialization, verification, webhook settlement and recovery remain server-authoritative.
- Success renders only from an owned order whose persisted payment state is paid.
- Pending, failed, abandoned, reversed and review-required attempts remain visible from persisted
  checkout state; retry/resume is offered only when policy permits.
- Missing or invalid order references render an unavailable state, never a false receipt.

### Authentication language contract

- Customer copy uses account, sign in, verification code, authenticator app, device and sign out.
- Staff copy uses store workspace, approved team member, owner/manager access and store operations.
- Provider names and token/session/factor/challenge/server/database jargon are excluded from visible UI.
- Technical diagnostics remain internal logs and server contracts.

## Source implementation record

### Images

- [x] Harden `CloudImage` source narrowing while preserving Next static/local sources.
- [x] Replace the remaining account security `next/image` usage with `CloudImage`.
- [x] Replace the legacy account raw `<img>` thumbnail with canonical cover media and a placeholder.
- [x] Keep direct `CldImage` usage inside `CloudImage` only.
- [x] Add a source gate that rejects direct `next/image`, `next-cloudinary` and raw `<img>` usage.

### Runtime identity and null safety

- [x] Normalize account and saved product grids before rendering.
- [x] Normalize cart lines, recommendations and checkout request lines.
- [x] Normalize orders, order media, active account overview records and confirmation lines.
- [x] Normalize returns and eligible order-line identities with composite keys.
- [x] Normalize staff members, authenticators, saved addresses, delivery zones and inventory intake rows.
- [x] Replace fixed auth-dialog catalogue indexes with a guarded product selection.
- [x] Add invalid-date, missing-media, missing-selection and missing-profile fallbacks in changed surfaces.

### Buttons and links

- [x] Give all shared variants explicit foreground colors for rest, hover, expanded and dark states.
- [x] Make SVG content inherit the button foreground.
- [x] Inspect representative Admin, storefront and account direct-CVA links for local color overrides.
- [x] Add source assertions for outline, ghost, link and icon foreground contracts.
- [ ] Execute light/dark visual contrast checks at all required viewport sizes.

### APIs and production actions

- [x] Retain typed `/api/v1/**` clients/routes for cart, checkout, payments and account domains.
- [x] Add typed `/api/v1/auth/email` for storefront recovery/confirmation email.
- [x] Add typed `/api/v1/auth/invitations` client/envelope and sanitize provider-facing failures.
- [x] Add typed `/api/v1/auth/invitations/finalize` for manager account completion.
- [x] Replace raw auth JSON casts and `/auth/email`/invitation browser mutations in active UI.
- [x] Add a route-reference parity check between static `/api/v1/**` clients and Route Handlers.
- [x] Keep the active account overview server-connected to owned profile, saved items and commerce orders.
- [ ] Execute the source gate and inspect every reported legacy/prototype action before readiness.

### Payment states

- [x] Keep success restricted to an owned persisted paid order.
- [x] Add durable pending, failed, abandoned, reversed and review-required checkout presentation.
- [x] Preserve checkout/cart state when payment closes or fails.
- [x] Prevent retry for reversed or review-required attempts.
- [ ] Execute Paystack success, close, failure, reversal and recovery flows against a configured environment.

### Product language

- [x] Rewrite customer account security, password recovery and storefront auth shell copy.
- [x] Rewrite staff sign-in, manager invitation/setup and inventory intake copy.
- [x] Sanitize provider names returned through the manager invitation API.
- [x] Rewrite domain security errors that could surface session/factor/challenge terminology.
- [ ] Complete browser review of every auth error and empty state.

## Six-role phased execution

### Phase 6 — Orchestrator and planner

- [x] Reopen PR #62 without changing the no-Actions policy.
- [x] Extend the specification and plan with production-readiness contracts.
- [x] Classify findings across data, domain, UI and reviewer ownership.
- [x] Add a local source gate for image, type, legacy import, API and button contracts.

### Phase 7 — Data engineer

- [x] Reuse existing persisted customer, cart, order, checkout, payment and product-media truth.
- [x] Preserve existing RLS, ownership, constraints, idempotency and settlement invariants.
- [x] Add no schema solely to simulate a missing UI action.
- [ ] Run Prisma validation, migration status and Supabase advisory checks locally.

### Phase 8 — Domain engineer

- [x] Add typed auth email and staff invitation Route Handlers/clients.
- [x] Remove changed raw response casts and unsafe fixed collection assumptions.
- [x] Normalize repeated projections before changed render loops.
- [x] Complete persisted payment failure/recovery presentation rules.
- [ ] Add or execute focused tests for new auth routes, normalizers and payment-state presentation.

### Phase 9 — UI engineer

- [x] Route changed application media through `CloudImage` with fallbacks.
- [x] Fix the shared button/link contrast contract.
- [x] Add stable composite keys and null/empty states to high-risk account/storefront/admin lists.
- [x] Replace changed fake/transient payment presentation with persisted status UI.
- [x] Replace provider/developer copy across changed customer and staff auth/security surfaces.
- [x] Preserve the established visual design rather than redesigning the product.

### Phase 10 — Reviewer

Required commands, not run through GitHub Actions:

```bash
pnpm check:storefront-production
pnpm audit:buttons
pnpm prisma:validate
pnpm prisma:migrate:status
pnpm check:architecture
pnpm biome
pnpm typecheck
pnpm test
pnpm build
pnpm react-doctor
pnpm test:e2e
```

Manual browser review must cover 375×812, 768×1024 and 1280×800 in light and dark themes,
keyboard/focus, all link-rendered variants, icon visibility, duplicate-key warnings, uncaught errors,
network/API ownership, empty/populated account and storefront states, payment success/failure/recovery
and customer/staff auth copy.

## Acceptance criteria

- The only application imports of `next/image` and `next-cloudinary` are inside `CloudImage`.
- No active Admin/storefront/account/auth UI uses raw `<img>`.
- Link-rendered Button and direct-CVA content remains visible in both themes.
- No duplicate-key warning or undefined-property exception is reproducible in reviewed flows.
- Application source contains no explicit `any` and changed customer flows avoid fixed indexes.
- Active browser mutations use typed `/api/v1/**` operations and real domain actions.
- Server-rendered pages use real persisted data or honest empty/unavailable states.
- Payment success/failure/recovery UI reflects persisted server state only.
- Customer and staff auth/security UI contains no provider or developer-facing terminology.
- Reviewer commands and browser gates pass before the PR leaves draft.

## Explicit exclusions

- No broad visual redesign.
- No replacement of Cloudinary, Supabase Auth or Paystack infrastructure.
- No client-owned customer, inventory, order, total or payment truth.
- No schema addition merely to avoid an existing domain model.
- No unrelated legacy deletion without active-route/import proof.
- No GitHub Actions execution or validation claim.
