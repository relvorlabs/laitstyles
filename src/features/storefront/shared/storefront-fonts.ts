import { Manrope, Newsreader } from "next/font/google";

// The handoff typography is self-hosted by next/font and exposed through the
// application-wide semantic font roles.
const storefrontSans = Manrope({
  subsets: ["latin"],
  variable: "--font-storefront-sans",
});
const storefrontSerif = Newsreader({
  subsets: ["latin"],
  variable: "--font-storefront-serif",
});

export const storefrontFontClassName = `${storefrontSans.variable} ${storefrontSerif.variable}`;
