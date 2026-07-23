"use client";

import { type CSSProperties, type ReactNode, use } from "react";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import type { StorefrontCatalogPayload } from "@/features/storefront/shared/catalog-types";
import { StorefrontExperienceProvider } from "@/features/storefront/shared/storefront-experience-provider";
import { SiteChrome } from "@/features/storefront/shell/site-chrome";

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
