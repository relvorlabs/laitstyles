import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { SiteChrome } from "@/components/layout/site-chrome";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { themeBootScript } from "@/components/theme/theme-script";
// The canonical typography is the card-lab home-lab set (Geist / Instrument Serif /
// Geist Mono), loaded once here via next/font and exposed as --font-lab-* for the whole app.
import { labFontClassName } from "@/features/storefront/home-lab/fonts";
import { StorefrontExperienceProvider } from "@/features/storefront/shared/storefront-experience-provider";
import { cn } from "@/lib/utils";
import "./globals.css";
import "@/features/storefront/home-lab/home-lab.css";

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
          {/* Single app-wide toast host. Ink pill + bone text, bottom-right — on-brand and
              high-contrast (light text on dark), matching the button contrast rule. Home-lab's
              own Toaster was removed so /products no longer double-renders toasts. */}
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
      </body>
    </html>
  );
}
