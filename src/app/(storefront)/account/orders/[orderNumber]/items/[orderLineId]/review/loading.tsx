import { Skeleton } from "@/components/ui/skeleton";
import { panelClass } from "@/features/storefront/account/components/account-primitives";
import { cn } from "@/lib/utils";

export default function AccountOrderItemReviewLoading() {
  return (
    <div aria-busy="true" className="mx-auto w-full max-w-4xl pb-12">
      <span className="sr-only">Loading your product review</span>
      <Skeleton className="h-11 w-36" />
      <Skeleton className="mt-6 h-3 w-32" />
      <Skeleton className="mt-5 h-16 w-full max-w-2xl" />
      <div className={cn("mt-7 space-y-5 p-6", panelClass)}>
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-11 w-40" />
      </div>
    </div>
  );
}
