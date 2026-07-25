import type {
  ControlRoomCustomer,
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

export type CustomerRepository = {
  listCustomers: () => Promise<ControlRoomCustomer[]>;
  getCustomer: (customerId: string) => Promise<ControlRoomCustomer | null>;
};

export type SettingsRepository = {
  getSettings: () => Promise<StoreSettings | null>;
};

export type OverviewRepository = {
  getOverview: () => Promise<OverviewResource>;
};

export type AdminRepositories = {
  customers: CustomerRepository;
  settings: SettingsRepository;
  overview: OverviewRepository;
};
