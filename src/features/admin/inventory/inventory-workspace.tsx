"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { InventoryControls } from "@/features/admin/inventory/inventory-controls";
import { InventoryDetailSheet } from "@/features/admin/inventory/inventory-detail-sheet";
import { InventoryEmptyState } from "@/features/admin/inventory/inventory-empty-state";
import { downloadInventoryCsv } from "@/features/admin/inventory/inventory-export";
import { InventoryExportAlert } from "@/features/admin/inventory/inventory-export-alert";
import { InventoryGrid } from "@/features/admin/inventory/inventory-grid";
import { InventoryIntakeQueue } from "@/features/admin/inventory/inventory-intake-queue";
import { InventoryMobileList } from "@/features/admin/inventory/inventory-mobile-list";
import { InventoryPagination } from "@/features/admin/inventory/inventory-pagination";
import { InventorySavedViews } from "@/features/admin/inventory/inventory-saved-views";
import { InventorySelectionBar } from "@/features/admin/inventory/inventory-selection-bar";
import { InventorySummaryStrip } from "@/features/admin/inventory/inventory-summary-strip";
import { InventoryTable } from "@/features/admin/inventory/inventory-table";
import { buildInventoryHref } from "@/features/admin/inventory/inventory-url";
import { InventoryWorkspaceHeader } from "@/features/admin/inventory/inventory-workspace-header";
import { ProductMediaViewer } from "@/features/admin/inventory/product-media-viewer";
import { useProductEditorController } from "@/features/admin/product-editor/product-editor-controller";
import { useAdmin } from "@/features/admin/state/admin-provider";
import {
  defaultInventoryQuery,
  getInventoryFacetOptions,
  getInventorySummary,
  getInventoryViewCounts,
  queryInventory,
  toInventoryListItem,
} from "@/lib/admin/inventory/inventory-selectors";
import type {
  InventoryFacetOptions,
  InventoryPresentation,
  InventoryQuery,
} from "@/lib/admin/shared/types";
import {
  adminProductsQueryOptions,
  productTaxonomyQueryOptions,
} from "@/modules/products/client/hooks";

type InventoryWorkspaceProps = {
  initialQuery: InventoryQuery;
  initialPresentation: InventoryPresentation;
  initialOpenProductId: string | null;
  initialPage: number;
  initialPageSize: number;
};

export function InventoryWorkspace({
  initialQuery,
  initialPresentation,
  initialOpenProductId,
  initialPage,
  initialPageSize,
}: InventoryWorkspaceProps) {
  const pathname = usePathname();
  const { state } = useAdmin();
  const { data: products = [] } = useQuery(adminProductsQueryOptions());
  const { data: catalogueTaxonomy = [] } = useQuery(productTaxonomyQueryOptions());
  const { openExistingProduct } = useProductEditorController();
  const [query, setQuery] = useState(initialQuery);
  const [presentation, setPresentation] = useState<InventoryPresentation>(initialPresentation);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [openProductId, setOpenProductId] = useState<string | null>(initialOpenProductId);
  const [openMedia, setOpenMedia] = useState<{
    productId: string;
    mediaId: string;
  } | null>(null);
  const [exportedCount, setExportedCount] = useState<number | null>(null);

  const items = useMemo(() => queryInventory(products, query), [query, products]);
  const summary = useMemo(() => getInventorySummary(products), [products]);
  const facets = useMemo<InventoryFacetOptions>(() => {
    const productFacets = getInventoryFacetOptions(products);
    return {
      ...productFacets,
      categories: mergeOptions(
        productFacets.categories,
        catalogueTaxonomy.filter((item) => item.kind === "category").map((item) => item.name),
      ),
      collections: mergeOptions(
        productFacets.collections,
        catalogueTaxonomy.filter((item) => item.kind === "collection").map((item) => item.name),
      ),
    };
  }, [catalogueTaxonomy, products]);
  const viewCounts = useMemo(() => getInventoryViewCounts(products), [products]);
  const allItems = useMemo(() => products.map(toInventoryListItem), [products]);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const pageItems = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, pageSize, safePage],
  );
  const openItem = allItems.find((item) => item.product.id === openProductId) ?? null;
  const mediaItem = allItems.find((item) => item.product.id === openMedia?.productId) ?? null;
  const isIntake = query.view === "intake";

  function replaceUrl(
    nextQuery = query,
    nextPresentation = presentation,
    nextProductId = openProductId,
    nextPage = safePage,
    nextPageSize = pageSize,
  ) {
    window.history.replaceState(
      null,
      "",
      buildInventoryHref(pathname, {
        query: nextQuery,
        presentation: nextPresentation,
        productId: nextProductId,
        page: nextPage,
        pageSize: nextPageSize,
      }),
    );
  }

  function patchQuery(patch: Partial<InventoryQuery>) {
    const nextQuery = { ...query, ...patch };
    setQuery(nextQuery);
    setPage(1);
    setSelectedIds(new Set());
    setExportedCount(null);
    replaceUrl(nextQuery, presentation, openProductId, 1);
  }

  function resetQuery() {
    setQuery(defaultInventoryQuery);
    setPage(1);
    setSelectedIds(new Set());
    setExportedCount(null);
    replaceUrl(defaultInventoryQuery, presentation, openProductId, 1);
  }

  function changePresentation(nextPresentation: InventoryPresentation) {
    setPresentation(nextPresentation);
    replaceUrl(query, nextPresentation);
  }

  function changePage(nextPage: number) {
    const clamped = Math.min(Math.max(nextPage, 1), totalPages);
    setPage(clamped);
    replaceUrl(query, presentation, openProductId, clamped);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function changePageSize(nextPageSize: number) {
    setPageSize(nextPageSize);
    setPage(1);
    setSelectedIds(new Set());
    replaceUrl(query, presentation, openProductId, 1, nextPageSize);
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
      for (const item of pageItems) {
        if (selected) next.add(item.product.id);
        else next.delete(item.product.id);
      }
      return next;
    });
    setExportedCount(null);
  }

  function exportSelection() {
    const selected = allItems.filter((item) => selectedIds.has(item.product.id));
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

      <InventoryExportAlert count={exportedCount} onDismiss={() => setExportedCount(null)} />

      {items.length ? (
        isIntake ? (
          <InventoryIntakeQueue items={items} />
        ) : (
          <>
            <InventoryMobileList
              items={pageItems}
              onOpen={openProduct}
              onOpenMedia={openProductMedia}
              onSelectedChange={setProductSelected}
              selectedIds={selectedIds}
            />
            <div
              className={presentation === "grid" ? "hidden md:block" : "hidden md:block lg:hidden"}
            >
              <InventoryGrid
                className={presentation === "table" ? "grid gap-4 md:grid-cols-2" : undefined}
                items={pageItems}
                onOpen={openProduct}
                onOpenMedia={openProductMedia}
                onSelectedChange={setProductSelected}
                selectedIds={selectedIds}
              />
            </div>
            {presentation === "table" ? (
              <InventoryTable
                items={pageItems}
                onOpen={openProduct}
                onOpenMedia={openProductMedia}
                onSelectedChange={setProductSelected}
                onSelectVisible={selectVisible}
                selectedIds={selectedIds}
              />
            ) : null}
            <InventoryPagination
              onPageChange={changePage}
              onPageSizeChange={changePageSize}
              page={safePage}
              pageSize={pageSize}
              totalItems={items.length}
            />
          </>
        )
      ) : (
        <InventoryEmptyState hasProducts={products.length > 0} onReset={resetQuery} />
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

function mergeOptions(primary: string[], secondary: string[]) {
  return Array.from(new Set([...primary, ...secondary])).toSorted((left, right) =>
    left.localeCompare(right, "en-NG"),
  );
}
