"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import type { CSSProperties, ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { getAppQueryClient } from "@/lib/query/app-query-client";
import { ThemeProvider } from "@/providers/theme-provider";

// Session is intentionally NOT mounted here. Cache Components requires any
// uncached per-request read (getCurrentSession) to sit behind a Suspense
// boundary that covers every route, not just the ones with their own — so
// SessionProvider is mounted one level up, in root layout's SessionSlot,
// inside a <Suspense> this component's caller wraps around its children.
export function AppProvider({ children }: { children: ReactNode }) {
  const queryClient = getAppQueryClient();

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        {process.env.NODE_ENV === "development" ? (
          <ReactQueryDevtools initialIsOpen={false} />
        ) : null}
      </QueryClientProvider>
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
