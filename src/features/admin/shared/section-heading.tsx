import type { ReactNode } from "react";

type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function SectionHeading({ eyebrow, title, description, action }: SectionHeadingProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {eyebrow}
        </p>
        <h2 className="mt-1.5 font-serif text-[27px] font-medium leading-tight sm:text-[30px]">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 max-w-[620px] text-[13px] leading-5 text-muted-foreground sm:text-[13.5px]">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
