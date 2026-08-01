"use client";

import type { ReactNode } from "react";
import { useReveal } from "@/hooks/use-reveal";

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
