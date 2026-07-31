"use client";

import { XIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Eyebrow, IconButton } from "../components/account-primitives";

type EyebrowTone = "sage" | "oxblood" | "muted";

const eyebrowToneClass: Record<EyebrowTone, string> = {
  sage: "text-[var(--acc-sage-deep)]",
  oxblood: "text-[var(--acc-oxblood)]",
  muted: "text-[var(--acc-muted)]",
};

const sizeClass = {
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
  "2xl": "sm:max-w-2xl",
  "4xl": "sm:max-w-4xl",
} as const;

export function AccountModal({
  open,
  onClose,
  title,
  eyebrow,
  eyebrowTone = "sage",
  showClose = true,
  size = "lg",
  scroll = false,
  fullMobile = false,
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  eyebrowTone?: EyebrowTone;
  showClose?: boolean;
  size?: keyof typeof sizeClass;
  scroll?: boolean;
  fullMobile?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Dialog
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      open={open}
    >
      <DialogContent
        className={cn(
          "lst-account block gap-0 rounded-[18px] bg-[var(--acc-surface)] p-5 text-[var(--acc-ink)] shadow-[var(--acc-shadow-md)] ring-0 sm:p-7",
          sizeClass[size],
          scroll && "max-h-[94vh] overflow-y-auto",
          fullMobile &&
            "h-full max-h-none w-full max-w-full overflow-y-auto rounded-none sm:h-auto sm:max-h-[94vh] sm:rounded-[18px]",
          className,
        )}
        showCloseButton={false}
      >
        {showClose ? (
          <div className="flex items-start justify-between gap-4">
            <div>
              {eyebrow ? (
                <Eyebrow className={eyebrowToneClass[eyebrowTone]}>{eyebrow}</Eyebrow>
              ) : null}
              <DialogTitle className={cn("font-serif text-4xl font-normal", eyebrow && "mt-3")}>
                {title}
              </DialogTitle>
            </div>
            <IconButton aria-label="Close" onClick={onClose}>
              <XIcon className="size-[18px]" />
            </IconButton>
          </div>
        ) : (
          <div>
            {eyebrow ? (
              <Eyebrow className={eyebrowToneClass[eyebrowTone]}>{eyebrow}</Eyebrow>
            ) : null}
            <DialogTitle className={cn("font-serif text-4xl font-normal", eyebrow && "mt-3")}>
              {title}
            </DialogTitle>
          </div>
        )}
        {children}
      </DialogContent>
    </Dialog>
  );
}
