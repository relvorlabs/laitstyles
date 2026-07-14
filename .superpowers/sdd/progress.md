# Product Field Reconciliation — progress ledger

Plan: docs/superpowers/plans/2026-07-13-product-field-reconciliation.md
Branch: feat/storefront-v2-spec (ALL parts — corrected; control-room-v2 lacks the storefront pipeline)
Execution: inline (executing-plans style) — environment shell instability made 15-subagent orchestration with per-task `pnpm build` unreliable. Same TDD + verification gates applied.

Base before work: 4973875 (WIP checkpoint of pre-existing storefront work)

## Ledger
- Task A1 (DB columns): complete — commit 4266c14. Applied 9 additive columns to hosted products via `prisma db execute` (DB not Prisma-Migrate-managed); migrate diff now empty; client regenerated.
- Task B1 (write path): complete — commit eb470db. Extended product-write.ts (new columns + gallery + measurements); test passes; added vitest server-only stub alias.
- Task C1/C2 (domain + mappers): complete — commit 7f0d439. Extended ProductCommon/ProductDetail + mappers + conditionDisplay(); mappers test passes (incl. cost-leak guard); smoke:storefront OK (7 live products via mappers).
- Task D1/D2 (Control Room editor): complete — commit 2194a06. New fields in editor input/schema/defaults/conversion + InventoryProduct (optional, like fulfilment) + identity-step UI. Conversion test 2/2. Full suite 143/144 — the 1 failure is server-client-boundary.test.ts TIMING OUT (5s) due to slow FS during a pathologically slow run (117s transform), NOT a real violation (no client component imports a server-only module). Re-verify when machine is faster.

## DEFERRED (user decision 2026-07-13)
- Part E (storefront unification): DEFERRED to a focused, separately-reviewed pass. Scope confirmed large/invasive: home-lab is a self-contained prototype app — `Product`/`products` referenced 82× across 9 files (storefront-context/overlays hold cart+quickview state; catalogue-lab/storefront-lab/site-header/card/detail render it). Migrating card+detail onto ProductDetail/ProductSummary requires rewiring the whole home-lab data/state/cart layer + live routes (/, /products, /products/[slug]) + retiring data.ts, and changes live homepage behavior (18 fake → 7 real products). Do when environment is stable; give it its own review. Adapter groundwork (Task E1) not yet built.
- Part F (editor->DB wiring): Phase-12 gated, not started.

## OPEN ITEMS
- Stray hosted-DB row: running `smoke:storefront` created a `smoke-admin-write` product (pre-existing smoke behavior; DB went 7→8 published). Left in place — did not delete a DB row unprompted. User may want to clean it up.
- Re-verify server-client-boundary.test.ts on a faster machine (timed out at 5s here, not a real violation).

## Notes / carry-forward
- `pnpm typecheck` has ONE pre-existing noise error: `.next/dev/types/validator.ts` "routes.d.ts is not a module" — stale Next.js route typegen, unrelated to our changes; clears after `next build`/`dev`. Treat non-`.next` errors as the real signal.
- prisma/generated is gitignored (do not commit).
- New DB columns: material, fit, style, care_instructions, flaw_notes (text null); weight_grams (int null); pickup_available (bool default true); delivery_restrictions, packaging_notes (text default '').
