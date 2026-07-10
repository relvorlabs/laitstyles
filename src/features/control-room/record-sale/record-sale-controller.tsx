"use client";

import Link from "next/link";
import {
  createContext,
  use,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { RecordSaleDialog } from "@/features/control-room/record-sale/record-sale-dialog";
import type { RecordSaleCompletion } from "@/features/control-room/record-sale/record-sale-types";
import { ControlRoomIcon } from "@/features/control-room/shared/control-room-icon";

const RecordSaleControllerContext = createContext<{
  openRecordSale: () => void;
} | null>(null);

export function RecordSaleControllerProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<RecordSaleCompletion | null>(null);

  const openRecordSale = useCallback(() => {
    setResult(null);
    setOpen(true);
  }, []);
  const value = useMemo(() => ({ openRecordSale }), [openRecordSale]);

  return (
    <RecordSaleControllerContext value={value}>
      {children}
      <RecordSaleDialog
        onCompleted={setResult}
        onOpenChange={setOpen}
        open={open}
      />
      {result ? (
        <Alert
          aria-live="polite"
          className="fixed right-4 bottom-4 z-[80] w-[min(92vw,440px)] border-[#CBD2BA] bg-[#E7EBDD] text-[#4A5540] shadow-xl"
        >
          <ControlRoomIcon icon={CheckmarkCircle02Icon} size={18} />
          <AlertTitle>{result.message}</AlertTitle>
          <AlertDescription className="text-[#59644A]">
            Inventory, Orders, revenue and activity now use this session-only sale record.
          </AlertDescription>
          <AlertAction>
            <Link
              className={buttonVariants({
                variant: "ghost",
                size: "sm",
                className: "h-8 rounded-full px-3",
              })}
              href={`/admin/orders?order=${encodeURIComponent(result.orderId)}`}
              onClick={() => setResult(null)}
            >
              Open order
            </Link>
          </AlertAction>
        </Alert>
      ) : null}
    </RecordSaleControllerContext>
  );
}

export function useRecordSaleController() {
  const context = use(RecordSaleControllerContext);
  if (!context) {
    throw new Error(
      "useRecordSaleController must be used inside RecordSaleControllerProvider",
    );
  }
  return context;
}
