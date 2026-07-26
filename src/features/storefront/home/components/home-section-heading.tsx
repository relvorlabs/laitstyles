"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { RevealDiv } from "@/features/storefront/shared/reveal";
import { IconArrow } from "@/modules/storefront-shell/ui/storefront-icons";

export function HomeSectionHeading({
  eyebrow,
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  eyebrow: string;
  title: ReactNode;
  subtitle?: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <RevealDiv className="section-head">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2 className="section-title">{title}</h2>
        {subtitle ? <p className="section-subtitle">{subtitle}</p> : null}
      </div>
      <Button type="button" onClick={onAction} variant="link">
        {actionLabel} <IconArrow />
      </Button>
    </RevealDiv>
  );
}
