"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Product } from "@/features/storefront/shared/catalogue-data";
import { useStorefront } from "@/features/storefront/shared/storefront-provider";

export function ProductGallery({ product }: { product: Product }) {
  const storefront = useStorefront();
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const images = product.images;
  const count = images.length;
  const go = (nextIndex: number) => setIndex((nextIndex + count) % count);

  return (
    <div className="grid gap-3 lg:grid-cols-[88px_minmax(0,1fr)]">
      <div
        className="order-2 flex gap-3 overflow-x-auto pb-1 lg:order-1 lg:flex-col"
        aria-label="Product media"
      >
        {images.map((src, imageIndex) => (
          <Button
            key={src}
            type="button"
            aria-label={`View image ${imageIndex + 1}`}
            aria-current={imageIndex === index}
            aria-pressed={imageIndex === index}
            onClick={() => setIndex(imageIndex)}
            className="relative aspect-[4/5] h-auto w-20 shrink-0 overflow-hidden p-0"
            variant={imageIndex === index ? "secondary" : "outline"}
          >
            <Image src={src} alt="" fill sizes="80px" className="object-cover" />
          </Button>
        ))}
      </div>

      <div className="order-1 min-w-0 lg:order-2">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[14px] border border-border bg-surface-sunken">
          <AnimatePresence initial={false}>
            <motion.div
              key={index}
              className="absolute inset-0"
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.985 }}
              transition={{ duration: 0.34, ease: [0.22, 0.8, 0.24, 1] }}
            >
              <Image
                src={images[index]}
                alt={`${product.name}, view ${index + 1}`}
                fill
                priority={index === 0}
                sizes="(min-width: 1024px) 55vw, 100vw"
                className="object-cover"
              />
            </motion.div>
          </AnimatePresence>

          {count > 1 ? (
            <>
              <Button
                type="button"
                aria-label="Previous image"
                onClick={() => go(index - 1)}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-0"
                size="icon-lg"
                variant="ghost"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="m15 5-7 7 7 7"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Button>
              <Button
                type="button"
                aria-label="Next image"
                onClick={() => go(index + 1)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-0"
                size="icon-lg"
                variant="ghost"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="m9 5 7 7-7 7"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Button>
            </>
          ) : null}

          <Button
            type="button"
            onClick={() => storefront.openImageViewerFor(product.id, index)}
            aria-label="Open image viewer"
            className="absolute bottom-4 right-4 gap-2"
            variant="outline"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            View details
          </Button>
        </div>

        <div className="mt-3 flex items-center justify-between gap-4 text-xs uppercase tracking-[0.13em] text-muted-foreground">
          <span aria-live="polite" className="tabular-nums">
            {String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
          </span>
          <span>The exact piece shown</span>
        </div>
      </div>
    </div>
  );
}
