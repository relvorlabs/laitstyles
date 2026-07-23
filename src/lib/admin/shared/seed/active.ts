import {
  activities,
  customers,
  holds,
  orders,
  products,
  reviews,
  salesPulse,
  stockMovements,
} from "@/lib/admin/shared/seed/active-store-data";
import type { ControlRoomState } from "@/lib/admin/shared/types";

export const activeControlRoomSeed: ControlRoomState = {
  storeName: "Laitstyle",
  reportingDate: "2026-07-09",
  asOf: "2026-07-09T11:35:00+01:00",
  currency: "NGN",
  isNewStore: false,
  products,
  orders,
  holds,
  customers,
  activities,
  stockMovements,
  reviews,
  salesPulse,
  continueTasks: [
    {
      id: "continue-wrap-skirt",
      type: "draft",
      title: "Finish the Ivory Linen Wrap Skirt",
      detail: "Add measurements, confirm condition and set a selling price.",
      href: "/admin/inventory?view=intake",
      progress: 62,
    },
  ],
};
