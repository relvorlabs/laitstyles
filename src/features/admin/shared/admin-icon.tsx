import { HugeiconsIcon } from "@hugeicons/react";
import type { ComponentProps } from "react";

export type AdminIconData = ComponentProps<typeof HugeiconsIcon>["icon"];

type AdminIconProps = {
  icon: AdminIconData;
  className?: string;
  size?: number;
  strokeWidth?: number;
};

export function AdminIcon({
  icon,
  className,
  size = 18,
  strokeWidth = 1.6,
}: AdminIconProps) {
  return (
    <HugeiconsIcon
      aria-hidden="true"
      className={className}
      icon={icon}
      size={size}
      strokeWidth={strokeWidth}
    />
  );
}
