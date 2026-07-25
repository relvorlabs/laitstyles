import type {
  ControlRoomOrder,
  OverviewSnapshot,
  SalesPulsePoint,
  StoreSettings,
} from "@/lib/admin/shared/types";

export type OverviewResource = {
  snapshot: OverviewSnapshot;
  reportingDate: string;
  asOf: string;
  salesPulse: SalesPulsePoint[];
  openOrders: ControlRoomOrder[];
};

export type SettingsRepository = {
  getSettings: () => Promise<StoreSettings | null>;
};

export type OverviewRepository = {
  getOverview: () => Promise<OverviewResource>;
};

export type AdminRepositories = {
  settings: SettingsRepository;
  overview: OverviewRepository;
};
