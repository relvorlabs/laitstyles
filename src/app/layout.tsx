import type { Metadata } from "next";
import { AppProviders } from "@/app/app-providers";
// The canonical Manrope/Newsreader typography is loaded once here via next/font
// and exposed as --font-storefront-* for the whole app.
import { storefrontFontClassName } from "@/features/storefront/shared/storefront-fonts";
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
      className={cn("h-full antialiased font-sans", storefrontFontClassName)}
      lang="en"
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
