# Laitstyle Control Room V2 — Product and UX Specification

**Status:** Locked for phased implementation  
**Branch:** `feat/control-room-v2`  
**Primary user:** Laitstyle admin/store owner  
**Secondary user:** Store staff member with limited operational responsibility  
**Implementation rule:** Finish and verify one phase before starting another.

## 1. Product statement

Control Room V2 is the operating workspace for running a fashion resale and stocked-clothing business. It must help a non-technical store owner or manager understand what is happening, decide what needs attention, and complete daily work without navigating a collection of database-like tables.

The interface should feel like a modern fashion operations studio: editorial in presentation, operational in density, visual where products matter, and calm under pressure.

It is not an enterprise ERP, a technical administration console, or a storefront clone.

## 2. Problem definition

The current Control Room has three structural problems:

1. **Fragmented responsibilities.** Inventory, Intake, Orders, Holds and Offline Sales behave like unrelated pages even though they are stages of the same retail workflow.
2. **Incorrect inventory assumption.** The current model treats all products as one-of-one. Laitstyle must support both unique pieces and stocked products with quantities and optional variants.
3. **Generic presentation.** The current UI is dominated by lists and tables, gives weak visual hierarchy, and does not adapt meaningfully across desktop, tablet and mobile.

The revamp must solve the operating model before polishing individual screens.

## 3. Product principles

### 3.1 Business language over technical language

Use terms such as “delivery updates”, “payment methods”, “hold duration” and “store visibility”. Do not expose implementation concepts such as cache invalidation, webhook state, provider configuration or database sync.

### 3.2 One connected operating system

A product, stock movement, hold, order, offline sale and customer event must be represented as connected operational records, not isolated page-local demos.

### 3.3 Progressive disclosure

Show the information needed for the current decision first. Use drawers, dialogs, steppers and expandable detail areas rather than making every action a new page or placing all fields on one screen.

### 3.4 Visual products, structured operations

Product imagery and meaningful status should lead catalogue experiences. Tables are appropriate for rapid comparison, but they must not be the only inventory representation.

### 3.5 Truthful prototype boundaries

Until real backend services exist, the UI may use typed seed data behind explicit adapters. It must never claim that payments, delivery providers, authentication or inventory locking are production integrations.

### 3.6 Responsive by task, not by compression

Desktop may use dense workspaces. Tablet must preserve core comparison and actions. Mobile must switch to operational cards, bottom sheets and focused task flows rather than squeezing desktop tables into a narrow viewport.

## 4. Core jobs to be done

The admin/store owner must be able to:

1. Understand today’s store health and priorities.
2. Add, edit, publish and archive products.
3. Track unique pieces and multi-unit products accurately.
4. Understand available, reserved, sold, returned and damaged stock.
5. Move newly received products through an intake workflow.
6. Process orders from payment through delivery.
7. Extend, release or convert customer holds.
8. Record offline sales and have them affect stock and revenue.
9. Review a customer’s complete relationship with the store.
10. Configure store behaviour without technical terminology.

## 5. Information architecture

The final navigation is grouped by business responsibility.

```text
CONTROL ROOM
Overview

CATALOGUE
Inventory
Collections

SALES
Orders
Holds
Returns

PEOPLE
Customers

STORE
Settings
```

### Navigation rules

- “Add product”, “Record sale” and “Create order” are global actions, not permanent sidebar destinations.
- Intake is an Inventory workflow and saved view, not a separate top-level destination.
- Offline sales are created through the global “Record sale” flow and appear within Sales/Orders.
- A sidebar destination must not be exposed until its phase is implemented with a meaningful default, empty, loading and error state.
- Mobile uses a compact top bar plus a sheet-based navigation menu. It must not render the desktop sidebar off-canvas without adaptation.

## 6. Overview specification

Overview is a daily command centre. It must answer:

- What needs attention now?
- What changed recently?
- What is selling?
- What is low in stock?
- Which orders or deliveries are at risk?
- Which holds are close to release?
- How much revenue came from online and offline channels?
- What should the staff member do next?

### Active-store overview

Required modules:

1. **Today strip** — revenue, online/offline split, orders, units sold and active holds.
2. **Attention queue** — delayed orders, failed/pending payments, low stock, incomplete drafts and expiring holds.
3. **Sales pulse** — compact seven-day visual with accessible labels and online/offline distinction.
4. **Fulfilment lane** — paid, preparing, packed, dispatched and exception counts.
5. **Inventory watch** — low stock, out of stock, newly received and unpublished products with product imagery.
6. **Continue working** — recent draft, unfinished product setup or order task.
7. **Activity stream** — meaningful events across products, orders, customers and staff.
8. **Quick actions** — add product, record sale, create order and open intake queue.

### New-store overview

A store without operating data receives an onboarding-oriented state:

- Add the first product
- Configure delivery
- Choose payment methods
- Record an offline sale
- Preview the storefront

Do not show empty enterprise charts or meaningless zero-valued cards.

## 7. Inventory domain model

Inventory must support three explicit product modes through a discriminated union.

### 7.1 Unique piece

Use for a single physical item.

Required concepts:

- Quantity fixed at one
- Unique archive/reference number
- Individual condition and measurements
- Individual photography
- Status: draft, intake, available, held, sold, returned, damaged or archived

### 7.2 Stocked product

Use for multiple interchangeable units without meaningful variants.

Required concepts:

- Total received
- Available quantity
- Reserved quantity
- Sold quantity
- Returned quantity
- Damaged quantity
- Low-stock threshold
- Cost per unit and selling price

Example:

```text
Botanical Jeans
Total received: 50
Available: 29
Reserved: 3
Sold: 18
Returned: 0
Damaged: 0
```

### 7.3 Variant product

Use when stock differs by size, colour or another sellable option.

Required concepts:

- Product-level identity and media
- Variant combinations
- SKU/reference per variant where needed
- Quantity buckets per variant
- Optional variant image
- Product-level and variant-level pricing boundaries

### 7.4 Shared inventory concepts

Every product mode supports:

- Product identity and description
- Category, collection and brand
- Media gallery with cover image
- Publication state and sales-channel visibility
- Pricing and optional cost/margin information
- Fulfilment information
- Stock movement history
- Orders and holds
- Offline sales
- Returns and damages
- Reviews
- Staff activity

### 7.5 Typed domain direction

Implementation should use a clear union rather than optional fields on one enormous interface.

```ts
type InventoryProduct =
  | UniqueProduct
  | StockedProduct
  | VariantProduct;
```

Expected errors such as invalid quantity, insufficient stock or incomplete publication requirements should use typed results or structured validation errors. Unexpected programming failures should be surfaced through route error boundaries.

## 8. Inventory workspace specification

Inventory is the primary catalogue workspace.

### Required views

- All products
- Live
- Drafts
- Intake queue
- Low stock
- Out of stock
- Held
- Sold
- Unpublished
- Needs attention

### Required presentation modes

1. **Visual grid** — product-led browsing with image, product mode, status, available quantity, price and primary action.
2. **Operational table** — compact comparison for bulk work, sorting and filtering.
3. **Mobile cards** — task-focused cards that preserve status, quantity, price and actions without horizontal table compression.

### Inventory controls

- Search by product name, archive number, SKU, category and variant
- Saved-view tabs
- Product mode filter
- Stock status filter
- Category and collection filters
- Channel visibility filter
- Sort by recently updated, stock, sales, price or name
- Bulk publish/unpublish, archive, collection assignment and export boundaries
- Persistent “Add product” primary action

### Product detail workspace

Opening a product should use a side sheet or dedicated detail workspace depending on information depth. It must expose:

- Summary
- Stock and variants
- Media
- Pricing
- Orders
- Holds
- Stock movements
- Returns/damages
- Reviews
- Activity

The implementation must not create a new route for small edits that can be completed safely within a sheet or dialog.

## 9. Add-product flow

“Add product” opens a large responsive dialog on desktop and a full-height drawer/sheet on mobile.

The flow is a seven-step wizard:

1. **Product type** — unique piece, multiple units or variants
2. **Identity** — name, category, brand, description, collection and internal reference
3. **Images** — upload, reorder, select cover and identify detail/defect images
4. **Stock and variants** — fields adapt to the selected product mode
5. **Pricing** — selling price, reference price, cost and margin preview
6. **Fulfilment** — weight, pickup, delivery restrictions and packaging notes
7. **Review and publish** — validation summary, preview, save draft, publish now or schedule

### Wizard requirements

- Progress is preserved while the dialog remains open.
- The staff member can move backward without losing entered values.
- Each step validates locally and shows errors next to the relevant field.
- The final step distinguishes blocking requirements from optional improvements.
- Closing with unsaved work requires confirmation.
- Draft save and publish are distinct actions.
- No upload or persistence integration may be claimed until implemented.

## 10. Intake workflow

Intake is a saved Inventory view, not a separate product-creation destination.

### Intake stages

```text
Received
→ Photographing
→ Details required
→ Pricing review
→ Ready to publish
→ Published
```

### Intake responsibilities

- Record received items or batches
- Attach initial photos
- Capture measurements and condition
- Record acquisition cost
- Assign archive references
- Resolve missing information
- Approve for publication

The same product record moves through intake; Intake must not create a duplicate inventory record.

## 11. Sales operations

### 11.1 Orders

Order statuses:

- Pending payment
- Payment confirmed
- Preparing
- Packed
- Ready for pickup
- Dispatched
- Out for delivery
- Delivered
- Cancelled
- Refunded
- Returned

An order opens in a side sheet with:

- Customer identity and contact
- Products, variants and quantities
- Payment timeline
- Delivery address
- Courier and tracking
- Internal notes
- Customer messages boundary
- Status timeline
- Refund, cancel and return actions where valid

### 11.2 Holds

A hold includes:

- Customer or guest
- Product and optional variant
- Quantity held
- Source
- Start and expiry time
- Checkout stage
- Payment progress
- Risk state

Actions:

- Extend
- Release
- Convert to order
- Contact customer boundary
- View cart/order context

A unique product hold blocks the only unit. A stocked or variant product hold reserves only the specified quantity.

### 11.3 Offline sales

“Record sale” opens a guided dialog:

1. Select product
2. Select variant or physical unit
3. Enter quantity
4. Enter final selling price
5. Select channel
6. Attach or create customer
7. Select payment method/status
8. Add notes
9. Review and confirm

Supported channel labels include physical store, WhatsApp, Instagram, phone, pop-up event, staff-assisted and other.

Recording an offline sale must conceptually:

- Reduce available inventory
- Increase sold quantity
- Create a sales/order record
- Update revenue
- Update customer history
- Flag conflicting holds
- Add a stock movement and activity event

In prototype phases these effects must occur through one typed action/service boundary, not independent component state mutations.

## 12. Customers workspace

The customer list should prioritize operational context:

- Name and location
- Lifetime spend
- Order count
- Active holds
- Last purchase
- Customer type
- Attention/risk flags

Customer detail opens in a sheet or workspace with:

1. **Summary** — lifetime spend, average order value, orders, returns, cancellations and active holds
2. **Timeline** — orders, payments, deliveries, reviews, refunds, support events, offline purchases and hold releases
3. **Products** — purchased, held, saved and reviewed products
4. **Addresses and delivery** — saved addresses and delivery history
5. **Notes** — internal notes, sizing context and delivery preferences

This is an operational customer view, not a generic enterprise CRM.

## 13. Settings experience

Settings must use plain business language and visual sections.

### Sections

- **Store identity** — name, logo, contact details, social accounts and description
- **Selling preferences** — currency, hold duration, low-stock threshold, default product mode and pay-on-delivery preference
- **Delivery** — zones, pickup locations, rates and estimated times
- **Payments** — accepted methods, bank-transfer instructions, pay-on-delivery deposit and refund preferences
- **Notifications** — order, hold, stock, payment and delivery alerts
- **Team** — staff, roles, permissions and recent activity boundary

Use previews, helper text and explicit save feedback. Do not expose APIs, webhooks, caches or database concepts.

## 14. Visual and interaction direction

### Design character

- Editorial operations studio
- Warm neutral base connected to Laitstyle
- Ink, bone and sage remain core, with contextual warning and error tones
- Product imagery is used where it improves recognition
- Controlled density rather than oversized empty cards
- Strong typographic hierarchy using the existing Newsreader and Instrument Sans pairing
- Subtle elevation system; no random shadow or radius values
- One primary action per context

### Avoid

- Generic four-card SaaS dashboard layouts
- Purple gradients, glass effects or decorative charts unrelated to decisions
- Uniformly rounded containers with no hierarchy
- Tiny grey labels and low-contrast metadata
- Icon-only actions without accessible names
- Hover-only functionality
- Tables that horizontally overflow on mobile
- Custom overlays when the existing shadcn dialog, sheet, drawer or alert-dialog is appropriate

### Responsive targets

Design and verify at minimum:

- 375 × 812
- 768 × 1024
- 1280 × 800

Desktop, tablet and mobile may use different compositions while preserving the same task outcome.

## 15. Component and route architecture

The existing catch-all admin page must be replaced by route-level pages and feature components.

### Route direction

```text
src/app/admin/
  layout.tsx
  page.tsx
  loading.tsx
  error.tsx
  inventory/page.tsx
  orders/page.tsx
  holds/page.tsx
  customers/page.tsx
  settings/page.tsx
```

Collections and Returns routes are added only in the phases that implement them.

### Feature direction

```text
src/features/control-room/
  shell/
  overview/
  inventory/
  product-editor/
  orders/
  holds/
  customers/
  settings/
  shared/

src/lib/control-room/
  types.ts
  seed.ts
  selectors.ts
  actions.ts
  result.ts
```

### File-size and responsibility rules

- Route page files should primarily compose features and remain small.
- Split feature sections into focused components before a file becomes difficult to scan; target roughly 200–250 lines, not a rigid numeric rule.
- Do not create a universal component with many boolean behaviour props. Prefer explicit variants and compound composition.
- Keep domain types and seed data outside page components.
- Keep modal and sheet flows in their feature folders.
- Client boundaries should be as narrow as practical.

## 16. Technology rules

### Next.js and React

- Follow Next.js 16 route and async conventions.
- Prefer Server Components for route composition and static data boundaries.
- Use Client Components only for interaction state, browser APIs and form workflows.
- Add route `loading.tsx` and `error.tsx` where the phase introduces meaningful async or failure boundaries.
- Do not enable Cache Components or add `use cache` without a real data freshness requirement.

### shadcn and icons

- The repository uses shadcn with Base UI primitives and the HugeIcons library.
- Inspect existing components before adding new ones.
- Use Dialog, Sheet, Drawer, AlertDialog, Tabs, Card, Table, Empty, Skeleton, Field and other existing primitives correctly.
- Every dialog/sheet/drawer requires an accessible title.
- Use semantic tokens rather than hard-coded functional colours in feature components.
- Do not mix Lucide and HugeIcons in newly rebuilt Control Room components.

### TanStack

- No TanStack dependency is currently installed.
- `@tanstack/react-table` may be introduced in the Inventory phase if sorting, filtering, column visibility and bulk selection would otherwise create custom table infrastructure.
- TanStack Query must not be introduced until the Control Room has real asynchronous server state. Static prototype data does not justify a query cache.
- Any dependency addition requires a short architecture decision in the phase notes.

### Forms and validation

- Use React Hook Form and Zod for multi-step and consequential forms.
- Model expected validation failures explicitly.
- Preserve draft form state inside the product-editor boundary.
- Prevent duplicate submission and show progress for asynchronous boundaries.

## 17. State and data boundaries

Until backend integration exists:

- Use typed seed data from `src/lib/control-room/seed.ts`.
- Use one reducer/action boundary for connected operational changes.
- Derived metrics must come from selectors, not copied component state.
- Do not use random timers, random status changes or fake network delays as product behaviour.
- Prototype actions must update all related records consistently or clearly remain disabled with explanatory copy.

Future adapters should allow the typed domain to be replaced by server actions or API calls without rewriting view components.

## 18. Required states

Every implemented page or major workflow must include:

- Default
- Loading
- Empty
- Error
- Success/confirmation where an action completes
- Permission-restricted boundary where relevant in future team phases

State demonstrations must not appear as development controls in the production-facing interface.

## 19. Accessibility requirements

- WCAG AA contrast for text and controls
- Logical heading structure
- Visible keyboard focus
- 44px minimum touch targets for primary controls
- Keyboard-operable menus, dialogs, sheets and steppers
- Accessible labels for icon-only controls
- No colour-only status communication
- Reduced-motion support
- Dialog focus trapping and predictable Escape behaviour through the UI primitives
- Tables require semantic headers; mobile cards require equivalent labels

## 20. Performance requirements

- Use `next/image` with accurate `sizes`
- Avoid importing entire icon libraries or broad barrel modules
- Dynamically load heavy editors/charts only when opened or below the fold
- Avoid repeated full-array scans in render when selectors or maps are appropriate
- Long inventories should be prepared for pagination or virtualization; do not implement virtualization before the data volume requires it
- Avoid unnecessary context subscriptions and page-wide client rendering

## 21. Authentication, roles and permissions

Supabase Auth owns identity and sessions. Prisma profiles own application authorization. The supported roles are:

- **Consumer** — storefront browsing, purchasing and access to their own account, orders and saved products.
- **Admin / store owner** — the one owner account with all operations, settings, audit and destructive-action capabilities.
- **Store manager** — operational inventory, order, hold, return, sales and customer capabilities without admin-only settings, audit or destructive inventory deletion.

Consumers may register through the storefront. Staff cannot self-register. The admin is created only by the email/password bootstrap command; managers are provisioned through an owner-controlled backend process.

Server checks are authoritative. Client role controls use the same typed capability map for visibility and disabled states. Roles are never accepted from client input or user-editable auth metadata.

## 22. Prisma data model direction

Prisma is the only database management layer. `prisma/schema.prisma` and `prisma/migrations` define profiles, catalogue, inventory, sales, returns, customers, reviews, settings, assets and audit data.

Every business row belongs to the single Laitstyle store, so there is no store or tenant foreign key. `store_settings` is a singleton. `catalogue_categories.image_url` supplies the storefront category artwork.

Database workflow:

1. edit and format the Prisma schema;
2. validate it;
3. create and review a Prisma migration;
4. regenerate Prisma Client;
5. deploy committed Prisma migrations.

Supabase database tooling is not part of this workflow.

## 23. Non-goals before production integration

- Payment settlement, courier and messaging-provider implementation
- Supplier, warehouse, accounting and tax systems
- Realtime updates without a proven operational need
- Production claims while a domain still uses deterministic prototype data
## 24. Definition of done for each implementation phase

A phase is complete only when:

1. Its scoped screens and interactions satisfy this specification.
2. No dead navigation or placeholder action is exposed as complete.
3. Responsive behaviour is verified at 375, 768 and 1280 widths when browser tooling is available.
4. Keyboard and screen-reader-relevant behaviour is reviewed.
5. ESLint passes.
6. TypeScript passes with `tsc --noEmit`.
7. Available tests pass.
8. The production build passes.
9. React Doctor is run and changed-scope errors are resolved.
10. The phase tracker and PR description are updated before the next phase begins.

## 25. Final success criteria

Control Room V2 is successful when the store owner or manager can understand daily priorities, manage both unique and multi-unit inventory, complete core sales operations and configure the store without needing to understand the application’s technical architecture.

The result should feel recognisably Laitstyle, visually considered and operationally trustworthy—not like a styled database or generic admin template.
