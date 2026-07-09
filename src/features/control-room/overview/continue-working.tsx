import Link from "next/link";
import { ArrowRight01Icon, PackageIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";
import { ControlRoomIcon } from "@/features/control-room/shared/control-room-icon";
import type { ContinueTask } from "@/lib/control-room/types";

export function ContinueWorking({ task }: { task?: ContinueTask }) {
  if (!task) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="font-serif text-[27px] font-medium">
            Nothing unfinished.
          </CardTitle>
          <CardDescription>
            Drafts and interrupted operational work will return here.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="h-full bg-[#E7EBDD] ring-[#C9D1B8] scroll-mt-24" id="continue-working">
      <CardHeader>
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="grid size-11 place-items-center rounded-[13px] bg-card text-[#4A5540] ring-1 ring-foreground/10">
            <ControlRoomIcon icon={PackageIcon} size={20} />
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5F6C4D]">
            Continue working
          </span>
        </div>
        <CardTitle className="font-serif text-[28px] font-medium leading-tight">
          {task.title}
        </CardTitle>
        <CardDescription className="mt-2 max-w-[460px] text-[13px] leading-5 text-[#59644A]">
          {task.detail}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Progress value={task.progress}>
          <ProgressLabel className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#59644A]">
            Readiness
          </ProgressLabel>
          <ProgressValue className="text-[#59644A]" />
        </Progress>
      </CardContent>
      <CardFooter className="border-[#C9D1B8] bg-white/45">
        <Button
          className="h-10 rounded-full px-4"
          render={<Link href={task.href} />}
          size="lg"
        >
          Review what is missing
          <ControlRoomIcon icon={ArrowRight01Icon} size={16} />
        </Button>
      </CardFooter>
    </Card>
  );
}
