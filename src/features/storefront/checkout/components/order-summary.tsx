import { HelpCircle, ShieldCheck, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CloudImage } from "@/components/ui/cloud-image";
import { Input } from "@/components/ui/input";
import type { CheckoutSnapshot, Currency } from "@/features/storefront/checkout/checkout-helpers";
import { cn } from "@/lib/utils";
import { CurrencyButton } from "./currency-button";
import { SummaryRows } from "./summary-rows";
import { TrustBadge } from "./trust-badge";

export function OrderSummary({
  currency,
  setCurrency,
  vals,
}: {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  vals: CheckoutSnapshot;
}) {
  return (
    <aside className="min-w-[300px] flex-[1_1_400px] border-l border-[#F0EEE8] bg-[#FAF9F6] px-[34px] pb-11 pt-8 max-md:border-l-0 max-sm:px-5">
      <div
        className={cn(
          "mb-4 flex items-center gap-2 rounded-full border px-3.5 py-[9px]",
          vals.expired
            ? "border-[#E4C4BF] bg-[#FBF0EE]"
            : vals.expiring
              ? "border-[#E8D7A6] bg-[#FBF6E8]"
              : "border-chip-border bg-chip-bg",
        )}
      >
        <span
          className={cn(
            "size-2 rounded-full",
            vals.hasHold && !vals.expired ? "animate-[leemPulse_1.8s_ease-in-out_infinite]" : "",
          )}
          style={{
            background: vals.expired ? "#B4453C" : vals.expiring ? "#9A7B1F" : "#7C8C63",
          }}
        />
        <span
          aria-live="polite"
          className="text-[12.5px]"
          style={{ color: vals.expired ? "#8A362F" : vals.expiring ? "#8A7434" : "#4A5540" }}
        >
          {vals.holdMsg}
        </span>
      </div>

      {vals.items.map((item) => (
        <div className="flex items-center gap-3.5 py-2.5" key={item.lineKey}>
          <div className="relative h-[66px] w-[60px] shrink-0 overflow-hidden rounded-[9px] bg-[#E4E5DE]">
            <span className="absolute -right-[7px] -top-[7px] z-[2] flex h-5 min-w-5 items-center justify-center rounded-full bg-[#4A4842] text-[11px] font-semibold text-white">
              {item.quantity}
            </span>
            {item.img ? (
              <CloudImage
                alt={item.name}
                className="object-cover"
                fill
                sizes="60px"
                src={item.img}
              />
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-medium">{item.name}</div>
            <div className="mt-0.5 text-xs text-[#8A887E]">{item.meta}</div>
          </div>
          <div className="whitespace-nowrap text-[13.5px] font-semibold">{item.price}</div>
        </div>
      ))}

      <div className="my-[18px] mb-[22px] flex gap-2.5">
        <Input className="flex-1" inputSize="lg" placeholder="Discount code or gift card" />
        <Button size="lg">Apply</Button>
      </div>

      <SummaryRows
        subtotal={vals.subtotal}
        shipping={vals.shipping}
        total={vals.total}
        vat={vals.vat}
        zoneName={vals.activeZone.name.split(" ")[0]}
        totalLabel="Total"
      />
      {vals.isPod ? (
        <div className="mt-2.5 flex justify-between rounded-[9px] border border-[#E8D7A6] bg-[#FBF6E8] px-3 py-2.5 text-[12.5px] text-[#8A7434]">
          <span>Deposit due now</span>
          <span className="font-semibold">{vals.podDeposit}</span>
        </div>
      ) : null}

      <div className="mt-7 grid grid-cols-3 gap-3">
        <TrustBadge icon={<Truck className="size-[22px]" />} label="GIG · Sendbox" />
        <TrustBadge icon={<HelpCircle className="size-[22px]" />} label="7-day returns" />
        <TrustBadge icon={<ShieldCheck className="size-[22px]" />} label="Buyer protection" />
      </div>

      <div className="mt-6 hidden gap-1.5 max-md:flex">
        <CurrencyButton active={currency === "NGN"} onClick={() => setCurrency("NGN")}>
          ₦ NGN
        </CurrencyButton>
        <CurrencyButton active={currency === "USD"} onClick={() => setCurrency("USD")}>
          $ USD
        </CurrencyButton>
      </div>
    </aside>
  );
}
