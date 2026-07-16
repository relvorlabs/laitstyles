import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";

// Fonts the card-lab prototypes load from Google Fonts, loaded here via next/font
// (self-hosted, no CDN <link>) and exposed as the CSS variables storefront.css consumes:
// --font-storefront-sans / --font-storefront-mono / --font-storefront-serif. Shared by every .lst-storefront route.
const storefrontSans = Geist({ subsets: ["latin"], variable: "--font-storefront-sans" });
const storefrontMono = Geist_Mono({ subsets: ["latin"], variable: "--font-storefront-mono" });
const storefrontSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-storefront-serif",
});

export const storefrontFontClassName = `${storefrontSans.variable} ${storefrontMono.variable} ${storefrontSerif.variable}`;
