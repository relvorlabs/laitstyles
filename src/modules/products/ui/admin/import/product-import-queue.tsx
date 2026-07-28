"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ProductImportChild } from "@/modules/products/import/types";

type ProductImportQueueProps = {
  items: ProductImportChild[];
  ignoredAssetCount: number;
  selectedImportId: string | null;
  onSelect: (importId: string) => void;
  onPrevious: () => void;
  onNext: () => void;
};

export function ProductImportQueue({
  items,
  ignoredAssetCount,
  selectedImportId,
  onSelect,
  onPrevious,
  onNext,
}: ProductImportQueueProps) {
  const [search, setSearch] = useState("");
  const selectedIndex = items.findIndex((child) => child.importId === selectedImportId);
  const visibleChildren = useMemo(
    () =>
      items.filter((child) =>
        child.values.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
      ),
    [items, search],
  );

  return (
    <aside className="contents" aria-label="Imported product queue">
      <div className="border-b border-border bg-muted/20 px-5 py-4 lg:hidden">
        <label className="grid gap-1.5 text-xs font-medium" htmlFor="import-product-picker">
          Imported product
          <select
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            id="import-product-picker"
            onChange={(event) => onSelect(event.target.value)}
            value={selectedImportId ?? ""}
          >
            {items.map((child, index) => (
              <option key={child.importId} value={child.importId}>
                {index + 1}. {child.values.name || "Untitled product"} ({queueStatusLabel(child)})
              </option>
            ))}
          </select>
        </label>
        <QueueNavigation
          canGoNext={selectedIndex >= 0 && selectedIndex < items.length - 1}
          canGoPrevious={selectedIndex > 0}
          onNext={onNext}
          onPrevious={onPrevious}
          position={selectedIndex + 1}
          total={items.length}
        />
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          Nothing has been uploaded or saved yet. Imported values stay in this browser until you
          save the active product.
        </p>
        {ignoredAssetCount ? (
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {ignoredAssetCount} media asset{ignoredAssetCount === 1 ? " was" : "s were"} ignored;
            product media is not imported.
          </p>
        ) : null}
      </div>

      <div className="hidden min-h-0 flex-col border-r border-border bg-muted/15 lg:flex">
        <div className="border-b border-border px-4 py-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Import queue
          </p>
          <p className="mt-1 text-sm font-medium">
            {items.length} product{items.length === 1 ? "" : "s"} to review
          </p>
          <Input
            aria-label="Search imported products"
            className="mt-4 h-9"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search products"
            value={search}
          />
        </div>
        <div className="min-h-0 flex-1 overscroll-contain overflow-y-auto p-2">
          {visibleChildren.map((child) => (
            <button
              aria-current={child.importId === selectedImportId ? "true" : undefined}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm outline-none transition-colors [contain-intrinsic-size:auto_40px] [content-visibility:auto] hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current=true]:bg-accent"
              key={child.importId}
              onClick={() => onSelect(child.importId)}
              type="button"
            >
              <StatusDot status={child.status} />
              <span className="min-w-0 flex-1 truncate font-medium">
                {child.values.name || "Untitled product"}
              </span>
              <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                {queueStatusLabel(child)}
              </span>
            </button>
          ))}
          {!visibleChildren.length ? (
            <p className="px-3 py-5 text-sm text-muted-foreground">No imported products match.</p>
          ) : null}
        </div>
        <div className="border-t border-border px-4 py-3">
          <QueueNavigation
            canGoNext={selectedIndex >= 0 && selectedIndex < items.length - 1}
            canGoPrevious={selectedIndex > 0}
            onNext={onNext}
            onPrevious={onPrevious}
            position={selectedIndex + 1}
            total={items.length}
          />
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Nothing has been uploaded or saved yet. Imported values stay in this browser until you
            save the active product.
          </p>
          {ignoredAssetCount ? (
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              {ignoredAssetCount} media asset{ignoredAssetCount === 1 ? " was" : "s were"} ignored;
              product media is not imported.
            </p>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

function QueueNavigation({
  position,
  total,
  canGoPrevious,
  canGoNext,
  onPrevious,
  onNext,
}: {
  position: number;
  total: number;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="mt-3 flex items-center justify-between gap-2">
      <Button
        disabled={!canGoPrevious}
        onClick={onPrevious}
        size="sm"
        type="button"
        variant="outline"
      >
        Previous product
      </Button>
      <span className="text-xs tabular-nums text-muted-foreground">
        {Math.max(position, 0)} / {total}
      </span>
      <Button disabled={!canGoNext} onClick={onNext} size="sm" type="button" variant="outline">
        Next product
      </Button>
    </div>
  );
}

function queueStatusLabel(child: ProductImportChild) {
  if (child.status === "saved" && child.persistence) return child.persistence;
  if (child.isDirty && child.persistence) return `${child.persistence} edited`;
  return child.status;
}

function StatusDot({ status }: { status: ProductImportChild["status"] }) {
  const className =
    status === "saved"
      ? "bg-success"
      : status === "failed"
        ? "bg-destructive"
        : status === "saving"
          ? "bg-warning"
          : "bg-muted-foreground";
  return (
    <span className={`size-2 shrink-0 rounded-full ${className}`}>
      <span className="sr-only">Status: {status}</span>
    </span>
  );
}
