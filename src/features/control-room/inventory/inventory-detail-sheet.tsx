"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ProductMediaPanel,
  ProductPricingPanel,
  ProductSummaryPanel,
} from "@/features/control-room/inventory/inventory-detail-catalogue";
import {
  ProductActivityPanel,
  ProductHoldsPanel,
  ProductMovementsPanel,
  ProductOrdersPanel,
  ProductReturnsPanel,
  ProductReviewsPanel,
} from "@/features/control-room/inventory/inventory-detail-records";
import { ProductStockPanel } from "@/features/control-room/inventory/inventory-detail-stock";
import type {
  ControlRoomState,
  InventoryListItem,
} from "@/lib/control-room/types";

type InventoryDetailSheetProps = {
  item: InventoryListItem | null;
  state: ControlRoomState;
  onOpenChange: (open: boolean) => void;
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

export function InventoryDetailSheet({
  item,
  state,
  onOpenChange,
}: InventoryDetailSheetProps) {
  const productId = item?.product.id ?? null;
  const orders = productId
    ? state.orders.filter((order) =>
        order.lines.some((line) => line.productId === productId),
      )
    : [];
  const holds = productId
    ? state.holds.filter((hold) => hold.productId === productId)
    : [];
  const movements = productId
    ? state.stockMovements
        .filter((movement) => movement.productId === productId)
        .toSorted(
          (left, right) =>
            new Date(right.occurredAt).getTime() -
            new Date(left.occurredAt).getTime(),
        )
    : [];
  const reviews = productId
    ? state.reviews
        .filter((review) => review.productId === productId)
        .toSorted(
          (left, right) =>
            new Date(right.createdAt).getTime() -
            new Date(left.createdAt).getTime(),
        )
    : [];
  const activities = productId
    ? state.activities
        .filter((activity) => activity.productId === productId)
        .toSorted(
          (left, right) =>
            new Date(right.occurredAt).getTime() -
            new Date(left.occurredAt).getTime(),
        )
    : [];

  return (
    <Sheet onOpenChange={onOpenChange} open={Boolean(item)}>
      <SheetContent
        className="w-[min(96vw,760px)] gap-0 overflow-y-auto overscroll-contain sm:max-w-[760px]"
        side="right"
      >
        {item && productId ? (
          <>
            <SheetHeader className="border-b border-border px-5 py-5 sm:px-6">
              <SheetTitle className="font-serif text-[28px] font-medium leading-tight">
                {item.product.name}
              </SheetTitle>
              <SheetDescription>
                Read-only catalogue, stock and operational history for this product.
              </SheetDescription>
            </SheetHeader>

            <Tabs className="min-h-0 flex-1" defaultValue="summary">
              <div className="overflow-x-auto border-b border-border px-4 sm:px-5">
                <TabsList
                  className="h-12 min-w-max gap-1 rounded-none bg-transparent p-0"
                  variant="line"
                >
                  {detailTabs.map(([value, label]) => (
                    <TabsTrigger
                      className="px-3 text-[11.5px]"
                      key={value}
                      value={value}
                    >
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
