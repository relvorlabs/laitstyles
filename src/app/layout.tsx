import type { Metadata } from "next";
import { Suspense } from "react";
import { AppProviders } from "@/app/app-providers";
import { AppShellFallback } from "@/app/app-shell-fallback";
// The canonical Manrope/Newsreader typography is loaded once here via next/font
// and exposed as --font-storefront-* for the whole app.
import { storefrontFontClassName } from "@/features/storefront/shared/storefront-fonts";
import { loadStorefrontCatalog } from "@/lib/storefront/catalog-data";
import { cn } from "@/lib/utils";
import "./theme-entry.css";

export const metadata: Metadata = {
  title: "Laitstyle",
  description: "One-of-one second-hand pieces from Lagos.",
  icons: {
    icon: "/brand/laitstyle-symbol.svg",
    shortcut: "/brand/laitstyle-symbol.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Started here (not awaited) so the static shell can send immediately;
  // AppProviders resolves it with use() inside the Suspense boundary below.
  // See docs/01-app/02-guides/streaming.md "Sharing a promise across the tree".
  const catalogPromise = loadStorefrontCatalog();

  return (
    <html
      className={cn("h-full antialiased font-sans", storefrontFontClassName)}
      lang="en"
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <Suspense fallback={<AppShellFallback />}>
          <AppProviders catalogPromise={catalogPromise}>{children}</AppProviders>
        </Suspense>
      </body>
    </html>
  );
}
