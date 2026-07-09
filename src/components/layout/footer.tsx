"use client";

import Link from "next/link";
import { useState } from "react";

const columns = [
  {
    title: "SHOP",
    links: [
      { label: "New arrivals", href: "/shop?sort=newest" },
      { label: "Best finds", href: "/shop?sort=reduced" },
      { label: "Women", href: "/shop?department=women" },
      { label: "Accessories", href: "/shop?category=accessories" },
    ],
  },
  {
    title: "COMPANY",
    links: [
      { label: "About Laitstyle", href: "/#how-it-works" },
      { label: "Our grading", href: "/#how-it-works" },
      { label: "Journal", href: "/#journal" },
      { label: "Account", href: "/account" },
    ],
  },
  {
    title: "SUPPORT",
    links: [
      { label: "Your orders", href: "/account?tab=orders" },
      { label: "Delivery addresses", href: "/account?tab=addresses" },
      { label: "Reservations", href: "/account?tab=reservations" },
      { label: "Email support", href: "mailto:care@laitstyle.ng" },
    ],
  },
];

export function Footer() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  function subscribe(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setMessage("Enter a valid email address.");
      return;
    }
    setMessage("You’re on the Laitstyle drop list.");
    setEmail("");
  }

  return (
    <footer className="px-6 pb-10 pt-11 max-sm:px-4">
      <div className="mx-auto grid max-w-[1240px] grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-4">
        <div className="relative flex min-h-[280px] flex-col justify-end overflow-hidden rounded-[16px] bg-[radial-gradient(120%_90%_at_20%_10%,#3B4A34,#1F2A1B)] p-8">
          <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_18%_30%,rgba(255,255,255,.5)_0_3px,transparent_4px),radial-gradient(circle_at_70%_20%,rgba(255,255,255,.4)_0_2px,transparent_3px),radial-gradient(circle_at_82%_68%,rgba(255,255,255,.45)_0_3px,transparent_4px),radial-gradient(circle_at_40%_80%,rgba(255,255,255,.35)_0_2px,transparent_3px)] opacity-70" />
          <div className="relative">
            <div className="mb-2 text-[12px] uppercase tracking-[.16em] text-white/70">Stay connected</div>
            <div className="mb-2.5 font-serif text-[30px] text-white">Be part of what&apos;s next</div>
            <p className="mb-[18px] max-w-[360px] text-[13px] leading-[1.5] text-white/78">
              Get first access to new one-of-one drops and restyle stories, shaped around conscious fashion.
            </p>
            <form className="flex max-w-[430px] gap-2 max-sm:flex-col" onSubmit={subscribe}>
              <label className="sr-only" htmlFor="footer-email">Email address</label>
              <input
                autoComplete="email"
                className="h-[46px] min-w-0 flex-1 rounded-full border border-white/30 bg-white/10 px-[18px] text-[13.5px] text-white outline-none placeholder:text-white/55 focus:border-white"
                id="footer-email"
                name="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email address…"
                spellCheck={false}
                type="email"
                value={email}
              />
              <button className="h-[46px] rounded-full bg-white px-[22px] text-[13.5px] font-semibold text-primary" type="submit">Subscribe</button>
            </form>
            <p aria-live="polite" className="mt-2 min-h-5 text-[11.5px] text-white/75">{message}</p>
          </div>
        </div>

        <div className="flex flex-col rounded-[16px] bg-[#20261C] p-8 text-white">
          <div className="grid flex-1 grid-cols-3 gap-5 max-sm:grid-cols-2">
            {columns.map((column) => (
              <div key={column.title}>
                <div className="mb-3.5 text-[11.5px] tracking-[.14em] text-white/50">{column.title}</div>
                <div className="flex flex-col gap-2.5 text-[13px]">
                  {column.links.map((item) => (
                    <Link className="text-white/85 hover:text-white" href={item.href} key={item.label}>{item.label}</Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap justify-between gap-2 border-t border-white/12 pt-4 text-[12.5px] text-white/60">
            <span>Contact</span>
            <a className="text-white/70 hover:text-white" href="mailto:care@laitstyle.ng">care@laitstyle.ng</a>
          </div>
          <div className="mt-2.5 text-[11.5px] text-white/40">© Laitstyle 2026. All rights reserved.</div>
        </div>
      </div>
    </footer>
  );
}
