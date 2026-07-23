# Single-store authentication and database decision

Status: accepted, 2026-07-15.

Laitstyle manages exactly one store. Supabase owns authentication identities, passwords, OAuth and sessions. Prisma owns every application database model, migration and generated database type.

Authorization is role based. Consumers receive `profiles.role = consumer`; the one owner profile has `admin`; staff who operate the store have `manager`. Server guards are authoritative and client controls mirror the same static capability map for usability.

The application deliberately has no tenant hierarchy, store switcher, membership graph, invitation subsystem, platform-admin tier or capability rows. The admin bootstrap is intentionally narrow: email and password only.

Database workflow: change the Prisma schema, create or review a Prisma migration, regenerate Prisma Client, run tests, then deploy the committed Prisma migrations. Supabase database commands are outside the project workflow.
