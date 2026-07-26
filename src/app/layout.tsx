import type { Metadata } from "next";
import { cn } from "@/lib/utils";
import { storefrontFontClassName } from "@/modules/storefront-shell/ui/storefront-fonts";
import { AppProvider } from "@/providers/providers";
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
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
