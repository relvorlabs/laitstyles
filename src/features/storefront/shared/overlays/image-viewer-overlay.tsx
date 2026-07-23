"use client";

import Image from "next/image";
import type { CSSProperties, MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { IconClose } from "../storefront-icons";
import { useStorefront } from "../storefront-provider";

export function ImageViewerOverlay() {
  const storefront = useStorefront();
  const overlayBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) storefront.closeAll();
  };
  const viewerProduct = storefront.activeProduct ?? storefront.products[0];
  if (!viewerProduct || viewerProduct.images.length === 0) return null;
  const viewerLabels = [
    "Front view",
    "Back view",
    "Fabric detail",
    "Brand or care label",
    viewerProduct.flaw !== "None" ? "Disclosed detail" : "Styled view",
  ];

  return (
    <div
      id="imageViewer"
      className={`overlay modal-wrap${storefront.openId === "imageViewer" ? " open" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Product images"
      onClick={overlayBackdrop}
    >
      <section className="modal image-modal">
        <div className="modal-head">
          <h2>Product images</h2>
          <Button
            type="button"
            aria-label="Close image viewer"
            onClick={storefront.closeAll}
            size="icon-lg"
            variant="ghost"
          >
            <IconClose />
          </Button>
        </div>
        <div className="mt-4 grid h-[calc(100%-72px)] grid-cols-[92px_1fr] gap-[14px] max-[600px]:grid-cols-1 max-[600px]:grid-rows-[1fr_auto]">
          <div
            id="viewerThumbs"
            className="grid content-start gap-2 overflow-auto max-[600px]:order-2 max-[600px]:auto-cols-[72px] max-[600px]:grid-flow-col max-[600px]:overflow-x-auto"
          >
            {viewerProduct.images.map((src, index) => (
              <Button
                key={src}
                className="relative aspect-[4/5] h-auto overflow-hidden p-0"
                type="button"
                aria-label={viewerLabels[index]}
                aria-pressed={index === storefront.imageIndex}
                onClick={() => {
                  storefront.setImageIndex(index);
                  storefront.setZoom(1);
                }}
                variant={index === storefront.imageIndex ? "secondary" : "outline"}
              >
                <Image src={src} alt="" fill sizes="92px" className="object-cover" />
              </Button>
            ))}
          </div>
          <div
            id="viewerMain"
            className="relative grid min-h-0 place-items-center overflow-hidden rounded-[5px] bg-[var(--bone-2)]"
            style={{ "--zoom": storefront.zoom } as CSSProperties}
          >
            <Image
              id="viewerImage"
              src={viewerProduct.images[storefront.imageIndex]}
              alt={`${viewerProduct.name}, ${viewerLabels[storefront.imageIndex]?.toLowerCase()}`}
              fill
              sizes="100vw"
              className="object-contain [transform:scale(var(--zoom,1))] [transition:transform_220ms_var(--ease)]"
            />
            <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3">
              <div className="flex gap-[7px]">
                <Button
                  id="prevImage"
                  type="button"
                  aria-label="Previous image"
                  onClick={() => {
                    storefront.setImageIndex(
                      (index) =>
                        (index - 1 + viewerProduct.images.length) % viewerProduct.images.length,
                    );
                    storefront.setZoom(1);
                  }}
                  size="icon-lg"
                  variant="ghost"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </Button>
                <Button
                  id="nextImage"
                  type="button"
                  aria-label="Next image"
                  onClick={() => {
                    storefront.setImageIndex((index) => (index + 1) % viewerProduct.images.length);
                    storefront.setZoom(1);
                  }}
                  size="icon-lg"
                  variant="ghost"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </Button>
              </div>
              <span
                id="viewerCount"
                className="rounded-full bg-[rgba(243,240,232,0.9)] px-[13px] py-2.5 font-mono text-[0.7rem] font-medium leading-none"
              >
                {storefront.imageIndex + 1} / {viewerProduct.images.length}
              </span>
              <div className="flex gap-[7px]">
                <Button
                  id="zoomOut"
                  type="button"
                  aria-label="Zoom out"
                  onClick={() => storefront.setZoom((zoom) => Math.max(1, zoom - 0.25))}
                  size="icon-lg"
                  variant="ghost"
                >
                  −
                </Button>
                <Button
                  id="zoomIn"
                  type="button"
                  aria-label="Zoom in"
                  onClick={() => storefront.setZoom((zoom) => Math.min(2.2, zoom + 0.25))}
                  size="icon-lg"
                  variant="ghost"
                >
                  +
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
