import type { ControlRoomState } from "@/lib/admin/shared/types";

export const newStoreControlRoomSeed: ControlRoomState = {
  storeName: "Laitstyle",
  reportingDate: "2026-07-09",
  asOf: "2026-07-09T11:35:00+01:00",
  currency: "NGN",
  isNewStore: true,
  products: [],
  orders: [],
  holds: [],
  customers: [],
  activities: [],
  stockMovements: [],
  reviews: [],
  salesPulse: [],
  continueTasks: [
    {
      id: "setup-store",
      type: "setup",
      title: "Set up the store foundation",
      detail: "Add the first product, delivery options and accepted payments.",
      href: "/admin?view=new-store",
      progress: 20,
    },
  ],
};
