"use client";

import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  formatCustomerDate,
  getCustomerInitials,
} from "@/features/control-room/customers/customer-labels";
import {
  CustomerAttentionBadges,
  CustomerSegmentBadges,
  CustomerTypeBadge,
} from "@/features/control-room/customers/customer-status-badges";
import { ControlRoomIcon } from "@/features/control-room/shared/control-room-icon";
import type { CustomerRelationshipProfile } from "@/lib/control-room/customer-types";
import { formatNaira } from "@/lib/control-room/formatters";

export function CustomersMobileList({
  profiles,
  onOpen,
}: {
  profiles: CustomerRelationshipProfile[];
  onOpen: (customerId: string) => void;
}) {
  return (
    <div className="grid gap-3 lg:hidden md:grid-cols-2">
      {profiles.map((profile) => {
        const customer = profile.customer;
        return (
          <Card className="gap-0 overflow-hidden py-0" key={customer.id}>
            <div className="border-b border-border bg-secondary/45 px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <Button
                  className="h-auto min-w-0 justify-start gap-3 rounded-[10px] p-0 text-left"
                  onClick={() => onOpen(customer.id)}
                  type="button"
                  variant="link"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-card font-serif text-base font-semibold shadow-sm">
                    {getCustomerInitials(customer.name)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-serif text-[24px] font-medium leading-none">
                      {customer.name}
                    </span>
                    <span className="mt-1.5 block truncate text-[10.5px] text-muted-foreground">
                      {customer.city || "No city captured"} ·{" "}
                      {customer.email || customer.phone || "No contact"}
                    </span>
                  </span>
                </Button>
                <CustomerTypeBadge type={customer.type} />
              </div>
            </div>

            <div className="flex flex-col gap-4 p-4">
              <div className="grid grid-cols-2 gap-3">
                <Metric label="Lifetime spend" value={formatNaira(profile.metrics.lifetimeSpend)} />
                <Metric label="Orders" value={String(profile.metrics.orderCount)} />
                <Metric
                  label="Last purchase"
                  value={formatCustomerDate(profile.metrics.lastPurchaseAt)}
                />
                <Metric label="Active holds" value={String(profile.metrics.activeHoldCount)} />
              </div>

              <CustomerSegmentBadges segments={profile.segments} />
              {profile.attention.length ? (
                <CustomerAttentionBadges attention={profile.attention} />
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  No payment, delivery, return or hold follow-up is active.
                </p>
              )}

              <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
                <p className="text-[10.5px] leading-4 text-muted-foreground">
                  {profile.products.length} connected product relationship
                  {profile.products.length === 1 ? "" : "s"}
                </p>
                <Button
                  aria-label={`Open ${customer.name}`}
                  className="size-11 rounded-full"
                  onClick={() => onOpen(customer.id)}
                  size="icon-lg"
                  type="button"
                  variant="outline"
                >
                  <ControlRoomIcon icon={ArrowRight01Icon} size={17} />
                </Button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[14px] bg-secondary/60 p-3">
      <p className="break-words font-serif text-[18px] font-medium leading-tight tabular-nums">
        {value}
      </p>
      <p className="mt-2 text-[9px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
