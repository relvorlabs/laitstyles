# Laitstyle Control Room V2 — Phase 10 Supabase Auth and Organization Permissions

## Status

**Planned.**

Phase 10 starts only after Phase 9 confirms the codebase structure and auth/data boundaries are ready.

## Goal

Implement end-to-end Supabase Auth for Laitstyle staff and storefront consumers, including Google OAuth, server-side session handling, organization/store membership and role-based permission gates.

## Source requirements

- Current Supabase changelog checked for auth/database breaking changes.
- Current Supabase SSR client docs checked.
- Current Supabase Google OAuth docs checked.
- Current Next.js 16 docs checked for proxy, route handlers and async request APIs where used.

## Identity model

Supabase Auth owns sign-in identity. Application tables own authorization.

- `auth.users` remains the identity source.
- `public.profiles` stores app profile information for every authenticated user.
- `public.organizations` groups one or more stores under an owner.
- `public.stores` is the operational tenant boundary for Control Room data.
- `public.store_memberships` assigns a profile to a store with a role.
- `public.role_capabilities` maps roles to named permissions.
- `public.customers` links consumer profiles to storefront customer records where applicable.

Authorization must not rely on user-editable metadata.

## Staff roles

| Role | Purpose | Capability boundary |
| --- | --- | --- |
| `owner` | CEO/store owner | Full store control, team management, destructive product actions, export, ownership-only settings |
| `manager` | Senior operator | Catalogue, orders, holds, returns, customers and most store settings; no owner transfer or owner-only destructive actions |
| `operator` | Sales staff | Daily sales, holds, fulfilment and assigned customer work; no team management, exports, owner settings or final destructive actions |

Use capability names such as:

- `store:view`
- `settings:update`
- `team:manage`
- `inventory:create`
- `inventory:update`
- `inventory:archive`
- `inventory:delete`
- `orders:update`
- `holds:update`
- `sales:record`
- `returns:update`
- `customers:view`
- `customers:note`
- `reports:export`

## Consumer permissions

Consumers can:

- sign in with email or Google
- manage their own profile and addresses
- view their own orders, holds, returns and reviews
- save products and submit reviews
- check out or place holds through storefront flows
- read public published storefront catalogue data

Consumers cannot access Control Room routes, internal notes, staff activity, cost/margin data, stock movement internals, unpublished products or store team settings.

## Implementation scope

- Add Supabase SSR clients in `src/lib/supabase/`.
- Add auth role/capability contracts in `src/lib/auth/`.
- Add a Next.js `proxy.ts` session refresh path using Supabase SSR cookies.
- Add `src/app/auth/callback/route.ts` for OAuth code exchange.
- Add an auth error page/route.
- Add sign-in and sign-out flows for staff and consumers.
- Add server guards for Control Room route access.
- Add role/capability helpers for action-level checks.
- Add permission-restricted states to Control Room surfaces.
- Add storefront account boundaries for signed-out, signed-in and denied states.
- Add deterministic tests for role capability mapping and guard behavior.

## Out of scope

- Full production catalogue/order persistence.
- Supabase schema/RLS migrations beyond minimal auth tables if Phase 11 has not started.
- TanStack Query.
- Payment provider, courier provider and messaging provider integration.
- Multi-store enterprise workflows beyond the single-organization/store foundation.

## Acceptance criteria

- Google OAuth redirects through Supabase and returns through the callback route locally.
- Sessions are read and refreshed through server-side cookie handling.
- Server protection uses `getClaims()` or `getUser()` and does not trust `getSession()` for authorization.
- Staff roles map to capability checks in one shared contract.
- Control Room routes reject signed-out and unauthorized users.
- Consumer routes expose only consumer capabilities.
- Permission-restricted UI states are clear and accessible.
- Service role and secret keys never appear in client bundles or `NEXT_PUBLIC_` variables.
- Lint, TypeScript, Vitest, build, React Doctor and browser auth smoke checks pass.
