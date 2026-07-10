"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { ProductMedia } from "@/lib/control-room/types";

type ProductMediaViewerProps = {
  media: ProductMedia[];
  productName: string;
  open: boolean;
  initialMediaId?: string | null;
  onOpenChange: (open: boolean) => void;
};

type CopyFeedback = "copied" | "error" | null;

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

export function ProductMediaViewer({
  media,
  productName,
  open,
  initialMediaId,
  onOpenChange,
}: ProductMediaViewerProps) {
  const orderedMedia = useMemo(
    () => [...media].sort((left, right) => left.position - right.position),
    [media],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [copyFeedback, setCopyFeedback] = useState<CopyFeedback>(null);

  const resetMediaState = useCallback(() => {
    setZoom(MIN_ZOOM);
    setCopyFeedback(null);
  }, []);

  const showPrevious = useCallback(() => {
    setActiveIndex((current) =>
      current <= 0 ? orderedMedia.length - 1 : current - 1,
    );
    resetMediaState();
  }, [orderedMedia.length, resetMediaState]);

  const showNext = useCallback(() => {
    setActiveIndex((current) =>
      current >= orderedMedia.length - 1 ? 0 : current + 1,
    );
    resetMediaState();
  }, [orderedMedia.length, resetMediaState]);

  const changeZoom = useCallback((delta: number) => {
    setZoom((current) =>
      Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current + delta)),
    );
  }, []);

  useEffect(() => {
    if (!open) return;
    const requestedIndex = orderedMedia.findIndex(
      (item) => item.id === initialMediaId,
    );
    setActiveIndex(requestedIndex >= 0 ? requestedIndex : 0);
    resetMediaState();
  }, [initialMediaId, open, orderedMedia, resetMediaState]);

  useEffect(() => {
    if (!open || orderedMedia.length < 1) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        showPrevious();
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        showNext();
      }
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        changeZoom(ZOOM_STEP);
      }
      if (event.key === "-") {
        event.preventDefault();
        changeZoom(-ZOOM_STEP);
      }
      if (event.key === "0") {
        event.preventDefault();
        resetMediaState();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [changeZoom, open, orderedMedia.length, resetMediaState, showNext, showPrevious]);

  const activeMedia = orderedMedia[activeIndex] ?? null;
  const hasMultiple = orderedMedia.length > 1;

  async function copyImageLink() {
    if (!activeMedia) return;
    try {
      const absoluteUrl = new URL(activeMedia.url, window.location.origin).href;
      await navigator.clipboard.writeText(absoluteUrl);
      setCopyFeedback("copied");
      window.setTimeout(() => setCopyFeedback(null), 1800);
    } catch {
      setCopyFeedback("error");
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="flex h-dvh w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none bg-background p-0 sm:h-[min(92dvh,920px)] sm:w-[min(96vw,1320px)] sm:max-w-[1320px] sm:rounded-2xl"
        data-media-viewer
      >
        {activeMedia ? (
          <>
            <DialogHeader className="shrink-0 border-b border-border px-4 py-4 pr-14 sm:px-6">
              <DialogTitle className="font-serif text-xl font-medium sm:text-2xl">
                {productName}
              </DialogTitle>
              <DialogDescription>
                Image {activeIndex + 1} of {orderedMedia.length} · {activeMedia.kind}
              </DialogDescription>
            </DialogHeader>

            <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_250px]">
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
                    <Image
                      alt={activeMedia.alt}
                      className="object-contain"
                      fill
                      priority
                      sizes="(min-width: 1024px) 75vw, 100vw"
                      src={activeMedia.url}
                    />
                  </div>
                </div>

                {hasMultiple ? (
                  <>
                    <Button
                      aria-label="Show previous image"
                      className="absolute left-5 top-1/2 size-11 -translate-y-1/2 rounded-full bg-background/90 shadow-lg sm:left-8"
                      onClick={showPrevious}
                      size="icon-lg"
                      type="button"
                      variant="outline"
                    >
                      <ChevronLeft aria-hidden="true" />
                    </Button>
                    <Button
                      aria-label="Show next image"
                      className="absolute right-5 top-1/2 size-11 -translate-y-1/2 rounded-full bg-background/90 shadow-lg sm:right-8"
                      onClick={showNext}
                      size="icon-lg"
                      type="button"
                      variant="outline"
                    >
                      <ChevronRight aria-hidden="true" />
                    </Button>
                  </>
                ) : null}
              </div>

              <aside className="flex min-h-0 flex-col border-t border-border bg-card lg:border-l lg:border-t-0">
                <div className="flex flex-wrap items-center gap-2 border-b border-border p-3 lg:p-4">
                  <Button
                    aria-label="Zoom out"
                    disabled={zoom <= MIN_ZOOM}
                    onClick={() => changeZoom(-ZOOM_STEP)}
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
                    disabled={zoom >= MAX_ZOOM}
                    onClick={() => changeZoom(ZOOM_STEP)}
                    size="icon"
                    type="button"
                    variant="outline"
                  >
                    <ZoomIn aria-hidden="true" />
                  </Button>
                  <Button
                    aria-label="Reset zoom"
                    onClick={resetMediaState}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <RotateCcw aria-hidden="true" />
                  </Button>
                </div>

                <div className="flex min-h-0 flex-1 gap-2 overflow-x-auto p-3 lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden lg:p-4">
                  {orderedMedia.map((item, index) => (
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
                      onClick={() => {
                        setActiveIndex(index);
                        resetMediaState();
                      }}
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
                  <Button
                    className="min-h-11"
                    onClick={copyImageLink}
                    type="button"
                    variant="outline"
                  >
                    {copyFeedback === "copied" ? (
                      <Check aria-hidden="true" />
                    ) : (
                      <Copy aria-hidden="true" />
                    )}
                    {copyFeedback === "copied" ? "Link copied" : "Copy image link"}
                  </Button>
                  {copyFeedback === "error" ? (
                    <p
                      className="col-span-2 text-xs leading-5 text-destructive lg:col-span-1"
                      role="alert"
                    >
                      The image link could not be copied. Open the original image and copy its address instead.
                    </p>
                  ) : null}
                </div>
              </aside>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
