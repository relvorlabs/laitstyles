import type { Product } from "@/lib/catalogue";

export const ORDER_STORAGE_KEY = "laitstyle-latest-order-v1";

export type OrderReceipt = {
  orderNumber: string;
  firstName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  zoneName: string;
  eta: string;
  paymentName: string;
  items: Product[];
  subtotal: number;
  shipping: number;
  vat: number;
  total: number;
  placedAt: string;
};

export function createOrderNumber() {
  const suffix = Date.now().toString().slice(-4);
  return `LAIT-${suffix}`;
}

export function subscribeToLatestOrder(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => undefined;

  function handleStorage(event: StorageEvent) {
    if (event.storageArea === window.sessionStorage && event.key === ORDER_STORAGE_KEY) {
      onStoreChange();
    }
  }

  window.addEventListener("storage", handleStorage);
  return () => window.removeEventListener("storage", handleStorage);
}

export function getLatestOrderSnapshot() {
  if (typeof window === "undefined") return null;

  try {
    return window.sessionStorage.getItem(ORDER_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function getServerOrderSnapshot() {
  return null;
}

export function parseOrderReceipt(snapshot: string | null) {
  if (!snapshot) return null;

  try {
    return JSON.parse(snapshot) as OrderReceipt;
  } catch {
    return null;
  }
}

export function subscribeToClientReady() {
  return () => undefined;
}

export function getClientReadySnapshot() {
  return true;
}

export function getServerClientReadySnapshot() {
  return false;
}
