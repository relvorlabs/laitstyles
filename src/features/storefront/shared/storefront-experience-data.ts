export type StorefrontAccountItemState = "available" | "lastone" | "resYou" | "resOthers" | "sold";

export type StorefrontAccountItem = {
  id: string;
  name: string;
  cat: string;
  size: string;
  color: string;
  cond: string;
  priceNum: number;
  origNum: number;
  st: StorefrontAccountItemState;
  img: string;
  removed?: boolean;
  secondsLeft?: number;
  mins?: number;
};

export const storefrontImage = (id: string) =>
  `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;

export const storefrontAccountSeedItems: StorefrontAccountItem[] = [
  [
    "Botanical Print Jacket",
    "Jackets",
    "S",
    "Ivory",
    "Excellent",
    34000,
    42000,
    "lastone",
    "1mJxRFNyGo2xXT89oLeiuAGZtSvRlw0Jf",
  ],
  [
    "Sage Field Vest",
    "Jackets",
    "M",
    "Sage",
    "Excellent",
    28000,
    35000,
    "available",
    "1T0XygfKzp92Id6ch09aTFcUyG8PbIG66",
  ],
  [
    "Eco Shell Jacket",
    "Jackets",
    "M",
    "Grey",
    "Excellent",
    31000,
    39000,
    "resYou",
    "1_2N674OlXJWHLw2a0Yh99LPNMlzQ95o_",
  ],
  [
    "Ivory Zip Jacket",
    "Jackets",
    "M",
    "Cream",
    "Good",
    29000,
    37000,
    "resOthers",
    "1PDPeY2i810fzrtHsOUIcbh569FWkkNep",
  ],
  [
    "Bloom Belted Coat",
    "Coats",
    "L",
    "Rust",
    "Excellent",
    45000,
    58000,
    "sold",
    "1k3j8wbjDh_WYYrHykQo8HPGoLDuLYtpv",
  ],
  [
    "Daisy Field Dress",
    "Dresses",
    "S",
    "Ivory",
    "Excellent",
    26000,
    33000,
    "available",
    "1dXXWxCEEg6ezYPsRCK6B1XxD5QpAiZfh",
  ],
  [
    "Chunky Cable Sweater",
    "Knitwear",
    "M",
    "Rust",
    "Good",
    23000,
    29000,
    "lastone",
    "127OwSWR8AB6eyu9zzWjc_k7KW3cYa-Uw",
  ],
  [
    "Linen Camp Shirt",
    "Shirts",
    "M",
    "Cream",
    "Excellent",
    13500,
    18000,
    "available",
    "1wyWEgY5Wazc7-chGSdz5IjlpvKAzXL80",
  ],
].map((row, index) => ({
  id: `w${index}`,
  name: row[0] as string,
  cat: row[1] as string,
  size: row[2] as string,
  color: row[3] as string,
  cond: row[4] as string,
  priceNum: row[5] as number,
  origNum: row[6] as number,
  st: row[7] as StorefrontAccountItemState,
  img: storefrontImage(row[8] as string),
  secondsLeft: row[7] === "resYou" ? 742 - index * 7 : undefined,
  mins: row[7] === "resOthers" ? 4 + (index % 4) : undefined,
}));
