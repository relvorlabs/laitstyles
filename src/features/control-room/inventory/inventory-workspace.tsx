"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { InventoryControls } from "@/features/control-room/inventory/inventory-controls";
import { InventoryDetailSheet } from "@/features/control-room/inventory/inventory-detail-sheet";
import { InventoryEmptyState } from "@/features/control-room/inventory/inventory-empty-state";
import { downloadInventoryCsv } from "@/features/control-room/inventory/inventory-export";
import { InventoryExportAlert } from "@/features/control-room/inventory/inventory-export-alert";
import { InventoryGrid } from "@/features/control-room/inventory/inventory-grid";
import { InventoryMobileList } from "@/features/control-room/inventory/inventory-mobile-list";
import { InventorySavedViews } from "@/features/control-room/inventory/inventory-saved-views";
import { InventorySelectionBar } from "@/features/control-room/inventory/inventory-selection-bar";
import { InventorySummaryStrip } from "@/features/control-room/inventory/inventory-summary-strip";
import { InventoryTable } from "@/features/control-room/inventory/inventory-table";
import { buildInventoryHref } from "@/features/control-room/inventory/inventory-url";
import { InventoryWorkspaceHeader } from "@/features/control-room/inventory/inventory-workspace-header";
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
  const pathname = usePathname();
  const router = useRouter();
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

  function replaceUrl(
    nextView = query.view,
    nextPresentation = presentation,
    nextProductId = openProductId,
  ) {
    router.replace(
      buildInventoryHref(pathname, {
        view: nextView,
        presentation: nextPresentation,
        productId: nextProductId,
      }),
      { scroll: false },
    );
  }

  function patchQuery(patch: Partial<InventoryQuery>) {
    const nextQuery = { ...query, ...patch };
    setQuery(nextQuery);
    setExportedCount(null);
    if (patch.view) replaceUrl(nextQuery.view);
  }

  function resetQuery() {
    setQuery(defaultInventoryQuery);
    setExportedCount(null);
    replaceUrl("all");
  }

  function changePresentation(nextPresentation: InventoryPresentation) {
    setPresentation(nextPresentation);
    replaceUrl(query.view, nextPresentation);
  }

  function openProduct(productId: string) {
    setOpenProductId(productId);
    replaceUrl(query.view, presentation, productId);
  }

  function closeProduct() {
    setOpenProductId(null);
    replaceUrl(query.view, presentation, null);
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

    downloadInventoryCsv(selected, state.reportingDate);
    setExportedCount(selected.length);
  }

  function openSelected() {
    const [productId] = selectedIds;
    if (productId) openProduct(productId);
  }

  return (
    <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <InventoryWorkspaceHeader />
      <InventorySummaryStrip summary={summary} />

      <Card className="gap-0 overflow-hidden py-0">
        <InventorySavedViews
          counts={viewCounts}
          onChange={(view) => patchQuery({ view })}
          value={query.view}
        />
        <InventoryControls
          facets={facets}
          onPresentationChange={changePresentation}
          onQueryChange={patchQuery}
          onReset={resetQuery}
          presentation={presentation}
          query={query}
          resultCount={items.length}
        />
      </Card>

      <InventoryExportAlert
        count={exportedCount}
        onDismiss={() => setExportedCount(null)}
      />

      {items.length ? (
        <>
          <InventoryMobileList
            items={items}
            onOpen={openProduct}
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
              onOpen={openProduct}
              onSelectedChange={setProductSelected}
              selectedIds={selectedIds}
            />
          </div>
          {presentation === "table" ? (
            <InventoryTable
              items={items}
              onOpen={openProduct}
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
          if (!open) closeProduct();
        }}
        state={state}
      />
    </div>
  );
}
