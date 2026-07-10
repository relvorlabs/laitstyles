import Link from "next/link";
import { BrandMark } from "@/components/layout/brand-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const columns = [
  ["SHOP", "New Arrivals", "Best Finds", "Collections", "Sale"],
  ["COMPANY", "About Us", "Sustainability", "Journal", "Careers"],
  ["SUPPORT", "Help Center", "Shipping & Returns", "FAQ"],
];

export function Footer() {
  return (
    <footer className="px-6 pb-10 pt-11">
      <div className="mx-auto grid max-w-[1240px] grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-4">
        <div className="relative flex min-h-[280px] flex-col justify-end overflow-hidden rounded-[16px] border border-brand-sage/35 bg-brand-sage-strong p-8 text-brand-bone">
          <div className="absolute -right-12 -top-16 size-52 rounded-full border border-brand-bone/15" />
          <div className="absolute -right-3 top-8 size-28 rounded-full border border-brand-bone/10" />
          <div className="relative">
            <div className="mb-2 text-[12px] uppercase tracking-[.16em] text-brand-bone/72">
              Stay connected
            </div>
            <div className="mb-2.5 font-serif text-[30px] text-brand-bone">
              Be part of what&apos;s next
            </div>
            <div className="mb-[18px] max-w-[360px] text-[13px] leading-[1.5] text-brand-bone/80">
              Get first access to new one-of-one drops and restyle stories,
              shaped around conscious fashion.
            </div>
            <div className="flex max-w-[400px] gap-2">
              <Input
                className="h-[46px] flex-1 rounded-full border-brand-bone/30 bg-brand-ink/15 px-[18px] text-[13.5px] text-brand-bone placeholder:text-brand-bone/60"
                placeholder="Email"
              />
              <Button className="h-[46px] rounded-full bg-brand-bone px-[22px] text-[13.5px] font-semibold text-brand-ink hover:bg-brand-bone-strong">
                Subscribe
              </Button>
            </div>
          </div>
        </div>
        <div className="flex flex-col rounded-[16px] bg-sidebar p-8 text-sidebar-foreground">
          <div className="mb-7">
            <BrandMark className="text-sidebar-foreground" />
          </div>
          <div className="grid flex-1 grid-cols-3 gap-5">
            {columns.map(([title, ...links]) => (
              <div key={title}>
                <div className="mb-3.5 text-[11.5px] tracking-[.14em] text-sidebar-foreground/50">
                  {title}
                </div>
                <div className="flex flex-col gap-2.5 text-[13px] text-sidebar-foreground/85">
                  {links.map((item) => (
                    <Link
                      className="text-sidebar-foreground/85 hover:text-brand-sage-soft"
                      href={
                        item === "New Arrivals"
                          ? "/#justin"
                          : item === "Journal"
                            ? "/#journal"
                            : "#"
                      }
                      key={item}
                    >
                      {item}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap justify-between gap-2 border-t border-sidebar-border pt-4 text-[12.5px] text-sidebar-foreground/60">
            <span>Contact us</span>
            <span>+234 800 000 0000 · care@laitstyle.ng</span>
          </div>
          <div className="mt-2.5 text-[11.5px] text-sidebar-foreground/40">
            © Laitstyle 2026. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
