import type { InventoryMode } from "@/modules/products/types";

export type SettingsSection = "identity" | "selling" | "delivery" | "payments" | "notifications";
export type StoreBrandLogo = {
  publicId: string;
  url: string;
  width: number | null;
  height: number | null;
  format: string | null;
  bytes: number | null;
};
export type StoreIdentitySettings = {
  storeName: string;
  description: string;
  contactEmail: string;
  contactPhone: string;
  whatsappNumber: string;
  instagramHandle: string;
  websiteUrl: string;
  logo: StoreBrandLogo | null;
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
export type AcceptedPaymentMethod = "bank-transfer" | "card" | "cash" | "pos" | "pay-on-delivery";
export type RefundPreference = "original-method" | "bank-transfer" | "store-credit";
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
export type StoreSettings = {
  identity: StoreIdentitySettings;
  selling: SellingPreferencesSettings;
  delivery: DeliverySettings;
  payments: PaymentSettings;
  notifications: NotificationSettings;
  updatedAt: string;
};
export type SaveStoreSettingsInput = Omit<StoreSettings, "updatedAt">;
export type SettingsValidationIssue = {
  path: string;
  message: string;
  section: SettingsSection;
};
export type StoreSettingsActionErrorCode = "invalid-settings" | "settings-not-available";
export type StoreSettingsActionError = {
  code: StoreSettingsActionErrorCode;
  message: string;
  issues?: SettingsValidationIssue[];
};
export type StoreSettingsActionSuccess = {
  settings: StoreSettings;
  message: string;
};
