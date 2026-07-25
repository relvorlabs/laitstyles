"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { openImageViewer } from "@/features/storefront/shared/storefront-overlay-events";
import {
  useStorefrontCatalogData,
  useStorefrontOverlay,
} from "@/features/storefront/shared/storefront-runtime";
import type { StorefrontOverlayId } from "@/stores/storefront-ui.store";

type TrustItem = {
  title: string;
  body: string;
  overlay: "conditionModal" | "measureModal" | "deliveryModal" | "imageViewer";
  icon: ReactNode;
};

const trustItems: TrustItem[] = [
  { title: "Individually inspected", body: "Condition checked before listing", overlay: "conditionModal", icon: <svg aria-hidden="true" className="h-[21px] w-[21px] [stroke-width:1.35]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="m9 12 2 2 4-5" /><circle cx="12" cy="12" r="9" /></svg> },
  { title: "Measured by hand", body: "Fit guidance beyond the size tag", overlay: "measureModal", icon: <svg aria-hidden="true" className="h-[21px] w-[21px] [stroke-width:1.35]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 8h16M7 5v6M11 5v3M15 5v6M19 5v3M4 16h16" /></svg> },
  { title: "Exact-item photography", body: "Front, back, details and labels", overlay: "imageViewer", icon: <svg aria-hidden="true" className="h-[21px] w-[21px] [stroke-width:1.35]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect height="14" rx="2" width="18" x="3" y="5" /><circle cx="9" cy="10" r="2" /><path d="m21 15-5-5L5 19" /></svg> },
  { title: "Flaws clearly disclosed", body: "No surprises when the piece arrives", overlay: "conditionModal", icon: <svg aria-hidden="true" className="h-[21px] w-[21px] [stroke-width:1.35]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.7 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z" /></svg> },
  { title: "Nationwide delivery", body: "Estimate before checkout", overlay: "deliveryModal", icon: <svg aria-hidden="true" className="h-[21px] w-[21px] [stroke-width:1.35]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z" /><circle cx="7" cy="18" r="2" /><circle cx="18" cy="18" r="2" /></svg> },
];

export function TrustSection() {
  const overlay = useStorefrontOverlay();
  const { products } = useStorefrontCatalogData();
  const imageProduct = products[0];

  const openItem = (item: TrustItem) => {
    if (item.overlay === "imageViewer") {
      if (imageProduct) openImageViewer({ productId: imageProduct.id, index: 0 });
      return;
    }
    overlay.open(item.overlay as StorefrontOverlayId);
  };

  return (
    <section className="border-y border-[var(--line)] bg-[var(--bone-2)]">
      <div className="shell grid grid-cols-5 max-[860px]:grid-cols-2 max-[600px]:grid-cols-1">
        {trustItems.map((item, index, list) => (
          <Button
            className={`h-auto min-h-[130px] flex-col items-start justify-between whitespace-normal py-5 text-left ${index === list.length - 1 ? "max-[860px]:col-span-2" : ""}`}
            key={item.title}
            onClick={() => openItem(item)}
            type="button"
            variant="ghost"
          >
            {item.icon}
            <span className="mt-[5px] block text-[0.73rem] text-[var(--muted)]"><strong className="text-[0.9rem] text-[var(--ink)]">{item.title}</strong><span className="mt-[5px] block">{item.body}</span></span>
          </Button>
        ))}
      </div>
    </section>
  );
}
