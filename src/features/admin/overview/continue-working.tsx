import { ArrowRight01Icon, PackageIcon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { AdminIcon } from "@/features/admin/shared/admin-icon";
import type { ContinueTask } from "@/lib/admin/shared/types";

export function ContinueWorking({ task }: { task?: ContinueTask }) {
  if (!task) {
    return (
      <Card className="self-start">
        <CardHeader>
          <CardTitle className="font-serif text-[27px] font-medium">Nothing unfinished.</CardTitle>
          <CardDescription>
            Drafts and interrupted operational work will return here.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card
      className="self-start scroll-mt-24 border-brand-sage/35 bg-accent/45 ring-brand-sage/25"
      id="continue-working"
    >
      <CardHeader>
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="grid size-11 place-items-center rounded-[13px] bg-card text-accent-foreground ring-1 ring-foreground/10">
            <AdminIcon icon={PackageIcon} size={20} />
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-foreground/78">
            Continue working
          </span>
        </div>
        <CardTitle className="font-serif text-[28px] font-medium leading-tight">
          {task.title}
        </CardTitle>
        <CardDescription className="mt-2 max-w-[460px] text-[13px] leading-5 text-muted-foreground">
          {task.detail}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Progress value={task.progress}>
          <ProgressLabel className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Readiness
          </ProgressLabel>
          <ProgressValue className="text-muted-foreground" />
        </Progress>
      </CardContent>
      <CardFooter className="border-brand-sage/25 bg-card/45">
        <Link
          className={buttonVariants({
            size: "lg",
          })}
          href={task.href}
        >
          Review what is missing
          <AdminIcon icon={ArrowRight01Icon} size={16} />
        </Link>
      </CardFooter>
    </Card>
  );
}
