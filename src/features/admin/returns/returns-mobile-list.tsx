"use client";

import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toReturnWorkspaceItem } from "@/features/admin/returns/return-selectors";
import { ReturnStatusBadge } from "@/features/admin/returns/return-status-badge";
import { AdminIcon } from "@/features/admin/shared/admin-icon";
import { formatNaira, formatRelativeTime } from "@/lib/admin/formatters";
import type { AdminState, ControlRoomReturn } from "@/lib/admin/types";

export function ReturnsMobileList({
  state,
  returns,
  onOpen,
}: {
  state: AdminState;
  returns: ControlRoomReturn[];
  onOpen: (returnId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 lg:hidden">
      {returns.map((record) => {
        const item = toReturnWorkspaceItem(state, record);
        return (
          <Card key={record.id} className="gap-0 py-0">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {record.id} · {record.orderId}
                  </p>
                  <h2 className="mt-2 truncate font-serif text-[23px] font-medium">
                    {item.productNames[0] ?? "Returned product"}
                  </h2>
                  <p className="mt-1 truncate text-sm text-muted-foreground">{item.customerName}</p>
                </div>
                <ReturnStatusBadge status={record.status} />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 rounded-[14px] bg-secondary/60 p-3">
                <Metric label="Quantity" value={String(item.quantity)} />
                <Metric label="Value" value={formatNaira(record.refundAmount)} />
                <Metric label="Updated" value={formatRelativeTime(state.asOf, record.updatedAt)} />
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                  {record.reason}
                </p>
                <Button
                  aria-label={`Open ${record.id}`}
                  className="size-10 shrink-0 rounded-full"
                  onClick={() => onOpen(record.id)}
                  size="icon"
                  type="button"
                  variant="outline"
                >
                  <AdminIcon icon={ArrowRight01Icon} size={16} />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[11px] font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-[8px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
