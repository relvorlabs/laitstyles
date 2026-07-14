-- Product shopper-facing attributes shown on the PDP that had no home in the
-- schema, plus fulfilment fields the Control Room product editor already
-- collects but silently dropped. All nullable or defaulted so existing product
-- rows load unchanged. Applied via `prisma db execute` (this DB is not managed
-- by Prisma Migrate); IF NOT EXISTS keeps it retry-safe.
alter table "public"."products"
  add column if not exists "material"              text,
  add column if not exists "fit"                   text,
  add column if not exists "style"                 text,
  add column if not exists "care_instructions"     text,
  add column if not exists "flaw_notes"            text,
  add column if not exists "weight_grams"          integer,
  add column if not exists "pickup_available"      boolean not null default true,
  add column if not exists "delivery_restrictions" text    not null default '',
  add column if not exists "packaging_notes"       text    not null default '';

comment on column "public"."products"."flaw_notes" is
  'Disclosed condition flaws shown to the shopper. Defect *images* live in product_media (kind=product-defect).';
