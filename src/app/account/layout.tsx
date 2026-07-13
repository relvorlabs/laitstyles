import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getServerAuthPrincipal } from "@/lib/auth/server/session";

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const principal = await getServerAuthPrincipal();

  if (!principal.profileId) {
    redirect("/auth/sign-in?next=/account");
  }

  return children;
}
