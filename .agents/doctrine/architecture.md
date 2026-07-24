# Doctrine: Project structure & separation of concern

Owner of: the real folder map, layering rules, which layer owns what.
Cited by: every engineering role. This file is the map roles use to know their territory.

## The layers (top = closest to the user)

```
src/app/**          Routing, layouts, route-group composition, API route handlers.
src/providers/**    App-wide client infrastructure composed by the root layout.
src/features/**     Feature composition: screens assembled from components + data hooks.
src/components/**   Reusable presentational + primitive UI (design system lives here).
src/server/**       Server-only domain logic: repositories, mappers, policies, authorization.
src/lib/**          Cross-cutting utilities and typed clients shared by the layers above.
prisma/  supabase/  Schema, migrations, and hosted-service config.
```

Dependencies flow **downward only**. `app` may import from `providers`, `features`,
`components`, `server`, and `lib`. `providers` may compose app-wide client infrastructure from
`components` and `lib`, but must not import feature state or server-only modules. `features` may
import from `components`, `server`, and `lib`. `server` and `lib` must never import from
`providers`, `features`, or `app`. `components` must never import from `server`. Server-only code
must never reach a client bundle — the `src/lib/boundaries` check guards this seam.

## Canonical commerce vocabulary

The repository uses one semantic naming rule; the words are not interchangeable aliases:

- **`storefront`** is the only architecture name for the customer-facing experience and its
  presentation-specific contracts. Use it for `src/features/storefront/**`,
  `src/lib/storefront/**`, route/client boundaries, UI state, auth presentation, loaders,
  scripts, and symbols such as `StorefrontRouteBoundary` or `StorefrontAuthSession`.
- **`commerce`** is reserved for shared business-domain code. Pure schemas and types that can
  cross boundaries live in `src/lib/commerce/**`; server-only repositories, policies, and
  services live in `src/server/commerce/**`.
- **`store`** is not an architecture namespace. It is too ambiguous with client state stores,
  persistence stores, merchant locations, and ordinary retail prose. Do not introduce
  `src/features/store`, `src/lib/store`, `src/server/store`, `StoreProvider`, or similar aliases.

Do not mechanically replace `storefront` with `commerce` or the reverse. A module moves between
these names only when its ownership changes between presentation-specific storefront code and
shared business-domain code. The architecture guard enforces namespace, import, filename, and
common symbol rules.

## Route groups (`src/app`)

`(home)`, `account`, `cart`, `checkout`, `collections`, `products`, `order-confirmation`,
`auth` — storefront. `admin` and `control-room` — operator surfaces. `api` — route handlers
(`api/health`, `api/payment/{initialize,callback,webhook}`).

## Domain (`src/server`)

- `server/commerce/catalogue` — catalog repository, mappers, product writes, visibility.
- `server/commerce/orders` — account order reads.
- `server/commerce/reviews` — verified-purchase review repository, policy, schema.
- `server/auth` — canonical session resolution (`getCurrentSession`), staff access, profile provisioning.
- `server/assets` — asset config/resolution.

## Cross-cutting (`src/lib`)

`prisma` (client), `supabase` (client), `auth` (pure role/permission policies + `auth/server` redirect helpers),
`query` (TanStack QueryClient factories), `commerce` (shared domain schemas/types), `storefront`
(presentation-specific consumer DTO contracts), `money`, `errors`, `assets`, `boundaries`
(server/client boundary test), and `admin`.

## Providers (`src/providers`)

`providers.tsx` is the root-layout composition entry point. It contains only app-wide client
infrastructure. The current app-wide boundaries are theme and TanStack Query; global UI such as
the toaster may be mounted there without being reclassified as a provider.

Feature contexts remain in their owning feature folders and are mounted at the lowest route or
shell that has the data and lifecycle they require. Controllers, shells, overlays, and ordinary
components must not be moved into `src/providers` or re-exported from the root provider entry point.

## Features (`src/features`)

`storefront/{home,catalogue,product,checkout,account,shell,shared}` and
`admin/{overview,orders,inventory,holds,returns,customers,settings,product-editor,record-sale,shell,shared,state}`.
Admin feature folders carry a per-domain `data/` subfolder for their read/query layer and a
shared `state/` folder for admin-wide client state.

## Separation-of-concern rules

- A file has one clear purpose. When it grows large or mixes concerns, split it — large
  files are a signal, not a style preference.
- Presentational components take data via props; they do not fetch or hold business state.
- Domain rules live in `src/server` / `src/lib`, not inside components or route files.
- Feature-specific conventions belong in the feature's spec, not in repo-wide doctrine.

### Labeled feature example (not global law)

The catalogue read path under `src/server/commerce/catalogue/*` uses Cache Components with
the tag convention `catalogue` and `product-${slug}`. This is a **catalogue-feature**
convention documented here as an example; other features define their own in their specs.
See [server-and-actions](server-and-actions.md) for the caching rules themselves.
