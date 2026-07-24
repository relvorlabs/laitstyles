export const ORDER_RECEIPT_STORAGE_KEY = "laitstyles-storefront:v1:latest-order";
export const LEGACY_ORDER_RECEIPT_STORAGE_KEY = "laitstyle-latest-order-v1";

export type OrderReceiptItem = {
  lineKey: string;
  productId: string;
  slug: string;
  name: string;
  imageUrl: string;
  size: string | null;
  colour: string | null;
  condition: string;
  quantity: number;
  unitPriceNaira: number;
};

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
  items: OrderReceiptItem[];
  subtotal: number;
  shipping: number;
  vat: number;
  total: number;
  placedAt: string;
};

export interface ReceiptStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : null;
}

function positiveInteger(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : null;
}

function nonNegativeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function parseReceiptItem(value: unknown): OrderReceiptItem | null {
  if (!isRecord(value)) return null;
  const lineKey = stringValue(value.lineKey);
  const productId = stringValue(value.productId);
  const slug = stringValue(value.slug);
  const name = stringValue(value.name);
  const imageUrl = stringValue(value.imageUrl);
  const condition = stringValue(value.condition);
  const quantity = positiveInteger(value.quantity);
  const unitPriceNaira = nonNegativeNumber(value.unitPriceNaira);
  if (
    !lineKey ||
    !productId ||
    !slug ||
    !name ||
    imageUrl === null ||
    !condition ||
    !quantity ||
    unitPriceNaira === null
  ) {
    return null;
  }
  return {
    lineKey,
    productId,
    slug,
    name,
    imageUrl,
    size: value.size === null ? null : stringValue(value.size),
    colour: value.colour === null ? null : stringValue(value.colour),
    condition,
    quantity,
    unitPriceNaira,
  };
}

export function createOrderNumber(now: number = Date.now()) {
  return `LAIT-${now.toString().slice(-6)}`;
}

export function parseOrderReceipt(value: unknown): OrderReceipt | null {
  if (!isRecord(value) || !Array.isArray(value.items)) return null;
  const items = value.items.map(parseReceiptItem);
  if (items.some((item) => item === null)) return null;

  const orderNumber = stringValue(value.orderNumber);
  const firstName = stringValue(value.firstName);
  const email = stringValue(value.email);
  const phone = stringValue(value.phone);
  const address = stringValue(value.address);
  const city = stringValue(value.city);
  const country = stringValue(value.country);
  const zoneName = stringValue(value.zoneName);
  const eta = stringValue(value.eta);
  const paymentName = stringValue(value.paymentName);
  const placedAt = stringValue(value.placedAt);
  const subtotal = nonNegativeNumber(value.subtotal);
  const shipping = nonNegativeNumber(value.shipping);
  const vat = nonNegativeNumber(value.vat);
  const total = nonNegativeNumber(value.total);

  if (
    !orderNumber ||
    firstName === null ||
    email === null ||
    phone === null ||
    address === null ||
    city === null ||
    country === null ||
    zoneName === null ||
    eta === null ||
    paymentName === null ||
    placedAt === null ||
    subtotal === null ||
    shipping === null ||
    vat === null ||
    total === null
  ) {
    return null;
  }

  return {
    orderNumber,
    firstName,
    email,
    phone,
    address,
    city,
    country,
    zoneName,
    eta,
    paymentName,
    items: items as OrderReceiptItem[],
    subtotal,
    shipping,
    vat,
    total,
    placedAt,
  };
}

export function parseOrderReceiptSnapshot(snapshot: string | null) {
  if (!snapshot) return null;
  try {
    return parseOrderReceipt(JSON.parse(snapshot));
  } catch {
    return null;
  }
}

export function serializeOrderReceipt(receipt: OrderReceipt) {
  const parsed = parseOrderReceipt(receipt);
  if (!parsed) throw new Error("Cannot persist an invalid order receipt.");
  return JSON.stringify(parsed);
}

export function readLatestOrderReceipt(storage: ReceiptStorage): OrderReceipt | null {
  const serialized =
    storage.getItem(ORDER_RECEIPT_STORAGE_KEY) ?? storage.getItem(LEGACY_ORDER_RECEIPT_STORAGE_KEY);
  return parseOrderReceiptSnapshot(serialized);
}

export function writeLatestOrderReceipt(storage: ReceiptStorage, receipt: OrderReceipt) {
  storage.setItem(ORDER_RECEIPT_STORAGE_KEY, serializeOrderReceipt(receipt));
  storage.removeItem(LEGACY_ORDER_RECEIPT_STORAGE_KEY);
}

export function subscribeToLatestOrder(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const handleStorage = (event: StorageEvent) => {
    if (
      event.storageArea === window.sessionStorage &&
      (event.key === ORDER_RECEIPT_STORAGE_KEY || event.key === LEGACY_ORDER_RECEIPT_STORAGE_KEY)
    ) {
      onStoreChange();
    }
  };
  window.addEventListener("storage", handleStorage);
  return () => window.removeEventListener("storage", handleStorage);
}

export function getLatestOrderSnapshot() {
  if (typeof window === "undefined") return null;
  try {
    return (
      window.sessionStorage.getItem(ORDER_RECEIPT_STORAGE_KEY) ??
      window.sessionStorage.getItem(LEGACY_ORDER_RECEIPT_STORAGE_KEY)
    );
  } catch {
    return null;
  }
}

export function getServerOrderSnapshot() {
  return null;
}
