"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { postGoogleOAuthResult } from "@/modules/auth/ui/google-oauth-popup";

export default function OAuthCompletePage() {
  return (
    <Suspense fallback={<OAuthStatus text="Completing Google sign-in…" />}>
      <OAuthComplete />
    </Suspense>
  );
}

function OAuthComplete() {
  const params = useSearchParams();
  const [closed, setClosed] = useState(false);
  const target = params.get("target") ?? "/?auth=signin&error=oauth-callback-invalid";

  useEffect(() => {
    const sent = postGoogleOAuthResult(target);
    if (!sent) setClosed(true);
  }, [target]);

  return (
    <OAuthStatus
      text={
        closed
          ? "Google sign-in completed. You can close this window and return to Laitstyles."
          : "Returning you to Laitstyles…"
      }
    />
  );
}

function OAuthStatus({ text }: { text: string }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-6 text-foreground">
      <div className="max-w-sm rounded-3xl border border-border bg-card p-8 text-center shadow-xl">
        <div className="mx-auto mb-5 size-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        <h1 className="font-serif text-2xl font-medium">Google sign-in</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{text}</p>
      </div>
    </main>
  );
}
