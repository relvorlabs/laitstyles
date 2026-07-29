import { HugeiconsIcon } from "@hugeicons/react";
import type { ComponentProps } from "react";

export type ProductAdminIconData = ComponentProps<typeof HugeiconsIcon>["icon"];

export function AdminIcon({
  icon,
  className,
  size = 18,
  strokeWidth = 1.6,
}: {
  icon: ProductAdminIconData;
  className?: string;
  size?: number;
  strokeWidth?: number;
}) {
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
