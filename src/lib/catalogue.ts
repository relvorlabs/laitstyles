import type { Product as StorefrontProduct } from "@/features/storefront/shared/catalogue-data";

export type ProductState = "available" | "lastone" | "resYou" | "resOthers" | "sold";

export type Product = {
  id: string;
  name: string;
  category: string;
  size: string;
  color: string;
  condition: string;
  price: number;
  original: number;
  state: ProductState;
  image: string;
  minutes?: number;
  secondsLeft?: number;
  dropped?: number;
};

export type PlpProduct = Product & {
  brand: string;
  era: string;
  rank: number;
};

const stateFor = (product: StorefrontProduct): ProductState => {
  if (product.status === "sold") return "sold";
  if (product.status === "reserved") return "resOthers";
  if (product.inventory === "one-of-one" || product.stock === 1) return "lastone";
  return "available";
};

/** Compatibility projection for the legacy ShopProvider. */
export function projectLegacyCatalogue(products: readonly StorefrontProduct[]): PlpProduct[] {
  return products.map((product, rank) => ({
    id: product.id,
    rank,
    name: product.name,
    category: product.type,
    size: product.size,
    color: product.colour,
    condition:
      product.condition === "A+" ? "Excellent" : product.condition === "B+" ? "Fair" : "Good",
    price: product.price,
    original: product.referencePrice ?? product.price,
    state: stateFor(product),
    brand: product.brand,
    era: product.style,
    image: product.images[0] ?? "",
  }));
}

const nairaFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

const driveImage = (id: string) => `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;

/** Editorial content is not product data and remains a separate static content projection. */
export const journal = [
  {
    kicker: "Guide",
    title: "How we grade a one-of-one piece",
    image: driveImage("1TRkBEXRzM9TkK7UhzAqcywy5sgfbQoAQ"),
  },
  {
    kicker: "Impact",
    title: "What a second life saves from landfill",
    image: driveImage("1FYSps6nje3Gn5C5XBpyl5cQKJZsgRvLt"),
  },
  {
    kicker: "Styling",
    title: "Building a wardrobe from single pieces",
    image: driveImage("1Whs0BvRIrBvfknH6jG7MB81szJsAY19o"),
  },
];

export function canonicalProductId(id: string) {
  return id;
}

export function canonicalizeProduct(catalogue: readonly Product[], product: Product): Product {
  const match = catalogue.find((item) => item.id === product.id);
  if (!match) return product;
  return {
    ...match,
    state: product.state,
    minutes: product.minutes,
    secondsLeft: product.secondsLeft,
    dropped: product.dropped,
  };
}

export function naira(value: number) {
  return nairaFormatter.format(value);
}
