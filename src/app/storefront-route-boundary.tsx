import type { ReactNode } from "react";
import { Suspense } from "react";
import { AppShellFallback } from "@/app/app-shell-fallback";
import { StorefrontClientBoundary } from "@/app/storefront-client-boundary";
import { loadStorefrontShellCatalogue } from "@/features/storefront/shared/catalogue-loader";
import type { StorefrontAuthSession } from "@/features/storefront/shared/storefront-auth-session";
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
  const cataloguePromise = loadStorefrontShellCatalogue();
  const authSessionPromise = loadStorefrontAuthSession();

  return (
    <Suspense fallback={<AppShellFallback />}>
      <StorefrontClientBoundary
        authSessionPromise={authSessionPromise}
        cataloguePromise={cataloguePromise}
      >
        {children}
      </StorefrontClientBoundary>
    </Suspense>
  );
}
