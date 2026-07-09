import Link from "next/link";
import {
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  PackageIcon,
  Settings01Icon,
  Store01Icon,
} from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ControlRoomIcon } from "@/features/control-room/shared/control-room-icon";

const setupSteps = [
  {
    title: "Add the first product",
    detail: "Choose a unique piece, multiple units or product variants.",
    icon: PackageIcon,
    phase: "Inventory setup",
  },
  {
    title: "Choose delivery options",
    detail: "Set Lagos, interstate and pickup expectations in business language.",
    icon: Store01Icon,
    phase: "Store settings",
  },
  {
    title: "Confirm selling preferences",
    detail: "Review hold duration, payments and low-stock defaults.",
    icon: Settings01Icon,
    phase: "Store settings",
  },
] as const;

export function NewStoreOverview() {
  return (
    <div className="mx-auto flex w-full max-w-[1220px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <section className="overflow-hidden rounded-[22px] bg-primary text-primary-foreground">
        <div className="grid gap-8 px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-[1.15fr_.85fr] lg:items-center lg:px-10 lg:py-12">
          <div>
            <Badge
              className="border-white/[0.14] bg-white/[0.08] text-[#D9E1C9]"
              variant="outline"
            >
              New store workspace
            </Badge>
            <h1 className="mt-5 max-w-[690px] text-balance font-serif text-[40px] font-medium leading-[.98] sm:text-[54px]">
              Set up the shop in the order a real store needs it.
            </h1>
            <p className="mt-5 max-w-[620px] text-[14px] leading-6 text-white/[0.72] sm:text-[15px]">
              Start with products, delivery and how customers can pay. Sales charts and fulfilment queues appear only after the store has activity worth managing.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button
                className="h-11 rounded-full bg-[#D9E1C9] px-5 text-primary hover:bg-[#C9D5B3]"
                render={<Link href="/" />}
                size="lg"
              >
                Preview storefront
                <ControlRoomIcon icon={ArrowRight01Icon} size={16} />
              </Button>
              <Button
                className="h-11 rounded-full border-white/[0.22] px-5 text-white hover:bg-white/[0.08] hover:text-white"
                render={<Link href="/admin" />}
                size="lg"
                variant="outline"
              >
                View active-store example
              </Button>
            </div>
          </div>

          <div className="rounded-[18px] border border-white/[0.14] bg-white/[0.07] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/[0.64]">
                Store readiness
              </span>
              <span className="font-serif text-[28px] tabular-nums">20%</span>
            </div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-1/5 rounded-full bg-[#AFC48A]" />
            </div>
            <p className="mt-4 text-[12.5px] leading-5 text-white/[0.68]">
              The store identity exists. Products, delivery and selling preferences still need owner decisions.
            </p>
          </div>
        </div>
      </section>

      <section className="grid scroll-mt-24 gap-4 lg:grid-cols-[1fr_340px]" id="setup">
        <Card className="gap-0 py-0">
          <CardHeader className="border-b border-border px-5 py-5 sm:px-6">
            <CardTitle className="font-serif text-[29px] font-medium">
              Build the operating foundation
            </CardTitle>
            <CardDescription className="mt-1 text-[13px] leading-5">
              These steps unlock in sequence as their Control Room phases are completed.
            </CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-border p-0">
            {setupSteps.map((step, index) => (
              <article
                className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 px-5 py-5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-4 sm:px-6"
                key={step.title}
              >
                <span className="grid size-11 place-items-center rounded-[13px] bg-secondary text-[#4A5540]">
                  <ControlRoomIcon icon={step.icon} size={20} />
                </span>
                <div className="min-w-0">
                  <div className="text-[13.5px] font-semibold">
                    {index + 1}. {step.title}
                  </div>
                  <p className="mt-1 text-[12px] leading-5 text-muted-foreground">
                    {step.detail}
                  </p>
                </div>
                <Badge className="col-start-2 mt-1 sm:col-start-auto sm:mt-0" variant="outline">
                  {step.phase}
                </Badge>
              </article>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-[#E7EBDD] ring-[#C9D1B8]">
          <Empty className="min-h-[320px] border-0 p-5">
            <EmptyHeader>
              <EmptyMedia className="grid size-14 place-items-center rounded-full bg-card text-[#4A5540] ring-1 ring-foreground/10">
                <ControlRoomIcon icon={CheckmarkCircle02Icon} size={24} />
              </EmptyMedia>
              <EmptyTitle className="font-serif text-[25px] font-medium">
                No empty analytics theatre
              </EmptyTitle>
              <EmptyDescription className="text-[#59644A]">
                Revenue, stock warnings and delivery queues appear when there is real operating data to show.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Badge className="bg-card text-[#4A5540]" variant="secondary">
                Calm by default
              </Badge>
            </EmptyContent>
          </Empty>
        </Card>
      </section>
    </div>
  );
}
