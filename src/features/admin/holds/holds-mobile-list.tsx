"use client";

import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { holdSourceLabels, holdStageLabels } from "@/features/admin/holds/hold-labels";
import { HoldRiskBadge } from "@/features/admin/holds/hold-risk-badge";
import {
  formatHoldCountdown,
  toHoldWorkspaceItem,
} from "@/features/admin/holds/hold-selectors";
import { AdminIcon } from "@/features/admin/shared/admin-icon";
import type { AdminState, ControlRoomHold } from "@/lib/admin/types";

export function HoldsMobileList({
  state,
  holds,
  onOpen,
}: {
  state: AdminState;
  holds: ControlRoomHold[];
  onOpen: (holdId: string) => void;
}) {
  return (
    <div className="grid gap-3 lg:hidden md:grid-cols-2">
      {holds.map((hold) => {
        const item = toHoldWorkspaceItem(state, hold);
        return (
          <Card className="gap-0 overflow-hidden py-0" key={hold.id}>
            <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-4 p-4">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[12px] bg-secondary">
                <Image
                  alt={item.imageAlt}
                  className="object-cover"
                  fill
                  sizes="92px"
                  src={item.imageUrl}
                />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <HoldRiskBadge risk={item.risk} />
                  <Badge variant="outline">{holdStageLabels[hold.stage]}</Badge>
                </div>
                <Button
                  className="mt-3 h-auto max-w-full justify-start p-0 text-left"
                  onClick={() => onOpen(hold.id)}
                  type="button"
                  variant="link"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-serif text-[22px] font-medium leading-tight">
                      {item.productName}
                    </span>
                    <span className="mt-1 block truncate text-[10.5px] text-muted-foreground">
                      {item.variantLabel ?? item.productReference}
                    </span>
                  </span>
                </Button>
                <p className="mt-3 truncate text-[11.5px] font-semibold">{item.customerName}</p>
                <p className="mt-1 text-[10.5px] text-muted-foreground">
                  {holdSourceLabels[hold.source]} · {hold.quantity} unit
                  {hold.quantity === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-border bg-secondary/45 px-4 py-3">
              <div>
                <p className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Release countdown
                </p>
                <p className="mt-1 font-serif text-[22px] font-medium tabular-nums">
                  {formatHoldCountdown(item.secondsRemaining)}
                </p>
              </div>
              <Button
                aria-label={`Open ${hold.id}`}
                className="size-11 rounded-full"
                onClick={() => onOpen(hold.id)}
                size="icon-lg"
                type="button"
                variant="outline"
              >
                <AdminIcon icon={ArrowRight01Icon} size={17} />
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
