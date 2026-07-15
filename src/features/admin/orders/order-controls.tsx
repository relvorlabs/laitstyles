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
import { orderSortOptions } from "@/features/admin/orders/order-selectors";
import type { OrderQuery } from "@/features/admin/orders/order-types";
import { AdminIcon } from "@/features/admin/shared/admin-icon";

const channelFilterLabels: Record<OrderQuery["channel"], string> = {
  all: "All channels",
  online: "Online",
  offline: "Offline & assisted",
};

const paymentFilterLabels: Record<OrderQuery["payment"], string> = {
  all: "All payments",
  pending: "Pending",
  paid: "Paid",
  deposit: "Deposit",
  failed: "Failed",
  refunded: "Refunded",
};

export function OrderControls({
  query,
  resultCount,
  onQueryChange,
  onReset,
}: {
  query: OrderQuery;
  resultCount: number;
  onQueryChange: (patch: Partial<OrderQuery>) => void;
  onReset: () => void;
}) {
  const hasFilters =
    query.search !== "" ||
    query.channel !== "all" ||
    query.payment !== "all" ||
    query.sort !== "placed-desc";
  const sortLabel =
    orderSortOptions.find((option) => option.value === query.sort)?.label ?? "Newest first";

  return (
    <div className="flex flex-col gap-3 px-4 py-4 sm:px-5">
      <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_repeat(3,minmax(150px,auto))]">
        <InputGroup className="h-11 bg-card">
          <InputGroupAddon>
            <AdminIcon icon={Search01Icon} size={17} />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Search orders"
            autoComplete="off"
            name="order-search"
            onChange={(event) => onQueryChange({ search: event.target.value })}
            placeholder="Search order, customer, product or city…"
            spellCheck={false}
            value={query.search}
          />
        </InputGroup>

        <Select
          onValueChange={(value) => {
            if (value) {
              onQueryChange({ channel: value as OrderQuery["channel"] });
            }
          }}
          value={query.channel}
        >
          <SelectTrigger aria-label="Filter orders by channel" className="h-11 w-full">
            <span className="flex-1 truncate text-left">{channelFilterLabels[query.channel]}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Channel</SelectLabel>
              <SelectItem value="all">All channels</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="offline">Offline & assisted</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select
          onValueChange={(value) => {
            if (value) {
              onQueryChange({ payment: value as OrderQuery["payment"] });
            }
          }}
          value={query.payment}
        >
          <SelectTrigger aria-label="Filter orders by payment" className="h-11 w-full">
            <span className="flex-1 truncate text-left">{paymentFilterLabels[query.payment]}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Payment</SelectLabel>
              <SelectItem value="all">All payments</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="deposit">Deposit</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select
          onValueChange={(value) => {
            if (value) onQueryChange({ sort: value as OrderQuery["sort"] });
          }}
          value={query.sort}
        >
          <SelectTrigger aria-label="Sort orders" className="h-11 w-full">
            <span className="flex-1 truncate text-left">{sortLabel}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Sort</SelectLabel>
              {orderSortOptions.map((option) => (
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
          order{resultCount === 1 ? "" : "s"} in this view
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
