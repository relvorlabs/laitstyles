"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { accountCustomerKeys } from "@/modules/customers/client/account-keys";
import {
  listOwnedRecentProductIdsRequest,
  recordOwnedRecentProductIdsRequest,
} from "@/modules/customers/client/recent-products-api";
import { useSession } from "@/providers/session-provider";
import {
  selectRecentIds,
  selectUiHydrated,
  useStorefrontUiStore,
} from "@/stores/storefront-ui.store";

const RECENT_STORAGE_PREFIX = "laitstyles-storefront:v2:recent:";
const LEGACY_RECENT_STORAGE_KEY = "laitstyles-storefront:v1:recent";
const LEGACY_RECENT_STORAGE_KEY_OLD = "laitstyles-recent";

export function StorefrontRecentPersistence() {
  const session = useSession();
  const signedIn = session.signedIn;
  const identityKey = signedIn
    ? `consumer:${session.identityKey ?? session.email ?? "unresolved"}`
    : "guest";
  const uiHydrated = useStorefrontUiStore(selectUiHydrated);
  const recentIds = useStorefrontUiStore(selectRecentIds);
  const replaceRecent = useStorefrontUiStore((state) => state.replaceRecent);
  const previousIdentity = useRef<string | null>(null);
  const initializedIdentity = useRef<string | null>(null);
  const lastServerSignature = useRef("");

  const serverQuery = useQuery({
    queryKey: accountCustomerKeys.recentProducts(),
    queryFn: ({ signal }) => listOwnedRecentProductIdsRequest(signal),
    enabled: signedIn && uiHydrated,
    staleTime: 15_000,
  });

  const serverIds = useMemo(() => serverQuery.data ?? [], [serverQuery.data]);

  useEffect(() => {
    if (!uiHydrated || initializedIdentity.current === identityKey) return;
    if (signedIn && serverQuery.isPending) return;

    const localIds = readStoredIds(window.localStorage, storageKey(identityKey));
    const legacyIds = readLegacyIds();
    const guestIds = signedIn
      ? readStoredIds(window.localStorage, storageKey("guest"))
      : [];
    const transitioningGuestIds =
      signedIn && previousIdentity.current === "guest" ? recentIds : [];
    const nextIds = uniqueIds([
      ...transitioningGuestIds,
      ...guestIds,
      ...localIds,
      ...serverIds,
      ...legacyIds,
    ]);

    replaceRecent(nextIds);
    initializedIdentity.current = identityKey;
    previousIdentity.current = identityKey;
    lastServerSignature.current = signature(serverIds);

    try {
      window.sessionStorage.removeItem(LEGACY_RECENT_STORAGE_KEY);
      window.sessionStorage.removeItem(LEGACY_RECENT_STORAGE_KEY_OLD);
    } catch {
      // Storage is optional; the in-memory list remains usable.
    }
  }, [
    identityKey,
    recentIds,
    replaceRecent,
    serverIds,
    serverQuery.isPending,
    signedIn,
    uiHydrated,
  ]);

  useEffect(() => {
    if (!uiHydrated || initializedIdentity.current !== identityKey) return;
    try {
      window.localStorage.setItem(storageKey(identityKey), JSON.stringify(recentIds));
    } catch {
      // Storage is optional; the in-memory list remains usable.
    }
  }, [identityKey, recentIds, uiHydrated]);

  useEffect(() => {
    if (
      !signedIn ||
      !uiHydrated ||
      initializedIdentity.current !== identityKey ||
      recentIds.length === 0
    ) {
      return;
    }
    const currentSignature = signature(recentIds);
    if (currentSignature === lastServerSignature.current) return;

    const timer = window.setTimeout(() => {
      void recordOwnedRecentProductIdsRequest(recentIds)
        .then((canonicalIds) => {
          lastServerSignature.current = signature(canonicalIds);
          if (signature(recentIds) !== lastServerSignature.current) {
            replaceRecent(canonicalIds);
          }
          try {
            window.localStorage.removeItem(storageKey("guest"));
          } catch {
            // Best effort after the server accepts the merged guest history.
          }
        })
        .catch(() => undefined);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [identityKey, recentIds, replaceRecent, signedIn, uiHydrated]);

  return null;
}

function storageKey(identityKey: string): string {
  return `${RECENT_STORAGE_PREFIX}${encodeURIComponent(identityKey)}`;
}

function readLegacyIds(): string[] {
  try {
    return uniqueIds([
      ...parseIds(window.sessionStorage.getItem(LEGACY_RECENT_STORAGE_KEY)),
      ...parseIds(window.sessionStorage.getItem(LEGACY_RECENT_STORAGE_KEY_OLD)),
    ]);
  } catch {
    return [];
  }
}

function readStoredIds(storage: Storage, key: string): string[] {
  try {
    return parseIds(storage.getItem(key));
  } catch {
    return [];
  }
}

function parseIds(serialized: string | null): string[] {
  if (!serialized) return [];
  try {
    const value = JSON.parse(serialized) as unknown;
    return Array.isArray(value)
      ? uniqueIds(value.filter((candidate): candidate is string => typeof candidate === "string"))
      : [];
  } catch {
    return [];
  }
}

function uniqueIds(productIds: readonly string[]): string[] {
  return [...new Set(productIds.filter((productId) => productId.trim().length > 0))].slice(0, 8);
}

function signature(productIds: readonly string[]): string {
  return productIds.join("|");
}
