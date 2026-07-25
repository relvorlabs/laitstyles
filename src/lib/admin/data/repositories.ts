import type {
  ControlRoomCustomer,
  ControlRoomHold,
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

export type OrderRepository = {
  listOrders: () => Promise<ControlRoomOrder[]>;
  getOrder: (orderId: string) => Promise<ControlRoomOrder | null>;
};

export type HoldRepository = {
  listHolds: () => Promise<ControlRoomHold[]>;
  getHold: (holdId: string) => Promise<ControlRoomHold | null>;
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
  orders: OrderRepository;
  holds: HoldRepository;
  returns: ReturnRepository;
  customers: CustomerRepository;
  settings: SettingsRepository;
  overview: OverviewRepository;
};
