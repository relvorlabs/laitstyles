"use client";

import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { createContext, type ReactNode, use, useCallback, useMemo, useState } from "react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { RecordSaleDialog } from "@/features/admin/record-sale/record-sale-dialog";
import type { RecordSaleCompletion } from "@/features/admin/record-sale/record-sale-types";
import { AdminIcon } from "@/features/admin/shared/admin-icon";

const RecordSaleControllerContext = createContext<{
  openRecordSale: () => void;
} | null>(null);

export function RecordSaleControllerProvider({ children }: { children: ReactNode }) {
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
      <RecordSaleDialog onCompleted={setResult} onOpenChange={setOpen} open={open} />
      {result ? (
        <Alert
          aria-live="polite"
          className="fixed right-4 bottom-4 z-[80] w-[min(92vw,520px)] border-primary/25 bg-background text-foreground shadow-xl"
        >
          <AdminIcon className="text-primary" icon={CheckmarkCircle02Icon} size={18} />
          <AlertTitle>{result.message}</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            Order {result.orderId} is pending payment. Stock is reserved under Paystack reference{
            " "
          }
            <span className="font-medium text-foreground">{result.reference}</span>; revenue has not
            been recognised.
          </AlertDescription>
          <AlertAction>
            <div className="flex flex-wrap justify-end gap-2">
              <a
                className={buttonVariants({ variant: "default", size: "sm" })}
                href={result.authorizationUrl}
                rel="noreferrer"
                target="_blank"
              >
                Open checkout
              </a>
              <Link
                className={buttonVariants({ variant: "ghost", size: "sm" })}
                href={`/admin/orders?order=${encodeURIComponent(result.orderId)}`}
                onClick={() => setResult(null)}
              >
                Open order
              </Link>
            </div>
          </AlertAction>
        </Alert>
      ) : null}
    </RecordSaleControllerContext>
  );
}

export function useRecordSaleController() {
  const context = use(RecordSaleControllerContext);
  if (!context) {
    throw new Error("useRecordSaleController must be used inside RecordSaleControllerProvider");
  }
  return context;
}
