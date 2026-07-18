import type { FulfilmentLaneItem } from "@/lib/admin/shared/types";
import { cn } from "@/lib/utils";

export function FulfilmentLane({ items }: { items: FulfilmentLaneItem[] }) {
  const total = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <section
      aria-labelledby="fulfilment-heading"
      className="scroll-mt-24 border-t border-border pt-6"
      id="fulfilment"
    >
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        Fulfilment lane
      </p>
      <h2
        className="mt-1.5 font-serif text-[24px] font-medium leading-tight"
        id="fulfilment-heading"
      >
        Move paid orders forward.
      </h2>
      <p className="mt-1.5 text-[12.5px] leading-5 text-muted-foreground">
        {total} order{total === 1 ? "" : "s"} currently between payment and dispatch.
      </p>

      <ol aria-label="Order fulfilment stages, in sequence" className="mt-4">
        {items.map((item) => (
          <li className="flex items-baseline gap-3 py-2.5" key={item.status}>
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {item.label}
            </span>
            <span
              aria-hidden="true"
              className="min-w-6 flex-1 border-b border-dotted border-border-strong/70"
            />
            <span
              className={cn(
                "font-serif text-[22px] font-medium leading-none tabular-nums",
                !item.count && "text-muted-foreground",
              )}
            >
              {item.count}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
