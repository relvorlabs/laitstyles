import type {
  ControlRoomOrder,
  OverviewSnapshot,
  SalesPulsePoint,
} from "@/lib/admin/shared/types";

export type OverviewResource = {
  snapshot: OverviewSnapshot;
  reportingDate: string;
  asOf: string;
  salesPulse: SalesPulsePoint[];
  openOrders: ControlRoomOrder[];
};

export type OverviewRepository = {
  getOverview: () => Promise<OverviewResource>;
};

export type AdminRepositories = {
  overview: OverviewRepository;
};
