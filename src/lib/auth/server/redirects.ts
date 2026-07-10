const LOCAL_BASE_URL = "https://laitstyle.local";

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
    const url = new URL(trimmed, LOCAL_BASE_URL);
    if (url.origin !== LOCAL_BASE_URL) return fallback;
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
