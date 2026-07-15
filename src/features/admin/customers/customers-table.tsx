"use client";

import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatCustomerDate,
  getCustomerInitials,
} from "@/features/admin/customers/customer-labels";
import {
  CustomerAttentionBadges,
  CustomerSegmentBadges,
  CustomerTypeBadge,
} from "@/features/admin/customers/customer-status-badges";
import { AdminIcon } from "@/features/admin/shared/admin-icon";
import type { CustomerRelationshipProfile } from "@/lib/admin/customer-types";
import { formatNaira } from "@/lib/admin/formatters";

export function CustomersTable({
  profiles,
  onOpen,
}: {
  profiles: CustomerRelationshipProfile[];
  onOpen: (customerId: string) => void;
}) {
  return (
    <div className="hidden overflow-hidden rounded-[18px] border border-border bg-card lg:block">
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="bg-secondary/55 hover:bg-secondary/55">
            <TableHead className="w-[24%]">Customer</TableHead>
            <TableHead className="w-[17%]">Relationship</TableHead>
            <TableHead className="w-[14%] text-right">Spend</TableHead>
            <TableHead className="w-[11%] text-right">Orders</TableHead>
            <TableHead className="w-[14%]">Last purchase</TableHead>
            <TableHead className="w-[17%]">Follow-up</TableHead>
            <TableHead className="w-[3%] text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {profiles.map((profile) => {
            const customer = profile.customer;
            return (
              <TableRow key={customer.id}>
                <TableCell className="overflow-hidden">
                  <Button
                    className="h-auto max-w-full justify-start gap-3 rounded-[10px] p-0 text-left"
                    onClick={() => onOpen(customer.id)}
                    type="button"
                    variant="link"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary font-serif text-sm font-semibold">
                      {getCustomerInitials(customer.name)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-semibold">{customer.name}</span>
                      <span className="mt-1 block truncate text-[10.5px] text-muted-foreground">
                        {customer.email || customer.phone || "No contact captured"}
                      </span>
                    </span>
                  </Button>
                </TableCell>
                <TableCell className="overflow-hidden">
                  <div className="flex min-w-0 flex-col items-start gap-2">
                    <CustomerTypeBadge type={customer.type} />
                    <CustomerSegmentBadges segments={profile.segments} />
                  </div>
                </TableCell>
                <TableCell className="overflow-hidden text-right font-semibold tabular-nums">
                  <span className="block truncate">{formatNaira(profile.metrics.lifetimeSpend)}</span>
                  <span className="mt-1 block truncate text-[10px] font-normal text-muted-foreground">
                    AOV {formatNaira(profile.metrics.averageOrderValue)}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  <span className="font-semibold">{profile.metrics.orderCount}</span>
                  <span className="mt-1 block text-[10px] text-muted-foreground">
                    {profile.metrics.activeHoldCount} active hold
                    {profile.metrics.activeHoldCount === 1 ? "" : "s"}
                  </span>
                </TableCell>
                <TableCell className="overflow-hidden text-[11.5px]">
                  <span className="block truncate">{formatCustomerDate(profile.metrics.lastPurchaseAt)}</span>
                  <span className="mt-1 block truncate text-[10px] text-muted-foreground">
                    {customer.city || "No city captured"}
                  </span>
                </TableCell>
                <TableCell className="overflow-hidden">
                  {profile.attention.length ? (
                    <CustomerAttentionBadges attention={profile.attention} />
                  ) : (
                    <span className="text-[11px] text-muted-foreground">No active follow-up</span>
                  )}
                </TableCell>
                <TableCell className="px-1 text-right">
                  <Button
                    aria-label={`Open ${customer.name}`}
                    className="size-9 rounded-full"
                    onClick={() => onOpen(customer.id)}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <AdminIcon icon={ArrowRight01Icon} size={16} />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
