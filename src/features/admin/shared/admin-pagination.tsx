"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const pageSizeOptions = [10, 25, 50, 100] as const;

export function AdminPagination({
  noun,
  page,
  pageSize,
  pageCount,
  totalItems,
  onPageChange,
  onPageSizeChange,
}: {
  noun: string;
  page: number;
  pageSize: number;
  pageCount: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const totalPages = Math.max(1, pageCount);
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const firstItem = totalItems ? (safePage - 1) * pageSize + 1 : 0;
  const lastItem = Math.min(safePage * pageSize, totalItems);
  const visiblePages = getVisiblePages(safePage, totalPages);
  const label = noun.toLocaleLowerCase("en-GB");

  return (
    <nav
      aria-label={`${noun} pagination`}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span aria-live="polite">
          Showing{" "}
          <strong className="font-semibold text-foreground">
            {firstItem}–{lastItem}
          </strong>{" "}
          of <strong className="font-semibold text-foreground">{totalItems}</strong>
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs">{noun} per page</span>
          <Select
            onValueChange={(value) => onPageSizeChange(Number(value ?? pageSize))}
            value={String(pageSize)}
          >
            <SelectTrigger aria-label={`${noun} per page`} className="h-9 w-[76px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {pageSizeOptions.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          aria-label={`Previous ${label} page`}
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          size="icon"
          type="button"
          variant="outline"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
        </Button>

        {visiblePages.map((entry, index) =>
          entry === "ellipsis" ? (
            <span
              aria-hidden="true"
              className="grid size-10 place-items-center text-sm text-muted-foreground"
              key={`ellipsis-${index}`}
            >
              …
            </span>
          ) : (
            <Button
              aria-current={entry === safePage ? "page" : undefined}
              aria-label={`Go to ${label} page ${entry}`}
              key={entry}
              onClick={() => onPageChange(entry)}
              size="icon"
              type="button"
              variant={entry === safePage ? "default" : "ghost"}
            >
              {entry}
            </Button>
          ),
        )}

        <Button
          aria-label={`Next ${label} page`}
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          size="icon"
          type="button"
          variant="outline"
        >
          <ChevronRight aria-hidden="true" className="size-4" />
        </Button>
      </div>
    </nav>
  );
}

function getVisiblePages(page: number, totalPages: number) {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const result: Array<number | "ellipsis"> = [1];
  if (page > 3) result.push("ellipsis");
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);
  for (let current = start; current <= end; current += 1) result.push(current);
  if (page < totalPages - 2) result.push("ellipsis");
  result.push(totalPages);
  return result;
}
