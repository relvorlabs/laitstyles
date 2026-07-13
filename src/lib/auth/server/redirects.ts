const LOCAL_AUTH_ORIGIN = "https://laitstyle.localhost";

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

export function withAuthErrorPath(message: string, next: string) {
  const params = new URLSearchParams({
    message,
    next: getSafeNextPath(next, "/"),
  });

  return `/auth/error?${params.toString()}`;
}
