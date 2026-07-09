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
