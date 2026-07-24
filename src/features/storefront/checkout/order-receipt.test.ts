import { describe, expect, it } from "vitest";
import {
  createOrderNumber,
  LEGACY_ORDER_RECEIPT_STORAGE_KEY,
  ORDER_RECEIPT_STORAGE_KEY,
  type OrderReceipt,
  parseOrderReceipt,
  type ReceiptStorage,
  readLatestOrderReceipt,
  serializeOrderReceipt,
  writeLatestOrderReceipt,
} from "./order-receipt";

class MemoryStorage implements ReceiptStorage {
  readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

const receipt: OrderReceipt = {
  orderNumber: "LAIT-123456",
  firstName: "Ada",
  email: "ada@example.com",
  phone: "+234 801 234 5678",
  address: "1 Marina Road",
  city: "Lagos",
  country: "Nigeria",
  zoneName: "Lagos mainland & island",
  eta: "1–2 business days",
  paymentName: "Paystack",
  items: [
    {
      lineKey: "p1:default",
      productId: "p1",
      slug: "linen-shirt",
      name: "Linen shirt",
      imageUrl: "/shirt.jpg",
      size: "M",
      colour: "Cream",
      condition: "A+",
      quantity: 1,
      unitPriceNaira: 24000,
    },
  ],
  subtotal: 24000,
  shipping: 3500,
  vat: 1800,
  total: 29300,
  placedAt: "2026-07-24T10:00:00.000Z",
};

describe("order receipt", () => {
  it("creates deterministic order numbers from the supplied time", () => {
    expect(createOrderNumber(1_800_000_123_456)).toBe("LAIT-123456");
  });

  it("round-trips only the explicit receipt shape", () => {
    expect(parseOrderReceipt(JSON.parse(serializeOrderReceipt(receipt)))).toEqual(receipt);
  });

  it("rejects malformed or partial receipt items", () => {
    expect(parseOrderReceipt({ ...receipt, items: [{ productId: "p1" }] })).toBeNull();
    expect(parseOrderReceipt({ ...receipt, total: -1 })).toBeNull();
  });

  it("writes the canonical key and removes the legacy key", () => {
    const storage = new MemoryStorage();
    storage.setItem(LEGACY_ORDER_RECEIPT_STORAGE_KEY, JSON.stringify(receipt));

    writeLatestOrderReceipt(storage, receipt);

    expect(readLatestOrderReceipt(storage)).toEqual(receipt);
    expect(storage.getItem(ORDER_RECEIPT_STORAGE_KEY)).not.toBeNull();
    expect(storage.getItem(LEGACY_ORDER_RECEIPT_STORAGE_KEY)).toBeNull();
  });

  it("reads a valid legacy receipt while migration is pending", () => {
    const storage = new MemoryStorage();
    storage.setItem(LEGACY_ORDER_RECEIPT_STORAGE_KEY, JSON.stringify(receipt));
    expect(readLatestOrderReceipt(storage)).toEqual(receipt);
  });
});
