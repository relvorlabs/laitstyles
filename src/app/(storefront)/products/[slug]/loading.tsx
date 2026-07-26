import { Skeleton } from "@/components/ui/skeleton";
import "@/features/storefront/shared/storefront.css";
import { storefrontFontClassName } from "@/modules/storefront-shell/ui/storefront-fonts";

const SKELETON_ITEMS = ["one", "two", "three", "four"] as const;

export default function ProductDetailLoading() {
  return (
    <div
      className={`lst-storefront lst-catalogue ${storefrontFontClassName}`}
      aria-busy="true"
      aria-label="Loading product details"
      role="status"
    >
      <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">
        <Skeleton className="h-3 w-64" />
      </div>

      <section className="mx-auto grid max-w-[1500px] gap-8 px-4 pb-14 sm:px-6 lg:grid-cols-[minmax(0,1.18fr)_minmax(390px,0.82fr)] lg:gap-12 lg:px-8">
        <div className="grid gap-3 sm:grid-cols-[84px_minmax(0,1fr)]">
          <div className="order-2 flex gap-3 sm:order-1 sm:grid">
            {SKELETON_ITEMS.map((item) => (
              <Skeleton className="aspect-[4/5] w-20 sm:w-full" key={`thumbnail-${item}`} />
            ))}
          </div>
          <Skeleton className="order-1 min-h-[620px] rounded-sm sm:order-2 sm:min-h-[760px]" />
          <div className="order-3 col-span-full grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-border sm:grid-cols-4">
            {SKELETON_ITEMS.map((item) => (
              <Skeleton className="h-28 rounded-none" key={`trust-${item}`} />
            ))}
          </div>
        </div>

        <div className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <Skeleton className="h-3 w-48" />
          <Skeleton className="h-28 w-full max-w-md" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-12 w-52" />
          <div className="grid grid-cols-3 gap-3 border-y border-border py-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <div className="flex gap-3">
            <Skeleton className="h-14 w-[130px]" />
            <Skeleton className="h-14 flex-1" />
          </div>
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-36 w-full" />
        </div>
      </section>
    </div>
  );
}
