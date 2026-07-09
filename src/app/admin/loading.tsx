import { Skeleton } from "@/components/ui/skeleton";

export default function AdminOverviewLoading() {
  return (
    <div
      aria-label="Loading the Control Room overview"
      className="mx-auto flex w-full max-w-[1480px] flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10"
      role="status"
    >
      <div className="max-w-[860px]">
        <Skeleton className="h-3 w-48" />
        <Skeleton className="mt-4 h-14 w-full max-w-[760px] rounded-[16px]" />
        <Skeleton className="mt-3 h-5 w-full max-w-[620px]" />
      </div>

      <Skeleton className="h-[360px] rounded-[22px]" />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(380px,.92fr)]">
        <Skeleton className="h-[520px] rounded-[18px]" />
        <Skeleton className="h-[360px] rounded-[18px]" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Skeleton className="h-[430px] rounded-[18px]" />
        <Skeleton className="h-[430px] rounded-[18px]" />
      </div>

      <Skeleton className="h-[460px] rounded-[18px]" />
    </div>
  );
}
