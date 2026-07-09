export type ControlRoomSection =
  | "overview"
  | "inventory"
  | "intake"
  | "orders"
  | "holds"
  | "offline"
  | "customers"
  | "settings";

export type StockMode = "unique" | "stocked";
export type InventoryStatus = "live" | "draft" | "archived";
export type IntakeStage = "captured" | "grading" | "ready";
export type OrderStatus =
  | "new"
  | "paid"
  | "packing"
  | "dispatched"
  | "delivered"
  | "cancelled";
export type PaymentStatus = "paid" | "pending" | "deposit" | "failed";
export type SaleChannel = "Website" | "WhatsApp" | "Instagram" | "Walk-in" | "Pop-up";

export type InventoryVariant = {
  id: string;
  size: string;
  color: string;
  sku: string;
  onHand: number;
  held: number;
  sold: number;
  reorderAt: number;
};

export type InventoryStyle = {
  id: string;
  name: string;
  category: string;
  collection: string;
  stockMode: StockMode;
  cover: string;
  images: string[];
  price: number;
  cost: number;
  status: InventoryStatus;
  published: boolean;
  condition: string;
  description: string;
  variants: InventoryVariant[];
  createdAt: string;
  updatedAt: string;
};

export type IntakeItem = {
  id: string;
  name: string;
  category: string;
  cover: string;
  photos: number;
  stage: IntakeStage;
  owner: string;
  missing: string[];
  receivedAt: string;
  stockMode: StockMode;
  expectedUnits: number;
};

export type ControlRoomOrder = {
  id: string;
  customerId: string;
  customer: string;
  email: string;
  styleId: string;
  variantId: string;
  quantity: number;
  amount: number;
  status: OrderStatus;
  payment: PaymentStatus;
  channel: SaleChannel;
  delivery: string;
  placedAt: string;
  note: string;
};

export type ControlRoomHold = {
  id: string;
  styleId: string;
  variantId: string;
  customerId: string;
  customer: string;
  quantity: number;
  channel: string;
  secondsLeft: number;
  startedAt: string;
};

export type CustomerReview = {
  id: string;
  rating: number;
  text: string;
  createdAt: string;
};

export type ControlRoomCustomer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  joinedAt: string;
  lastSeen: string;
  totalSpent: number;
  orderCount: number;
  deliveredCount: number;
  cancelledCount: number;
  averagePaymentTime: string;
  deliverySuccess: number;
  reviews: CustomerReview[];
  tags: string[];
};

export type OfflineSale = {
  id: string;
  styleId: string;
  variantId: string;
  styleName: string;
  quantity: number;
  amount: number;
  channel: SaleChannel;
  buyer: string;
  paymentMethod: string;
  soldAt: string;
};

export type NewStyleDraft = {
  name: string;
  category: string;
  collection: string;
  stockMode: StockMode;
  price: number;
  cost: number;
  condition: string;
  description: string;
  cover: string;
  images: string[];
  publishNow: boolean;
  variants: Array<{
    size: string;
    color: string;
    quantity: number;
    sku: string;
    reorderAt: number;
  }>;
};

const drive = (id: string) =>
  `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;

export const controlRoomSections: Array<{
  key: ControlRoomSection;
  label: string;
  group: "Today" | "Commerce" | "Relationships" | "Business";
  description: string;
}> = [
  {
    key: "overview",
    label: "Overview",
    group: "Today",
    description: "What changed, what needs attention and what is selling.",
  },
  {
    key: "intake",
    label: "Intake",
    group: "Today",
    description: "Unfinished arrivals waiting for photos, grading or pricing.",
  },
  {
    key: "inventory",
    label: "Inventory",
    group: "Commerce",
    description: "Styles, variants, stock, media, prices and publication.",
  },
  {
    key: "orders",
    label: "Orders",
    group: "Commerce",
    description: "Payments, packing, dispatch and delivery exceptions.",
  },
  {
    key: "holds",
    label: "Holds",
    group: "Commerce",
    description: "Time-sensitive reservations that affect available stock.",
  },
  {
    key: "offline",
    label: "Offline sales",
    group: "Commerce",
    description: "Record walk-in, WhatsApp, Instagram and pop-up sales.",
  },
  {
    key: "customers",
    label: "Customers",
    group: "Relationships",
    description: "Profiles, orders, delivery history, payments and reviews.",
  },
  {
    key: "settings",
    label: "Settings",
    group: "Business",
    description: "Store rules, delivery, payments, notifications and team.",
  },
];

export const inventorySeed: InventoryStyle[] = [
  {
    id: "botanical-jean",
    name: "Botanical Utility Jean",
    category: "Denim",
    collection: "Botanical Workwear",
    stockMode: "stocked",
    cover: drive("1mJxRFNyGo2xXT89oLeiuAGZtSvRlw0Jf"),
    images: [
      drive("1mJxRFNyGo2xXT89oLeiuAGZtSvRlw0Jf"),
      drive("1Q8ra1vjG-2D3bDbXvYRUvQeriv-tJbb5"),
      drive("1RqpHTso4SMuUlc8gBEsWZp4v1eRjE1uH"),
    ],
    price: 32000,
    cost: 14500,
    status: "live",
    published: true,
    condition: "New old stock",
    description:
      "Botanical denim with a relaxed utility cut. Managed as a stocked style across four size variants.",
    variants: [
      { id: "botanical-s", size: "S", color: "Indigo botanical", sku: "BJ-S-IND", onHand: 8, held: 1, sold: 4, reorderAt: 4 },
      { id: "botanical-m", size: "M", color: "Indigo botanical", sku: "BJ-M-IND", onHand: 12, held: 1, sold: 8, reorderAt: 5 },
      { id: "botanical-l", size: "L", color: "Indigo botanical", sku: "BJ-L-IND", onHand: 9, held: 1, sold: 6, reorderAt: 4 },
      { id: "botanical-xl", size: "XL", color: "Indigo botanical", sku: "BJ-XL-IND", onHand: 3, held: 0, sold: 0, reorderAt: 3 },
    ],
    createdAt: "18 Jun 2026",
    updatedAt: "Today, 11:08",
  },
  {
    id: "sage-field-vest",
    name: "Sage Field Vest",
    category: "Jackets",
    collection: "Field Notes",
    stockMode: "unique",
    cover: drive("1T0XygfKzp92Id6ch09aTFcUyG8PbIG66"),
    images: [drive("1T0XygfKzp92Id6ch09aTFcUyG8PbIG66")],
    price: 28000,
    cost: 12000,
    status: "live",
    published: true,
    condition: "Excellent",
    description: "One-of-one utility vest with a soft sage wash.",
    variants: [
      { id: "sage-m", size: "M", color: "Sage", sku: "SFV-001", onHand: 1, held: 1, sold: 0, reorderAt: 0 },
    ],
    createdAt: "01 Jul 2026",
    updatedAt: "Today, 10:42",
  },
  {
    id: "linen-camp-shirt",
    name: "Linen Camp Shirt",
    category: "Shirts",
    collection: "Soft Structure",
    stockMode: "stocked",
    cover: drive("1wyWEgY5Wazc7-chGSdz5IjlpvKAzXL80"),
    images: [drive("1wyWEgY5Wazc7-chGSdz5IjlpvKAzXL80")],
    price: 18500,
    cost: 7800,
    status: "live",
    published: true,
    condition: "Excellent",
    description: "Lightweight camp shirt offered in cream and sand.",
    variants: [
      { id: "linen-m-cream", size: "M", color: "Cream", sku: "LCS-M-CRM", onHand: 7, held: 0, sold: 5, reorderAt: 3 },
      { id: "linen-l-cream", size: "L", color: "Cream", sku: "LCS-L-CRM", onHand: 4, held: 1, sold: 4, reorderAt: 3 },
      { id: "linen-l-sand", size: "L", color: "Sand", sku: "LCS-L-SND", onHand: 2, held: 0, sold: 2, reorderAt: 2 },
    ],
    createdAt: "22 Jun 2026",
    updatedAt: "Yesterday",
  },
  {
    id: "canvas-carry-tote",
    name: "Canvas Carry Tote",
    category: "Accessories",
    collection: "Daily Carry",
    stockMode: "stocked",
    cover: drive("1wcW3Loif83NNUqILRSsQKU0RgrIyENGA"),
    images: [drive("1wcW3Loif83NNUqILRSsQKU0RgrIyENGA")],
    price: 15000,
    cost: 6500,
    status: "live",
    published: true,
    condition: "Excellent",
    description: "Structured everyday canvas tote with reinforced handles.",
    variants: [
      { id: "tote-khaki", size: "OS", color: "Khaki", sku: "CCT-KHK", onHand: 8, held: 0, sold: 6, reorderAt: 4 },
      { id: "tote-forest", size: "OS", color: "Forest", sku: "CCT-FOR", onHand: 4, held: 0, sold: 2, reorderAt: 3 },
    ],
    createdAt: "12 Jun 2026",
    updatedAt: "Yesterday",
  },
  {
    id: "daisy-field-dress",
    name: "Daisy Field Dress",
    category: "Dresses",
    collection: "Found Florals",
    stockMode: "unique",
    cover: drive("1dXXWxCEEg6ezYPsRCK6B1XxD5QpAiZfh"),
    images: [drive("1dXXWxCEEg6ezYPsRCK6B1XxD5QpAiZfh")],
    price: 26000,
    cost: 11000,
    status: "live",
    published: true,
    condition: "Excellent",
    description: "A one-of-one floral dress with a softly structured waist.",
    variants: [
      { id: "daisy-s", size: "S", color: "Ivory floral", sku: "DFD-001", onHand: 0, held: 0, sold: 1, reorderAt: 0 },
    ],
    createdAt: "29 Jun 2026",
    updatedAt: "Yesterday, 17:03",
  },
  {
    id: "moss-street-hoodie",
    name: "Moss Street Hoodie",
    category: "Knitwear",
    collection: "After Hours",
    stockMode: "unique",
    cover: drive("1s0FXAMt3A8H79hGm_6pwZrlcSi3klXC6"),
    images: [drive("1s0FXAMt3A8H79hGm_6pwZrlcSi3klXC6")],
    price: 21000,
    cost: 8500,
    status: "draft",
    published: false,
    condition: "Good",
    description: "Heavyweight moss hoodie awaiting final measurements.",
    variants: [
      { id: "moss-m", size: "M", color: "Moss", sku: "MSH-001", onHand: 1, held: 0, sold: 0, reorderAt: 0 },
    ],
    createdAt: "08 Jul 2026",
    updatedAt: "28 min ago",
  },
  {
    id: "washed-denim-overshirt",
    name: "Washed Denim Overshirt",
    category: "Denim",
    collection: "Reworked Denim",
    stockMode: "unique",
    cover: drive("1Q8ra1vjG-2D3bDbXvYRUvQeriv-tJbb5"),
    images: [drive("1Q8ra1vjG-2D3bDbXvYRUvQeriv-tJbb5")],
    price: 19000,
    cost: 7400,
    status: "archived",
    published: true,
    condition: "Excellent",
    description: "Sold one-of-one denim overshirt retained in the archive.",
    variants: [
      { id: "denim-m", size: "M", color: "Indigo", sku: "WDO-001", onHand: 0, held: 0, sold: 1, reorderAt: 0 },
    ],
    createdAt: "20 Jun 2026",
    updatedAt: "03 Jul 2026",
  },
];

export const intakeSeed: IntakeItem[] = [
  {
    id: "intake-wrap-skirt",
    name: "Ivory linen wrap skirt",
    category: "Skirts",
    cover: drive("1FVxsSzsHCh4tKe5VMLKO0O25UyGk0DZJ"),
    photos: 4,
    stage: "grading",
    owner: "Teni",
    missing: ["waist measurement", "flaw close-up"],
    receivedAt: "Today, 09:14",
    stockMode: "unique",
    expectedUnits: 1,
  },
  {
    id: "intake-blazer",
    name: "Charcoal cropped blazer",
    category: "Blazers",
    cover: drive("1a_gBKr983vl3VEPy5mT-oC6M4kMmiipy"),
    photos: 6,
    stage: "ready",
    owner: "Moyo",
    missing: ["selling price"],
    receivedAt: "Yesterday, 15:37",
    stockMode: "unique",
    expectedUnits: 1,
  },
  {
    id: "intake-polo-drop",
    name: "Ribbed polo mini-drop",
    category: "Tees",
    cover: drive("1yKF2UM6-vHyrC_8zL2FzIWy91SnBrEaE"),
    photos: 2,
    stage: "captured",
    owner: "Unassigned",
    missing: ["variant count", "sizes", "pricing", "condition"],
    receivedAt: "Today, 11:23",
    stockMode: "stocked",
    expectedUnits: 18,
  },
];

export const customerSeed: ControlRoomCustomer[] = [
  {
    id: "cus-amara",
    name: "Amara Okafor",
    email: "amara@example.com",
    phone: "+234 801 234 5678",
    city: "Ikeja, Lagos",
    joinedAt: "14 Feb 2026",
    lastSeen: "12 min ago",
    totalSpent: 184000,
    orderCount: 6,
    deliveredCount: 5,
    cancelledCount: 0,
    averagePaymentTime: "4 min",
    deliverySuccess: 100,
    tags: ["Repeat buyer", "Denim", "WhatsApp updates"],
    reviews: [
      { id: "review-amara-1", rating: 5, text: "Exactly as photographed and the fit notes were accurate.", createdAt: "18 Jun 2026" },
    ],
  },
  {
    id: "cus-tomi",
    name: "Tomi Adeyemi",
    email: "tomi@example.com",
    phone: "+234 803 112 4455",
    city: "Lekki, Lagos",
    joinedAt: "03 Apr 2026",
    lastSeen: "24 min ago",
    totalSpent: 91000,
    orderCount: 3,
    deliveredCount: 2,
    cancelledCount: 0,
    averagePaymentTime: "11 min",
    deliverySuccess: 100,
    tags: ["Pay on delivery", "Outerwear"],
    reviews: [
      { id: "review-tomi-1", rating: 4, text: "Delivery was smooth. Packaging could be more compact.", createdAt: "02 Jul 2026" },
    ],
  },
  {
    id: "cus-nneka",
    name: "Nneka Obi",
    email: "nneka@example.com",
    phone: "+234 809 881 4021",
    city: "Enugu",
    joinedAt: "29 Jan 2026",
    lastSeen: "Yesterday",
    totalSpent: 147500,
    orderCount: 5,
    deliveredCount: 4,
    cancelledCount: 1,
    averagePaymentTime: "2 min",
    deliverySuccess: 80,
    tags: ["Interstate", "Dresses"],
    reviews: [],
  },
  {
    id: "cus-musa",
    name: "Musa Bello",
    email: "musa@example.com",
    phone: "+234 806 557 3310",
    city: "Abuja",
    joinedAt: "11 May 2026",
    lastSeen: "28 Jun",
    totalSpent: 51000,
    orderCount: 2,
    deliveredCount: 2,
    cancelledCount: 0,
    averagePaymentTime: "7 min",
    deliverySuccess: 100,
    tags: ["Menswear", "Transfer"],
    reviews: [],
  },
];

export const orderSeed: ControlRoomOrder[] = [
  {
    id: "LS-20514",
    customerId: "cus-amara",
    customer: "Amara Okafor",
    email: "amara@example.com",
    styleId: "botanical-jean",
    variantId: "botanical-m",
    quantity: 1,
    amount: 32000,
    status: "packing",
    payment: "paid",
    channel: "Website",
    delivery: "Ikeja, Lagos",
    placedAt: "Today, 10:42",
    note: "Customer prefers WhatsApp delivery updates.",
  },
  {
    id: "LS-20509",
    customerId: "cus-tomi",
    customer: "Tomi Adeyemi",
    email: "tomi@example.com",
    styleId: "sage-field-vest",
    variantId: "sage-m",
    quantity: 1,
    amount: 28000,
    status: "paid",
    payment: "deposit",
    channel: "Website",
    delivery: "Lekki, Lagos",
    placedAt: "Today, 09:18",
    note: "Pay-on-delivery balance due to courier.",
  },
  {
    id: "LS-20488",
    customerId: "cus-nneka",
    customer: "Nneka Obi",
    email: "nneka@example.com",
    styleId: "daisy-field-dress",
    variantId: "daisy-s",
    quantity: 1,
    amount: 26000,
    status: "dispatched",
    payment: "paid",
    channel: "Website",
    delivery: "Enugu",
    placedAt: "Yesterday, 17:03",
    note: "Waybill sent by WhatsApp.",
  },
  {
    id: "LS-20411",
    customerId: "cus-musa",
    customer: "Musa Bello",
    email: "musa@example.com",
    styleId: "washed-denim-overshirt",
    variantId: "denim-m",
    quantity: 1,
    amount: 19000,
    status: "delivered",
    payment: "paid",
    channel: "Website",
    delivery: "Abuja",
    placedAt: "28 Jun, 15:45",
    note: "Delivered successfully.",
  },
];

export const holdSeed: ControlRoomHold[] = [
  {
    id: "hold-botanical",
    styleId: "botanical-jean",
    variantId: "botanical-m",
    customerId: "cus-amara",
    customer: "Amara Okafor",
    quantity: 1,
    channel: "Checkout",
    secondsLeft: 812,
    startedAt: "10:42",
  },
  {
    id: "hold-sage",
    styleId: "sage-field-vest",
    variantId: "sage-m",
    customerId: "cus-tomi",
    customer: "Tomi Adeyemi",
    quantity: 1,
    channel: "Cart",
    secondsLeft: 537,
    startedAt: "09:18",
  },
  {
    id: "hold-linen",
    styleId: "linen-camp-shirt",
    variantId: "linen-l-cream",
    customerId: "guest",
    customer: "Guest shopper",
    quantity: 1,
    channel: "Product page",
    secondsLeft: 384,
    startedAt: "11:04",
  },
];

export const offlineSalesSeed: OfflineSale[] = [
  {
    id: "OFF-104",
    styleId: "canvas-carry-tote",
    variantId: "tote-khaki",
    styleName: "Canvas Carry Tote",
    quantity: 1,
    amount: 14500,
    channel: "WhatsApp",
    buyer: "Dara A.",
    paymentMethod: "Transfer",
    soldAt: "Today, 08:31",
  },
  {
    id: "OFF-103",
    styleId: "linen-camp-shirt",
    variantId: "linen-m-cream",
    styleName: "Linen Camp Shirt",
    quantity: 2,
    amount: 35000,
    channel: "Pop-up",
    buyer: "Walk-in customer",
    paymentMethod: "POS",
    soldAt: "Yesterday, 18:12",
  },
];

export function inventoryTotals(style: InventoryStyle) {
  const onHand = style.variants.reduce((sum, variant) => sum + variant.onHand, 0);
  const held = style.variants.reduce((sum, variant) => sum + variant.held, 0);
  const sold = style.variants.reduce((sum, variant) => sum + variant.sold, 0);
  const available = Math.max(0, onHand - held);
  const received = onHand + sold;
  const sellThrough = received ? Math.round((sold / received) * 100) : 0;
  const lowStock = style.variants.filter(
    (variant) => variant.reorderAt > 0 && variant.onHand - variant.held <= variant.reorderAt,
  ).length;

  return { onHand, held, sold, available, received, sellThrough, lowStock };
}

export function inventoryValue(styles: InventoryStyle[]) {
  return styles.reduce((sum, style) => {
    const { onHand } = inventoryTotals(style);
    return sum + onHand * style.cost;
  }, 0);
}

export function formatControlRoomTime(seconds: number) {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

export function makeStyleFromDraft(draft: NewStyleDraft): InventoryStyle {
  const id = `${draft.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Date.now().toString().slice(-5)}`;
  const variants = draft.variants.map((variant, index) => ({
    id: `${id}-${index + 1}`,
    size: variant.size || "OS",
    color: variant.color || "Not specified",
    sku: variant.sku || `${id.toUpperCase().slice(0, 8)}-${index + 1}`,
    onHand: Math.max(0, variant.quantity),
    held: 0,
    sold: 0,
    reorderAt: draft.stockMode === "unique" ? 0 : Math.max(0, variant.reorderAt),
  }));

  return {
    id,
    name: draft.name,
    category: draft.category,
    collection: draft.collection || "Unassigned collection",
    stockMode: draft.stockMode,
    cover: draft.cover || drive("1T0XygfKzp92Id6ch09aTFcUyG8PbIG66"),
    images: draft.images.length ? draft.images : [draft.cover || drive("1T0XygfKzp92Id6ch09aTFcUyG8PbIG66")],
    price: draft.price,
    cost: draft.cost,
    status: draft.publishNow ? "live" : "draft",
    published: draft.publishNow,
    condition: draft.condition,
    description: draft.description,
    variants,
    createdAt: "Today",
    updatedAt: "Just now",
  };
}

export function defaultNewStyleDraft(): NewStyleDraft {
  return {
    name: "",
    category: "Denim",
    collection: "",
    stockMode: "unique",
    price: 0,
    cost: 0,
    condition: "Excellent",
    description: "",
    cover: "",
    images: [],
    publishNow: false,
    variants: [
      { size: "M", color: "", quantity: 1, sku: "", reorderAt: 0 },
    ],
  };
}
