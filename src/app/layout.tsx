import type { Metadata } from "next";
import { AppProviders } from "@/components/providers/app-providers";
// The canonical typography is the card-lab home-lab set (Geist / Instrument Serif /
// Geist Mono), loaded once here via next/font and exposed as --font-lab-* for the whole app.
import { labFontClassName } from "@/features/storefront/home-lab/fonts";
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
  return (
    <html
      className={cn("h-full antialiased font-sans", labFontClassName)}
      lang="en"
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
