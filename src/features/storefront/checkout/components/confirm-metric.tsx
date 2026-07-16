export function ConfirmMetric({
  label,
  paid = false,
  value,
}: {
  label: string;
  paid?: boolean;
  value: string;
}) {
  return (
    <div className="flex-[1_1_160px]">
      <div className="mb-[5px] text-[11px] uppercase tracking-[.06em] text-[#A7A59B]">{label}</div>
      <div className="flex items-center gap-[7px] text-[15px] font-semibold tabular-nums">
        {value}
        {paid ? (
          <span className="rounded-[5px] bg-[#EAF0DD] px-1.5 py-0.5 text-[10px] font-bold text-[#5F7043]">
            PAID
          </span>
        ) : null}
      </div>
    </div>
  );
}
