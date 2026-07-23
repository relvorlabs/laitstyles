import { Check, Home, MapPin, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type {
  CheckoutSnapshot,
  initialForm,
} from "@/features/storefront/checkout/checkout-helpers";
import { ConfirmMetric } from "./confirm-metric";
import { SummaryRows } from "./summary-rows";

export function ConfirmationScreen({
  form,
  vals,
}: {
  form: typeof initialForm;
  vals: CheckoutSnapshot;
}) {
  const first = form.first.trim() || "there";
  const email = form.email || "your inbox";
  const orderNo = "LAIT-4821";
  return (
    <div className="w-full max-w-[640px]">
      <div className="flex items-center justify-center px-1 pb-6">
        <Link className="flex items-center gap-[9px]" href="/">
          <Home className="size-5" strokeWidth={1.9} />
          <span className="text-[15px] font-semibold tracking-[.26em]">LAITSTYLE</span>
        </Link>
      </div>
      <Card className="gap-0 overflow-hidden rounded-lg bg-card p-0 shadow-[0_30px_80px_rgba(0,0,0,.10)] ring-0">
        <div className="border-b border-[#F0EEE8] bg-[linear-gradient(180deg,#F4F6EE_0%,#FFFFFF_100%)] px-[34px] py-[52px] pb-10 text-center">
          <div className="mx-auto mb-6 flex size-[78px] items-center justify-center rounded-full border border-[#CFDCB4] bg-[#EAF0DD] animate-[leemPop_.5s_cubic-bezier(.33,1,.68,1)]">
            <Check className="size-9 text-[#5F7043]" strokeWidth={2.4} />
          </div>
          <div className="mb-2.5 text-[11.5px] font-semibold uppercase tracking-[.28em] text-accent">
            Order confirmed &middot; &#8470; one of one
          </div>
          <h1 className="m-0 mb-2.5 font-serif text-[34px] font-medium italic leading-[1.15]">
            They&apos;re yours, {first}.
          </h1>
          <p className="mx-auto m-0 max-w-[420px] text-[14.5px] leading-[1.6] text-[#57554E]">
            Each piece is one-of-one &mdash; off the rail for good and reserved to you. A receipt is
            on its way to <strong className="text-primary">{email}</strong>.
          </p>
        </div>

        <div className="flex flex-wrap gap-5 border-b border-[#F0EEE8] px-[34px] py-[26px]">
          <ConfirmMetric label="Order number" value={`#${orderNo}`} />
          <ConfirmMetric label="Payment" value={vals.activeMethod.name} paid />
          <ConfirmMetric label="Est. delivery" value="Wed, 15 Jul" />
        </div>

        <div className="px-[34px] pb-2 pt-7">
          <div className="mb-1.5 text-[12.5px] font-semibold uppercase tracking-[.04em] text-[#57554E]">
            Delivering to
          </div>
          <div className="flex items-start gap-3 border-b border-[#F4F3EE] py-3.5 pb-[22px]">
            <MapPin className="mt-0.5 size-[18px] shrink-0 text-accent" />
            <div className="text-[13.5px] leading-[1.65] text-[#3D3B35]">
              {`${form.first} ${form.last}`.trim() || "Your delivery address"}
              <br />
              {form.address || "—"}
              <br />
              {form.city}
              {form.postcode ? `, ${form.postcode}` : ""} &middot; {form.country}
              <br />
              {form.phone}
            </div>
          </div>
        </div>

        <div className="px-[34px] pb-1.5 pt-5">
          {vals.items.map((item) => (
            <div
              className="flex items-center gap-3.5 border-b border-[#F4F3EE] py-3"
              key={item.name}
            >
              <div className="relative h-[70px] w-[58px] shrink-0 overflow-hidden rounded-[9px] bg-[#E4E5DE]">
                <Image alt={item.name} className="object-cover" fill sizes="58px" src={item.img} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{item.name}</div>
                <div className="mt-0.5 text-xs text-[#8A887E]">{item.meta}</div>
                <div className="mt-0.5 text-[11.5px] text-[#A7A59B]">
                  Reserved to you &middot; one of one
                </div>
              </div>
              <div className="whitespace-nowrap text-sm font-semibold">{item.price}</div>
            </div>
          ))}
        </div>

        <div className="px-[34px] pb-2 pt-[18px]">
          <SummaryRows
            subtotal={vals.subtotal}
            shipping={vals.shipping}
            total={vals.total}
            vat={vals.vat}
            zoneName={vals.activeZone.name.split(" ")[0]}
            totalLabel="Total paid"
            compact
          />
        </div>

        <div className="px-[34px] pb-[30px] pt-[22px]">
          <Alert className="flex gap-3 rounded-xl border-[#EEECE5] bg-[#F7F7F3] px-[18px] py-4">
            <Truck className="mt-0.5 size-[18px] shrink-0 text-accent" />
            <AlertTitle className="sr-only">Tracking</AlertTitle>
            <AlertDescription>
              <div className="text-[13.5px] font-semibold text-primary">Tracking on the way</div>
              <div className="mt-[3px] text-[12.5px] leading-[1.55] text-[#57554E]">
                We&apos;ll text your <strong>GIG Logistics</strong> tracking link the moment your
                parcel is booked. Follow it from your account.
              </div>
            </AlertDescription>
          </Alert>
          <div className="mt-[22px] flex flex-wrap gap-3">
            <Button
              className="min-w-[180px] flex-1"
              nativeButton={false}
              render={<Link href="/products" />}
            >
              Back to the archive
            </Button>
            <Button
              className="min-w-[180px] flex-1"
              nativeButton={false}
              render={<Link href="/account" />}
              variant="outline"
            >
              View my orders
            </Button>
          </div>
        </div>
      </Card>
      <p className="mx-auto mt-[22px] max-w-[440px] text-center font-serif text-[12.5px] italic leading-[1.6] text-[#8A887E]">
        Questions about your order? Reach us at care@laitstyle.ng &mdash; we reply within a day.
      </p>
    </div>
  );
}
