"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
import { useProductEditorController } from "@/modules/products/ui/admin/product-editor/product-editor-controller";
import { useAdmin } from "@/features/admin/state/admin-provider";
import {
  defaultInventoryQuery,
  toInventoryListItem,
} from "@/lib/admin/inventory/inventory-selectors";
import type {
  InventoryFacetOptions,
  InventoryListItem,
  InventoryPresentation,
  InventoryQuery,
} from "@/lib/admin/shared/types";
import { inventoryProductPageQueryOptions } from "@/modules/inventory/client/hooks";
import type {
  InventoryProductListInput,
  InventorySummary,
  InventoryViewCounts,
} from "@/modules/inventory/types";
import {
  adminProductQueryOptions,
  productTaxonomyQueryOptions,
} from "@/modules/products/client/hooks";

const emptySummary: InventorySummary = {
  totalProducts: 0,
  liveProducts: 0,
  availableUnits: 0,
  reservedUnits: 0,
  soldUnits: 0,
  lowStockProducts: 0,
  outOfStockProducts: 0,
  intakeProducts: 0,
};

const emptyViewCounts: InventoryViewCounts = {
  all: 0,
  live: 0,
  drafts: 0,
  intake: 0,
  "low-stock": 0,
  "out-of-stock": 0,
  held: 0,
  sold: 0,
  unpublished: 0,
  "needs-attention": 0,
};

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
  const { openExistingProduct } = useProductEditorController();
  const [query, setQuery] = useState(initialQuery);
  const [presentation, setPresentation] = useState<InventoryPresentation>(initialPresentation);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [selectedItems, setSelectedItems] = useState<Map<string, InventoryListItem>>(
    () => new Map(),
  );
  const [openProductId, setOpenProductId] = useState<string | null>(initialOpenProductId);
  const [openMedia, setOpenMedia] = useState<{
    productId: string;
    mediaId: string;
  } | null>(null);
  const [exportedCount, setExportedCount] = useState<number | null>(null);

  const pageInput = useMemo<InventoryProductListInput>(
    () => ({
      view: query.view,
      q: query.search,
      mode: query.mode,
      stock: query.stock,
      category: query.category,
      collection: query.collection,
      channel: query.channel,
      sort: query.sort,
      page,
      pageSize,
    }),
    [page, pageSize, query],
  );
  const { data: productPage } = useQuery(inventoryProductPageQueryOptions(pageInput));
  const { data: catalogueTaxonomy = [] } = useQuery(productTaxonomyQueryOptions());
  const { data: openedProduct = null } = useQuery({
    ...adminProductQueryOptions(openProductId ?? "closed"),
    enabled: Boolean(openProductId),
  });

  const products = productPage?.products ?? [];
  const items = useMemo(() => products.map(toInventoryListItem), [products]);
  const summary = productPage?.summary ?? emptySummary;
  const viewCounts = productPage?.viewCounts ?? emptyViewCounts;
  const pagination = productPage?.pagination ?? {
    page,
    pageSize,
    total: 0,
    pageCount: 0,
  };
  const facets = useMemo<InventoryFacetOptions>(
    () => ({
      categories: mergeOptions(
        ["Uncategorised"],
        catalogueTaxonomy.filter((item) => item.kind === "category").map((item) => item.name),
      ),
      collections: mergeOptions(
        [],
        catalogueTaxonomy.filter((item) => item.kind === "collection").map((item) => item.name),
      ),
    }),
    [catalogueTaxonomy],
  );
  const totalPages = Math.max(1, pagination.pageCount);
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const openItem = openedProduct
    ? toInventoryListItem(openedProduct)
    : (items.find((item) => item.product.id === openProductId) ?? null);
  const mediaItem = items.find((item) => item.product.id === openMedia?.productId) ?? null;
  const isIntake = query.view === "intake";

  useEffect(() => {
    if (!productPage || page <= totalPages) return;
    setPage(totalPages);
    window.history.replaceState(
      null,
      "",
      buildInventoryHref(pathname, {
        query,
        presentation,
        productId: openProductId,
        page: totalPages,
        pageSize,
      }),
    );
  }, [openProductId, page, pageSize, pathname, presentation, productPage, query, totalPages]);

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

  function clearSelection() {
    setSelectedIds(new Set());
    setSelectedItems(new Map());
  }

  function patchQuery(patch: Partial<InventoryQuery>) {
    const nextQuery = { ...query, ...patch };
    setQuery(nextQuery);
    setPage(1);
    clearSelection();
    setExportedCount(null);
    replaceUrl(nextQuery, presentation, openProductId, 1);
  }

  function resetQuery() {
    setQuery(defaultInventoryQuery);
    setPage(1);
    clearSelection();
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
    clearSelection();
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
    const item = items.find((entry) => entry.product.id === productId);
    setSelectedIds((current) => {
      const next = new Set(current);
      if (selected) next.add(productId);
      else next.delete(productId);
      return next;
    });
    setSelectedItems((current) => {
      const next = new Map(current);
      if (selected && item) next.set(productId, item);
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
    setSelectedItems((current) => {
      const next = new Map(current);
      for (const item of items) {
        if (selected) next.set(item.product.id, item);
        else next.delete(item.product.id);
      }
      return next;
    });
    setExportedCount(null);
  }

  function exportSelection() {
    const selected = [...selectedItems.values()];
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
          resultCount={pagination.total}
        />
      </Card>

      <InventoryExportAlert count={exportedCount} onDismiss={() => setExportedCount(null)} />

      {items.length ? (
        isIntake ? (
          <>
            <InventoryIntakeQueue items={items} totalItems={pagination.total} />
            <InventoryPagination
              onPageChange={changePage}
              onPageSizeChange={changePageSize}
              page={safePage}
              pageSize={pageSize}
              totalItems={pagination.total}
            />
          </>
        ) : (
          <>
            <InventoryMobileList
              items={items}
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
              totalItems={pagination.total}
            />
          </>
        )
      ) : (
        <InventoryEmptyState hasProducts={summary.totalProducts > 0} onReset={resetQuery} />
      )}

      {!isIntake ? (
        <InventorySelectionBar
          onClear={clearSelection}
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
