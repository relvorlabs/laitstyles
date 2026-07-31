// Order/return line thumbnails for the account. Product imagery comes from the
// canonical storefront catalogue so it stays consistent with the shop's ProductCard.

import type { ComponentProps } from "react";
import { CloudImage } from "@/components/ui/cloud-image";
import { cn } from "@/lib/utils";
import type { Product } from "@/modules/products/ui/storefront/catalogue-data";
import { getProductDefaultImage } from "@/modules/products/ui/storefront/product-media";

/** `.order-thumb` frame; pass an aspect class (e.g. `aspect-square`). */
export function OrderThumb({ className, children, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[10px] border border-[var(--acc-line)] bg-[var(--acc-bone-2)]",
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
  const image = getProductDefaultImage(product);

  return (
    <OrderThumb className={className}>
      {image ? (
        <CloudImage
          alt={product.name}
          className="object-cover [filter:saturate(0.72)_contrast(0.97)]"
          fill
          sizes="96px"
          src={image}
        />
      ) : (
        <span
          aria-label={`${product.name} image unavailable`}
          className="grid size-full place-items-center px-2 text-center text-[10px] text-[var(--acc-muted)]"
          role="img"
        >
          Image unavailable
        </span>
      )}
    </OrderThumb>
  );
}
