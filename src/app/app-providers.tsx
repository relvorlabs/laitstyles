"use client";

import { type CSSProperties, type ReactNode } from "react";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "@/components/ui/sonner";

export function AppProviders({ children }: { children: ReactNode }) {
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
