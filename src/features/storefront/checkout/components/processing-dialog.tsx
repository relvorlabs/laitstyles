import { Button } from "@/components/ui/button";

export function ProcessingDialog({
  gatewayName,
  markPlaced,
  simulateDecline,
}: {
  gatewayName: string;
  markPlaced: () => void;
  simulateDecline: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-5">
      <div className="absolute inset-0 bg-[#1B1A17]/50 animate-[leemFade_.25s_ease]" />
      <div
        className="relative w-full max-w-[400px] rounded-lg bg-card px-8 py-[38px] text-center shadow-[0_30px_80px_rgba(0,0,0,.28)] animate-[leemPop_.35s_cubic-bezier(.33,1,.68,1)]"
        role="dialog"
        aria-label="Processing payment"
      >
        <div className="mx-auto mb-[22px] size-[52px] rounded-full border-[3px] border-[#ECEAE3] border-t-primary animate-spin" />
        <h3 className="m-0 mb-2 font-serif text-[22px] font-medium">
          Redirecting to {gatewayName}...
        </h3>
        <p className="m-0 mb-[22px] text-[13.5px] leading-[1.6] text-[#57554E]">
          Complete your payment in the secure {gatewayName} window. Your pieces stay held until
          you&apos;re back.
        </p>
        <Button size="lg" className="mb-2.5 w-full" onClick={markPlaced}>
          I&apos;ve completed payment
        </Button>
        <Button size="lg" onClick={simulateDecline} variant="ghost">
          Payment failed? Simulate a declined card
        </Button>
      </div>
    </div>
  );
}
