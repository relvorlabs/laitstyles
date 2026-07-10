import type { InventoryMode } from "@/lib/control-room/inventory-types";

export type SettingsSection =
  | "identity"
  | "selling"
  | "delivery"
  | "payments"
  | "notifications"
  | "team";

export type StoreIdentitySettings = {
  storeName: string;
  description: string;
  contactEmail: string;
  contactPhone: string;
  whatsappNumber: string;
  instagramHandle: string;
  websiteUrl: string;
  logoPreviewUrl: string;
};

export type SellingPreferencesSettings = {
  currency: "NGN";
  holdDurationMinutes: number;
  lowStockThreshold: number;
  defaultProductMode: InventoryMode;
  payOnDeliveryEnabled: boolean;
};

export type DeliveryZoneSettings = {
  id: string;
  name: string;
  rate: number;
  estimatedMinDays: number;
  estimatedMaxDays: number;
  enabled: boolean;
};

export type PickupLocationSettings = {
  id: string;
  name: string;
  address: string;
  city: string;
  instructions: string;
  enabled: boolean;
};

export type DeliverySettings = {
  zones: DeliveryZoneSettings[];
  pickupLocations: PickupLocationSettings[];
};

export type AcceptedPaymentMethod =
  | "bank-transfer"
  | "card"
  | "cash"
  | "pos"
  | "pay-on-delivery";

export type RefundPreference =
  | "original-method"
  | "bank-transfer"
  | "store-credit";

export type PaymentSettings = {
  acceptedMethods: AcceptedPaymentMethod[];
  bankTransferInstructions: string;
  payOnDeliveryDepositPercent: number;
  refundPreference: RefundPreference;
};

export type NotificationSettings = {
  newOrders: boolean;
  expiringHolds: boolean;
  lowStock: boolean;
  paymentIssues: boolean;
  deliveryExceptions: boolean;
};

export type TeamRole = "owner" | "manager" | "operations";
export type TeamMemberStatus = "active" | "prototype-invite";

export type TeamMemberBoundary = {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  status: TeamMemberStatus;
  responsibility: string;
};

export type TeamSettings = {
  members: TeamMemberBoundary[];
};

export type StoreSettings = {
  identity: StoreIdentitySettings;
  selling: SellingPreferencesSettings;
  delivery: DeliverySettings;
  payments: PaymentSettings;
  notifications: NotificationSettings;
  team: TeamSettings;
  updatedAt: string;
};

export type SaveStoreSettingsInput = Omit<StoreSettings, "updatedAt">;

export type SettingsValidationIssue = {
  path: string;
  message: string;
  section: SettingsSection;
};

export type StoreSettingsActionErrorCode =
  | "invalid-settings"
  | "settings-not-available";

export type StoreSettingsActionError = {
  code: StoreSettingsActionErrorCode;
  message: string;
  issues?: SettingsValidationIssue[];
};

export type StoreSettingsActionSuccess = {
  settings: StoreSettings;
  message: string;
};
