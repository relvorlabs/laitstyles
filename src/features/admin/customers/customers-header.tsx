import { Badge } from "@/components/ui/badge";

export function CustomersHeader() {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">People</Badge>
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Relationship ledger
          </span>
        </div>
        <h1 className="mt-3 text-balance font-serif text-[38px] font-medium leading-none sm:text-[46px]">
          Customers
        </h1>
        <p className="mt-3 max-w-2xl text-pretty text-sm leading-6 text-muted-foreground">
          See who is buying, what needs follow-up, and the complete store history behind each
          relationship.
        </p>
      </div>
      <p className="max-w-sm text-pretty text-xs leading-5 text-muted-foreground md:text-right">
        Spend, orders, holds, returns and reviews are derived from the same connected Admin records.
      </p>
    </header>
  );
}
