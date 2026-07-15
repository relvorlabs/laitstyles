"use client";

import { PackageIcon, Search01Icon, Settings01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { InventoryFilterFields } from "@/features/admin/inventory/inventory-filter-fields";
import { AdminIcon } from "@/features/admin/shared/admin-icon";
import type {
  InventoryFacetOptions,
  InventoryPresentation,
  InventoryQuery,
} from "@/lib/admin/types";
import { cn } from "@/lib/utils";

type InventoryControlsProps = {
  query: InventoryQuery;
  facets: InventoryFacetOptions;
  presentation: InventoryPresentation;
  resultCount: number;
  onQueryChange: (patch: Partial<InventoryQuery>) => void;
  onPresentationChange: (presentation: InventoryPresentation) => void;
  onReset: () => void;
};

export function InventoryControls({
  query,
  facets,
  presentation,
  resultCount,
  onQueryChange,
  onPresentationChange,
  onReset,
}: InventoryControlsProps) {
  const hasFilters =
    query.search !== "" ||
    query.mode !== "all" ||
    query.stock !== "all" ||
    query.category !== "all" ||
    query.collection !== "all" ||
    query.channel !== "all" ||
    query.sort !== "updated-desc";

  return (
    <div className="flex flex-col gap-3 px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <InputGroup className="h-11 bg-card lg:max-w-[420px]">
          <InputGroupAddon>
            <AdminIcon icon={Search01Icon} size={17} />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Search Inventory"
            autoComplete="off"
            name="inventory-search"
            onChange={(event) => onQueryChange({ search: event.target.value })}
            placeholder="Search name, archive number, SKU or variant…"
            spellCheck={false}
            value={query.search}
          />
        </InputGroup>

        <div className="hidden min-w-0 flex-1 items-center gap-2 lg:flex">
          <InventoryFilterFields facets={facets} onQueryChange={onQueryChange} query={query} />
        </div>

        <div className="flex items-center justify-between gap-2">
          <Sheet>
            <SheetTrigger
              render={
                <Button
                  className="h-11 rounded-full px-4 lg:hidden"
                  type="button"
                  variant="outline"
                />
              }
            >
              <AdminIcon icon={Settings01Icon} size={17} />
              Filters
            </SheetTrigger>
            <SheetContent className="w-[min(92vw,420px)] overscroll-contain" side="right">
              <SheetHeader>
                <SheetTitle>Filter Inventory</SheetTitle>
                <SheetDescription>
                  Narrow the current saved view without changing product records.
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-4 px-4">
                <InventoryFilterFields
                  facets={facets}
                  mobile
                  onQueryChange={onQueryChange}
                  query={query}
                />
              </div>
              <SheetFooter>
                <Button
                  className="h-11 rounded-full"
                  disabled={!hasFilters}
                  onClick={onReset}
                  type="button"
                  variant="outline"
                >
                  Reset Filters
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>

          {hasFilters ? (
            <Button
              className="hidden h-11 rounded-full px-4 sm:inline-flex"
              onClick={onReset}
              type="button"
              variant="ghost"
            >
              Reset
            </Button>
          ) : null}

          <div
            aria-label="Inventory presentation"
            className="hidden items-center rounded-full border border-border bg-card p-1 lg:flex"
            role="group"
          >
            {(["grid", "table"] as const).map((option) => (
              <Button
                aria-pressed={presentation === option}
                className={cn(
                  "min-h-9 rounded-full px-3 text-[11px] font-semibold capitalize",
                  presentation === option ? "shadow-sm" : "text-muted-foreground",
                )}
                key={option}
                onClick={() => onPresentationChange(option)}
                size="sm"
                type="button"
                variant={presentation === option ? "default" : "ghost"}
              >
                {option}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 text-[11.5px] text-muted-foreground">
        <span>
          <strong className="font-semibold text-foreground tabular-nums">{resultCount}</strong>{" "}
          product{resultCount === 1 ? "" : "s"} in this view
        </span>
        <span className="hidden items-center gap-2 sm:inline-flex">
          <AdminIcon icon={PackageIcon} size={15} />
          Grid, table and mobile cards share this result set
        </span>
      </div>
    </div>
  );
}
