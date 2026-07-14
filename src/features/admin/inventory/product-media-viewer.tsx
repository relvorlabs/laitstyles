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
  const initialIndex = useMemo(() => {
    const requestedIndex = orderedMedia.findIndex((item) => item.id === initialMediaId);
    return requestedIndex >= 0 ? requestedIndex : 0;
  }, [initialMediaId, orderedMedia]);
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [copyFeedback, setCopyFeedback] = useState<CopyFeedback>(null);
  const selectedIndex = selectedMediaId
    ? orderedMedia.findIndex((item) => item.id === selectedMediaId)
    : -1;
  const activeIndex = selectedIndex >= 0 ? selectedIndex : initialIndex;

  const resetMediaState = useCallback(() => {
    setZoom(MIN_ZOOM);
    setCopyFeedback(null);
  }, []);

  const showPrevious = useCallback(() => {
    const previousIndex = activeIndex <= 0 ? orderedMedia.length - 1 : activeIndex - 1;
    setSelectedMediaId(orderedMedia[previousIndex]?.id ?? null);
    resetMediaState();
  }, [activeIndex, orderedMedia, resetMediaState]);

  const showNext = useCallback(() => {
    const nextIndex = activeIndex >= orderedMedia.length - 1 ? 0 : activeIndex + 1;
    setSelectedMediaId(orderedMedia[nextIndex]?.id ?? null);
    resetMediaState();
  }, [activeIndex, orderedMedia, resetMediaState]);

  const changeZoom = useCallback((delta: number) => {
    setZoom((current) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current + delta)));
  }, []);

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
    setSelectedMediaId(orderedMedia[index]?.id ?? null);
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
