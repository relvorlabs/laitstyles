import { Skeleton } from "@/components/ui/skeleton";
import { panelClass } from "@/features/storefront/account/components/account-primitives";
import { cn } from "@/lib/utils";

export default function AccountOrderDetailLoading() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Loading order details</span>
      <Skeleton className="h-11 w-36" />
      <Skeleton className="mt-5 h-3 w-28" />
      <Skeleton className="mt-5 h-16 w-full max-w-xl" />
      <Skeleton className="mt-4 h-5 w-72 max-w-full" />
      <div className={cn("mt-7 p-6", panelClass)}>
        <Skeleton className="h-9 w-36" />
        <div className="mt-6 space-y-5">
          {[0, 1, 2].map((item) => (
            <div key={item} className="flex gap-4">
              <Skeleton className="size-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-48 max-w-full" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className={cn("mt-6 p-5", panelClass)}>
        <Skeleton className="h-9 w-24" />
        <div className="mt-6 grid gap-5 sm:grid-cols-[112px_minmax(0,1fr)]">
          <Skeleton className="aspect-[4/5] rounded-[10px]" />
          <div className="space-y-3">
            <Skeleton className="h-6 w-56 max-w-full" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-11 w-44" />
          </div>
        </div>
      </div>
    </div>
  );
}
