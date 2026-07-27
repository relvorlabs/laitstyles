"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getAuthFlowErrorMessage, isAuthFlowErrorCode } from "@/modules/auth/errors";
import {
  AUTH_SECONDARY_BUTTON_CLASS_NAME,
  AuthStatusNotice,
} from "@/modules/auth/ui/auth-page-shell";
import { openGoogleOAuthPopup } from "@/modules/auth/ui/google-oauth-popup";

export function GoogleOAuthButton({
  next,
  returnTo,
  disabled = false,
}: {
  next: string;
  returnTo: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    if (pending) return;
    setPending(true);
    setError(null);
    const result = await openGoogleOAuthPopup({ next, returnTo });
    if (!result.ok) {
      setError(result.message);
      setPending(false);
      return;
    }

    const target = new URL(result.target, window.location.origin);
    const errorCode = target.searchParams.get("error");
    if (isAuthFlowErrorCode(errorCode)) {
      setError(getAuthFlowErrorMessage(errorCode));
      setPending(false);
      return;
    }

    router.replace(`${target.pathname}${target.search}${target.hash}`);
  }

  return (
    <div className="grid gap-3">
      {error ? <AuthStatusNotice tone="error">{error}</AuthStatusNotice> : null}
      <Button
        className={`w-full ${AUTH_SECONDARY_BUTTON_CLASS_NAME}`}
        disabled={disabled || pending}
        onClick={start}
        size="lg"
        type="button"
        variant="outline"
      >
        <span className="grid size-7 place-items-center rounded-full border border-border bg-card font-semibold">
          G
        </span>
        {pending ? "Waiting for Google…" : "Continue with Google"}
      </Button>
    </div>
  );
}
