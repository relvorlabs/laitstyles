import {
  Alert02Icon,
  ArrowRight01Icon,
  Clock01Icon,
  PackageIcon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AdminIcon } from "@/features/admin/shared/admin-icon";
import type { AttentionItem, AttentionTone } from "@/lib/admin/shared/types";
import { cn } from "@/lib/utils";

type AttentionQueueProps = {
  items: AttentionItem[];
};

const toneStyles: Record<
  AttentionTone,
  { badge: "destructive" | "secondary" | "outline"; numeral: string }
> = {
  critical: { badge: "destructive", numeral: "text-oxblood" },
  warning: { badge: "secondary", numeral: "text-warning-surface-foreground" },
  info: { badge: "outline", numeral: "text-muted-foreground" },
};

export function AttentionQueue({ items }: AttentionQueueProps) {
  return (
    <section aria-labelledby="attention-heading" className="scroll-mt-24" id="attention">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Needs a decision
          </p>
          <h2
            className="mt-1.5 text-balance font-serif text-[27px] font-medium leading-tight sm:text-[30px]"
            id="attention-heading"
          >
            Handle these before they become customer problems.
          </h2>
          <p className="mt-2 max-w-[620px] text-[13px] leading-5 text-muted-foreground sm:text-[13.5px]">
            Sorted by operational risk, not by when the record was created.
          </p>
        </div>
        <Badge variant={items.length ? "secondary" : "outline"}>{items.length} open</Badge>
      </header>

      <Card className="mt-5 gap-0 py-0">
        <CardContent className="p-0">
          {items.length ? (
            <ol className="divide-y divide-border">
              {items.map((item, index) => (
                <li key={item.id}>
                  <AttentionRow index={index} item={item} />
                </li>
              ))}
            </ol>
          ) : (
            <div className="bg-accent/50 px-5 py-12 text-center sm:px-6">
              <span className="mx-auto grid size-12 place-items-center rounded-full bg-card text-accent-foreground ring-1 ring-foreground/10">
                <AdminIcon icon={PackageIcon} size={21} />
              </span>
              <h3 className="mt-4 font-serif text-[24px] font-medium">
                Nothing needs you right now.
              </h3>
              <p className="mx-auto mt-2 max-w-[380px] text-[13px] leading-5 text-muted-foreground">
                Payments, holds, delivery exceptions and stock warnings will appear here when they
                need attention.
              </p>
              <Link
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mt-4")}
                data-slot="button"
                href="/admin/orders"
              >
                Review open orders
                <AdminIcon icon={ArrowRight01Icon} size={15} />
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function AttentionRow({ item, index }: { item: AttentionItem; index: number }) {
  const tone = toneStyles[item.tone];
  const icon = item.eyebrow.toLowerCase().includes("hold")
    ? Clock01Icon
    : item.eyebrow.toLowerCase().includes("stock")
      ? PackageIcon
      : Alert02Icon;

  return (
    <Link
      className="group grid min-h-[88px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-4 py-4 text-foreground transition-colors hover:bg-surface-interactive hover:text-foreground sm:px-5"
      href={item.href}
    >
      <span
        aria-hidden="true"
        className={cn("font-mono text-[13px] font-semibold tabular-nums", tone.numeral)}
      >
        {String(index + 1).padStart(2, "0")}
      </span>
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2">
          <Badge className="gap-1" variant={tone.badge}>
            <AdminIcon icon={icon} size={11} />
            {item.eyebrow}
          </Badge>
        </span>
        <span className="mt-2 block text-[13.5px] font-semibold leading-5 sm:text-[14px]">
          {item.title}
        </span>
        <span className="mt-0.5 block text-[11.5px] leading-5 text-muted-foreground sm:text-[12px]">
          {item.detail}
        </span>
      </span>
      <span className="grid size-9 place-items-center rounded-full border border-border text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground">
        <AdminIcon icon={ArrowRight01Icon} size={16} />
      </span>
    </Link>
  );
}
