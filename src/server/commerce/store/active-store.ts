import "server-only";

import { cache } from "react";
import { prisma } from "@/lib/prisma";

export interface ActiveStore {
  id: string;
  slug: string;
  name: string;
}

// Single-store storefront: resolve the one active store server-side (Option A).
// `cache` memoizes it per request so repeated reads don't re-query.
export const getActiveStore = cache(async (): Promise<ActiveStore> => {
  const store = await prisma.stores.findFirst({
    where: { status: "active" },
    orderBy: { created_at: "asc" },
    select: { id: true, slug: true, name: true },
  });
  if (!store) {
    throw new Error("No active store found — the storefront cannot resolve a store.");
  }
  return store;
});
