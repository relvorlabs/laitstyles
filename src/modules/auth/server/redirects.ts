import "server-only";

import { headers } from "next/headers";
import type { AuthFlowErrorCode } from "@/modules/auth/server/diagnostics";

export const LOCAL_AUTH_ORIGIN = "https://laitstyle.localhost";

export function getSafeNextPath(
  value: FormDataEntryValue | string | null | undefined,
  fallback = "/",
) {
  if (typeof value !== "string") return fallback;

  const trimmed = value.trim();
  if (!trimmed?.startsWith("/") || trimmed.startsWith("//")) {
    return fallback;
  }

  try {
    const url = new URL(trimmed, LOCAL_AUTH_ORIGIN);
    if (url.origin !== LOCAL_AUTH_ORIGIN) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function withAuthErrorPath(code: AuthFlowErrorCode, next: string) {
  const params = new URLSearchParams({
    code,
    next: getSafeNextPath(next, "/"),
  });

  return `/auth/error?${params.toString()}`;
}

export async function getRequestOrigin() {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const protocol =
    headerStore.get("x-forwarded-proto") ??
    (host?.startsWith("localhost") || host?.startsWith("127.") ? "http" : "https");

  return host ? `${protocol}://${host}` : LOCAL_AUTH_ORIGIN;
}
