// Money is handled in integer minor units (kobo; 100 kobo = ₦1) to avoid
// floating-point drift. DB `numeric(12,2)` values are converted to kobo at the
// data boundary. NGN is the source of truth; USD is display-only/approximate.
// See docs/storefront-v2/03 §1.

export type Kobo = number; // integer

export function nairaToKobo(naira: number): Kobo {
  return Math.round(naira * 100);
}

export function koboToNaira(kobo: Kobo): number {
  return kobo / 100;
}

/** Format kobo as Naira, e.g. 2850000 -> "₦28,500". */
export function formatNaira(kobo: Kobo): string {
  const naira = kobo / 100;
  const hasFraction = kobo % 100 !== 0;
  return `₦${naira.toLocaleString("en-NG", {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

/** Display-only, approximate USD conversion. Not for pricing or checkout. */
export function formatUsdApprox(kobo: Kobo, nairaPerUsd: number): string {
  if (nairaPerUsd <= 0) return "$0.00";
  const usd = kobo / 100 / nairaPerUsd;
  return `$${usd.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
