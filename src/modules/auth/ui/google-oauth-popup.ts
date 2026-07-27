"use client";

import { createClient } from "@/lib/supabase/client";

const OAUTH_MESSAGE_TYPE = "laitstyles:oauth-complete";

export type GoogleOAuthPopupResult =
  | { ok: true; target: string }
  | { ok: false; message: string; target?: string };

export async function openGoogleOAuthPopup({
  next,
  returnTo,
}: {
  next: string;
  returnTo: string;
}): Promise<GoogleOAuthPopupResult> {
  const callback = new URL("/auth/callback", window.location.origin);
  callback.searchParams.set("next", next);
  callback.searchParams.set("returnTo", returnTo);
  callback.searchParams.set("popup", "1");

  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callback.toString(),
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) {
    return { ok: false, message: "Google sign-in could not be started. Please try again." };
  }

  const width = 520;
  const height = 700;
  const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2);
  const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2);
  const popup = window.open(
    data.url,
    "laitstyles-google-auth",
    `popup=yes,width=${width},height=${height},left=${left},top=${top}`,
  );

  if (!popup) {
    return {
      ok: false,
      message: "Your browser blocked the Google sign-in window. Allow popups for Laitstyles and try again.",
    };
  }

  return new Promise<GoogleOAuthPopupResult>((resolve) => {
    let settled = false;
    const finish = (result: GoogleOAuthPopupResult) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("message", onMessage);
      window.clearInterval(closedPoll);
      window.clearTimeout(timeout);
      resolve(result);
    };

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (!event.data || typeof event.data !== "object") return;
      const data = event.data as { type?: string; target?: string };
      if (data.type !== OAUTH_MESSAGE_TYPE || typeof data.target !== "string") return;
      finish({ ok: true, target: data.target });
    };

    window.addEventListener("message", onMessage);
    const closedPoll = window.setInterval(() => {
      if (!popup.closed) return;
      finish({ ok: false, message: "Google sign-in was closed before it finished." });
    }, 400);
    const timeout = window.setTimeout(() => {
      try {
        popup.close();
      } catch {
        // Cross-origin popup cleanup is best effort.
      }
      finish({ ok: false, message: "Google sign-in took too long. Please try again." });
    }, 120_000);
  });
}

export function postGoogleOAuthResult(target: string) {
  if (!window.opener) return false;
  window.opener.postMessage({ type: OAUTH_MESSAGE_TYPE, target }, window.location.origin);
  window.close();
  return true;
}
