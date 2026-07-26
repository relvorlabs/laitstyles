"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useReveal } from "@/features/storefront/shared/reveal";
import { IconArrow } from "@/modules/storefront-shell/ui/storefront-icons";

export function CategoryCard({
  name,
  image,
  count,
  onClick,
}: {
  name: string;
  image: string | null;
  count: number;
  onClick: () => void;
}) {
  const { ref, visible } = useReveal<HTMLButtonElement>();

  return (
    <Button
      ref={ref}
      className={`category-card h-auto w-full justify-start rounded-none p-0 text-left reveal${
        visible ? "visible" : ""
      }`}
      type="button"
      onClick={onClick}
      variant="ghost"
    >
      <span className="contents">
        {image ? (
          <Image
            src={image}
            alt={`${name} collection`}
            width={1200}
            height={1500}
            sizes="(min-width: 861px) 25vw, (min-width: 601px) 50vw, 100vw"
          />
        ) : (
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-[var(--ink-soft)]"
            data-slot="category-image-fallback"
          />
        )}
        <span className="category-label">
          <span>
            <span>{count} pieces</span>
            <span className="block text-[inherit]">
              <span className="contents">{name}</span>
            </span>
          </span>
          <span className="category-arrow">
            <IconArrow />
          </span>
        </span>
      </span>
    </Button>
  );
}
