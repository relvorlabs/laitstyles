"use client";

import type { CSSProperties, ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/providers/theme-provider";

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      {children}
      <Toaster
        position="bottom-right"
        style={
          {
            "--normal-bg": "var(--brand-ink)",
            "--normal-text": "var(--brand-bone)",
            "--normal-border": "var(--border-strong)",
            "--border-radius": "5px",
          } as CSSProperties
        }
      />
    </ThemeProvider>
  );
}
