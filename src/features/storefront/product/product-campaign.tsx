"use client";

import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, domAnimation, LazyMotion, m, useReducedMotion } from "motion/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { ProductDetailPresentation } from "./product-detail-presentation";
import { wrapCampaignIndex } from "./product-detail-presentation";

export function ProductCampaign({
  frames,
}: {
  frames: ProductDetailPresentation["campaignFrames"];
}) {
  const [index, setIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [paused, setPaused] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const stageRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const current = frames[index];

  useEffect(() => {
    const element = stageRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), {
      threshold: 0.2,
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => setDocumentVisible(document.visibilityState === "visible");
    onVisibilityChange();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  useEffect(() => {
    if (frames.length < 2 || reduceMotion || paused || !isVisible || !documentVisible) return;
    const timer = window.setInterval(
      () => setIndex((currentIndex) => wrapCampaignIndex(currentIndex + 1, frames.length)),
      6200,
    );
    return () => window.clearInterval(timer);
  }, [documentVisible, frames.length, isVisible, paused, reduceMotion]);

  if (!current) return null;

  const go = (nextIndex: number) => setIndex(wrapCampaignIndex(nextIndex, frames.length));

  return (
    <LazyMotion features={domAnimation}>
      <section
        id="campaign"
        className="bg-surface-inverse py-8 text-surface-inverse-foreground sm:py-12"
        aria-labelledby="campaign-title"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
        }}
      >
        <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.34em] opacity-50">
                Campaign 01 / Product form
              </p>
              <h2
                id="campaign-title"
                className="mt-3 font-serif text-4xl font-medium tracking-[-0.03em] sm:text-6xl"
              >
                The piece, in motion.
              </h2>
            </div>
            <p className="max-w-xs text-[11px] leading-6 opacity-60">
              A restrained study of line, material, and silhouette using the catalogue imagery
              available for this piece.
            </p>
          </div>

          <div
            ref={stageRef}
            className="relative min-h-[680px] min-w-0 overflow-hidden rounded-sm border border-current bg-surface-inverse"
          >
            <AnimatePresence initial={false} mode="sync">
              <m.article
                key={current.id}
                className="absolute inset-0"
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.01 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.99 }}
                transition={{ duration: reduceMotion ? 0 : 0.58, ease: "easeOut" }}
                aria-live="polite"
              >
                {current.image ? (
                  <Image
                    src={current.image}
                    alt={`${current.caption} for this product`}
                    fill
                    sizes="100vw"
                    className="object-cover"
                  />
                ) : null}
                <div className="absolute inset-0 bg-linear-to-t from-surface-inverse via-transparent to-transparent" />
                <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-5 p-6 text-surface-inverse-foreground sm:p-10">
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-[0.3em] opacity-60">
                      {current.eyebrow} · {current.caption}
                    </p>
                    <h3 className="mt-3 max-w-xl font-serif text-4xl font-medium leading-none sm:text-6xl">
                      {current.headline}
                    </h3>
                  </div>
                  <span
                    className="hidden text-[88px] font-semibold leading-none opacity-20 sm:block"
                    aria-hidden="true"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
              </m.article>
            </AnimatePresence>

            {frames.length > 1 ? (
              <div className="absolute left-6 top-1/2 z-20 flex -translate-y-1/2 gap-2 sm:left-10">
                <Button
                  type="button"
                  aria-label="Previous campaign slide"
                  onClick={() => go(index - 1)}
                  className="rounded-full border-current bg-surface-inverse/70 text-surface-inverse-foreground hover:bg-surface-inverse"
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
                  aria-label="Next campaign slide"
                  onClick={() => go(index + 1)}
                  className="rounded-full border-current bg-surface-inverse/70 text-surface-inverse-foreground hover:bg-surface-inverse"
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
              </div>
            ) : null}

            <nav
              className="absolute bottom-7 right-7 z-20 flex items-center gap-2"
              aria-label="Campaign slide selection"
            >
              {frames.map((frame, frameIndex) => (
                <button
                  key={frame.id}
                  type="button"
                  className={`h-1.5 rounded-full bg-current transition-[width,opacity] focus-visible:outline-2 focus-visible:outline-offset-4 ${frameIndex === index ? "w-6 opacity-100" : "w-3 opacity-30"}`}
                  aria-current={frameIndex === index ? "true" : undefined}
                  aria-label={`Go to campaign slide ${frameIndex + 1}`}
                  onClick={() => go(frameIndex)}
                />
              ))}
            </nav>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {frames.map((frame, frameIndex) => (
              <button
                key={frame.id}
                type="button"
                onClick={() => go(frameIndex)}
                aria-pressed={frameIndex === index}
                className={`min-h-24 border border-current p-5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${frameIndex === index ? "bg-surface-selected text-surface-selected-foreground" : "bg-transparent"}`}
              >
                <p className="font-mono text-[9px] uppercase tracking-[0.24em] opacity-50">
                  {String(frameIndex + 1).padStart(2, "0")} / {frame.eyebrow}
                </p>
                <p className="mt-2 text-sm font-semibold">{frame.caption}</p>
              </button>
            ))}
          </div>
        </div>
      </section>
    </LazyMotion>
  );
}
