"use client";

import { Cancel01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from "@/components/ui/select";
import { ControlRoomIcon } from "@/features/control-room/shared/control-room-icon";
import {
  returnStatuses,
} from "@/features/control-room/returns/return-selectors";
import { returnStatusLabels } from "@/features/control-room/returns/return-labels";
import type {
  ReturnQuery,
  ReturnSortKey,
} from "@/features/control-room/returns/return-types";

const sortLabels: Record<ReturnSortKey, string> = {
  "updated-desc": "Recently updated",
  "requested-desc": "Newest request",
  "value-desc": "Highest return value",
};

export function ReturnControls({
  query,
  resultCount,
  onQueryChange,
  onReset,
}: {
  query: ReturnQuery;
  resultCount: number;
  onQueryChange: (patch: Partial<ReturnQuery>) => void;
  onReset: () => void;
}) {
  const filtered = Boolean(query.search || query.status !== "all" || query.sort !== "updated-desc");

  return (
    <div className="flex flex-col gap-3 p-3 sm:p-4 xl:flex-row xl:items-center">
      <div className="relative flex-1">
        <ControlRoomIcon
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          icon={Search01Icon}
          size={17}
        />
        <Input
          aria-label="Search returns"
          className="h-11 pl-10"
          onChange={(event) => onQueryChange({ search: event.target.value })}
          placeholder="Search return, order, customer or product"
          value={query.search}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex">
        <Select
          onValueChange={(value) => value && onQueryChange({ status: value as ReturnQuery["status"] })}
          value={query.status}
        >
          <SelectTrigger aria-label="Filter return status" className="h-11 min-w-0 sm:w-[190px]">
            <span className="flex-1 truncate text-left">
              {query.status === "all" ? "All statuses" : returnStatusLabels[query.status]}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Status</SelectLabel>
              <SelectItem value="all">All statuses</SelectItem>
              {returnStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {returnStatusLabels[status]}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select
          onValueChange={(value) => value && onQueryChange({ sort: value as ReturnSortKey })}
          value={query.sort}
        >
          <SelectTrigger aria-label="Sort returns" className="h-11 min-w-0 sm:w-[190px]">
            <span className="flex-1 truncate text-left">{sortLabels[query.sort]}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Sort</SelectLabel>
              {Object.entries(sortLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between gap-3 xl:justify-end">
        <p className="text-xs text-muted-foreground">
          {resultCount} return{resultCount === 1 ? "" : "s"} in this view
        </p>
        {filtered ? (
          <Button className="h-9 rounded-full px-3" onClick={onReset} type="button" variant="ghost">
            <ControlRoomIcon icon={Cancel01Icon} size={15} />
            Reset
          </Button>
        ) : null}
      </div>
    </div>
  );
}
