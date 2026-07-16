import "server-only";

import type { StaffCapability } from "@/lib/auth/permissions";
import { resolveAdminAccess } from "@/lib/auth/server/access";
import { getServerAuthPrincipal } from "@/lib/auth/server/session";

export async function getAdminAccess(capability: StaffCapability = "admin:access") {
  return resolveAdminAccess(await getServerAuthPrincipal(), capability);
}
