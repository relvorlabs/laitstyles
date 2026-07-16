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
import { toReturnWorkspaceItem } from "@/features/admin/returns/return-selectors";
import { ReturnStatusBadge } from "@/features/admin/returns/return-status-badge";
import { AdminIcon } from "@/features/admin/shared/admin-icon";
import { formatNaira, formatRelativeTime } from "@/lib/admin/formatters";
import type { AdminState, ControlRoomReturn } from "@/lib/admin/types";

export function ReturnsTable({
  state,
  returns,
  onOpen,
}: {
  state: AdminState;
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
                  <Button
                    className="h-auto justify-start p-0 text-left"
                    onClick={() => onOpen(record.id)}
                    type="button"
                    variant="link"
                  >
                    <span>
                      <span className="block text-[12.5px] font-semibold">{record.id}</span>
                      <span className="mt-1 block text-[10.5px] text-muted-foreground">
                        {record.orderId} · {formatRelativeTime(state.asOf, record.updatedAt)}
                      </span>
                    </span>
                  </Button>
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
                    onClick={() => onOpen(record.id)}
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
