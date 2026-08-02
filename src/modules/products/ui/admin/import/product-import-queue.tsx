"use client";

import { Delete02Icon } from "@hugeicons/core-free-icons";
import { useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { ProductImportChild } from "@/modules/products/import/types";
import { AdminIcon } from "@/modules/products/ui/admin/admin-icon";

type ProductImportQueueProps = {
  items: ProductImportChild[];
  ignoredAssetCount: number;
  selectedImportId: string | null;
  onSelect: (importId: string) => void;
  selectedImportIds: string[];
  onAddFile: (file: File) => void;
  onToggleSelection: (importId: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onDelete: (importIds: string[]) => void;
  appendIssue?: string | null;
  appendNotice?: string | null;
};

export function ProductImportQueue({
  items,
  ignoredAssetCount,
  selectedImportId,
  onSelect,
  selectedImportIds,
  onAddFile,
  onToggleSelection,
  onSelectAll,
  onClearSelection,
  onDelete,
  appendIssue,
  appendNotice,
}: ProductImportQueueProps) {
  const [search, setSearch] = useState("");
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
        <QueueToolbar
          selectedCount={selectedImportIds.length}
          total={items.length}
          onAddFile={onAddFile}
          onSelectAll={onSelectAll}
          onClearSelection={onClearSelection}
          onDelete={() => onDelete(selectedImportIds)}
        />
        {appendIssue ? (
          <p aria-live="assertive" className="mt-2 text-xs text-destructive">
            {appendIssue}
          </p>
        ) : null}
        {appendNotice ? (
          <p aria-live="polite" className="mt-2 text-xs text-muted-foreground">
            {appendNotice}
          </p>
        ) : null}
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

        <div className="mt-3 grid gap-1 lg:hidden">
          {items.map((child) => (
            <div
              key={child.importId}
              className="flex min-h-11 items-center gap-2 rounded-md border border-border/60 px-2"
            >
              <Checkbox
                aria-label={`Select ${child.values.name || "Untitled product"}`}
                checked={selectedImportIds.includes(child.importId)}
                onCheckedChange={() => onToggleSelection(child.importId)}
              />
              <button
                className="min-w-0 flex-1 truncate py-2 text-left text-sm font-medium"
                onClick={() => onSelect(child.importId)}
                type="button"
              >
                {child.values.name || "Untitled product"}
              </button>
              <button
                aria-label={`Delete ${child.values.name || "Untitled product"}`}
                className="flex min-h-11 min-w-11 items-center justify-center text-muted-foreground"
                onClick={() => onDelete([child.importId])}
                type="button"
              >
                <AdminIcon icon={Delete02Icon} size={16} />
              </button>
            </div>
          ))}
        </div>

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
          <QueueToolbar
            selectedCount={selectedImportIds.length}
            total={items.length}
            onAddFile={onAddFile}
            onSelectAll={onSelectAll}
            onClearSelection={onClearSelection}
            onDelete={() => onDelete(selectedImportIds)}
          />
          {appendIssue ? (
            <p aria-live="assertive" className="mt-2 text-xs text-destructive">
              {appendIssue}
            </p>
          ) : null}
          {appendNotice ? (
            <p aria-live="polite" className="mt-2 text-xs text-muted-foreground">
              {appendNotice}
            </p>
          ) : null}
          {ignoredAssetCount ? (
            <p aria-live="polite" className="mt-2 text-xs leading-5 text-muted-foreground">
              {ignoredAssetCount} media asset{ignoredAssetCount === 1 ? " was" : "s were"} ignored;
              product media is not imported.
            </p>
          ) : null}
        </div>
        <div className="min-h-0 flex-1 overscroll-contain overflow-y-auto p-2">
          {visibleChildren.map((child) => (
            <div
              key={child.importId}
              className="group flex w-full items-center gap-2 rounded-md px-2 py-1 hover:bg-accent"
            >
              <Checkbox
                aria-label={`Select ${child.values.name || "Untitled product"}`}
                checked={selectedImportIds.includes(child.importId)}
                onCheckedChange={() => onToggleSelection(child.importId)}
              />
              <button
                aria-current={child.importId === selectedImportId ? "true" : undefined}
                className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-2.5 text-left text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current=true]:bg-accent"
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
              <button
                aria-label={`Delete ${child.values.name || "Untitled product"}`}
                className="flex min-h-11 min-w-11 items-center justify-center text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                onClick={() => onDelete([child.importId])}
                type="button"
              >
                <AdminIcon icon={Delete02Icon} size={16} />
              </button>
            </div>
          ))}
          {!visibleChildren.length ? (
            <p className="px-3 py-5 text-sm text-muted-foreground">No imported products match.</p>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

function QueueToolbar({
  selectedCount,
  total,
  onAddFile,
  onSelectAll,
  onClearSelection,
  onDelete,
}: {
  selectedCount: number;
  total: number;
  onAddFile: (file: File) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <label className="inline-flex min-h-9 cursor-pointer items-center rounded-md border border-input px-3 text-xs font-medium">
        Add another file
        <input
          aria-label="Add another product import file"
          accept=".csv,.json,text/csv,application/json"
          className="sr-only"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) onAddFile(file);
            event.currentTarget.value = "";
          }}
          type="file"
        />
      </label>
      <button
        aria-label={
          selectedCount === total
            ? "Clear imported product selection"
            : "Select all imported products"
        }
        className="min-h-9 rounded-md border border-input px-3 text-xs font-medium"
        onClick={selectedCount === total ? onClearSelection : onSelectAll}
        type="button"
      >
        {selectedCount === total ? "Clear selection" : "Select all"}
      </button>
      {selectedCount ? (
        <button
          aria-label="Delete selected imported products"
          className="min-h-9 rounded-md border border-destructive/40 px-3 text-xs font-medium text-destructive"
          onClick={onDelete}
          type="button"
        >
          Delete selected
        </button>
      ) : null}
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
