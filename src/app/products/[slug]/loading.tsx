import "@/features/storefront/home-lab/home-lab.css";
import { labFontClassName } from "@/features/storefront/home-lab/fonts";

// Route-level skeleton mirroring the final product-detail geometry (no centered spinner).
export default function Loading() {
  return (
    <div className={`lst-lab lst-catalogue ${labFontClassName}`}>
      <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">
        <div className="h-4 w-56 rounded bg-surface-sunken" />
        <section className="mt-6 grid gap-10 pb-16 lg:grid-cols-[minmax(0,1.18fr)_minmax(390px,0.82fr)] xl:gap-16">
          <div className="aspect-[4/5] w-full rounded-[14px] border border-border bg-surface-sunken" />
          <div className="space-y-5">
            <div className="flex gap-2">
              <div className="h-6 w-16 rounded-full bg-surface-sunken" />
              <div className="h-6 w-20 rounded-full bg-surface-sunken" />
            </div>
            <div className="h-14 w-3/4 rounded bg-surface-sunken" />
            <div className="h-9 w-40 rounded bg-surface-sunken" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-24 rounded-[9px] bg-surface-sunken" />
              <div className="h-24 rounded-[9px] bg-surface-sunken" />
            </div>
            <div className="h-[54px] w-full rounded-full bg-surface-sunken" />
            <div className="h-40 w-full rounded bg-surface-sunken" />
          </div>
        </section>
      </div>
    </div>
  );
}
