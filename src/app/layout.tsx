import type { Metadata } from "next";
import { SiteChrome } from "@/components/layout/site-chrome";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { themeBootScript } from "@/components/theme/theme-script";
// The canonical typography is the card-lab home-lab set (Geist / Instrument Serif /
// Geist Mono), loaded once here via next/font and exposed as --font-lab-* for the whole app.
import { labFontClassName } from "@/features/storefront/home-lab/fonts";
import { StorefrontExperienceProvider } from "@/features/storefront/shared/storefront-experience-provider";
import { cn } from "@/lib/utils";
import "./globals.css";

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
  return (
    <html
      className={cn("h-full antialiased font-sans", labFontClassName)}
      lang="en"
      suppressHydrationWarning
    >
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: Static theme bootstrap prevents light/dark hydration flash and contains no user input. */}
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          <StorefrontExperienceProvider>
            <SiteChrome>{children}</SiteChrome>
          </StorefrontExperienceProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
