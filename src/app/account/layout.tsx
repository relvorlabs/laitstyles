import type { Metadata } from "next";
import type { ReactNode } from "react";
import { StorefrontRouteBoundary } from "@/app/storefront-route-boundary";
import { AccountShell } from "@/features/storefront/account/account-shell";

export const metadata: Metadata = {
  title: "Account",
  description: "Manage your Laitstyle orders, addresses, saved items and preferences.",
};

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <StorefrontRouteBoundary>
      <AccountShell>{children}</AccountShell>
    </StorefrontRouteBoundary>
  );
}
