"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { inventorySortOptions } from "@/lib/control-room/inventory-selectors";
import type {
  InventoryFacetOptions,
  InventoryQuery,
} from "@/lib/control-room/types";

type InventoryFilterFieldsProps = {
  query: InventoryQuery;
  facets: InventoryFacetOptions;
  mobile?: boolean;
  onQueryChange: (patch: Partial<InventoryQuery>) => void;
};

export function InventoryFilterFields({
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
          ["sold", "Sold through"],
        ]}
        value={query.stock}
      />
      <FilterSelect
        className={triggerClassName}
        label="Category"
        onChange={(value) => onQueryChange({ category: value })}
        options={[
          ["all", "All categories"],
          ...facets.categories.map((item) => [item, item] as const),
        ]}
        value={query.category}
      />
      <FilterSelect
        className={triggerClassName}
        label="Collection"
        onChange={(value) => onQueryChange({ collection: value })}
        options={[
          ["all", "All collections"],
          ...facets.collections.map((item) => [item, item] as const),
        ]}
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
        options={inventorySortOptions.map(
          (option) => [option.value, option.label] as const,
        )}
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
