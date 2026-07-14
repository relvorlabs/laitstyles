import "server-only";

import type { StaffCapability } from "@/lib/auth/permissions";
import { resolveAdminAccess } from "@/lib/auth/server/access";
import { getServerAuthPrincipal } from "@/lib/auth/server/session";

export async function getAdminAccess(capability: StaffCapability = "admin:access") {
  const principal = await getServerAuthPrincipal();
  const configuredStoreId =
    process.env.LAITSTYLE_DEFAULT_STORE_ID ?? process.env.NEXT_PUBLIC_LAITSTYLE_STORE_ID ?? null;

  return resolveAdminAccess(principal, capability, configuredStoreId);
}
