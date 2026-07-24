export type InventoryCounts = {
  totalReceived: number;
  available: number;
  reserved: number;
  sold: number;
  returned: number;
  damaged: number;
};

export type StockMovementKind =
  | "received"
  | "reserved"
  | "released"
  | "sold"
  | "returned"
  | "restocked"
  | "damaged"
  | "adjusted";

export type StockMovement = {
  id: string;
  productId: string;
  variantId: string | null;
  kind: StockMovementKind;
  quantity: number;
  occurredAt: string;
  actor: string;
  note: string;
};
