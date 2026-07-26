"use client";

import { useEffect, useEffectEvent } from "react";

let bodyLockCount = 0;

export function useOverlayLifecycle({
  open,
  onEscape,
  focusId,
}: {
  open: boolean;
  onEscape?: () => void;
  focusId?: string;
}) {
  const handleEscape = useEffectEvent(() => onEscape?.());

  useEffect(() => {
    if (!open) return;
    bodyLockCount += 1;
    document.body.classList.add("lst-locked");

    const previousFocus = document.activeElement as HTMLElement | null;
    const focusTarget = () => {
      const root = focusId ? document.getElementById(focusId) : null;
      const target =
        focusId === "searchModal"
          ? document.getElementById("searchInput")
          : root?.querySelector<HTMLElement>("button,input,select,textarea,a");
      target?.focus();
    };
    const frame = window.requestAnimationFrame(focusTarget);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleEscape();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      bodyLockCount = Math.max(0, bodyLockCount - 1);
      if (bodyLockCount === 0) document.body.classList.remove("lst-locked");
      previousFocus?.focus();
    };
  }, [focusId, open]);
}
