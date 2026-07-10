import { HugeiconsIcon } from "@hugeicons/react";
import type { ComponentProps } from "react";

export type ControlRoomIconData = ComponentProps<typeof HugeiconsIcon>["icon"];

type ControlRoomIconProps = {
  icon: ControlRoomIconData;
  className?: string;
  size?: number;
  strokeWidth?: number;
};

export function ControlRoomIcon({
  icon,
  className,
  size = 18,
  strokeWidth = 1.6,
}: ControlRoomIconProps) {
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
