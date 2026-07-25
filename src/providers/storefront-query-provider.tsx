"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useState } from "react";
import type { StorefrontShellCatalogPayload } from "@/features/storefront/shared/catalog-types";
import { makeStorefrontQueryClient } from "@/lib/query/storefront-query-client";
import { storefrontCatalogQueryKey } from "@/modules/products/client/storefront-catalog";

export function StorefrontQueryProvider({
  children,
  initialCatalog,
}: {
  children: ReactNode;
  initialCatalog: StorefrontShellCatalogPayload;
}) {
  const [queryClient] = useState(() => {
    const client = makeStorefrontQueryClient();
    client.setQueryData(storefrontCatalogQueryKey, initialCatalog);
    return client;
  });

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
