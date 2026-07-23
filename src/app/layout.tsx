import type { Metadata } from "next";
import { AppProviders } from "@/app/app-providers";
import { storefrontFontClassName } from "@/features/storefront/shared/storefront-fonts";
import { cn } from "@/lib/utils";
import "./theme-entry.css";

export const metadata: Metadata = {
  title: "Laitstyle",
  description: "Curated premium pre-owned fashion from Lagos.",
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
