"use client";

import { Search01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from "@/components/ui/select";
import { customerTypeLabels } from "@/features/control-room/customers/customer-labels";
import { customerSortOptions } from "@/features/control-room/customers/customer-selectors";
import type { CustomerQuery } from "@/features/control-room/customers/customer-types";
import { ControlRoomIcon } from "@/features/control-room/shared/control-room-icon";

const typeFilterLabels: Record<CustomerQuery["type"], string> = {
  all: "All customer types",
  individual: customerTypeLabels.individual,
  stylist: customerTypeLabels.stylist,
  reseller: customerTypeLabels.reseller,
  "walk-in": customerTypeLabels["walk-in"],
};

export function CustomerControls({
  query,
  resultCount,
  onQueryChange,
  onReset,
}: {
  query: CustomerQuery;
  resultCount: number;
  onQueryChange: (patch: Partial<CustomerQuery>) => void;
  onReset: () => void;
}) {
  const hasFilters = query.search !== "" || query.type !== "all" || query.sort !== "spend-desc";
  const sortLabel =
    customerSortOptions.find((option) => option.value === query.sort)?.label ?? "Highest spend";

  return (
    <div className="flex flex-col gap-3 px-4 py-4 sm:px-5">
      <div className="grid gap-3 lg:grid-cols-[minmax(280px,1fr)_minmax(170px,auto)_minmax(180px,auto)]">
        <InputGroup className="h-11 bg-card">
          <InputGroupAddon>
            <ControlRoomIcon icon={Search01Icon} size={17} />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Search customers"
            autoComplete="off"
            name="customer-search"
            onChange={(event) => onQueryChange({ search: event.target.value })}
            placeholder="Search customer, address or product…"
            spellCheck={false}
            value={query.search}
          />
        </InputGroup>

        <Select
          onValueChange={(value) => {
            if (value) onQueryChange({ type: value as CustomerQuery["type"] });
          }}
          value={query.type}
        >
          <SelectTrigger aria-label="Filter customers by type" className="h-11 w-full">
            <span className="flex-1 truncate text-left">{typeFilterLabels[query.type]}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Customer type</SelectLabel>
              {Object.entries(typeFilterLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select
          onValueChange={(value) => {
            if (value) onQueryChange({ sort: value as CustomerQuery["sort"] });
          }}
          value={query.sort}
        >
          <SelectTrigger aria-label="Sort customers" className="h-11 w-full">
            <span className="flex-1 truncate text-left">{sortLabel}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Sort</SelectLabel>
              {customerSortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="flex min-h-8 items-center justify-between gap-3 text-[11.5px] text-muted-foreground">
        <span>
          <strong className="font-semibold text-foreground tabular-nums">{resultCount}</strong>{" "}
          customer{resultCount === 1 ? "" : "s"} in this view
        </span>
        {hasFilters ? (
          <Button className="h-8 rounded-full px-3" onClick={onReset} type="button" variant="ghost">
            Reset filters
          </Button>
        ) : null}
      </div>
    </div>
  );
}
