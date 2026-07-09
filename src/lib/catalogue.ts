export type ProductState =
  | "available"
  | "lastone"
  | "resYou"
  | "resOthers"
  | "sold";

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

const img = (id: string) =>
  `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;

export const feedItems: Product[] = [
  { id: "vest", name: "Sage Field Vest", category: "Jackets", size: "M", color: "Sage", condition: "Excellent", price: 28000, original: 35000, state: "resYou", secondsLeft: 878, dropped: 99, image: img("1T0XygfKzp92Id6ch09aTFcUyG8PbIG66") },
  { id: "nature", name: "Nature Utility Vest", category: "Jackets", size: "L", color: "Silver", condition: "Good", price: 31000, original: 39000, state: "available", dropped: 99, image: img("1HgIA3DQUUjqGb5ypR-rHNJCoyP2aztRn") },
  { id: "botan", name: "Botanical Print Jacket", category: "Jackets", size: "S", color: "Ivory", condition: "Excellent", price: 34000, original: 42000, state: "lastone", dropped: 99, image: img("1mJxRFNyGo2xXT89oLeiuAGZtSvRlw0Jf") },
  { id: "ivory", name: "Ivory Zip Jacket", category: "Jackets", size: "M", color: "Cream", condition: "Good", price: 29000, original: 37000, state: "resOthers", minutes: 7, dropped: 99, image: img("1PDPeY2i810fzrtHsOUIcbh569FWkkNep") },
  { id: "bloom", name: "Bloom Belted Coat", category: "Coats", size: "L", color: "Rust", condition: "Excellent", price: 45000, original: 58000, state: "sold", dropped: 99, image: img("1k3j8wbjDh_WYYrHykQo8HPGoLDuLYtpv") },
  { id: "moss", name: "Moss Street Hoodie", category: "Knitwear", size: "M", color: "Moss", condition: "Good", price: 21000, original: 27000, state: "available", dropped: 99, image: img("1s0FXAMt3A8H79hGm_6pwZrlcSi3klXC6") },
  { id: "tote", name: "Canvas Carry Tote", category: "Accessories", size: "OS", color: "Khaki", condition: "Excellent", price: 15000, original: 19000, state: "lastone", dropped: 99, image: img("1wcW3Loif83NNUqILRSsQKU0RgrIyENGA") },
  { id: "cargo", name: "Verdant Cargo Trousers", category: "Trousers", size: "L", color: "Olive", condition: "Good", price: 22000, original: 28000, state: "available", dropped: 99, image: img("1RbUrJyyoo6nkKfK6NJwdHO0zIHY2n04D") },
];

export const feedPool: Product[] = [
  { id: "pool-denim", name: "Washed Denim Overshirt", category: "Denim", size: "M", color: "Indigo", condition: "Excellent", price: 19000, original: 26000, state: "available", image: img("1Q8ra1vjG-2D3bDbXvYRUvQeriv-tJbb5") },
  { id: "pool-cord", name: "Cropped Corduroy Jacket", category: "Jackets", size: "S", color: "Camel", condition: "Good", price: 24000, original: 30000, state: "available", image: img("1L2YrWAOexraRWeEg269qX7UUyXc1J6cM") },
  { id: "pool-scarf", name: "Herringbone Wool Scarf", category: "Accessories", size: "OS", color: "Grey", condition: "Excellent", price: 9500, original: 14000, state: "available", image: img("1vo86szmFVPu66lQyADcco0QfwU3HwMt6") },
  { id: "pool-track", name: "Retro Track Top", category: "Jackets", size: "L", color: "Forest", condition: "Good", price: 17000, original: 23000, state: "available", image: img("1EUlhVe3orAMtAQIoKqz5RY4iZ4kw4N-B") },
  { id: "pool-linen", name: "Linen Camp Shirt", category: "Shirts", size: "M", color: "Sand", condition: "Excellent", price: 13500, original: 18000, state: "available", image: img("1wyWEgY5Wazc7-chGSdz5IjlpvKAzXL80") },
];

export const categories = [
  { name: "Women", count: 214, image: img("170nY2G0456We4jG4_Jm_UkFLyxLIqE20") },
  { name: "Men", count: 168, image: img("1N1-Lu1RcIufG1RAfasQf6XrBuf6U4z-Y") },
  { name: "Outerwear", count: 92, image: img("1XFqJWKZ0kDlOhPnr22oL2s9encwtq6ik") },
  { name: "Bags", count: 57, image: img("1a_gBKr983vl3VEPy5mT-oC6M4kMmiipy") },
  { name: "Accessories", count: 133, image: img("127OwSWR8AB6eyu9zzWjc_k7KW3cYa-Uw") },
];

export const reducedItems = [
  { name: "Eco Shell Jacket", price: "₦31,000", original: "₦39,000", discount: "-21%", image: img("1_2N674OlXJWHLw2a0Yh99LPNMlzQ95o_") },
  { name: "Soft Beige Knit", price: "₦18,000", original: "₦24,000", discount: "-25%", image: img("1ZrtULUSgSWrmIRSve5DAuKqspfdzS71I") },
  { name: "Cream Cotton Longsleeve", price: "₦12,500", original: "₦17,000", discount: "-26%", image: img("1iCzHDF9lrDV612Ndwi5_m03oqJ7o45NH") },
  { name: "Bloom Belted Coat", price: "₦45,000", original: "₦58,000", discount: "-22%", image: img("1BI3_38frghBjJx-x8s248hh0EOZOSan1") },
  { name: "Herringbone Scarf", price: "₦9,500", original: "₦14,000", discount: "-32%", image: img("1oClPdqgEJiM83D0we53IaNOfQGTFaP1D") },
];

export const journal = [
  { kicker: "Guide", title: "How we grade a one-of-one piece", image: img("1TRkBEXRzM9TkK7UhzAqcywy5sgfbQoAQ") },
  { kicker: "Impact", title: "What a second life saves from landfill", image: img("1FYSps6nje3Gn5C5XBpyl5cQKJZsgRvLt") },
  { kicker: "Styling", title: "Building a wardrobe from single pieces", image: img("1Whs0BvRIrBvfknH6jG7MB81szJsAY19o") },
];

export type PlpProduct = Product & {
  brand: string;
  era: string;
  rank: number;
};

export const plpItems: PlpProduct[] = [
  { id: "p0", rank: 0, name: "Botanical Print Jacket", category: "Jackets", size: "S", color: "Ivory", condition: "Excellent", price: 34000, original: 42000, state: "lastone", brand: "Bloom", era: "Vintage", image: img("1mJxRFNyGo2xXT89oLeiuAGZtSvRlw0Jf") },
  { id: "p1", rank: 1, name: "Nature Utility Vest", category: "Jackets", size: "L", color: "Olive", condition: "Good", price: 31000, original: 39000, state: "available", brand: "Field", era: "Workwear", image: img("1HgIA3DQUUjqGb5ypR-rHNJCoyP2aztRn") },
  { id: "p2", rank: 2, name: "Sage Field Vest", category: "Jackets", size: "M", color: "Sage", condition: "Excellent", price: 28000, original: 35000, state: "available", brand: "Field", era: "Minimal", image: img("1T0XygfKzp92Id6ch09aTFcUyG8PbIG66") },
  { id: "p3", rank: 3, name: "Ivory Zip Jacket", category: "Jackets", size: "M", color: "Cream", condition: "Good", price: 29000, original: 37000, state: "resOthers", minutes: 7, brand: "Aria", era: "Minimal", image: img("1PDPeY2i810fzrtHsOUIcbh569FWkkNep") },
  { id: "p4", rank: 4, name: "Washed Denim Overshirt", category: "Denim", size: "M", color: "Indigo", condition: "Excellent", price: 19000, original: 26000, state: "available", brand: "Rework", era: "Workwear", image: img("1Q8ra1vjG-2D3bDbXvYRUvQeriv-tJbb5") },
  { id: "p5", rank: 5, name: "Cropped Corduroy Jacket", category: "Jackets", size: "S", color: "Camel", condition: "Good", price: 24000, original: 30000, state: "lastone", brand: "Bloom", era: "Vintage", image: img("1L2YrWAOexraRWeEg269qX7UUyXc1J6cM") },
  { id: "p6", rank: 6, name: "Retro Track Top", category: "Jackets", size: "L", color: "Forest", condition: "Good", price: 17000, original: 23000, state: "available", brand: "Kit", era: "Y2K", image: img("1EUlhVe3orAMtAQIoKqz5RY4iZ4kw4N-B") },
  { id: "p7", rank: 7, name: "Moss Street Hoodie", category: "Knitwear", size: "M", color: "Olive", condition: "Good", price: 21000, original: 27000, state: "available", brand: "Kit", era: "Minimal", image: img("1s0FXAMt3A8H79hGm_6pwZrlcSi3klXC6") },
  { id: "p8", rank: 8, name: "Eco Shell Jacket", category: "Jackets", size: "M", color: "Grey", condition: "Excellent", price: 31000, original: 39000, state: "resYou", secondsLeft: 780, brand: "Aria", era: "Workwear", image: img("1_2N674OlXJWHLw2a0Yh99LPNMlzQ95o_") },
  { id: "p9", rank: 9, name: "Bloom Belted Coat", category: "Coats", size: "L", color: "Rust", condition: "Excellent", price: 45000, original: 58000, state: "sold", brand: "Bloom", era: "Vintage", image: img("1k3j8wbjDh_WYYrHykQo8HPGoLDuLYtpv") },
  { id: "p10", rank: 10, name: "Herringbone Wool Scarf", category: "Accessories", size: "OS", color: "Grey", condition: "Excellent", price: 9500, original: 14000, state: "lastone", brand: "Wovn", era: "Minimal", image: img("1vo86szmFVPu66lQyADcco0QfwU3HwMt6") },
  { id: "p11", rank: 11, name: "Linen Camp Shirt", category: "Shirts", size: "M", color: "Cream", condition: "Excellent", price: 13500, original: 18000, state: "available", brand: "Aria", era: "Minimal", image: img("1wyWEgY5Wazc7-chGSdz5IjlpvKAzXL80") },
  { id: "p12", rank: 12, name: "Soft Beige Knit", category: "Knitwear", size: "L", color: "Cream", condition: "Good", price: 18000, original: 24000, state: "available", brand: "Wovn", era: "Minimal", image: img("1ZrtULUSgSWrmIRSve5DAuKqspfdzS71I") },
  { id: "p13", rank: 13, name: "Cream Cotton Longsleeve", category: "Tees", size: "M", color: "Cream", condition: "Excellent", price: 12500, original: 17000, state: "available", brand: "Basics", era: "Minimal", image: img("1iCzHDF9lrDV612Ndwi5_m03oqJ7o45NH") },
  { id: "p14", rank: 14, name: "Verdant Cargo Trousers", category: "Trousers", size: "L", color: "Olive", condition: "Good", price: 22000, original: 28000, state: "available", brand: "Field", era: "Workwear", image: img("1RbUrJyyoo6nkKfK6NJwdHO0zIHY2n04D") },
  { id: "p15", rank: 15, name: "Vintage Straight Jeans", category: "Denim", size: "L", color: "Indigo", condition: "Good", price: 20000, original: 27000, state: "lastone", brand: "Rework", era: "Vintage", image: img("1wAcVBwOdlLJw5mMbduiMYgPH4WWUTspP") },
  { id: "p16", rank: 16, name: "Daisy Field Dress", category: "Dresses", size: "S", color: "Ivory", condition: "Excellent", price: 26000, original: 33000, state: "available", brand: "Bloom", era: "Vintage", image: img("1dXXWxCEEg6ezYPsRCK6B1XxD5QpAiZfh") },
  { id: "p17", rank: 17, name: "Pleated Midi Skirt", category: "Skirts", size: "M", color: "Charcoal", condition: "Good", price: 16000, original: 21000, state: "resOthers", minutes: 6, brand: "Aria", era: "Minimal", image: img("1FVxsSzsHCh5tKe5VMLKO0O25UyGk0DZJ") },
  { id: "p18", rank: 18, name: "Tailored Wool Blazer", category: "Blazers", size: "M", color: "Charcoal", condition: "Excellent", price: 38000, original: 49000, state: "available", brand: "Line", era: "Minimal", image: img("1a_gBKr983vl3VEPy5mT-oC6M4kMmiipy") },
  { id: "p19", rank: 19, name: "Pique Polo", category: "Tees", size: "L", color: "Forest", condition: "Good", price: 11000, original: 15000, state: "available", brand: "Basics", era: "Minimal", image: img("1yKF2UM6-vHyrC_8zL2FzIWy91SnBrEaE") },
  { id: "p20", rank: 20, name: "Canvas Carry Tote", category: "Accessories", size: "OS", color: "Khaki", condition: "Excellent", price: 15000, original: 19000, state: "available", brand: "Wovn", era: "Workwear", image: img("1wcW3Loif83NNUqILRSsQKU0RgrIyENGA") },
  { id: "p21", rank: 21, name: "Denim Trucker Jacket", category: "Denim", size: "L", color: "Indigo", condition: "Excellent", price: 27000, original: 34000, state: "available", brand: "Rework", era: "Vintage", image: img("1RqpHTso4SMuUlc8gBEsWZp4v1eRjE1uH") },
  { id: "p22", rank: 22, name: "Chunky Cable Sweater", category: "Knitwear", size: "M", color: "Rust", condition: "Good", price: 23000, original: 29000, state: "lastone", brand: "Wovn", era: "Vintage", image: img("127OwSWR8AB6eyu9zzWjc_k7KW3cYa-Uw") },
  { id: "p23", rank: 23, name: "Sporty Windbreaker", category: "Jackets", size: "S", color: "Sage", condition: "Good", price: 19000, original: 25000, state: "sold", brand: "Kit", era: "Y2K", image: img("10tiVM8fylrSZH-2nh0BCLytTf9NdvxkU") },
];

const feedAliases: Record<string, string> = {
  vest: "p2",
  nature: "p1",
  botan: "p0",
  ivory: "p3",
  bloom: "p9",
  moss: "p7",
  tote: "p20",
  cargo: "p14",
  "pool-denim": "p4",
  "pool-cord": "p5",
  "pool-scarf": "p10",
  "pool-track": "p6",
  "pool-linen": "p11",
};

const pdpGalleryPools: Record<string, string[]> = {
  Jackets: ["1T0XygfKzp92Id6ch09aTFcUyG8PbIG66", "1HgIA3DQUUjqGb5ypR-rHNJCoyP2aztRn", "1PDPeY2i810fzrtHsOUIcbh569FWkkNep", "1L2YrWAOexraRWeEg269qX7UUyXc1J6cM", "1_2N674OlXJWHLw2a0Yh99LPNMlzQ95o_", "1v8dZZ4LGxNFuJXC6Qnhqtc9CYIs8Gedd"],
  Denim: ["1mJxRFNyGo2xXT89oLeiuAGZtSvRlw0Jf", "1Q8ra1vjG-2D3bDbXvYRUvQeriv-tJbb5", "1RqpHTso4SMuUlc8gBEsWZp4v1eRjE1uH", "1FvFM7SZDTf9C0FXXmWSqQs_bl9ZXGe8o", "1U0QjQfz5Vg3FdTSo1XrT8-dghJpcVSlu", "1KnOTL7GxhfkC3Ecujvp5aYUtAL969ZQ8"],
  Shirts: ["1wcW3Loif83NNUqILRSsQKU0RgrIyENGA", "1wyWEgY5Wazc7-chGSdz5IjlpvKAzXL80", "1N1-Lu1RcIufG1RAfasQf6XrBuf6U4z-Y", "1kqZaG0l5InHkBdlVUtn0gLOcomvO0NzD", "1-BSE_ykIRePxJ0lguNrcd3oHV7Qo5_4k", "1Wsz1l7vylskIhLzIvka_Y0ow2p9VnkYN"],
  Tees: ["1iCzHDF9lrDV612Ndwi5_m03oqJ7o45NH", "1JQNcZIIYuGiRabtYFE_84x9wWpykOPFI", "1Sxv_X79pSJ2UyJ1Kg3HdUyRVQstKThcA", "1m_hM_-5yBxL7VDiR_NOXalnY7JalaMsc", "1e5psj9AHef1-cbsCRP0c1UTLJYjtQ-KS", "1eJ1B-sqT6z2woGciU-3l2_ADwOhi3yiU"],
  Knitwear: ["1vo86szmFVPu66lQyADcco0QfwU3HwMt6", "127OwSWR8AB6eyu9zzWjc_k7KW3cYa-Uw", "1ZrtULUSgSWrmIRSve5DAuKqspfdzS71I", "1oClPdqgEJiM83D0we53IaNOfQGTFaP1D", "1xhhCn82wjvy_Dxf_F12gWmqCgHpcrG29", "1wu4uy1EbpilNUDawQWn9C8xfV2LsdGiD"],
  Trousers: ["1RbUrJyyoo6nkKfK6NJwdHO0zIHY2n04D", "1s9le2jRnOpFSfkXwpCMWJYOTTJMVTdfv", "1RmZyyGIcEG1BQpLMBTMCJIWxx04EE5MX", "1zjrRzRKXe3i9jDnjULUWTyIPGLw7MMRt", "1OegTxzO1V2Vp6cIeIBqb1uNpSsdDvAp3", "1IOviTqW1UtsGS9XMjFIcRtG7yVIVlrAf"],
  Dresses: ["1dXXWxCEEg6ezYPsRCK6B1XxD5QpAiZfh", "170nY2G0456We4jG4_Jm_UkFLyxLIqE20", "1FYSps6nje3Gn5C5XBpyl5cQKJZsgRvLt", "1efA2j77_IemUXIrXMig2ZRIQWyygvDVW", "1og9ve66GG-n6p0J9xJx1J---3MG_nPr7", "1tcQXf_PH0E2UidFg_NQdH-ANvqZhzmgn"],
  Skirts: ["1FVxsSzsHCh4tKe5VMLKO0O25UyGk0DZJ", "1gknaVKFoTfk4PWnYOuSLMDc746ZOp7Ef", "1vACC2mQXesDvFLIx4b097GHjCbaNXZlX", "1cNQqTW4UTyJp4iWwM7qTOAKKbxqjgAct", "1J4h4R4kYtUkXLKHmh6NNAJwOnzPr9IuP", "1_w22dBv_zVuOdqLpQh4qeXqQoyTOz_8y"],
  Coats: ["1k3j8wbjDh_WYYrHykQo8HPGoLDuLYtpv", "1XFqJWKZ0kDlOhPnr22oL2s9encwtq6ik", "1BI3_38frghBjJx-x8s248hh0EOZOSan1", "1Whs0BvRIrBvfknH6jG7MB81szJsAY19o", "1E37uHN3F47GFrnHW7lSCLZrcJKhs3UsG", "1IcVig2pJCY8pA-yNzErQckgj2qVtwOWh"],
  Blazers: ["1a_gBKr983vl3VEPy5mT-oC6M4kMmiipy", "1TRkBEXRzM9TkK7UhzAqcywy5sgfbQoAQ", "1d1mo6ZoqXcN6ufoGep-_5bIZs8zMbPik", "1AZMcTpLOjVUbficHFAjD3grInNe_p31t", "1qKMuFpOIAhq4Afy32hDrvAKI_Grqbgr9", "1yvMpNb28iza2dJoUX5MllC73SoY3wlWn"],
  Accessories: ["1wcW3Loif83NNUqILRSsQKU0RgrIyENGA", "1wyWEgY5Wazc7-chGSdz5IjlpvKAzXL80", "1N1-Lu1RcIufG1RAfasQf6XrBuf6U4z-Y", "1kqZaG0l5InHkBdlVUtn0gLOcomvO0NzD", "1-BSE_ykIRePxJ0lguNrcd3oHV7Qo5_4k", "1Wsz1l7vylskIhLzIvka_Y0ow2p9VnkYN"],
};

function driveIdFromThumbnail(url: string) {
  return url.match(/[?&]id=([^&]+)/)?.[1] ?? "";
}

export function canonicalProductId(id: string) {
  return feedAliases[id] ?? id;
}

export function canonicalizeProduct(product: Product): Product {
  const canonicalId = canonicalProductId(product.id);
  const match =
    plpItems.find((item) => item.id === canonicalId) ??
    plpItems.find((item) => item.name === product.name);

  if (!match) return product;

  return {
    ...match,
    state: product.state,
    minutes: product.minutes,
    secondsLeft: product.secondsLeft,
    dropped: product.dropped,
  };
}

export function galleryForProduct(product: PlpProduct) {
  const mainId = driveIdFromThumbnail(product.image);
  const pool = (pdpGalleryPools[product.category] ?? []).filter(
    (id) => id !== mainId,
  );
  return [mainId, ...pool].filter(Boolean).slice(0, 5).map(img);
}

export function findCatalogueProduct(id?: string) {
  const canonicalId = canonicalProductId(id ?? "");
  return plpItems.find((item) => item.id === canonicalId) ?? plpItems[0];
}

export function pdpHref(id: string) {
  return `/p/${canonicalProductId(id)}`;
}

export function naira(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}
