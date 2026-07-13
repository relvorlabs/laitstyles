import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <div>
        <Skeleton className="h-3 w-36" />
        <Skeleton className="mt-4 h-12 w-48" />
        <Skeleton className="mt-4 h-5 w-full max-w-[720px]" />
      </div>
      <Card className="grid gap-4 p-5 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index}>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-5 w-36" />
          </div>
        ))}
      </Card>
      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <Card className="hidden gap-3 p-4 lg:flex">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton className="h-16 w-full" key={index} />
          ))}
        </Card>
        <Card className="gap-5 p-5 sm:p-6">
          <Skeleton className="h-9 w-52" />
          <Skeleton className="h-4 w-full max-w-xl" />
          <div className="grid gap-5 sm:grid-cols-2">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton className="h-20 w-full" key={index} />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
