import type { ReactNode } from "react";
import { StorefrontRouteBoundary } from "@/app/storefront-route-boundary";

export default function StorefrontLayout({ children }: { children: ReactNode }) {
  return <StorefrontRouteBoundary>{children}</StorefrontRouteBoundary>;
}
