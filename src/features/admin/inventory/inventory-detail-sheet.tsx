"use client";

import { useQuery } from "@tanstack/react-query";
import { Edit02Icon } from "@hugeicons/core-free-icons";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminRepositories } from "@/features/admin/data/admin-repository-context";
import { ProductMediaPanel } from "@/features/admin/inventory/inventory-detail-media";
import { ProductPricingPanel } from "@/features/admin/inventory/inventory-detail-pricing";
import {
  ProductActivityPanel,
  ProductHoldsPanel,
  ProductMovementsPanel,
  ProductOrdersPanel,
  ProductReturnsPanel,
  ProductReviewsPanel,
} from "@/features/admin/inventory/inventory-detail-records";
import { ProductStockPanel } from "@/features/admin/inventory/inventory-detail-stock";
import { ProductSummaryPanel } from "@/features/admin/inventory/inventory-detail-summary";
import { InventoryProductLifecycleActions } from "@/features/admin/inventory/inventory-product-lifecycle-actions";
import { AdminIcon } from "@/features/admin/shared/admin-icon";
import { inventoryStockMovementsQueryOptions } from "@/lib/admin/inventory/inventory-query-options";
import type { ControlRoomState, InventoryListItem } from "@/lib/admin/shared/types";

type InventoryDetailSheetProps = {
  item: InventoryListItem | null;
  state: ControlRoomState;
  onOpenChange: (open: boolean) => void;
  onEdit: (productId: string) => void;
};

const detailTabs = [
  ["summary", "Summary"],
  ["stock", "Stock & variants"],
  ["media", "Media"],
  ["pricing", "Pricing"],
  ["orders", "Orders"],
  ["holds", "Holds"],
  ["movements", "Movements"],
  ["returns", "Returns & damage"],
  ["reviews", "Reviews"],
  ["activity", "Activity"],
] as const;

type DetailTab = (typeof detailTabs)[number][0];

export function InventoryDetailSheet({
  item,
  state,
  onOpenChange,
  onEdit,
}: InventoryDetailSheetProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>("summary");
  const repositories = useAdminRepositories();
  const productId = item?.product.id ?? null;
  const { data: movements = [] } = useQuery({
    ...inventoryStockMovementsQueryOptions(repositories, productId ?? undefined),
    enabled: Boolean(productId),
  });
  const orders = productId
    ? state.orders.filter((order) => order.lines.some((line) => line.productId === productId))
    : [];
  const holds = productId ? state.holds.filter((hold) => hold.productId === productId) : [];
  const reviews = productId
    ? state.reviews
        .filter((review) => review.productId === productId)
        .toSorted(
          (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
        )
    : [];
  const activities = productId
    ? state.activities
        .filter((activity) => activity.productId === productId)
        .toSorted(
          (left, right) =>
            new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime(),
        )
    : [];

  return (
    <Sheet onOpenChange={onOpenChange} open={Boolean(item)}>
      <SheetContent
        className="data-[side=right]:w-[calc(100vw-1rem)] data-[side=right]:gap-0 data-[side=right]:overflow-y-auto data-[side=right]:overscroll-contain data-[side=right]:sm:w-[min(92vw,760px)] data-[side=right]:sm:max-w-[760px]"
        side="right"
      >
        {item && productId ? (
          <>
            <SheetHeader className="border-b border-border px-5 py-5 pr-14 sm:px-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <SheetTitle className="font-serif text-[28px] font-medium leading-tight">
                    {item.product.name}
                  </SheetTitle>
                  <SheetDescription className="mt-1">
                    Catalogue, stock and operational history for this product.
                  </SheetDescription>
                </div>
                <Button size="lg" onClick={() => onEdit(productId)} type="button" variant="outline">
                  <AdminIcon icon={Edit02Icon} size={16} />
                  Edit product
                </Button>
              </div>
              <InventoryProductLifecycleActions
                lifecycle={item.product.lifecycle}
                onDeleted={() => onOpenChange(false)}
                productId={productId}
                productName={item.product.name}
              />
            </SheetHeader>

            <Tabs
              className="min-h-0 flex-1"
              onValueChange={(value) => setActiveTab(value as DetailTab)}
              value={activeTab}
            >
              <div className="border-b border-border px-4 py-3 sm:hidden">
                <Select
                  onValueChange={(value) => {
                    if (value) setActiveTab(value as DetailTab);
                  }}
                  value={activeTab}
                >
                  <SelectTrigger
                    aria-label="Product detail section"
                    className="h-11 w-full justify-between"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="start">
                    <SelectGroup>
                      {detailTabs.map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="hidden overflow-x-auto overscroll-x-contain border-b border-border px-4 sm:block sm:px-5">
                <TabsList
                  className="h-12 min-w-max gap-1 rounded-none bg-transparent p-0"
                  variant="line"
                >
                  {detailTabs.map(([value, label]) => (
                    <TabsTrigger className="px-3 text-[11.5px]" key={value} value={value}>
                      {label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <div className="p-4 sm:p-5">
                <TabsContent value="summary">
                  <ProductSummaryPanel item={item} />
                </TabsContent>
                <TabsContent value="stock">
                  <ProductStockPanel item={item} />
                </TabsContent>
                <TabsContent value="media">
                  <ProductMediaPanel item={item} />
                </TabsContent>
                <TabsContent value="pricing">
                  <ProductPricingPanel item={item} />
                </TabsContent>
                <TabsContent value="orders">
                  <ProductOrdersPanel orders={orders} productId={productId} />
                </TabsContent>
                <TabsContent value="holds">
                  <ProductHoldsPanel holds={holds} />
                </TabsContent>
                <TabsContent value="movements">
                  <ProductMovementsPanel movements={movements} />
                </TabsContent>
                <TabsContent value="returns">
                  <ProductReturnsPanel movements={movements} />
                </TabsContent>
                <TabsContent value="reviews">
                  <ProductReviewsPanel reviews={reviews} />
                </TabsContent>
                <TabsContent value="activity">
                  <ProductActivityPanel activities={activities} />
                </TabsContent>
              </div>
            </Tabs>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
