import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AccountShell } from "@/modules/customers/ui/account/account-shell";

export const metadata: Metadata = {
  title: "Account",
  description: "Manage your Laitstyle orders, addresses, saved items and preferences.",
};

export default function AccountLayout({ children }: { children: ReactNode }) {
  return <AccountShell>{children}</AccountShell>;
}
