import Link from "next/link";
import type { ReactNode } from "react";
import {
  type ActiveFacets,
  facetMutations,
  PRICE_PRESETS,
  shopHref,
} from "@/features/storefront/catalogue/facets";
import { cn } from "@/lib/utils";
import type { StorefrontFacetOptions } from "@/server/commerce/catalogue/catalog-repository";

// Server-rendered facet panel: each option is a Link that toggles its value in
// the URL. Reused in the desktop sidebar and the mobile filter sheet.
export function FacetPanel({
  facets,
  options,
}: {
  facets: ActiveFacets;
  options: StorefrontFacetOptions;
}) {
  return (
    <div className="flex flex-col">
      {options.brands.length ? (
        <FacetGroup title="Brand">
          {options.brands.map((value) => (
            <FacetOption
              active={facets.brands.includes(value)}
              href={shopHref(facets, facetMutations.brand(value))}
              key={value}
              label={value}
            />
          ))}
        </FacetGroup>
      ) : null}

      {options.conditions.length ? (
        <FacetGroup title="Condition">
          {options.conditions.map((value) => (
            <FacetOption
              active={facets.conditions.includes(value)}
              href={shopHref(facets, facetMutations.condition(value))}
              key={value}
              label={value}
            />
          ))}
        </FacetGroup>
      ) : null}

      {options.sizes.length ? (
        <FacetGroup title="Size">
          {options.sizes.map((value) => (
            <FacetOption
              active={facets.sizes.includes(value)}
              href={shopHref(facets, facetMutations.size(value))}
              key={value}
              label={value}
            />
          ))}
        </FacetGroup>
      ) : null}

      {options.colours.length ? (
        <FacetGroup title="Colour">
          {options.colours.map((value) => (
            <FacetOption
              active={facets.colours.includes(value)}
              href={shopHref(facets, facetMutations.colour(value))}
              key={value}
              label={value}
            />
          ))}
        </FacetGroup>
      ) : null}

      <FacetGroup title="Price">
        {PRICE_PRESETS.map((preset) => (
          <FacetOption
            active={facets.price === preset.value}
            href={shopHref(facets, facetMutations.price(preset.value))}
            key={preset.value}
            label={preset.label}
          />
        ))}
      </FacetGroup>
    </div>
  );
}

function FacetGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-b border-border py-4 last:border-b-0">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </p>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

function FacetOption({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      aria-pressed={active}
      className="flex items-center gap-2.5 py-1.5"
      href={href}
      scroll={false}
    >
      <span
        className={cn(
          "flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border-[1.5px] transition-colors",
          active ? "border-primary bg-primary" : "border-input bg-control",
        )}
      >
        {active ? <span className="size-2 rounded-[2px] bg-primary-foreground" /> : null}
      </span>
      <span className={cn("text-[13.5px]", active ? "text-foreground" : "text-muted-foreground")}>
        {label}
      </span>
    </Link>
  );
}
