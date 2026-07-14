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
import { toReturnWorkspaceItem } from "@/features/control-room/returns/return-selectors";
import { ReturnStatusBadge } from "@/features/control-room/returns/return-status-badge";
import { ControlRoomIcon } from "@/features/control-room/shared/control-room-icon";
import { formatNaira, formatRelativeTime } from "@/lib/control-room/formatters";
import type { ControlRoomReturn, ControlRoomState } from "@/lib/control-room/types";

export function ReturnsTable({
  state,
  returns,
  onOpen,
}: {
  state: ControlRoomState;
  returns: ControlRoomReturn[];
  onOpen: (returnId: string) => void;
}) {
  return (
    <div className="hidden overflow-hidden rounded-[18px] border border-border bg-card lg:block">
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="bg-secondary/55 hover:bg-secondary/55">
            <TableHead className="w-[18%]">Return</TableHead>
            <TableHead className="w-[24%]">Products</TableHead>
            <TableHead className="w-[18%]">Customer</TableHead>
            <TableHead className="w-[13%] text-center">Quantity</TableHead>
            <TableHead className="w-[13%]">Value</TableHead>
            <TableHead className="w-[11%]">Status</TableHead>
            <TableHead className="w-[3%]">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {returns.map((record) => {
            const item = toReturnWorkspaceItem(state, record);
            return (
              <TableRow key={record.id}>
                <TableCell>
                  <button
                    className="rounded-[8px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => onOpen(record.id)}
                    type="button"
                  >
                    <span className="block text-[12.5px] font-semibold">{record.id}</span>
                    <span className="mt-1 block text-[10.5px] text-muted-foreground">
                      {record.orderId} · {formatRelativeTime(state.asOf, record.updatedAt)}
                    </span>
                  </button>
                </TableCell>
                <TableCell className="overflow-hidden">
                  <span className="block truncate text-[12px] font-medium">
                    {item.productNames[0] ?? "Product"}
                  </span>
                  <span className="mt-1 block truncate text-[10.5px] text-muted-foreground">
                    {record.reason}
                  </span>
                </TableCell>
                <TableCell className="truncate text-[12px]">{item.customerName}</TableCell>
                <TableCell className="text-center font-semibold tabular-nums">
                  {item.quantity}
                </TableCell>
                <TableCell className="font-medium tabular-nums">
                  {formatNaira(record.refundAmount)}
                </TableCell>
                <TableCell>
                  <ReturnStatusBadge status={record.status} />
                </TableCell>
                <TableCell className="px-1 text-right">
                  <Button
                    aria-label={`Open ${record.id}`}
                    className="size-9 rounded-full"
                    onClick={() => onOpen(record.id)}
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
