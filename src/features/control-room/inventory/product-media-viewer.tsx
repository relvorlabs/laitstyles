"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProductMediaSidebar } from "@/features/control-room/inventory/product-media-sidebar";
import { ProductMediaStage } from "@/features/control-room/inventory/product-media-stage";
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

  function chooseMedia(index: number) {
    setActiveIndex(index);
    resetMediaState();
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
              <ProductMediaStage
                hasMultiple={orderedMedia.length > 1}
                media={activeMedia}
                onNext={showNext}
                onPrevious={showPrevious}
                zoom={zoom}
              />
              <ProductMediaSidebar
                activeIndex={activeIndex}
                copyFeedback={copyFeedback}
                maximumZoom={MAX_ZOOM}
                media={orderedMedia}
                minimumZoom={MIN_ZOOM}
                onCopy={copyImageLink}
                onMediaChange={chooseMedia}
                onReset={resetMediaState}
                onZoomChange={changeZoom}
                zoom={zoom}
              />
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
