import type { ReactNode } from "react";
import { Suspense } from "react";
import { AppShellFallback } from "@/app/app-shell-fallback";
import { StorefrontProviders } from "@/app/storefront-providers";
import type { StorefrontAuthSession } from "@/features/storefront/shared/storefront-auth-session";
import { loadStorefrontShellCatalog } from "@/features/storefront/shared/catalog-loader";
import { getCurrentSession } from "@/server/auth/session";

async function loadStorefrontAuthSession(): Promise<StorefrontAuthSession> {
  const session = await getCurrentSession();
  if (session.kind === "consumer" || session.kind === "staff") {
    return {
      signedIn: true,
      email: session.email,
      displayName: session.displayName,
    };
  }
  return { signedIn: false, email: null, displayName: null };
}

export function StorefrontRouteBoundary({ children }: { children: ReactNode }) {
  const catalogPromise = loadStorefrontShellCatalog();
  const authSessionPromise = loadStorefrontAuthSession();

  return (
    <Suspense fallback={<AppShellFallback />}>
      <StorefrontProviders
        authSessionPromise={authSessionPromise}
        catalogPromise={catalogPromise}
      >
        {children}
      </StorefrontProviders>
    </Suspense>
  );
}
