import type {
  SaveStoreSettingsInput,
  StoreSettings,
} from "@/lib/control-room/settings-types";

export const defaultStoreSettingsInput: SaveStoreSettingsInput = {
  identity: {
    storeName: "Laitstyle",
    description:
      "A considered fashion store for one-of-one finds and small-batch wardrobe pieces.",
    contactEmail: "hello@laitstyle.example",
    contactPhone: "+234 800 000 0000",
    whatsappNumber: "+234 800 000 0000",
    instagramHandle: "@laitstyle",
    websiteUrl: "https://laitstyle.example",
    logoPreviewUrl: "/product-placeholder.svg",
  },
  selling: {
    currency: "NGN",
    holdDurationMinutes: 15,
    lowStockThreshold: 3,
    defaultProductMode: "unique",
    payOnDeliveryEnabled: false,
  },
  delivery: {
    zones: [
      {
        id: "delivery-lagos-mainland",
        name: "Lagos mainland",
        rate: 3500,
        estimatedMinDays: 1,
        estimatedMaxDays: 2,
        enabled: true,
      },
      {
        id: "delivery-lagos-island",
        name: "Lagos island",
        rate: 4500,
        estimatedMinDays: 1,
        estimatedMaxDays: 2,
        enabled: true,
      },
      {
        id: "delivery-outside-lagos",
        name: "Outside Lagos",
        rate: 6500,
        estimatedMinDays: 2,
        estimatedMaxDays: 5,
        enabled: true,
      },
    ],
    pickupLocations: [
      {
        id: "pickup-ikeja-studio",
        name: "Ikeja studio pickup",
        address: "14 Allen Avenue",
        city: "Ikeja",
        instructions: "Pickup is available after order confirmation.",
        enabled: true,
      },
    ],
  },
  payments: {
    acceptedMethods: ["bank-transfer", "card", "pos"],
    bankTransferInstructions:
      "Use the order number as the transfer reference. Payment is confirmed after the store verifies receipt.",
    payOnDeliveryDepositPercent: 30,
    refundPreference: "original-method",
  },
  notifications: {
    newOrders: true,
    expiringHolds: true,
    lowStock: true,
    paymentIssues: true,
    deliveryExceptions: true,
  },
  team: {
    members: [
      {
        id: "team-owner",
        name: "Store owner",
        email: "owner@laitstyle.example",
        role: "owner",
        status: "active",
        responsibility: "Full store oversight and final approvals.",
      },
    ],
  },
};

export function createDefaultStoreSettings(asOf: string): StoreSettings {
  return {
    ...structuredClone(defaultStoreSettingsInput),
    updatedAt: asOf,
  };
}
