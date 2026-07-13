import "server-only";

import type { StaffCapability } from "@/lib/auth/permissions";
import { resolveControlRoomAccess } from "@/lib/auth/server/access";
import { getServerAuthPrincipal } from "@/lib/auth/server/session";

export async function getControlRoomAccess(capability: StaffCapability = "control-room:access") {
  const principal = await getServerAuthPrincipal();
  const configuredStoreId =
    process.env.LAITSTYLE_DEFAULT_STORE_ID ?? process.env.NEXT_PUBLIC_LAITSTYLE_STORE_ID ?? null;

  return resolveControlRoomAccess(principal, capability, configuredStoreId);
}
