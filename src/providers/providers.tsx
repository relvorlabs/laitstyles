"use client";

import { type CSSProperties, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
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
      </QueryProvider>
    </ThemeProvider>
  );
}
