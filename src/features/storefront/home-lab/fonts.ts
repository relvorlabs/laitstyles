import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";

// Fonts the card-lab prototypes load from Google Fonts, loaded here via next/font
// (self-hosted, no CDN <link>) and exposed as the CSS variables home-lab.css consumes:
// --font-lab-sans / --font-lab-mono / --font-lab-serif. Shared by every .lst-lab route.
const labSans = Geist({ subsets: ["latin"], variable: "--font-lab-sans" });
const labMono = Geist_Mono({ subsets: ["latin"], variable: "--font-lab-mono" });
const labSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-lab-serif",
});

export const labFontClassName = `${labSans.variable} ${labMono.variable} ${labSerif.variable}`;
