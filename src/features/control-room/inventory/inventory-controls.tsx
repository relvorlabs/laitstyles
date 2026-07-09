"use client";

import {
  PackageIcon,
  Search01Icon,
  Settings01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ControlRoomIcon } from "@/features/control-room/shared/control-room-icon";
import type {
  InventoryFacetOptions,
  InventoryPresentation,
  InventoryQuery,
} from "@/lib/control-room/types";
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
            <ControlRoomIcon icon={Search01Icon} size={17} />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Search Inventory"
            onChange={(event) => onQueryChange({ search: event.target.value })}
            placeholder="Search name, archive number, SKU or variant"
            value={query.search}
          />
        </InputGroup>

        <div className="hidden min-w-0 flex-1 items-center gap-2 lg:flex">
          <InventoryFilterFields
            facets={facets}
            onQueryChange={onQueryChange}
            query={query}
          />
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
              <ControlRoomIcon icon={Settings01Icon} size={17} />
              Filters
            </SheetTrigger>
            <SheetContent className="w-[min(92vw,420px)]" side="right">
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
                  Reset filters
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
              <button
                aria-pressed={presentation === option}
                className={cn(
                  "min-h-9 rounded-full px-3 text-[11px] font-semibold capitalize transition-colors",
                  presentation === option
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
                key={option}
                onClick={() => onPresentationChange(option)}
                type="button"
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 text-[11.5px] text-muted-foreground">
        <span>
          <strong className="font-semibold text-foreground tabular-nums">
            {resultCount}
          </strong>{" "}
          product{resultCount === 1 ? "" : "s"} in this view
        </span>
        <span className="inline-flex items-center gap-2">
          <ControlRoomIcon icon={PackageIcon} size={15} />
          Grid, table and mobile cards share this result set
        </span>
      </div>
    </div>
  );
}

type InventoryFilterFieldsProps = {
  query: InventoryQuery;
  facets: InventoryFacetOptions;
  mobile?: boolean;
  onQueryChange: (patch: Partial<InventoryQuery>) => void;
};

function InventoryFilterFields({
  query,
  facets,
  mobile = false,
  onQueryChange,
}: InventoryFilterFieldsProps) {
  const triggerClassName = mobile ? "h-11 w-full justify-between" : "h-10";

  return (
    <>
      <FilterSelect
        className={triggerClassName}
        label="Product mode"
        onChange={(value) =>
          onQueryChange({ mode: value as InventoryQuery["mode"] })
        }
        options={[
          ["all", "All modes"],
          ["unique", "Unique pieces"],
          ["stocked", "Stocked products"],
          ["variant", "Products with variants"],
        ]}
        value={query.mode}
      />
      <FilterSelect
        className={triggerClassName}
        label="Stock status"
        onChange={(value) =>
          onQueryChange({ stock: value as InventoryQuery["stock"] })
        }
        options={[
          ["all", "All stock"],
          ["healthy", "Available"],
          ["low-stock", "Low stock"],
          ["out-of-stock", "Out of stock"],
          ["held", "Held"],
          ["sold", "Has sales"],
        ]}
        value={query.stock}
      />
      <FilterSelect
        className={triggerClassName}
        label="Category"
        onChange={(value) => onQueryChange({ category: value })}
        options={[["all", "All categories"], ...facets.categories.map((item) => [item, item] as const)]}
        value={query.category}
      />
      <FilterSelect
        className={triggerClassName}
        label="Collection"
        onChange={(value) => onQueryChange({ collection: value })}
        options={[["all", "All collections"], ...facets.collections.map((item) => [item, item] as const)]}
        value={query.collection}
      />
      <FilterSelect
        className={triggerClassName}
        label="Channel"
        onChange={(value) =>
          onQueryChange({ channel: value as InventoryQuery["channel"] })
        }
        options={[
          ["all", "All channels"],
          ["storefront", "Storefront"],
          ["physical-store", "Physical store"],
          ["whatsapp", "WhatsApp"],
          ["instagram", "Instagram"],
        ]}
        value={query.channel}
      />
      <FilterSelect
        className={triggerClassName}
        label="Sort"
        onChange={(value) =>
          onQueryChange({ sort: value as InventoryQuery["sort"] })
        }
        options={[
          ["updated-desc", "Recently updated"],
          ["stock-asc", "Stock: low to high"],
          ["stock-desc", "Stock: high to low"],
          ["sold-desc", "Best selling"],
          ["price-asc", "Price: low to high"],
          ["price-desc", "Price: high to low"],
          ["name-asc", "Name: A–Z"],
        ]}
        value={query.sort}
      />
    </>
  );
}

type FilterSelectProps = {
  label: string;
  value: string;
  className?: string;
  options: ReadonlyArray<readonly [string, string]>;
  onChange: (value: string) => void;
};

function FilterSelect({
  label,
  value,
  className,
  options,
  onChange,
}: FilterSelectProps) {
  return (
    <Select onValueChange={(next) => onChange(next ?? "all")} value={value}>
      <SelectTrigger aria-label={label} className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map(([optionValue, optionLabel]) => (
            <SelectItem key={optionValue} value={optionValue}>
              {optionLabel}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
