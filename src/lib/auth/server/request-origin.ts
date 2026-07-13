import "server-only";

import { headers } from "next/headers";

export const LOCAL_AUTH_ORIGIN = "https://laitstyle.localhost";

export async function getRequestOrigin() {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const protocol =
    headerStore.get("x-forwarded-proto") ??
    (host?.startsWith("localhost") || host?.startsWith("127.") ? "http" : "https");

  return host ? `${protocol}://${host}` : LOCAL_AUTH_ORIGIN;
}
