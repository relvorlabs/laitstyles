"use client";

import { ArrowExpand01Icon, ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, domAnimation, LazyMotion, m, useReducedMotion } from "motion/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CloudImage } from "@/components/ui/cloud-image";
import type { ProductImage } from "@/lib/storefront/types";
import { openImageViewer } from "@/modules/storefront-shell/client/storefront-overlay-events";
import type { Product } from "./catalogue-data";

type GallerySelection = {
  mediaKey: string;
  index: number;
};

export function ProductGallery({
  product,
  media,
  colourLabel,
}: {
  product: Product;
  media: readonly ProductImage[];
  colourLabel: string;
}) {
  const reduceMotion = useReducedMotion();
  const mediaKey = media.map((image) => image.id).join("|");
  const [selection, setSelection] = useState<GallerySelection>(() => ({ mediaKey, index: 0 }));
  const index = selection.mediaKey === mediaKey ? selection.index : 0;
  const count = media.length;
  const safeIndex = count > 0 ? Math.min(index, count - 1) : 0;
  const currentImage = media[safeIndex];
  const imageUrls = media.map((image) => image.url);

  const selectImage = (nextIndex: number) => {
    setSelection({ mediaKey, index: nextIndex });
  };
  const go = (nextIndex: number) => {
    if (count > 0) selectImage((nextIndex + count) % count);
  };

  return (
    <div className="grid gap-3 sm:grid-cols-[84px_minmax(0,1fr)]">
      <fieldset className="order-2 m-0 flex min-w-0 gap-3 overflow-x-auto border-0 p-0 pb-1 sm:order-1 sm:grid sm:self-start sm:overflow-visible sm:pb-0">
        <legend className="sr-only">Product media</legend>
        {media.map((image, imageIndex) => (
          <Button
            aria-current={imageIndex === safeIndex ? "true" : undefined}
            aria-label={`View image ${imageIndex + 1}`}
            aria-pressed={imageIndex === safeIndex}
            className="relative aspect-[4/5] h-auto w-20 shrink-0 overflow-hidden rounded-sm p-0 sm:w-full"
            key={image.id}
            onClick={() => selectImage(imageIndex)}
            type="button"
            variant={imageIndex === safeIndex ? "default" : "outline"}
          >
            <CloudImage alt="" className="object-cover" fill sizes="84px" src={image.url} />
          </Button>
        ))}
      </fieldset>
      <div className="group order-1 min-w-0 sm:order-2">
        <div className="relative min-h-[620px] overflow-hidden rounded-sm border border-border bg-surface-sunken shadow-storefront-2 sm:min-h-[760px]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[2] mix-blend-multiply"
            style={{
              background:
                "linear-gradient(90deg, rgba(0,0,0,.07), transparent 13%, transparent 87%, rgba(0,0,0,.07)), linear-gradient(180deg, transparent 65%, rgba(0,0,0,.11))",
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[2] opacity-[0.12]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 16% 23%, #111 0 .45px, transparent .6px), radial-gradient(circle at 76% 67%, #111 0 .4px, transparent .55px)",
              backgroundSize: "8px 8px, 13px 13px",
            }}
          />
          {currentImage ? (
            <LazyMotion features={domAnimation}>
              <AnimatePresence initial={false} mode="sync">
                <m.div
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute inset-0"
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.01 }}
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.985 }}
                  key={currentImage.id}
                  transition={{ duration: reduceMotion ? 0 : 0.38, ease: "easeOut" }}
                >
                  <CloudImage
                    alt={currentImage.alt || `${product.name}, view ${safeIndex + 1}`}
                    className="object-cover"
                    fill
                    priority={safeIndex === 0}
                    sizes="(min-width: 1280px) 52vw, (min-width: 640px) 65vw, 100vw"
                    src={currentImage.url}
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
                Look {String(safeIndex + 1).padStart(2, "0")} · {colourLabel || "Colour pending"}
              </p>
            </div>
            <div className="pointer-events-auto flex gap-2">
              {count > 1 ? (
                <>
                  <Button
                    aria-label="Previous product image"
                    className="rounded-full border-current bg-overlay text-surface-inverse-foreground hover:bg-surface-inverse hover:text-surface-inverse-foreground"
                    onClick={() => go(safeIndex - 1)}
                    size="icon-lg"
                    type="button"
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
                    aria-label="Next product image"
                    className="rounded-full border-current bg-overlay text-surface-inverse-foreground hover:bg-surface-inverse hover:text-surface-inverse-foreground"
                    onClick={() => go(safeIndex + 1)}
                    size="icon-lg"
                    type="button"
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
                  aria-label="Enlarge product image"
                  className="rounded-full border-current bg-overlay text-surface-inverse-foreground hover:bg-surface-inverse hover:text-surface-inverse-foreground"
                  onClick={() =>
                    openImageViewer({
                      productId: product.id,
                      index: safeIndex,
                      images: imageUrls,
                    })
                  }
                  size="icon-lg"
                  type="button"
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
