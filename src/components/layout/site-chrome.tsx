"use client";

import { usePathname } from "next/navigation";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { ShopProvider } from "@/components/shop/shop-provider";

const focusedRoutes = ["/cart", "/checkout", "/order-confirmation"];

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");
  const isFocusedFlow = focusedRoutes.some(
    (route) => pathname === route || pathname?.startsWith(`${route}/`),
  );

  if (isAdmin) return <>{children}</>;

  return (
    <ShopProvider>
      {isFocusedFlow ? null : <Header />}
      {children}
      {isFocusedFlow ? null : <Footer />}
    </ShopProvider>
  );
}
