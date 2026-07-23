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

const nairaFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

const driveImage = (id: string) => `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;

/** Editorial content is not product data and remains separate from the catalogue. */
export const journal = [
  {
    kicker: "Guide",
    title: "How we grade a pre-owned piece",
    image: driveImage("1TRkBEXRzM9TkK7UhzAqcywy5sgfbQoAQ"),
  },
  {
    kicker: "Impact",
    title: "What a second life saves from landfill",
    image: driveImage("1FYSps6nje3Gn5C5XBpyl5cQKJZsgRvLt"),
  },
  {
    kicker: "Styling",
    title: "Building a wardrobe from considered pieces",
    image: driveImage("1Whs0BvRIrBvfknH6jG7MB81szJsAY19o"),
  },
];

export function canonicalProductId(id: string) {
  return id;
}

export function naira(value: number) {
  return nairaFormatter.format(value);
}
