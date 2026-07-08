import Link from "next/link";
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
        <div className="relative flex min-h-[280px] flex-col justify-end overflow-hidden rounded-[16px] bg-[radial-gradient(120%_90%_at_20%_10%,#3B4A34,#1F2A1B)] p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_30%,rgba(255,255,255,.5)_0_3px,transparent_4px),radial-gradient(circle_at_70%_20%,rgba(255,255,255,.4)_0_2px,transparent_3px),radial-gradient(circle_at_82%_68%,rgba(255,255,255,.45)_0_3px,transparent_4px),radial-gradient(circle_at_40%_80%,rgba(255,255,255,.35)_0_2px,transparent_3px)] opacity-70" />
          <div className="relative">
            <div className="mb-2 text-[12px] uppercase tracking-[.16em] text-white/70">
              Stay Connected
            </div>
            <div className="mb-2.5 font-serif text-[30px] text-white">
              Be Part of What&apos;s Next
            </div>
            <div className="mb-[18px] max-w-[360px] text-[13px] leading-[1.5] text-white/78">
              Get first access to new one-of-one drops and restyle stories,
              shaped around conscious fashion.
            </div>
            <div className="flex max-w-[400px] gap-2">
              <Input
                placeholder="Email"
                className="h-[46px] flex-1 rounded-full border-white/30 bg-white/10 px-[18px] text-[13.5px] text-white placeholder:text-white/55"
              />
              <Button className="h-[46px] rounded-full bg-white px-[22px] text-[13.5px] font-semibold text-primary hover:bg-white/90">
                Subscribe
              </Button>
            </div>
          </div>
        </div>
        <div className="flex flex-col rounded-[16px] bg-[#20261C] p-8 text-white">
          <div className="grid flex-1 grid-cols-3 gap-5">
            {columns.map(([title, ...links]) => (
              <div key={title}>
                <div className="mb-3.5 text-[11.5px] tracking-[.14em] text-white/50">
                  {title}
                </div>
                <div className="flex flex-col gap-2.5 text-[13px] text-white/85">
                  {links.map((item) => (
                    <Link
                      key={item}
                      href={
                        item === "New Arrivals"
                          ? "/#justin"
                          : item === "Journal"
                            ? "/#journal"
                            : "#"
                      }
                      className="text-white/85"
                    >
                      {item}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap justify-between gap-2 border-t border-white/12 pt-4 text-[12.5px] text-white/60">
            <span>Contact Us</span>
            <span>+234 800 000 0000 · care@laitstyle.ng</span>
          </div>
          <div className="mt-2.5 text-[11.5px] text-white/40">
            © Laitstyle 2026. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
