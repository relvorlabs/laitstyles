"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Card } from "@/components/ui/card";
import { InventoryControls } from "@/features/control-room/inventory/inventory-controls";
import { InventoryDetailSheet } from "@/features/control-room/inventory/inventory-detail-sheet";
import { InventoryEmptyState } from "@/features/control-room/inventory/inventory-empty-state";
import { downloadInventoryCsv } from "@/features/control-room/inventory/inventory-export";
import { InventoryExportAlert } from "@/features/control-room/inventory/inventory-export-alert";
import { InventoryGrid } from "@/features/control-room/inventory/inventory-grid";
import { InventoryIntakeQueue } from "@/features/control-room/inventory/inventory-intake-queue";
import { InventoryMobileList } from "@/features/control-room/inventory/inventory-mobile-list";
import { InventorySavedViews } from "@/features/control-room/inventory/inventory-saved-views";
import { InventorySelectionBar } from "@/features/control-room/inventory/inventory-selection-bar";
import { InventorySummaryStrip } from "@/features/control-room/inventory/inventory-summary-strip";
import { InventoryTable } from "@/features/control-room/inventory/inventory-table";
import { buildInventoryHref } from "@/features/control-room/inventory/inventory-url";
import { InventoryWorkspaceHeader } from "@/features/control-room/inventory/inventory-workspace-header";
import { ProductMediaViewer } from "@/features/control-room/inventory/product-media-viewer";
import { useProductEditorController } from "@/features/control-room/product-editor/product-editor-controller";
import { useControlRoom } from "@/features/control-room/state/control-room-provider";
import {
  defaultInventoryQuery,
  getInventoryFacetOptions,
  getInventorySummary,
  getInventoryViewCounts,
  queryInventory,
  toInventoryListItem,
} from "@/lib/control-room/inventory-selectors";
import type {
  InventoryPresentation,
  InventoryQuery,
} from "@/lib/control-room/types";

type InventoryWorkspaceProps = {
  initialQuery: InventoryQuery;
  initialPresentation: InventoryPresentation;
  initialOpenProductId: string | null;
};

export function InventoryWorkspace({
  initialQuery,
  initialPresentation,
  initialOpenProductId,
}: InventoryWorkspaceProps) {
  const pathname = usePathname();
  const { state } = useControlRoom();
  const { openExistingProduct } = useProductEditorController();
  const [query, setQuery] = useState(initialQuery);
  const [presentation, setPresentation] =
    useState<InventoryPresentation>(initialPresentation);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [openProductId, setOpenProductId] = useState<string | null>(
    initialOpenProductId,
  );
  const [openMedia, setOpenMedia] = useState<{
    productId: string;
    mediaId: string;
  } | null>(null);
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
  const mediaItem =
    allItems.find((item) => item.product.id === openMedia?.productId) ?? null;
  const isIntake = query.view === "intake";

  function replaceUrl(
    nextQuery = query,
    nextPresentation = presentation,
    nextProductId = openProductId,
  ) {
    window.history.replaceState(
      null,
      "",
      buildInventoryHref(pathname, {
        query: nextQuery,
        presentation: nextPresentation,
        productId: nextProductId,
      }),
    );
  }

  function patchQuery(patch: Partial<InventoryQuery>) {
    const nextQuery = { ...query, ...patch };
    setQuery(nextQuery);
    setSelectedIds(new Set());
    setExportedCount(null);
    replaceUrl(nextQuery);
  }

  function resetQuery() {
    setQuery(defaultInventoryQuery);
    setSelectedIds(new Set());
    setExportedCount(null);
    replaceUrl(defaultInventoryQuery);
  }

  function changePresentation(nextPresentation: InventoryPresentation) {
    setPresentation(nextPresentation);
    replaceUrl(query, nextPresentation);
  }

  function openProduct(productId: string) {
    setOpenProductId(productId);
    replaceUrl(query, presentation, productId);
  }

  function closeProduct() {
    setOpenProductId(null);
    replaceUrl(query, presentation, null);
  }

  function editProduct(productId: string) {
    closeProduct();
    openExistingProduct(productId);
  }

  function openProductMedia(productId: string, mediaId: string) {
    setOpenMedia({ productId, mediaId });
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
        isIntake ? (
          <InventoryIntakeQueue items={items} />
        ) : (
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
                className={
                  presentation === "table"
                    ? "grid gap-3 md:grid-cols-2"
                    : undefined
                }
                items={items}
                onOpen={openProduct}
                onOpenMedia={openProductMedia}
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
        )
      ) : (
        <InventoryEmptyState
          hasProducts={state.products.length > 0}
          onReset={resetQuery}
        />
      )}

      {!isIntake ? (
        <InventorySelectionBar
          onClear={() => setSelectedIds(new Set())}
          onExport={exportSelection}
          onOpenSelected={openSelected}
          selectedCount={selectedIds.size}
        />
      ) : null}
      <InventoryDetailSheet
        item={openItem}
        onEdit={editProduct}
        onOpenChange={(open) => {
          if (!open) closeProduct();
        }}
        state={state}
      />
      <ProductMediaViewer
        initialMediaId={openMedia?.mediaId}
        media={mediaItem?.product.media ?? []}
        onOpenChange={(open) => {
          if (!open) setOpenMedia(null);
        }}
        open={Boolean(mediaItem && openMedia)}
        productName={mediaItem?.product.name ?? "Product media"}
      />
    </div>
  );
}
