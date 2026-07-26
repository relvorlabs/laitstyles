import { Manrope, Newsreader } from "next/font/google";

const storefrontSans = Manrope({
  subsets: ["latin"],
  variable: "--font-storefront-sans",
});
const storefrontSerif = Newsreader({
  subsets: ["latin"],
  variable: "--font-storefront-serif",
});

export const storefrontFontClassName = `${storefrontSans.variable} ${storefrontSerif.variable}`;
