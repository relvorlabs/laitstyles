"use client";

import { type CSSProperties, type ReactNode } from "react";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { StorefrontExperienceProvider } from "@/features/storefront/shared/storefront-experience-provider";
import { SiteChrome } from "@/features/storefront/shell/site-chrome";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <StorefrontExperienceProvider products={[]}>
        <SiteChrome>{children}</SiteChrome>
      </StorefrontExperienceProvider>
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
