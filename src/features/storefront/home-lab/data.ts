// Verbatim data + pure helpers ported from docs/storefront-v2/card-lab/storefront.html.
// The prototype's fake catalogue and hardcoded pexels imagery are kept exactly as the
// source of truth for the Phase 2-3N homepage. Do not swap these for the real catalogue.

export type Condition = "A+" | "A" | "B+";
export type Inventory = "one-of-one" | "variant" | "matching-stock";
export type Status = "available" | "reserved" | "sold";

export type Product = {
  id: string;
  name: string;
  brand: string;
  brandStatus: string;
  category: string;
  type: string;
  style: string;
  price: number;
  condition: Condition;
  size: string;
  fit: string;
  inventory: Inventory;
  stock: number;
  status: Status;
  new: boolean;
  saved: number;
  flaw: string;
  material: string;
  images: string[];
  variants?: string[];
};

// const I = (id) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1200`;
export const I = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1200`;

export const products: Product[] = [
  {
    id: "p1",
    name: "Archive Varsity Jacket",
    brand: "Archive label",
    brandStatus: "Unverified",
    category: "Men",
    type: "Jackets",
    style: "Streetwear",
    price: 48000,
    condition: "A",
    size: "L",
    fit: "M–L",
    inventory: "one-of-one",
    stock: 1,
    status: "available",
    new: true,
    saved: 86,
    flaw: "Small mark inside the left cuff",
    material: "Wool body / leather sleeves",
    images: [I(26936525), I(26964993), I(31754552), I(6069529), I(26936525)],
  },
  {
    id: "p2",
    name: "Vintage Levi’s 501 Denim",
    brand: "Levi’s",
    brandStatus: "Branded",
    category: "Men",
    type: "Denim",
    style: "Essentials",
    price: 28500,
    condition: "A",
    size: "32",
    fit: "31–32",
    inventory: "one-of-one",
    stock: 1,
    status: "available",
    new: true,
    saved: 71,
    flaw: "None",
    material: "Structured cotton denim",
    images: [I(28174872), I(33641950), I(16848923), I(6843231), I(16428734)],
  },
  {
    id: "p3",
    name: "Ralph Lauren Oxford Shirt",
    brand: "Ralph Lauren",
    brandStatus: "Branded",
    category: "Men",
    type: "Shirts",
    style: "Workwear",
    price: 24000,
    condition: "A+",
    size: "M–XL",
    fit: "M–XL",
    inventory: "variant",
    stock: 4,
    status: "available",
    new: false,
    saved: 58,
    flaw: "None",
    material: "Oxford cotton",
    images: [I(15591950), I(16809906), I(7959592), I(6069529), I(15591950)],
    variants: ["M", "L", "XL"],
  },
  {
    id: "p4",
    name: "Structured Linen Blazer",
    brand: "Unbranded",
    brandStatus: "Unbranded",
    category: "Women",
    type: "Jackets",
    style: "Workwear",
    price: 32000,
    condition: "A+",
    size: "10",
    fit: "8–10",
    inventory: "one-of-one",
    stock: 1,
    status: "available",
    new: true,
    saved: 64,
    flaw: "None",
    material: "Linen-viscose blend",
    images: [I(18173611), I(18173603), I(23531830), I(7959592), I(12951783)],
  },
  {
    id: "p5",
    name: "Retro Nigeria Football Jersey",
    brand: "Sports label",
    brandStatus: "Unverified",
    category: "Unisex",
    type: "Jerseys",
    style: "Vintage",
    price: 21500,
    condition: "B+",
    size: "XL",
    fit: "L–XL",
    inventory: "one-of-one",
    stock: 1,
    status: "available",
    new: true,
    saved: 91,
    flaw: "Minor print wear across the lower number",
    material: "Lightweight polyester",
    images: [I(31959038), I(34247821), I(15591950), I(31959038), I(31754552)],
  },
  {
    id: "p6",
    name: "Minimal Black Work Trousers",
    brand: "Unbranded",
    brandStatus: "Unbranded",
    category: "Women",
    type: "Trousers",
    style: "Workwear",
    price: 22000,
    condition: "A+",
    size: "8–14",
    fit: "8–14",
    inventory: "variant",
    stock: 7,
    status: "available",
    new: false,
    saved: 33,
    flaw: "None",
    material: "Viscose tailoring blend",
    images: [I(15470820), I(4668874), I(9947825), I(7959592), I(15470820)],
    variants: ["8", "10", "12", "14"],
  },
  {
    id: "p7",
    name: "Oversized Graphic Sports Tee",
    brand: "Champion",
    brandStatus: "Branded",
    category: "Unisex",
    type: "Shirts",
    style: "Streetwear",
    price: 16500,
    condition: "A",
    size: "L",
    fit: "M–L",
    inventory: "one-of-one",
    stock: 1,
    status: "available",
    new: true,
    saved: 78,
    flaw: "None",
    material: "Heavyweight cotton",
    images: [I(31959038), I(31754552), I(35237132), I(31959038), I(15591950)],
  },
  {
    id: "p8",
    name: "Carhartt Double-Knee Work Pant",
    brand: "Carhartt",
    brandStatus: "Branded",
    category: "Men",
    type: "Trousers",
    style: "Workwear",
    price: 39500,
    condition: "A",
    size: "34",
    fit: "33–34",
    inventory: "one-of-one",
    stock: 1,
    status: "reserved",
    new: false,
    saved: 82,
    flaw: "Light natural knee fade",
    material: "Canvas cotton",
    images: [I(29197620), I(26964993), I(31754552), I(6069529), I(29197620)],
  },
  {
    id: "p9",
    name: "Neutral Ribbed Knit Cardigan",
    brand: "Mango",
    brandStatus: "Branded",
    category: "Women",
    type: "Knitwear",
    style: "Essentials",
    price: 19500,
    condition: "A+",
    size: "S–L",
    fit: "S–L",
    inventory: "variant",
    stock: 6,
    status: "available",
    new: false,
    saved: 41,
    flaw: "None",
    material: "Soft cotton knit",
    images: [I(9947825), I(10622516), I(23531830), I(6069529), I(9947825)],
    variants: ["S", "M", "L"],
  },
  {
    id: "p10",
    name: "Classic Navy Polo Shirt",
    brand: "Lacoste",
    brandStatus: "Branded",
    category: "Men",
    type: "Shirts",
    style: "Essentials",
    price: 26000,
    condition: "A",
    size: "M",
    fit: "M",
    inventory: "matching-stock",
    stock: 3,
    status: "available",
    new: false,
    saved: 47,
    flaw: "None",
    material: "Cotton piqué",
    images: [I(15591950), I(16809906), I(29197620), I(6069529), I(15591950)],
  },
  {
    id: "p11",
    name: "Light-Wash Denim Skirt",
    brand: "Designer-inspired",
    brandStatus: "Designer-inspired",
    category: "Women",
    type: "Denim",
    style: "Streetwear",
    price: 18500,
    condition: "A",
    size: "10",
    fit: "8–10",
    inventory: "one-of-one",
    stock: 1,
    status: "available",
    new: true,
    saved: 55,
    flaw: "Intentional distressed hem",
    material: "Washed cotton denim",
    images: [I(17160301), I(28174872), I(33641950), I(6843231), I(16428734)],
  },
  {
    id: "p12",
    name: "Vintage Adidas Track Jacket",
    brand: "Adidas",
    brandStatus: "Branded",
    category: "Unisex",
    type: "Jackets",
    style: "Vintage",
    price: 30000,
    condition: "A",
    size: "M",
    fit: "S–M",
    inventory: "one-of-one",
    stock: 1,
    status: "sold",
    new: false,
    saved: 102,
    flaw: "Light cuff wear",
    material: "Polyester tricot",
    images: [I(34247821), I(37260580), I(31959038), I(6069529), I(34247821)],
  },
  {
    id: "p13",
    name: "Relaxed Stone Cargo Trousers",
    brand: "Pull&Bear",
    brandStatus: "Branded",
    category: "Unisex",
    type: "Trousers",
    style: "Streetwear",
    price: 23500,
    condition: "A+",
    size: "S–XL",
    fit: "S–XL",
    inventory: "variant",
    stock: 9,
    status: "available",
    new: true,
    saved: 62,
    flaw: "None",
    material: "Cotton twill",
    images: [I(26964993), I(31754552), I(29197620), I(6069529), I(26964993)],
    variants: ["S", "M", "L", "XL"],
  },
  {
    id: "p14",
    name: "Silk-Feel Printed Midi Dress",
    brand: "Boutique label",
    brandStatus: "Unverified",
    category: "Women",
    type: "Dresses",
    style: "Statement",
    price: 27500,
    condition: "A",
    size: "12",
    fit: "10–12",
    inventory: "one-of-one",
    stock: 1,
    status: "available",
    new: false,
    saved: 37,
    flaw: "Tiny repaired inner seam",
    material: "Printed viscose",
    images: [I(15470820), I(6902997), I(9947825), I(6069529), I(15470820)],
  },
  {
    id: "p15",
    name: "Heavyweight Premium Tee",
    brand: "Unbranded",
    brandStatus: "Unbranded",
    category: "Unisex",
    type: "Shirts",
    style: "Essentials",
    price: 14500,
    condition: "A+",
    size: "S–XXL",
    fit: "S–XXL",
    inventory: "matching-stock",
    stock: 12,
    status: "available",
    new: false,
    saved: 29,
    flaw: "None",
    material: "Heavyweight cotton",
    images: [I(31959038), I(31754552), I(15591950), I(6069529), I(31959038)],
  },
  {
    id: "p16",
    name: "Vintage Leather Harrington",
    brand: "Archive label",
    brandStatus: "Unverified",
    category: "Men",
    type: "Jackets",
    style: "Vintage",
    price: 56000,
    condition: "B+",
    size: "M",
    fit: "S–M",
    inventory: "one-of-one",
    stock: 1,
    status: "available",
    new: true,
    saved: 95,
    flaw: "Natural surface creasing and a small lining repair",
    material: "Genuine leather",
    images: [I(26936525), I(34247821), I(31754552), I(6069529), I(26936525)],
  },
  {
    id: "p17",
    name: "Structured Crossbody Bag",
    brand: "Unbranded",
    brandStatus: "Unbranded",
    category: "Accessories",
    type: "Accessories",
    style: "Essentials",
    price: 18000,
    condition: "A+",
    size: "One size",
    fit: "One size",
    inventory: "matching-stock",
    stock: 5,
    status: "available",
    new: true,
    saved: 44,
    flaw: "None",
    material: "Textured faux leather",
    images: [I(6902997), I(15470820), I(5405644), I(6069529), I(6902997)],
  },
  {
    id: "p18",
    name: "Retro Baseball Cap",
    brand: "Sports label",
    brandStatus: "Unverified",
    category: "Accessories",
    type: "Accessories",
    style: "Vintage",
    price: 12000,
    condition: "A",
    size: "Adjustable",
    fit: "Adjustable",
    inventory: "one-of-one",
    stock: 1,
    status: "available",
    new: false,
    saved: 31,
    flaw: "Light brim fade",
    material: "Cotton twill",
    images: [I(6902997), I(15470820), I(5405644), I(6069529), I(6902997)],
  },
];

export const money = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 })
    .format(n)
    .replace("NGN", "₦");

export const inventoryLabel = (v: Inventory) =>
  v === "one-of-one" ? "One of one" : v === "variant" ? "Variants" : "Multiple units";

export const productById = (id: string) => products.find((p) => p.id === id);

// Stable public slug derived from the product name (the prototype data has no slug field).
export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
export const productSlug = (p: Product) => slugify(p.name);
export const productBySlug = (slug: string) => products.find((p) => productSlug(p) === slug);
export const relatedProducts = (p: Product, n = 4) =>
  products
    .filter((x) => x.id !== p.id && (x.category === p.category || x.type === p.type))
    .slice(0, n);

// Homepage "Shop by category" tiles — verbatim from renderHome().
export const homeCategories: [string, string, number][] = [
  ["Jackets", I(26936525), 5],
  ["Denim", I(28174872), 3],
  ["Shirts", I(31959038), 5],
  ["Dresses", I(15470820), 3],
  ["Trousers", I(26964993), 4],
  ["Accessories", I(6902997), 4],
];

export const filterCategories = [
  "Women",
  "Men",
  "Unisex",
  "Accessories",
  "Jackets",
  "Denim",
  "Shirts",
  "Trousers",
  "Dresses",
];

export const sortOptions: [string, string][] = [
  ["curated", "Curated"],
  ["newest", "Newest"],
  ["price-low", "Price: low to high"],
  ["price-high", "Price: high to low"],
  ["condition", "Best condition"],
  ["one", "One-of-one first"],
  ["saved", "Most saved"],
];

export const measurementsCm: Record<string, number> = {
  Chest: 112,
  Waist: 108,
  Length: 68,
  "Sleeve length": 62,
  "Shoulder width": 48,
};

export type ShopState = {
  category: string;
  collection: string | null;
  conditions: Set<string>;
  inventories: Set<string>;
  inStock: boolean;
  maxPrice: number | null;
  search: string;
  sort: string;
};

export function collectionTitle(state: Pick<ShopState, "category" | "collection">) {
  if (state.category !== "All")
    return {
      title: state.category,
      em: "collection",
      description: `Curated ${state.category.toLowerCase()} pieces across new arrivals, essentials and one-of-one finds.`,
    };
  const map: Record<string, { title: string; em: string; description: string }> = {
    new: {
      title: "New",
      em: "arrivals",
      description: "The latest pieces added to the Laitstyles rack.",
    },
    "one-of-one": {
      title: "One-of-one",
      em: "edit",
      description: "Exact-item pieces with no planned restock.",
    },
    "under-25": {
      title: "Under",
      em: "₦25,000",
      description: "Strong wardrobe options at a more accessible price point.",
    },
    "grade-a-plus": {
      title: "Grade A+",
      em: "essentials",
      description: "Like-new pieces selected for frequent rotation.",
    },
    vintage: {
      title: "Vintage",
      em: "sportswear",
      description: "Archive jackets, jerseys and streetwear with distinctive character.",
    },
  };
  return (
    (state.collection && map[state.collection]) || {
      title: "Shop",
      em: "all pieces",
      description:
        "Browse the complete Laitstyles catalogue. Use filters here when you know exactly what you are looking for.",
    }
  );
}

export function filteredProducts(state: ShopState) {
  let list = [...products];
  if (state.category !== "All")
    list = list.filter((p) => p.category === state.category || p.type === state.category);
  if (state.collection === "new") list = list.filter((p) => p.new);
  if (state.collection === "one-of-one") list = list.filter((p) => p.inventory === "one-of-one");
  if (state.collection === "under-25") list = list.filter((p) => p.price < 25000);
  if (state.collection === "grade-a-plus") list = list.filter((p) => p.condition === "A+");
  if (state.collection === "vintage") list = list.filter((p) => p.style === "Vintage");
  if (state.conditions.size) list = list.filter((p) => state.conditions.has(p.condition));
  if (state.inventories.size) list = list.filter((p) => state.inventories.has(p.inventory));
  if (state.inStock) list = list.filter((p) => p.status === "available");
  if (state.maxPrice) list = list.filter((p) => p.price <= (state.maxPrice as number));
  if (state.search) {
    const q = state.search.toLowerCase();
    list = list.filter((p) =>
      [p.name, p.brand, p.category, p.type, p.style, p.condition]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }
  const rank: Record<string, number> = { "A+": 0, A: 1, "B+": 2 };
  if (state.sort === "newest") list.sort((a, b) => Number(b.new) - Number(a.new));
  if (state.sort === "price-low") list.sort((a, b) => a.price - b.price);
  if (state.sort === "price-high") list.sort((a, b) => b.price - a.price);
  if (state.sort === "condition") list.sort((a, b) => rank[a.condition] - rank[b.condition]);
  if (state.sort === "one")
    list.sort(
      (a, b) => Number(b.inventory === "one-of-one") - Number(a.inventory === "one-of-one"),
    );
  if (state.sort === "saved") list.sort((a, b) => b.saved - a.saved);
  return list;
}
