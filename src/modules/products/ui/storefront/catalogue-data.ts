import type {
  StorefrontCatalogueCategory,
  StorefrontCatalogueProduct,
  StorefrontCondition,
  StorefrontInventory,
  StorefrontStatus,
} from "@/modules/products/storefront/catalogue-contract";

export type Condition = StorefrontCondition;
export type Inventory = StorefrontInventory;
export type Status = StorefrontStatus;
export type Product = StorefrontCatalogueProduct;

const moneyFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

export const money = (value: number) => moneyFormatter.format(value).replace("NGN", "₦");

export const inventoryLabel = (value: Inventory) =>
  value === "one-of-one" ? "One of one" : value === "variant" ? "Variants" : "Multiple units";

export function addToBagLabel(product: Pick<Product, "status" | "inventory" | "stock">) {
  if (product.status === "sold") return "Sold";
  if (product.status === "reserved") return "Reserved";
  if (product.inventory === "variant") return "Select size";
  if (product.inventory === "one-of-one") return "Grab it — the only one";
  if (product.stock === 1) return "Grab it — last one";
  if (product.stock <= 3) return `Add to bag · ${product.stock} left`;
  return "Add to bag";
}

export const productById = (products: readonly Product[], id: string) =>
  products.find((product) => product.id === id || product.databaseId === id);

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const productSlug = (product: Product) => product.slug;
export const productBySlug = (products: readonly Product[], slug: string) =>
  products.find((product) => product.slug === slug);
export const relatedProducts = (products: readonly Product[], product: Product, limit = 4) =>
  products
    .filter(
      (candidate) =>
        candidate.id !== product.id &&
        (candidate.category === product.category || candidate.type === product.type),
    )
    .slice(0, limit);

export function getHomeCategories(
  categories: readonly StorefrontCatalogueCategory[],
): [string, string | null, number][] {
  return categories
    .filter((category) =>
      ["Jackets", "Denim", "Shirts", "Dresses", "Trousers", "Accessories"].includes(category.name),
    )
    .map((category) => [category.name, category.imageUrl, category.productCount]);
}

export function getFilterCategories(products: readonly Product[]) {
  return [
    ...new Set([
      ...products.map((product) => product.category),
      ...products.map((product) => product.type),
    ]),
  ];
}

export const sortOptions: [string, string][] = [
  ["curated", "Curated"],
  ["newest", "Newest"],
  ["price-low", "Price: low to high"],
  ["price-high", "Price: high to low"],
  ["condition", "Best condition"],
  ["one", "One-of-one first"],
  ["saved", "Most saved"],
];

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
  if (state.category !== "All") {
    return {
      title: state.category,
      em: "collection",
      description: `Curated ${state.category.toLowerCase()} pieces across new arrivals, essentials and one-of-one finds.`,
    };
  }
  const titles: Record<string, { title: string; em: string; description: string }> = {
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
    (state.collection && titles[state.collection]) || {
      title: "Shop",
      em: "all pieces",
      description:
        "Browse the complete Laitstyles catalogue. Use filters here when you know exactly what you are looking for.",
    }
  );
}

export function filteredProducts(products: readonly Product[], state: ShopState) {
  let list = [...products];
  if (state.category !== "All") {
    list = list.filter(
      (product) => product.category === state.category || product.type === state.category,
    );
  }
  if (state.collection === "new") list = list.filter((product) => product.new);
  if (state.collection === "one-of-one") {
    list = list.filter((product) => product.inventory === "one-of-one");
  }
  if (state.collection === "under-25") list = list.filter((product) => product.price < 25000);
  if (state.collection === "grade-a-plus") {
    list = list.filter((product) => product.condition === "A+");
  }
  if (state.collection === "vintage") {
    list = list.filter((product) => product.style === "Vintage");
  }
  if (state.conditions.size) {
    list = list.filter((product) => state.conditions.has(product.condition));
  }
  if (state.inventories.size) {
    list = list.filter((product) => state.inventories.has(product.inventory));
  }
  if (state.inStock) list = list.filter((product) => product.status === "available");
  const maxPrice = state.maxPrice;
  if (maxPrice) list = list.filter((product) => product.price <= maxPrice);
  if (state.search) {
    const query = state.search.toLowerCase();
    list = list.filter((product) =>
      [
        product.name,
        product.brand,
        product.category,
        product.type,
        product.style,
        product.condition,
        product.material,
        product.colour,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }
  const conditionRank: Record<Condition, number> = { "A+": 0, A: 1, "B+": 2 };
  if (state.sort === "newest") list.sort((a, b) => Number(b.new) - Number(a.new));
  if (state.sort === "price-low") list.sort((a, b) => a.price - b.price);
  if (state.sort === "price-high") list.sort((a, b) => b.price - a.price);
  if (state.sort === "condition") {
    list.sort((a, b) => conditionRank[a.condition] - conditionRank[b.condition]);
  }
  if (state.sort === "one") {
    list.sort(
      (a, b) => Number(b.inventory === "one-of-one") - Number(a.inventory === "one-of-one"),
    );
  }
  if (state.sort === "saved") list.sort((a, b) => b.saved - a.saved);
  return list;
}
