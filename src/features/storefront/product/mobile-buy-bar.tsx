"use client";

import { AnimatePresence, domAnimation, LazyMotion, m, useReducedMotion } from "motion/react";

import { Button } from "@/components/ui/button";
import { money, type Product } from "@/features/storefront/shared/catalogue-data";

export function MobileBuyBar({
  product,
  visible,
  canAdd,
  quantity,
  onAdd,
}: {
  product: Product;
  visible: boolean;
  canAdd: boolean;
  quantity: number;
  onAdd: () => void;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <LazyMotion features={domAnimation}>
      <AnimatePresence>
        {visible ? (
          <m.div
            className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface-raised/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-storefront-3 backdrop-blur lg:hidden"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 100 }}
            transition={{ duration: reduceMotion ? 0 : 0.28, ease: "easeOut" }}
          >
            <div className="mx-auto flex max-w-xl items-center gap-3">
              <div className="min-w-0">
                <p className="truncate font-serif text-sm font-medium">{product.name}</p>
                <p className="mt-1 text-[11px] font-semibold tabular-nums">
                  {money(product.price)}
                  {quantity > 1 ? ` · Qty ${quantity}` : ""}
                </p>
              </div>
              <Button
                type="button"
                onClick={onAdd}
                disabled={!canAdd}
                className="ml-auto min-h-12 flex-1 font-bold"
              >
                {product.status === "available" ? "Add to bag" : product.status}
              </Button>
            </div>
          </m.div>
        ) : null}
      </AnimatePresence>
    </LazyMotion>
  );
}
