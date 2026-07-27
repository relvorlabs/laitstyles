"use client";

import {
  type CSSProperties,
  type MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { CloudImage } from "@/components/ui/cloud-image";
import { useOverlayLifecycle } from "@/hooks/use-overlay-lifecycle";
import { productById } from "@/modules/products/ui/storefront/catalogue-data";
import {
  type ImageViewerRequest,
  subscribeImageViewer,
  subscribeTransientOverlayClose,
} from "@/modules/storefront-shell/client/storefront-overlay-events";
import { useStorefrontCatalogueData } from "@/modules/storefront-shell/client/storefront-runtime";
import { IconClose } from "@/modules/storefront-shell/ui/storefront-icons";

export function ImageViewerOverlay() {
  const { products } = useStorefrontCatalogueData();
  const [request, setRequest] = useState<ImageViewerRequest | null>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [zoom, setZoom] = useState(1);

  const close = useCallback(() => setRequest(null), []);

  useEffect(
    () =>
      subscribeImageViewer((next) => {
        setRequest(next);
        setImageIndex(next.index ?? 0);
        setZoom(1);
      }),
    [],
  );

  useEffect(() => subscribeTransientOverlayClose(close), [close]);

  const product = useMemo(
    () => (request ? productById(products, request.productId) : undefined),
    [products, request],
  );
  const images = request?.images?.length ? [...request.images] : (product?.images ?? []);

  useOverlayLifecycle({
    open: Boolean(request && product && images.length),
    onEscape: close,
    focusId: "imageViewer",
  });

  useEffect(() => {
    if (!request || !product || images.length === 0) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        setImageIndex((index) => (index + 1) % images.length);
        setZoom(1);
      }
      if (event.key === "ArrowLeft") {
        setImageIndex((index) => (index - 1 + images.length) % images.length);
        setZoom(1);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [images.length, product, request]);

  if (!request || !product || images.length === 0) return null;

  const labels = [
    "Front view",
    "Back view",
    "Fabric detail",
    "Brand or care label",
    product.flaw !== "None" ? "Disclosed detail" : "Styled view",
  ];
  const safeIndex = Math.min(imageIndex, images.length - 1);
  const overlayBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) close();
  };

  const showPrevious = () => {
    setImageIndex((index) => (index - 1 + images.length) % images.length);
    setZoom(1);
  };
  const showNext = () => {
    setImageIndex((index) => (index + 1) % images.length);
    setZoom(1);
  };

  return (
    <div
      aria-label="Product images"
      aria-modal="true"
      className="overlay modal-wrap open"
      id="imageViewer"
      onClick={overlayBackdrop}
      role="dialog"
    >
      <section className="modal image-modal">
        <div className="modal-head">
          <h2>Product images</h2>
          <Button
            aria-label="Close image viewer"
            onClick={close}
            size="icon-lg"
            type="button"
            variant="ghost"
          >
            <IconClose />
          </Button>
        </div>
        <div className="mt-4 grid h-[calc(100%-72px)] grid-cols-[92px_1fr] gap-[14px] max-[600px]:grid-cols-1 max-[600px]:grid-rows-[1fr_auto]">
          <div
            className="grid content-start gap-2 overflow-auto max-[600px]:order-2 max-[600px]:auto-cols-[72px] max-[600px]:grid-flow-col max-[600px]:overflow-x-auto"
            id="viewerThumbs"
          >
            {images.map((src, index) => (
              <Button
                aria-label={labels[index] ?? `View image ${index + 1}`}
                aria-pressed={index === safeIndex}
                className="relative aspect-[4/5] h-auto overflow-hidden p-0"
                key={`${src}-${index}`}
                onClick={() => {
                  setImageIndex(index);
                  setZoom(1);
                }}
                type="button"
                variant={index === safeIndex ? "secondary" : "outline"}
              >
                <CloudImage alt="" className="object-cover" fill sizes="92px" src={src} />
              </Button>
            ))}
          </div>
          <div
            className="relative grid min-h-0 place-items-center overflow-hidden rounded-[5px] bg-[var(--bone-2)]"
            id="viewerMain"
            style={{ "--zoom": zoom } as CSSProperties}
          >
            <CloudImage
              alt={`${product.name}, ${(labels[safeIndex] ?? `view ${safeIndex + 1}`).toLowerCase()}`}
              className="object-contain [transform:scale(var(--zoom,1))] [transition:transform_220ms_var(--ease)]"
              fill
              id="viewerImage"
              sizes="100vw"
              src={images[safeIndex]}
            />
            <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3">
              <div className="flex gap-[7px]">
                <Button
                  aria-label="Previous image"
                  id="prevImage"
                  onClick={showPrevious}
                  size="icon-lg"
                  type="button"
                  variant="ghost"
                >
                  <svg aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </Button>
                <Button
                  aria-label="Next image"
                  id="nextImage"
                  onClick={showNext}
                  size="icon-lg"
                  type="button"
                  variant="ghost"
                >
                  <svg aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </Button>
              </div>
              <span
                className="rounded-full bg-[rgba(243,240,232,0.9)] px-[13px] py-2.5 font-mono text-[0.7rem] font-medium leading-none"
                id="viewerCount"
              >
                {safeIndex + 1} / {images.length}
              </span>
              <div className="flex gap-[7px]">
                <Button
                  aria-label="Zoom out"
                  id="zoomOut"
                  onClick={() => setZoom((value) => Math.max(1, value - 0.25))}
                  size="icon-lg"
                  type="button"
                  variant="ghost"
                >
                  −
                </Button>
                <Button
                  aria-label="Zoom in"
                  id="zoomIn"
                  onClick={() => setZoom((value) => Math.min(2.2, value + 0.25))}
                  size="icon-lg"
                  type="button"
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
