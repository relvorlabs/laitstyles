"use client";

import { Analytics } from "@vercel/analytics/next";
import { usePathname } from "next/navigation";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { QueryProvider } from "@/lib/query/query-provider";

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  if (isAdmin) {
    return <>{children}</>;
  }

  // Storefront TanStack Query provider is mounted here (not around /admin).
  return (
    <QueryProvider>
      <Header />
      {children}
      <Analytics />
      <Footer />
    </QueryProvider>
  );
}
