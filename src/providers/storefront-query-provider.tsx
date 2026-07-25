"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useState } from "react";
import { makeStorefrontQueryClient } from "@/lib/query/storefront-query-client";
import {
  storefrontCatalogueQueryKey,
} from "@/modules/products/client/storefront-catalogue";
import type { StorefrontShellCataloguePayload } from "@/modules/products/storefront/catalogue-contract";

export function StorefrontQueryProvider({
  children,
  initialCatalogue,
}: {
  children: ReactNode;
  initialCatalogue: StorefrontShellCataloguePayload;
}) {
  const [queryClient] = useState(() => {
    const client = makeStorefrontQueryClient();
    client.setQueryData(storefrontCatalogueQueryKey, initialCatalogue);
    return client;
  });

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
