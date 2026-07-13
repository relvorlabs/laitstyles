import {
  Alert02Icon,
  ArrowRight01Icon,
  Clock01Icon,
  PackageIcon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ControlRoomIcon } from "@/features/control-room/shared/control-room-icon";
import { SectionHeading } from "@/features/control-room/shared/section-heading";
import type { AttentionItem, AttentionTone } from "@/lib/control-room/types";
import { cn } from "@/lib/utils";

type AttentionQueueProps = {
  items: AttentionItem[];
};

const toneStyles: Record<
  AttentionTone,
  { badge: "destructive" | "secondary" | "outline"; icon: string; border: string }
> = {
  critical: {
    badge: "destructive",
    icon: "bg-destructive/10 text-destructive",
    border: "border-l-destructive",
  },
  warning: {
    badge: "secondary",
    icon: "bg-warning/18 text-warning-foreground",
    border: "border-l-warning",
  },
  info: {
    badge: "outline",
    icon: "bg-accent text-accent-foreground",
    border: "border-l-brand-sage",
  },
};

export function AttentionQueue({ items }: AttentionQueueProps) {
  return (
    <section className="scroll-mt-24" id="attention">
      <SectionHeading
        description="The few things most likely to interrupt fulfilment, cash flow or availability today."
        eyebrow="Owner attention"
        title="Handle these before they become customer problems."
      />

      <Card className="mt-5 gap-0 py-0">
        <CardHeader className="border-b border-border px-5 py-4 sm:px-6">
          <CardTitle className="flex items-center justify-between gap-3 text-[13px]">
            <span>Priority queue</span>
            <Badge variant={items.length ? "secondary" : "outline"}>{items.length} open</Badge>
          </CardTitle>
          <CardDescription className="text-[12px]">
            Sorted by operational risk, not by when the record was created.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {items.length ? (
            <div className="divide-y divide-border">
              {items.map((item) => (
                <AttentionRow item={item} key={item.id} />
              ))}
            </div>
          ) : (
            <div className="px-5 py-10 text-center sm:px-6">
              <span className="mx-auto grid size-12 place-items-center rounded-full bg-accent text-accent-foreground">
                <ControlRoomIcon icon={PackageIcon} size={21} />
              </span>
              <h3 className="mt-4 font-serif text-[24px] font-medium">The queue is clear.</h3>
              <p className="mx-auto mt-2 max-w-[380px] text-[13px] leading-5 text-muted-foreground">
                Payments, holds, delivery exceptions and stock warnings will appear here when they
                need attention.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function AttentionRow({ item }: { item: AttentionItem }) {
  const tone = toneStyles[item.tone];
  const icon = item.eyebrow.toLowerCase().includes("hold")
    ? Clock01Icon
    : item.eyebrow.toLowerCase().includes("stock")
      ? PackageIcon
      : Alert02Icon;

  return (
    <Link
      className={cn(
        "group grid min-h-[92px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-l-[3px] px-4 py-4 text-foreground hover:bg-secondary/55 hover:text-foreground sm:gap-4 sm:px-5",
        tone.border,
      )}
      href={item.href}
    >
      <span className={cn("grid size-10 place-items-center rounded-[12px]", tone.icon)}>
        <ControlRoomIcon icon={icon} size={18} />
      </span>
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2">
          <Badge variant={tone.badge}>{item.eyebrow}</Badge>
        </span>
        <span className="mt-2 block text-[13.5px] font-semibold leading-5 sm:text-[14px]">
          {item.title}
        </span>
        <span className="mt-0.5 block text-[11.5px] leading-5 text-muted-foreground sm:text-[12px]">
          {item.detail}
        </span>
      </span>
      <span className="grid size-9 place-items-center rounded-full border border-border text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground">
        <ControlRoomIcon icon={ArrowRight01Icon} size={16} />
      </span>
    </Link>
  );
}
