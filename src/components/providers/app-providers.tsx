"use client";

import { type CSSProperties, type ReactNode, use } from "react";
import { SiteChrome } from "@/components/layout/site-chrome";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { StorefrontExperienceProvider } from "@/features/storefront/shared/storefront-experience-provider";
import type { StorefrontCatalogPayload } from "@/lib/storefront/catalog-data";

export function AppProviders({
  catalogPromise,
  children,
}: {
  catalogPromise: Promise<StorefrontCatalogPayload>;
  children: ReactNode;
}) {
  const catalog = use(catalogPromise);

  return (
    <ThemeProvider>
      <StorefrontExperienceProvider products={catalog.products}>
        <SiteChrome catalog={catalog}>{children}</SiteChrome>
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
