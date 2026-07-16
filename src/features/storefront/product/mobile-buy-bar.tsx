"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { money, type Product } from "@/features/storefront/shared/catalogue-data";

export function MobileBuyBar({
  product,
  visible,
  canAdd,
  onAdd,
}: {
  product: Product;
  visible: boolean;
  canAdd: boolean;
  onAdd: () => void;
}) {
  const reduce = useReducedMotion();

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden"
          initial={reduce ? { opacity: 0 } : { y: 100 }}
          animate={reduce ? { opacity: 1 } : { y: 0 }}
          exit={reduce ? { opacity: 0 } : { y: 100 }}
          transition={{ duration: 0.28, ease: [0.22, 0.8, 0.24, 1] }}
        >
          <div className="mx-auto flex max-w-xl items-center gap-3">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.13em] text-muted-foreground">
                {product.inventory === "one-of-one" ? "Exact piece" : "Price"}
              </p>
              <p className="mt-1 font-semibold tabular-nums">{money(product.price)}</p>
            </div>
            <Button type="button" onClick={onAdd} disabled={!canAdd} className="ml-auto flex-1">
              {product.status === "available" ? "Add this piece" : product.status}
            </Button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
