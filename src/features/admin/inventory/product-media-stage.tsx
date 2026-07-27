"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CloudImage } from "@/components/ui/cloud-image";
import type { ProductMedia } from "@/lib/admin/shared/types";

export function ProductMediaStage({
  media,
  zoom,
  hasMultiple,
  onPrevious,
  onNext,
}: {
  media: ProductMedia;
  zoom: number;
  hasMultiple: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="relative flex min-h-[360px] items-center justify-center overflow-hidden bg-surface-sunken p-4 sm:p-6">
      <div
        className="relative h-full min-h-[320px] w-full overflow-auto rounded-xl border border-border bg-card"
        data-media-stage
      >
        <div
          className="relative min-h-full min-w-full transition-[width,height] duration-200 motion-reduce:transition-none"
          data-media-zoom={zoom.toFixed(2)}
          style={{
            height: `${zoom * 100}%`,
            width: `${zoom * 100}%`,
          }}
        >
          <CloudImage
            alt={media.alt}
            className="object-contain"
            fill
            priority
            sizes="(min-width: 1024px) 75vw, 100vw"
            src={media.url}
          />
        </div>
      </div>

      {hasMultiple ? (
        <>
          <Button
            aria-label="Show previous image"
            className="absolute left-5 top-1/2 -translate-y-1/2 sm:left-8"
            onClick={onPrevious}
            size="icon-lg"
            type="button"
            variant="outline"
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <Button
            aria-label="Show next image"
            className="absolute right-5 top-1/2 -translate-y-1/2 sm:right-8"
            onClick={onNext}
            size="icon-lg"
            type="button"
            variant="outline"
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </>
      ) : null}
    </div>
  );
}
