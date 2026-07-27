"use client";

import { Button } from "@/components/ui/button";
import { CloudImage } from "@/components/ui/cloud-image";
import { useReveal } from "@/hooks/use-reveal";
import { money, type Product } from "@/modules/products/ui/storefront/catalogue-data";

export function OneOfOneCard({
  product,
  featured,
  onClick,
}: {
  product: Product;
  featured: boolean;
  onClick: () => void;
}) {
  const { ref, visible } = useReveal<HTMLButtonElement>();

  return (
    <Button
      ref={ref}
      className={`one-card h-auto w-full justify-start rounded-none p-0 text-left ${
        featured ? "featured" : ""
      }reveal${visible ? "visible" : ""}`}
      type="button"
      onClick={onClick}
      variant="ghost"
    >
      <span className="contents">
        <CloudImage
          src={product.images[0]}
          alt={product.name}
          width={1200}
          height={1500}
          sizes={featured ? "(min-width: 861px) 50vw, 100vw" : "(min-width: 861px) 25vw, 50vw"}
        />
        <span className="one-info">
          <span>
            <span className="eyebrow">1 of 1</span>
            <span className="block text-[inherit]">{product.name}</span>
            <span className="block">
              Size {product.size} · Grade {product.condition}
            </span>
          </span>
          <span className="one-price price">{money(product.price)}</span>
        </span>
      </span>
    </Button>
  );
}
