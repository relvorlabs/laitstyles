"use client";

import { Check, Copy, ExternalLink, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import Image from "next/image";
import { Button, buttonVariants } from "@/components/ui/button";
import type { ProductMedia } from "@/lib/control-room/types";
import { cn } from "@/lib/utils";

type CopyFeedback = "copied" | "error" | null;

export function ProductMediaSidebar({
  media,
  activeIndex,
  zoom,
  minimumZoom,
  maximumZoom,
  copyFeedback,
  onMediaChange,
  onZoomChange,
  onReset,
  onCopy,
}: {
  media: ProductMedia[];
  activeIndex: number;
  zoom: number;
  minimumZoom: number;
  maximumZoom: number;
  copyFeedback: CopyFeedback;
  onMediaChange: (index: number) => void;
  onZoomChange: (delta: number) => void;
  onReset: () => void;
  onCopy: () => void;
}) {
  const activeMedia = media[activeIndex];
  if (!activeMedia) return null;

  return (
    <aside className="flex min-h-0 flex-col border-t border-border bg-card lg:border-l lg:border-t-0">
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-3 lg:p-4">
        <Button
          aria-label="Zoom out"
          disabled={zoom <= minimumZoom}
          onClick={() => onZoomChange(-0.25)}
          size="icon"
          type="button"
          variant="outline"
        >
          <ZoomOut aria-hidden="true" />
        </Button>
        <span className="min-w-16 text-center text-xs font-medium tabular-nums">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          aria-label="Zoom in"
          disabled={zoom >= maximumZoom}
          onClick={() => onZoomChange(0.25)}
          size="icon"
          type="button"
          variant="outline"
        >
          <ZoomIn aria-hidden="true" />
        </Button>
        <Button aria-label="Reset zoom" onClick={onReset} size="icon" type="button" variant="ghost">
          <RotateCcw aria-hidden="true" />
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 gap-2 overflow-x-auto p-3 lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden lg:p-4">
        {media.map((item, index) => (
          <button
            aria-label={`Show ${item.alt}`}
            aria-pressed={index === activeIndex}
            className={cn(
              "group relative aspect-[4/5] w-20 shrink-0 overflow-hidden rounded-lg border bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:w-full",
              index === activeIndex
                ? "border-brand-sage-strong ring-2 ring-brand-sage/30"
                : "border-border",
            )}
            key={item.id}
            onClick={() => onMediaChange(index)}
            type="button"
          >
            <Image
              alt=""
              className="object-cover transition-transform group-hover:scale-[1.03] motion-reduce:transition-none"
              fill
              sizes="120px"
              src={item.url}
            />
            <span className="absolute inset-x-1 bottom-1 rounded bg-background/88 px-1.5 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-foreground backdrop-blur">
              {item.kind}
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-border p-3 lg:grid-cols-1 lg:p-4">
        <a
          className={buttonVariants({
            variant: "outline",
            className: "min-h-11 justify-center",
          })}
          href={activeMedia.url}
          rel="noreferrer"
          target="_blank"
        >
          <ExternalLink aria-hidden="true" />
          Open original
        </a>
        <Button className="min-h-11" onClick={onCopy} type="button" variant="outline">
          {copyFeedback === "copied" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          {copyFeedback === "copied" ? "Link copied" : "Copy image link"}
        </Button>
        {copyFeedback === "error" ? (
          <p className="col-span-2 text-xs leading-5 text-destructive lg:col-span-1" role="alert">
            The image link could not be copied. Open the original image and copy its address
            instead.
          </p>
        ) : null}
      </div>
    </aside>
  );
}
