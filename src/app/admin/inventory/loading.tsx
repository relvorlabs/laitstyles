import { Skeleton } from "@/components/ui/skeleton";

export default function InventoryLoading() {
  return (
    <div
      aria-label="Loading Inventory"
      className="mx-auto flex w-full max-w-[1480px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10"
      role="status"
    >
      <div className="max-w-[820px]">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="mt-4 h-14 w-full max-w-[760px] rounded-[16px]" />
        <Skeleton className="mt-3 h-5 w-full max-w-[620px]" />
      </div>

      <Skeleton className="h-[236px] rounded-[18px] sm:h-[124px]" />
      <Skeleton className="h-[176px] rounded-[18px]" />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton className="aspect-[4/5] rounded-[18px]" key={index} />
        ))}
      </div>
    </div>
  );
}
