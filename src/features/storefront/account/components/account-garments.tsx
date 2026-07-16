// Order/return line thumbnails for the account. Product imagery comes from the
// shared storefront catalogue (shared/catalogue-data) so it stays consistent with the
// shop's ProductCard rather than bespoke placeholders.

import type { ComponentProps } from "react";
import type { Product } from "../../shared/catalogue-data";
import { cn } from "@/lib/utils";

/** `.order-thumb` frame; pass an aspect class (e.g. `aspect-square`). */
export function OrderThumb({ className, children, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[10px] border border-[var(--acc-line)] bg-[var(--acc-bone-2)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/** Real product image inside an `.order-thumb` frame. */
export function ProductThumb({ product, className }: { product: Product; className?: string }) {
  return (
    <OrderThumb className={className}>
      <img
        src={product.images[0]}
        alt=""
        loading="lazy"
        className="h-full w-full object-cover [filter:saturate(0.72)_contrast(0.97)]"
      />
    </OrderThumb>
  );
}
