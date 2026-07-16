# Laitstyle Control Room V2 — Phase 10 Authentication and Role Permissions

## Objective

Use Supabase Auth for identity and sessions while keeping authorization in the application database through `profiles.role`.

## Account model

- `consumer`: storefront registration, sign-in and self-service access to owned customer records.
- `admin`: the single store owner, created only by the email/password bootstrap command.
- `manager`: staff sign-in with operational permissions and owner-only settings excluded.

There is one store. Authorization never resolves through a store selector, tenant identifier, membership record or database-managed capability table. The backend loads the authenticated profile through Prisma and checks the static capability matrix in `src/lib/auth/permissions.ts`. The admin layout passes the resolved staff role to a client provider so the interface can hide or disable unavailable actions.

## Authentication flows

- Consumers may register and sign in through storefront authentication and receive a `consumer` profile.
- Staff use the dedicated staff sign-in surface. There is no public staff registration.
- Bootstrap the admin with `pnpm auth:bootstrap-admin -- --email <email> --password <password>`.
- Managers are provisioned through an owner-controlled backend process and then use staff sign-in.
- Redirect targets are validated before use; server authorization remains authoritative.

## Capability boundary

The admin has the full staff capability set. Managers can read and update inventory, orders, holds, returns and customer operations, record sales, read settings and export reports. Managers cannot update settings, delete inventory or read the audit log. Consumers have only storefront and own-account capabilities.

## Acceptance

- Only `consumer`, `admin` and `manager` are valid roles.
- A consumer cannot enter `/admin`.
- A manager can operate approved workflows but cannot update store settings or perform owner-only actions.
- Only one profile can have the `admin` role.
- No membership, invitation, store-switching or elevated platform-admin surface exists.
