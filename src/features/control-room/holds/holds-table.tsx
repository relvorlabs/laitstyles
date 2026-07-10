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
import { holdSourceLabels, holdStageLabels } from "@/features/control-room/holds/hold-labels";
import { HoldRiskBadge } from "@/features/control-room/holds/hold-risk-badge";
import {
  formatHoldCountdown,
  toHoldWorkspaceItem,
} from "@/features/control-room/holds/hold-selectors";
import { ControlRoomIcon } from "@/features/control-room/shared/control-room-icon";
import type { ControlRoomHold, ControlRoomState } from "@/lib/control-room/types";

export function HoldsTable({
  state,
  holds,
  onOpen,
}: {
  state: ControlRoomState;
  holds: ControlRoomHold[];
  onOpen: (holdId: string) => void;
}) {
  return (
    <div className="hidden overflow-hidden rounded-[18px] border border-border bg-card lg:block">
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="bg-secondary/55 hover:bg-secondary/55">
            <TableHead className="w-[24%]">Product</TableHead>
            <TableHead className="w-[19%]">Customer</TableHead>
            <TableHead className="w-[12%]">Stage</TableHead>
            <TableHead className="w-[13%]">Source</TableHead>
            <TableHead className="w-[10%] text-center">Quantity</TableHead>
            <TableHead className="w-[18%]">Release</TableHead>
            <TableHead className="w-[4%] text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {holds.map((hold) => {
            const item = toHoldWorkspaceItem(state, hold);
            return (
              <TableRow key={hold.id}>
                <TableCell className="overflow-hidden">
                  <button
                    className="max-w-full rounded-[8px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => onOpen(hold.id)}
                    type="button"
                  >
                    <span className="block truncate text-[12.5px] font-semibold">
                      {item.productName}
                    </span>
                    <span className="mt-1 block truncate text-[10.5px] text-muted-foreground">
                      {item.variantLabel ?? item.productReference}
                    </span>
                  </button>
                </TableCell>
                <TableCell className="overflow-hidden">
                  <span className="block truncate text-[12px] font-medium">
                    {item.customerName}
                  </span>
                  <span className="mt-1 block truncate text-[10.5px] text-muted-foreground">
                    {hold.id}
                  </span>
                </TableCell>
                <TableCell>{holdStageLabels[hold.stage]}</TableCell>
                <TableCell>{holdSourceLabels[hold.source]}</TableCell>
                <TableCell className="text-center font-semibold tabular-nums">
                  {hold.quantity}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-2">
                    <HoldRiskBadge risk={item.risk} />
                    <span className="text-[10.5px] font-medium tabular-nums text-muted-foreground">
                      {formatHoldCountdown(item.secondsRemaining)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="px-1 text-right">
                  <Button
                    aria-label={`Open ${hold.id}`}
                    className="size-9 rounded-full"
                    onClick={() => onOpen(hold.id)}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <ControlRoomIcon icon={ArrowRight01Icon} size={16} />
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
