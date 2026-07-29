import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { panelClass } from "@/modules/storefront-shell/ui/account-primitives";

export default function AccountOrdersLoading() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Loading orders</span>
      <Skeleton className="h-3 w-28" />
      <Skeleton className="mt-5 h-16 w-72 max-w-full" />
      <Skeleton className="mt-5 h-7 w-full max-w-2xl" />
      <div className="mt-8 space-y-4">
        {[0, 1, 2].map((item) => (
          <div key={item} className={cn("overflow-hidden p-5", panelClass)}>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-4 w-44" />
              </div>
              <Skeleton className="h-7 w-28 rounded-full" />
            </div>
            <div className="mt-6 grid gap-5 sm:grid-cols-[150px_minmax(0,1fr)]">
              <Skeleton className="aspect-[4/5] w-full rounded-[10px]" />
              <div className="space-y-3 py-2">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-4 w-full max-w-sm" />
                <Skeleton className="h-11 w-40" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
