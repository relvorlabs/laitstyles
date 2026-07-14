import {
  Call02Icon,
  InstagramIcon,
  MailAtSign01Icon,
  NewTwitterIcon,
  TiktokIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { BrandMark } from "@/components/layout/brand-mark";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Phase 2 shell footer — real destinations only. Help/policy/track-order links
// are added in Phase 3 when those routes exist; newsletter capture lands in
// Phase 9 (Resend). No dead links, no fake form.
const shopLinks = [
  { label: "New in", href: "/shop" },
  { label: "Shop all", href: "/shop" },
];
const accountLinks = [
  { label: "My account", href: "/account" },
  { label: "Checkout", href: "/checkout" },
];
const socials = [
  { label: "Instagram", href: "https://instagram.com", icon: InstagramIcon },
  { label: "TikTok", href: "https://tiktok.com", icon: TiktokIcon },
  { label: "X", href: "https://x.com", icon: NewTwitterIcon },
];

export function Footer() {
  return (
    <footer className="px-6 pb-10 pt-11">
      <div className="mx-auto grid max-w-[1240px] grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] gap-4">
        {/* Editorial CTA (newsletter capture arrives in Phase 9). */}
        <div className="relative flex min-h-[280px] flex-col justify-end overflow-hidden rounded-[16px] border border-brand-sage/35 bg-brand-sage-strong p-8 text-brand-bone">
          <div className="absolute -right-12 -top-16 size-52 rounded-full border border-brand-bone/15" />
          <div className="absolute -right-3 top-8 size-28 rounded-full border border-brand-bone/10" />
          <div className="relative">
            <div className="mb-2 text-[12px] uppercase tracking-[.16em] text-brand-bone/72">
              Curated premium pre-owned
            </div>
            <div className="mb-2.5 font-serif text-[30px] italic text-brand-bone">
              Great fashion, second time round
            </div>
            <div className="mb-[18px] max-w-[360px] text-[13px] leading-[1.5] text-brand-bone/80">
              Hand-picked pre-owned and vintage — inspected, cleaned and honestly graded. Ready to
              wear, at a fraction of new.
            </div>
            <Link
              className={cn(
                buttonVariants({ size: "lg" }),
                "rounded-full bg-brand-bone px-7 text-brand-ink hover:bg-brand-bone-strong",
              )}
              href="/shop"
            >
              Shop new in
            </Link>
          </div>
        </div>

        <div className="flex flex-col rounded-[16px] bg-sidebar p-8 text-sidebar-foreground">
          <div className="mb-7">
            <BrandMark className="text-sidebar-foreground" />
          </div>
          <div className="grid flex-1 grid-cols-2 gap-5">
            <FooterColumn title="SHOP" links={shopLinks} />
            <FooterColumn title="ACCOUNT" links={accountLinks} />
          </div>

          <div className="mt-7 flex flex-col gap-2.5 border-t border-sidebar-border pt-5 text-[13px] text-sidebar-foreground/80">
            <a
              className="inline-flex items-center gap-2.5 hover:text-brand-sage-soft"
              href="mailto:care@laitstyle.ng"
            >
              <HugeiconsIcon
                aria-hidden="true"
                icon={MailAtSign01Icon}
                size={16}
                strokeWidth={1.6}
              />
              care@laitstyle.ng
            </a>
            <a
              className="inline-flex items-center gap-2.5 hover:text-brand-sage-soft"
              href="tel:+2348000000000"
            >
              <HugeiconsIcon aria-hidden="true" icon={Call02Icon} size={16} strokeWidth={1.6} />
              +234 800 000 0000
            </a>
          </div>

          <div className="mt-5 flex items-center gap-2">
            {socials.map((social) => (
              <a
                aria-label={social.label}
                className="flex size-9 items-center justify-center rounded-full border border-sidebar-border text-sidebar-foreground/80 transition-colors hover:text-brand-sage-soft"
                href={social.href}
                key={social.label}
                rel="noreferrer"
                target="_blank"
              >
                <HugeiconsIcon aria-hidden="true" icon={social.icon} size={17} strokeWidth={1.6} />
              </a>
            ))}
          </div>

          <div className="mt-6 text-[11.5px] text-sidebar-foreground/40">
            © Laitstyle {new Date().getFullYear()}. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <div className="mb-3.5 text-[11.5px] tracking-[.14em] text-sidebar-foreground/50">
        {title}
      </div>
      <div className="flex flex-col gap-2.5 text-[13px]">
        {links.map((item) => (
          <Link
            className="text-sidebar-foreground/85 transition-colors hover:text-brand-sage-soft"
            href={item.href}
            key={item.label}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
