import type { Metadata } from "next";
import { AppProviders } from "@/components/providers/app-providers";
// The canonical typography is the card-lab storefront set (Geist / Instrument Serif /
// Geist Mono), loaded once here via next/font and exposed as --font-storefront-* for the whole app.
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const catalog = await loadStorefrontCatalog();

  return (
    <html
      className={cn("h-full antialiased font-sans", storefrontFontClassName)}
      lang="en"
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <AppProviders catalog={catalog}>{children}</AppProviders>
      </body>
    </html>
  );
}
