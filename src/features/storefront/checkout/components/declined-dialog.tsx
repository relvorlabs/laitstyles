import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DeclinedDialog({
  dismiss,
  payNow,
  timer,
}: {
  dismiss: () => void;
  payNow: () => void;
  timer: string;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-5">
      <div className="absolute inset-0 bg-[#1B1A17]/50 animate-[leemFade_.25s_ease]" />
      <div
        className="relative w-full max-w-[400px] rounded-lg bg-card px-8 py-[38px] text-center shadow-[0_30px_80px_rgba(0,0,0,.28)] animate-[leemPop_.35s_cubic-bezier(.33,1,.68,1)]"
        role="alertdialog"
        aria-label="Payment declined"
      >
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full border border-[#E4C4BF] bg-[#FBF0EE]">
          <XCircle className="size-7 text-destructive" strokeWidth={2.2} />
        </div>
        <h3 className="m-0 mb-2 font-serif text-[22px] font-medium">Payment declined</h3>
        <p className="m-0 mb-2 text-[13.5px] leading-[1.6] text-[#57554E]">
          Your bank declined the charge &mdash; no money left your account.{" "}
          <strong className="text-primary">Your pieces are still held</strong>, so you can try again
          right away.
        </p>
        <div className="mb-[22px] text-xs text-[#8A887E]">Held for {timer} more</div>
        <Button size="lg" className="mb-2.5 w-full" onClick={payNow}>
          Try payment again
        </Button>
        <Button size="lg" onClick={dismiss} variant="ghost">
          Choose another method
        </Button>
      </div>
    </div>
  );
}
