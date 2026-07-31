import "server-only";

import { headers } from "next/headers";
import type { AuthFlowErrorCode } from "@/modules/auth/server/diagnostics";

export const LOCAL_AUTH_ORIGIN = "https://laitstyle.localhost";
const AUTH_ORIGIN_ENV_KEYS = [
  "AUTH_SITE_URL",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SITE_URL",
] as const;

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

export function withAuthErrorState(
  returnToValue: FormDataEntryValue | string | null | undefined,
  code: AuthFlowErrorCode,
  fallback = "/",
) {
  const returnTo = getSafeNextPath(returnToValue, fallback);
  const url = new URL(returnTo, LOCAL_AUTH_ORIGIN);
  url.searchParams.set("error", code);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function getConfiguredAuthOrigin() {
  for (const key of AUTH_ORIGIN_ENV_KEYS) {
    const value = process.env[key]?.trim();
    if (!value) continue;

    try {
      const url = new URL(value);
      if (url.protocol === "http:" || url.protocol === "https:") return url.origin;
    } catch {
      // Ignore malformed optional values and fall back to request headers.
    }
  }

  return null;
}

export async function getRequestOrigin() {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  if (host) {
    const protocol =
      headerStore.get("x-forwarded-proto") ??
      (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
    return `${protocol}://${host}`;
  }

  return getConfiguredAuthOrigin() ?? LOCAL_AUTH_ORIGIN;
}

export async function getAuthRedirectUrl(path: string) {
  const safePath = getSafeNextPath(path, "/");
  return new URL(safePath, `${await getRequestOrigin()}/`).toString();
}
