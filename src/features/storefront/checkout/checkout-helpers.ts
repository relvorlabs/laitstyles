export type Currency = "NGN" | "USD";
export type CheckoutStep = 0 | 1 | 2 | 3;
export type ZoneId = "lagos" | "interstate";
export type PaymentId = "paystack" | "flutterwave" | "pod";
export type PayState = "idle" | "processing" | "declined";
export type FormErrors = Partial<
  Record<"email" | "first" | "last" | "address" | "city" | "phone", string>
>;
export type CheckoutSnapshot = ReturnType<typeof buildCheckoutSnapshot>;

export type CheckoutItem = {
  name: string;
  meta: string;
  seller: string;
  priceNum: number;
  img: string;
};

export const zones = [
  {
    id: "lagos" as const,
    name: "Lagos mainland & island",
    eta: "1–2 business days",
    feeNum: 3500,
  },
  {
    id: "interstate" as const,
    name: "Interstate (rest of Nigeria)",
    eta: "3–5 business days",
    feeNum: 6500,
  },
];

export const paymentMethods = [
  {
    id: "paystack" as const,
    name: "Paystack",
    sub: "Card, bank transfer or USSD",
    badges: ["CARD", "TRANSFER", "USSD"],
  },
  {
    id: "flutterwave" as const,
    name: "Flutterwave",
    sub: "Card, bank transfer or USSD",
    badges: ["CARD", "TRANSFER", "USSD"],
  },
  {
    id: "pod" as const,
    name: "Pay on delivery",
    sub: "Refundable deposit now, balance to courier",
    badges: ["LAGOS"],
  },
];

export const initialForm = {
  email: "",
  first: "",
  last: "",
  address: "",
  city: "",
  postcode: "",
  phone: "+234 ",
  country: "Nigeria",
};

export function validate(step: CheckoutStep, form: typeof initialForm): FormErrors {
  const nextErrors: FormErrors = {};
  if (step === 0 && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test((form.email || "").trim()))
    nextErrors.email = "Enter a valid email address";
  if (step === 1) {
    if (!form.first.trim()) nextErrors.first = "Required";
    if (!form.last.trim()) nextErrors.last = "Required";
    if (!form.address.trim()) nextErrors.address = "Add your street address";
    if (!form.city.trim()) nextErrors.city = "Required";
    const digits = form.phone.replace(/\D/g, "");
    const ok =
      (digits.startsWith("234") && digits.length === 13) ||
      (digits.startsWith("0") && digits.length === 11) ||
      (!digits.startsWith("234") && !digits.startsWith("0") && digits.length === 10);
    if (!ok) nextErrors.phone = "Enter a valid Nigerian number, e.g. +234 801 234 5678";
  }
  return nextErrors;
}

export function moneyLabel(ngn: number, currency: Currency) {
  return currency === "NGN"
    ? `₦${ngn.toLocaleString()}`
    : `$${(Math.round((ngn / 1600) * 100) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

export function formatSeconds(sec = 0) {
  const value = Math.max(0, sec);
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

export function buildCheckoutSnapshot(
  currency: Currency,
  zone: ZoneId,
  method: PaymentId,
  secondsLeft: number,
  checkoutItems: CheckoutItem[],
) {
  const activeZone = zones.find((item) => item.id === zone) || zones[0];
  const activeMethod = paymentMethods.find((item) => item.id === method) || paymentMethods[0];
  const sub = checkoutItems.reduce((sum, item) => sum + item.priceNum, 0);
  const vatNum = Math.round(sub * 0.075);
  const totalNum = sub + activeZone.feeNum + vatNum;
  const podDepositNum = 5000;
  const expired = secondsLeft <= 0;
  const expiring = !expired && secondsLeft <= 180;
  const isPod = method === "pod";

  return {
    activeMethod,
    activeZone,
    expired,
    expiring,
    gatewayName: method === "flutterwave" ? "Flutterwave" : "Paystack",
    isPod,
    items: checkoutItems.map((item) => ({ ...item, price: moneyLabel(item.priceNum, currency) })),
    podDeposit: moneyLabel(podDepositNum, currency),
    reviewHold: expired ? "Re-hold above to continue." : `Held ${formatSeconds(secondsLeft)}.`,
    shipping: moneyLabel(activeZone.feeNum, currency),
    subtotal: moneyLabel(sub, currency),
    timer: formatSeconds(secondsLeft),
    total: moneyLabel(totalNum, currency),
    vat: moneyLabel(vatNum, currency),
    payGateway: isPod ? "Deposit secured · Paystack" : `Secured by ${activeMethod.name} · PCI-DSS`,
    payLabel: expired
      ? "Re-hold to pay"
      : isPod
        ? `Pay deposit · ${moneyLabel(podDepositNum, currency)}`
        : `Pay ${moneyLabel(totalNum, currency)}`,
    holdMsg: expired
      ? "Hold released — re-hold above to continue"
      : isPod
        ? "Deposit confirms your hold at checkout"
        : `Your ${checkoutItems.length} pieces are held — releasing in ${formatSeconds(secondsLeft)}`,
  };
}
