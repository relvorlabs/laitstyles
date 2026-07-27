"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import type { CSSProperties, ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { getAppQueryClient } from "@/lib/query/app-query-client";
import { type AppSession, SessionProvider } from "@/providers/session-provider";
import { ThemeProvider } from "@/providers/theme-provider";

export function AppProvider({
  session,
  children,
}: {
  session: AppSession;
  children: ReactNode;
}) {
  const queryClient = getAppQueryClient();

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <SessionProvider session={session}>{children}</SessionProvider>
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
