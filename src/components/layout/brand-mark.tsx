export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex shrink-0 items-center gap-[9px]">
      <svg
        width={compact ? 20 : 22}
        height={compact ? 20 : 22}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
      >
        <path d="M3 15l9-9 9 9" />
        <path d="M7 11l5-5 5 5" />
      </svg>
      <span
        className={
          compact
            ? "text-[14px] font-semibold tracking-[.24em]"
            : "text-[16px] font-semibold tracking-[.28em]"
        }
      >
        LAITSTYLE
      </span>
    </span>
  );
}
