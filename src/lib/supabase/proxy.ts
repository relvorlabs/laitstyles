import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { requireSupabasePublicConfig } from "@/lib/supabase/env";

const AUTH_COOKIE_MARKER = "-auth-token";
const AUTH_REQUEST_TIMEOUT_MS = 5_000;

function hasSupabaseAuthCookie(request: NextRequest) {
  return request.cookies
    .getAll()
    .some(({ name }) => name.startsWith("sb-") && name.includes(AUTH_COOKIE_MARKER));
}

const fetchWithAuthTimeout: typeof fetch = (input, init) => {
  const timeoutSignal = AbortSignal.timeout(AUTH_REQUEST_TIMEOUT_MS);
  const signal = init?.signal ? AbortSignal.any([init.signal, timeoutSignal]) : timeoutSignal;

  return fetch(input, { ...init, signal });
};

export async function updateSupabaseSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Public anonymous requests have no session to refresh. Avoid a remote auth call on
  // every storefront page view, especially when the configured Supabase host is offline.
  if (!hasSupabaseAuthCookie(request)) return response;

  const config = requireSupabasePublicConfig();

  const supabase = createServerClient(config.url, config.publishableKey, {
    global: { fetch: fetchWithAuthTimeout },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  try {
    await supabase.auth.getClaims();
  } catch {
    // Route-level authorization remains fail-closed. The proxy should not hold every
    // request open indefinitely when session refresh is temporarily unavailable.
  }

  return response;
}

export const updateSession = updateSupabaseSession;
