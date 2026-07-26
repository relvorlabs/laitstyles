"use client";

import { useEffect, useRef, useState } from "react";

// React-driven port of observeReveals() from storefront.html. Each element reveals
// itself once via IntersectionObserver and keeps `visible` in its React-controlled
// className, so re-renders never flash it back to the hidden state. Reduced-motion
// remains owned by the existing stylesheet.
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || visible) return;
    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [visible]);

  return { ref, visible };
}
