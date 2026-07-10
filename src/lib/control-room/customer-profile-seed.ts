import type { ControlRoomCustomer } from "@/lib/control-room/customer-types";

const customerProfileSeed = {
  "customer-amara": {
    type: "individual",
    createdAt: "2026-05-18T09:30:00+01:00",
    addresses: [
      {
        id: "address-amara-home",
        label: "Home",
        line1: "14 Allen Avenue",
        line2: "Apartment 3B",
        city: "Ikeja",
        state: "Lagos",
        country: "Nigeria",
        isDefault: true,
        deliveryNotes: "Call at the gate before dispatch handoff.",
      },
    ],
    preferences: {
      contact: "whatsapp",
      sizes: ["M"],
      colours: ["Indigo", "Cream"],
      deliveryNotes: "Prefers weekday delivery before 6 PM.",
    },
    savedProductIds: ["nature-utility-vest", "soft-beige-knit"],
    notes: [
      {
        id: "note-amara-1",
        body: "Usually checks measurements before confirming denim purchases.",
        createdAt: "2026-07-07T12:10:00+01:00",
        author: "Store owner",
      },
    ],
  },
  "customer-tomi": {
    type: "stylist",
    createdAt: "2026-06-02T14:20:00+01:00",
    addresses: [
      {
        id: "address-tomi-studio",
        label: "Studio",
        line1: "8 Admiralty Way",
        line2: "Second floor",
        city: "Lekki",
        state: "Lagos",
        country: "Nigeria",
        isDefault: true,
        deliveryNotes: "Reception accepts parcels from 9 AM to 5 PM.",
      },
    ],
    preferences: {
      contact: "phone",
      sizes: ["S", "M"],
      colours: ["Cream", "Sage"],
      deliveryNotes: "May request same-day pickup for styling jobs.",
    },
    savedProductIds: ["botanical-jeans"],
    notes: [],
  },
  "customer-nneka": {
    type: "individual",
    createdAt: "2026-05-27T08:45:00+01:00",
    addresses: [
      {
        id: "address-nneka-home",
        label: "Home",
        line1: "22 Independence Layout",
        line2: "",
        city: "Enugu",
        state: "Enugu",
        country: "Nigeria",
        isDefault: true,
        deliveryNotes: "Confirm delivery day by phone.",
      },
    ],
    preferences: {
      contact: "email",
      sizes: ["S"],
      colours: ["Cream", "Khaki"],
      deliveryNotes: "Avoid Sunday delivery.",
    },
    savedProductIds: ["canvas-carry-tote"],
    notes: [
      {
        id: "note-nneka-1",
        body: "Delivery updates should include a clear waybill reference.",
        createdAt: "2026-07-08T17:20:00+01:00",
        author: "Store owner",
      },
    ],
  },
  "customer-musa": {
    type: "reseller",
    createdAt: "2026-06-10T10:05:00+01:00",
    addresses: [],
    preferences: {
      contact: "whatsapp",
      sizes: ["M", "L"],
      colours: ["Indigo", "Olive"],
      deliveryNotes: "Usually completes purchases in store.",
    },
    savedProductIds: [],
    notes: [],
  },
} satisfies Record<string, Partial<ControlRoomCustomer>>;

export function hydrateCustomerProfiles(
  customers: ControlRoomCustomer[],
): ControlRoomCustomer[] {
  return customers.map((customer) => {
    const profile = customerProfileSeed[customer.id];
    if (!profile) {
      return {
        ...customer,
        type: customer.type ?? "individual",
        addresses: customer.addresses ?? [],
        savedProductIds: customer.savedProductIds ?? [],
        notes: customer.notes ?? [],
      };
    }

    return {
      ...customer,
      ...profile,
      addresses: profile.addresses ?? customer.addresses ?? [],
      savedProductIds: profile.savedProductIds ?? customer.savedProductIds ?? [],
      notes: profile.notes ?? customer.notes ?? [],
    };
  });
}