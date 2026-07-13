import type {
  CatalogueTaxonomyItem,
  ControlRoomCustomer,
  ControlRoomHold,
  ControlRoomOrder,
  ControlRoomReturn,
  InventoryProduct,
  OverviewSnapshot,
  SalesPulsePoint,
  StockMovement,
  StoreSettings,
} from "@/lib/control-room/types";

export type OverviewResource = {
  snapshot: OverviewSnapshot;
  reportingDate: string;
  asOf: string;
  salesPulse: SalesPulsePoint[];
  openOrders: ControlRoomOrder[];
};

export type InventoryRepository = {
  listProducts: () => Promise<InventoryProduct[]>;
  getProduct: (productId: string) => Promise<InventoryProduct | null>;
  listTaxonomy: () => Promise<CatalogueTaxonomyItem[]>;
  listStockMovements: (productId?: string) => Promise<StockMovement[]>;
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

export type ControlRoomRepositories = {
  inventory: InventoryRepository;
  orders: OrderRepository;
  holds: HoldRepository;
  returns: ReturnRepository;
  customers: CustomerRepository;
  settings: SettingsRepository;
  overview: OverviewRepository;
};
