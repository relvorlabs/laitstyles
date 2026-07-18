"use client";

import { ArrowExpand01Icon, ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, domAnimation, LazyMotion, m, useReducedMotion } from "motion/react";
import Image from "next/image";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { Product } from "@/features/storefront/shared/catalogue-data";
import { useStorefront } from "@/features/storefront/shared/storefront-provider";

export function ProductGallery({ product }: { product: Product }) {
  const storefront = useStorefront();
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const images = product.images;
  const count = images.length;
  const currentImage = images[index];
  const go = (nextIndex: number) => {
    if (count > 0) setIndex((nextIndex + count) % count);
  };

  return (
    <div className="grid gap-3 sm:grid-cols-[84px_minmax(0,1fr)]">
      <fieldset className="order-2 m-0 flex min-w-0 gap-3 overflow-x-auto border-0 p-0 pb-1 sm:order-1 sm:grid sm:self-start sm:overflow-visible sm:pb-0">
        <legend className="sr-only">Product media</legend>
        {images.map((src, imageIndex) => (
          <Button
            key={src}
            type="button"
            aria-label={`View image ${imageIndex + 1}`}
            aria-current={imageIndex === index ? "true" : undefined}
            aria-pressed={imageIndex === index}
            onClick={() => setIndex(imageIndex)}
            className="relative aspect-[4/5] h-auto w-20 shrink-0 overflow-hidden rounded-sm p-0 sm:w-full"
            variant={imageIndex === index ? "default" : "outline"}
          >
            <Image src={src} alt="" fill sizes="84px" className="object-cover" />
          </Button>
        ))}
      </fieldset>

      <div className="order-1 min-w-0 sm:order-2">
        <div className="relative min-h-[620px] overflow-hidden rounded-sm border border-border bg-surface-sunken shadow-storefront-2 sm:min-h-[760px]">
          {currentImage ? (
            <LazyMotion features={domAnimation}>
              <AnimatePresence initial={false} mode="sync">
                <m.div
                  key={currentImage}
                  className="absolute inset-0"
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.985 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.01 }}
                  transition={{ duration: reduceMotion ? 0 : 0.38, ease: "easeOut" }}
                >
                  <Image
                    src={currentImage}
                    alt={`${product.name}, view ${index + 1}`}
                    fill
                    priority={index === 0}
                    sizes="(min-width: 1280px) 52vw, (min-width: 640px) 65vw, 100vw"
                    className="object-cover"
                  />
                </m.div>
              </AnimatePresence>
            </LazyMotion>
          ) : (
            <div className="absolute inset-0 grid place-items-center p-8 text-center text-sm text-muted-foreground">
              Product imagery will appear here when it becomes available.
            </div>
          )}

          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-4 bg-linear-to-t from-surface-inverse to-transparent p-5 text-surface-inverse-foreground sm:p-7">
            <div className="border-l border-current pl-3">
              <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.28em] opacity-70">
                Product study
              </p>
              <p className="mt-1 text-[11px]">
                Look {String(index + 1).padStart(2, "0")} · {product.colour || "Colour pending"}
              </p>
            </div>

            <div className="pointer-events-auto flex gap-2">
              {count > 1 ? (
                <>
                  <Button
                    type="button"
                    aria-label="Previous product image"
                    onClick={() => go(index - 1)}
                    className="rounded-full border-current bg-overlay text-surface-inverse-foreground hover:bg-surface-inverse hover:text-surface-inverse-foreground"
                    size="icon-lg"
                    variant="outline"
                  >
                    <HugeiconsIcon
                      aria-hidden="true"
                      icon={ArrowLeft01Icon}
                      size={20}
                      strokeWidth={1.6}
                    />
                  </Button>
                  <Button
                    type="button"
                    aria-label="Next product image"
                    onClick={() => go(index + 1)}
                    className="rounded-full border-current bg-overlay text-surface-inverse-foreground hover:bg-surface-inverse hover:text-surface-inverse-foreground"
                    size="icon-lg"
                    variant="outline"
                  >
                    <HugeiconsIcon
                      aria-hidden="true"
                      icon={ArrowRight01Icon}
                      size={20}
                      strokeWidth={1.6}
                    />
                  </Button>
                </>
              ) : null}
              {currentImage ? (
                <Button
                  type="button"
                  aria-label="Enlarge product image"
                  onClick={() => storefront.openImageViewerFor(product.id, index)}
                  className="rounded-full border-current bg-overlay text-surface-inverse-foreground hover:bg-surface-inverse hover:text-surface-inverse-foreground"
                  size="icon-lg"
                  variant="outline"
                >
                  <HugeiconsIcon
                    aria-hidden="true"
                    icon={ArrowExpand01Icon}
                    size={20}
                    strokeWidth={1.6}
                  />
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
