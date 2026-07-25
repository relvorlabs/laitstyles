import type {
  ControlRoomCustomer,
  ControlRoomOrder,
  ControlRoomReturn,
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

export type ReturnRepository = {
  listReturns: () => Promise<ControlRoomReturn[]>;
  getReturn: (returnId: string) => Promise<ControlRoomReturn | null>;
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
  returns: ReturnRepository;
  customers: CustomerRepository;
  settings: SettingsRepository;
  overview: OverviewRepository;
};
