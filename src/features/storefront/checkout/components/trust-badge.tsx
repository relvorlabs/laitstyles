import type { ReactNode } from "react";

export function TrustBadge({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      {icon}
      <span className="text-[11.5px] text-[#57554E]">{label}</span>
    </div>
  );
}
