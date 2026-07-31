import type { ComponentProps } from "react";
import { CloudImage } from "@/components/ui/cloud-image";
import { cn } from "@/lib/utils";
import type { Product } from "@/modules/products/ui/storefront/catalogue-data";
import { getProductDefaultImage } from "@/modules/products/ui/storefront/product-media";

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

export function ProductThumb({ product, className }: { product: Product; className?: string }) {
  const image = getProductDefaultImage(product);
  return (
    <OrderThumb className={className}>
      {image ? (
        <CloudImage
          alt={product.name}
          className="object-cover [filter:saturate(0.72)_contrast(0.97)]"
          fill
          sizes="(min-width: 768px) 170px, 45vw"
          src={image}
        />
      ) : null}
    </OrderThumb>
  );
}
