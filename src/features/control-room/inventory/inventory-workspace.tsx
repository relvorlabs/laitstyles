"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowUpRight01Icon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InventoryControls } from "@/features/control-room/inventory/inventory-controls";
import { InventoryDetailSheet } from "@/features/control-room/inventory/inventory-detail-sheet";
import { InventoryEmptyState } from "@/features/control-room/inventory/inventory-empty-state";
import { InventoryGrid } from "@/features/control-room/inventory/inventory-grid";
import { InventoryMobileList } from "@/features/control-room/inventory/inventory-mobile-list";
import { InventorySavedViews } from "@/features/control-room/inventory/inventory-saved-views";
import { InventorySelectionBar } from "@/features/control-room/inventory/inventory-selection-bar";
import { InventorySummaryStrip } from "@/features/control-room/inventory/inventory-summary-strip";
import { InventoryTable } from "@/features/control-room/inventory/inventory-table";
import { ControlRoomIcon } from "@/features/control-room/shared/control-room-icon";
import {
  defaultInventoryQuery,
  getInventoryFacetOptions,
  getInventorySummary,
  getInventoryViewCounts,
  queryInventory,
  toInventoryListItem,
} from "@/lib/control-room/inventory-selectors";
import type {
  ControlRoomState,
  InventoryPresentation,
  InventoryQuery,
} from "@/lib/control-room/types";

type InventoryWorkspaceProps = {
  state: ControlRoomState;
  initialQuery: InventoryQuery;
  initialPresentation: InventoryPresentation;
  initialOpenProductId: string | null;
};

export function InventoryWorkspace({
  state,
  initialQuery,
  initialPresentation,
  initialOpenProductId,
}: InventoryWorkspaceProps) {
  const [query, setQuery] = useState(initialQuery);
  const [presentation, setPresentation] =
    useState<InventoryPresentation>(initialPresentation);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [openProductId, setOpenProductId] = useState<string | null>(
    initialOpenProductId,
  );
  const [exportedCount, setExportedCount] = useState<number | null>(null);

  const items = useMemo(
    () => queryInventory(state.products, query),
    [query, state.products],
  );
  const summary = useMemo(
    () => getInventorySummary(state.products),
    [state.products],
  );
  const facets = useMemo(
    () => getInventoryFacetOptions(state.products),
    [state.products],
  );
  const viewCounts = useMemo(
    () => getInventoryViewCounts(state.products),
    [state.products],
  );
  const allItems = useMemo(
    () => state.products.map(toInventoryListItem),
    [state.products],
  );
  const openItem =
    allItems.find((item) => item.product.id === openProductId) ?? null;

  function patchQuery(patch: Partial<InventoryQuery>) {
    setQuery((current) => ({ ...current, ...patch }));
    setExportedCount(null);
  }

  function resetQuery() {
    setQuery(defaultInventoryQuery);
    setExportedCount(null);
  }

  function setProductSelected(productId: string, selected: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (selected) next.add(productId);
      else next.delete(productId);
      return next;
    });
    setExportedCount(null);
  }

  function selectVisible(selected: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const item of items) {
        if (selected) next.add(item.product.id);
        else next.delete(item.product.id);
      }
      return next;
    });
    setExportedCount(null);
  }

  function exportSelection() {
    const selected = allItems.filter((item) =>
      selectedIds.has(item.product.id),
    );
    if (!selected.length) return;

    const rows = [
      [
        "Product",
        "Reference",
        "Mode",
        "Category",
        "Collection",
        "Available",
        "Reserved",
        "Sold",
        "Returned",
        "Damaged",
        "Price",
        "Publication",
      ],
      ...selected.map((item) => [
        item.product.name,
        item.reference,
        item.product.inventoryMode,
        item.product.category,
        item.product.collection ?? "",
        item.stock.available,
        item.stock.reserved,
        item.stock.sold,
        item.stock.returned,
        item.stock.damaged,
        item.product.price,
        item.product.publication,
      ]),
    ];
    const csv = rows
      .map((row) => row.map((value) => escapeCsv(String(value))).join(","))
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `laitstyle-inventory-${state.reportingDate}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    setExportedCount(selected.length);
  }

  function openSelected() {
    const [productId] = selectedIds;
    if (productId) setOpenProductId(productId);
  }

  return (
    <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Catalogue operations
          </p>
          <h1 className="mt-3 max-w-[820px] text-balance font-serif text-[40px] font-medium leading-[.98] sm:text-[52px]">
            See every piece, unit and variant as one catalogue truth.
          </h1>
          <p className="mt-4 max-w-[720px] text-[14px] leading-6 text-muted-foreground">
            Product imagery leads the workspace, while stock, holds, visibility and sales stay close enough for daily decisions.
          </p>
        </div>
        <Link
          className={buttonVariants({
            variant: "outline",
            size: "lg",
            className: "h-11 rounded-full px-5",
          })}
          href="/shop"
        >
          Preview catalogue
          <ControlRoomIcon icon={ArrowUpRight01Icon} size={16} />
        </Link>
      </section>

      <InventorySummaryStrip summary={summary} />

      <Card className="gap-0 overflow-hidden py-0">
        <InventorySavedViews
          counts={viewCounts}
          onChange={(view) => patchQuery({ view })}
          value={query.view}
        />
        <InventoryControls
          facets={facets}
          onPresentationChange={setPresentation}
          onQueryChange={patchQuery}
          onReset={resetQuery}
          presentation={presentation}
          query={query}
          resultCount={items.length}
        />
      </Card>

      {exportedCount ? (
        <Alert className="border-[#C9D1B8] bg-[#E7EBDD] text-[#4A5540]">
          <ControlRoomIcon icon={CheckmarkCircle02Icon} size={18} />
          <AlertTitle>Inventory export created</AlertTitle>
          <AlertDescription className="text-[#59644A]">
            {exportedCount} selected product{exportedCount === 1 ? "" : "s"} were exported as a CSV file.
          </AlertDescription>
          <AlertAction>
            <Button
              className="h-8 rounded-full px-3"
              onClick={() => setExportedCount(null)}
              size="sm"
              type="button"
              variant="ghost"
            >
              Dismiss
            </Button>
          </AlertAction>
        </Alert>
      ) : null}

      {items.length ? (
        <>
          <InventoryMobileList
            items={items}
            onOpen={setOpenProductId}
            onSelectedChange={setProductSelected}
            selectedIds={selectedIds}
          />

          <div
            className={
              presentation === "grid"
                ? "hidden md:block"
                : "hidden md:block lg:hidden"
            }
          >
            <InventoryGrid
              className="grid gap-4 md:grid-cols-2"
              items={items}
              onOpen={setOpenProductId}
              onSelectedChange={setProductSelected}
              selectedIds={selectedIds}
            />
          </div>

          {presentation === "table" ? (
            <InventoryTable
              items={items}
              onOpen={setOpenProductId}
              onSelectedChange={setProductSelected}
              onSelectVisible={selectVisible}
              selectedIds={selectedIds}
            />
          ) : null}
        </>
      ) : (
        <InventoryEmptyState
          hasProducts={state.products.length > 0}
          onReset={resetQuery}
        />
      )}

      <InventorySelectionBar
        onClear={() => setSelectedIds(new Set())}
        onExport={exportSelection}
        onOpenSelected={openSelected}
        selectedCount={selectedIds.size}
      />

      <InventoryDetailSheet
        item={openItem}
        onOpenChange={(open) => {
          if (!open) setOpenProductId(null);
        }}
        state={state}
      />
    </div>
  );
}

function escapeCsv(value: string) {
  if (!/[",\n]/.test(value)) return value;
  return `"${value.replaceAll('"', '""')}"`;
}
