import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function CustomersLoading() {
  return (
    <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <div>
        <Skeleton className="h-3 w-32" />
        <Skeleton className="mt-4 h-12 w-56" />
        <Skeleton className="mt-4 h-5 w-full max-w-[680px]" />
      </div>
      <Card className="grid gap-4 p-5 sm:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index}>
            <Skeleton className="h-8 w-20" />
            <Skeleton className="mt-3 h-3 w-24" />
          </div>
        ))}
      </Card>
      <Card className="flex flex-col gap-4 p-5">
        <Skeleton className="h-11 w-full" />
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-1">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton className="h-24 w-full" key={index} />
          ))}
        </div>
      </Card>
    </div>
  );
}
