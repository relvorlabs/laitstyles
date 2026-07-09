"use client";

import { Search01Icon } from "@hugeicons/core-free-icons";
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
  SelectLabel,
  SelectTrigger,
} from "@/components/ui/select";
import { holdStageLabels } from "@/features/control-room/holds/hold-labels";
import { holdSortOptions } from "@/features/control-room/holds/hold-selectors";
import type { HoldQuery } from "@/features/control-room/holds/hold-types";
import { ControlRoomIcon } from "@/features/control-room/shared/control-room-icon";

const sourceLabels: Record<HoldQuery["source"], string> = {
  all: "All sources",
  storefront: "Storefront",
  assisted: "Assisted channels",
};

export function HoldControls({
  query,
  resultCount,
  onQueryChange,
  onReset,
}: {
  query: HoldQuery;
  resultCount: number;
  onQueryChange: (patch: Partial<HoldQuery>) => void;
  onReset: () => void;
}) {
  const hasFilters =
    query.search !== "" ||
    query.source !== "all" ||
    query.stage !== "all" ||
    query.sort !== "expiry-asc";
  const stageLabel =
    query.stage === "all" ? "All stages" : holdStageLabels[query.stage];
  const sortLabel =
    holdSortOptions.find((option) => option.value === query.sort)?.label ??
    "Releasing soonest";

  return (
    <div className="flex flex-col gap-3 px-4 py-4 sm:px-5">
      <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_repeat(3,minmax(150px,auto))]">
        <InputGroup className="h-11 bg-card">
          <InputGroupAddon>
            <ControlRoomIcon icon={Search01Icon} size={17} />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Search holds"
            autoComplete="off"
            name="hold-search"
            onChange={(event) => onQueryChange({ search: event.target.value })}
            placeholder="Search customer, product, SKU or hold…"
            spellCheck={false}
            value={query.search}
          />
        </InputGroup>

        <Select
          onValueChange={(value) => {
            if (value) onQueryChange({ source: value as HoldQuery["source"] });
          }}
          value={query.source}
        >
          <SelectTrigger aria-label="Filter holds by source" className="h-11 w-full">
            <span className="flex-1 truncate text-left">
              {sourceLabels[query.source]}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Source</SelectLabel>
              <SelectItem value="all">All sources</SelectItem>
              <SelectItem value="storefront">Storefront</SelectItem>
              <SelectItem value="assisted">Assisted channels</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select
          onValueChange={(value) => {
            if (value) onQueryChange({ stage: value as HoldQuery["stage"] });
          }}
          value={query.stage}
        >
          <SelectTrigger aria-label="Filter holds by stage" className="h-11 w-full">
            <span className="flex-1 truncate text-left">{stageLabel}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Stage</SelectLabel>
              <SelectItem value="all">All stages</SelectItem>
              <SelectItem value="product">Product</SelectItem>
              <SelectItem value="cart">Cart</SelectItem>
              <SelectItem value="checkout">Checkout</SelectItem>
              <SelectItem value="payment">Payment</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select
          onValueChange={(value) => {
            if (value) onQueryChange({ sort: value as HoldQuery["sort"] });
          }}
          value={query.sort}
        >
          <SelectTrigger aria-label="Sort holds" className="h-11 w-full">
            <span className="flex-1 truncate text-left">{sortLabel}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Sort</SelectLabel>
              {holdSortOptions.map((option) => (
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
          <strong className="font-semibold text-foreground tabular-nums">
            {resultCount}
          </strong>{" "}
          hold{resultCount === 1 ? "" : "s"} in this view
        </span>
        {hasFilters ? (
          <Button
            className="h-8 rounded-full px-3"
            onClick={onReset}
            type="button"
            variant="ghost"
          >
            Reset filters
          </Button>
        ) : null}
      </div>
    </div>
  );
}
