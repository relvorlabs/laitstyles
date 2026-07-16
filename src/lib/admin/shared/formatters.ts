const nairaFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

const compactNairaFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  notation: "compact",
  maximumFractionDigits: 1,
});

const reportingDateFormatter = new Intl.DateTimeFormat("en-NG", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

export function formatNaira(value: number) {
  return nairaFormatter.format(value);
}

export function formatCompactNaira(value: number) {
  return compactNairaFormatter.format(value);
}

export function formatRelativeTime(asOf: string, occurredAt: string) {
  const difference = new Date(asOf).getTime() - new Date(occurredAt).getTime();
  const minutes = Math.max(0, Math.floor(difference / 60_000));

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function formatReportingDate(value: string) {
  return reportingDateFormatter.format(new Date(`${value}T12:00:00+01:00`));
}
