"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomerDeliveryPanel } from "@/features/admin/customers/customer-delivery-panel";
import {
  customerTypeLabels,
  getCustomerInitials,
} from "@/features/admin/customers/customer-labels";
import { CustomerOverviewPanel } from "@/features/admin/customers/customer-overview-panel";
import { CustomerProductsPanel } from "@/features/admin/customers/customer-products-panel";
import {
  CustomerAttentionBadges,
  CustomerSegmentBadges,
} from "@/features/admin/customers/customer-status-badges";
import { CustomerTimelinePanel } from "@/features/admin/customers/customer-timeline-panel";
import type { CustomerActionFeedback } from "@/features/admin/customers/customer-types";
import type { CustomerRelationshipProfile } from "@/lib/admin/customers/customer-types";
import type { AdminState } from "@/lib/admin/shared/types";

export function CustomerDetailSheet({
  state,
  profile,
  feedback,
  onOpenChange,
  onAddNote,
}: {
  state: AdminState;
  profile: CustomerRelationshipProfile | null;
  feedback: CustomerActionFeedback | null;
  onOpenChange: (open: boolean) => void;
  onAddNote: (customerId: string, body: string) => Promise<string | null>;
}) {
  if (!profile) {
    return <Sheet onOpenChange={onOpenChange} open={false} />;
  }

  const customer = profile.customer;

  return (
    <Sheet onOpenChange={onOpenChange} open>
      <SheetContent
        className="data-[side=right]:gap-0 data-[side=right]:overflow-y-auto data-[side=right]:overscroll-contain max-sm:!inset-x-0 max-sm:!w-screen max-sm:!max-w-none max-sm:border-l-0 max-sm:pb-[env(safe-area-inset-bottom)] max-sm:duration-0 data-[side=right]:sm:w-[min(96vw,900px)] data-[side=right]:sm:max-w-[900px]"
        side="right"
      >
        <SheetHeader className="border-b border-border px-5 py-5 pr-14 max-sm:pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6">
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-secondary font-serif text-lg font-semibold">
              {getCustomerInitials(customer.name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {customerTypeLabels[customer.type ?? "individual"]} · {customer.city || "No city"}
              </p>
              <SheetTitle className="mt-2 text-balance font-serif text-[31px] font-medium leading-none">
                {customer.name}
              </SheetTitle>
              <SheetDescription className="mt-2 break-words">
                {customer.email || "No email captured"} · {customer.phone || "No phone captured"}
              </SheetDescription>
              <div className="mt-3 flex flex-col gap-2">
                <CustomerSegmentBadges segments={profile.segments} />
                <CustomerAttentionBadges attention={profile.attention} />
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="flex flex-col gap-5 p-4 sm:p-6">
          {feedback ? (
            <Alert
              aria-live="polite"
              className="sticky top-0 z-10 shadow-sm"
              variant={feedback.tone === "error" ? "destructive" : "default"}
            >
              <AlertTitle>{feedback.title}</AlertTitle>
              <AlertDescription>{feedback.message}</AlertDescription>
            </Alert>
          ) : null}

          <Tabs defaultValue="overview">
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-[14px] sm:grid-cols-4">
              <TabsTrigger className="min-h-10" value="overview">
                Overview
              </TabsTrigger>
              <TabsTrigger className="min-h-10" value="timeline">
                Timeline
              </TabsTrigger>
              <TabsTrigger className="min-h-10" value="products">
                Products
              </TabsTrigger>
              <TabsTrigger className="min-h-10" value="delivery">
                Delivery
              </TabsTrigger>
            </TabsList>
            <TabsContent className="pt-4" value="overview">
              <CustomerOverviewPanel
                onAddNote={(body) => onAddNote(customer.id, body)}
                profile={profile}
              />
            </TabsContent>
            <TabsContent className="pt-4" value="timeline">
              <CustomerTimelinePanel events={profile.timeline} />
            </TabsContent>
            <TabsContent className="pt-4" value="products">
              <CustomerProductsPanel relationships={profile.products} state={state} />
            </TabsContent>
            <TabsContent className="pt-4" value="delivery">
              <CustomerDeliveryPanel profile={profile} />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
