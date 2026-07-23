"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

// React-driven port of observeReveals() from storefront.html. Each element reveals
// itself once via IntersectionObserver and keeps `visible` in its React-controlled
// className, so re-renders (e.g. a product card after a save toggle) never flash it
// back to the hidden state. Reduced-motion is handled by the stylesheet.
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);
  return { ref, visible };
}

export function RevealDiv({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className={`${className} reveal${visible ? " visible" : ""}`.trim()}>
      {children}
    </div>
  );
}
