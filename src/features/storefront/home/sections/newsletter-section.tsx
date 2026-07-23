"use client";

import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { useStorefront } from "@/features/storefront/shared/storefront-provider";

export function NewsletterSection() {
  const storefront = useStorefront();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email =
      new FormData(event.currentTarget).get("email")?.toString().trim().toLowerCase() ?? "";
    storefront.setNewsletterStatus(
      email === "duplicate@example.com"
        ? "This email is already on the drop list."
        : "You are on the list. Watch your inbox for the next drop.",
    );
  };

  return (
    <section className="newsletter-band">
      <div className="shell newsletter-inner">
        <div>
          <span className="eyebrow">Drop alerts</span>
          <h2 className="newsletter-title">
            See the best pieces <em>before they go.</em>
          </h2>
        </div>
        <form id="newsletterForm" className="newsletter-form" onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="newsletterEmail">Email address</label>
            <input
              id="newsletterEmail"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
            />
          </div>
          <Button type="submit">Join the list</Button>
          <p id="newsletterStatus" className="newsletter-status" aria-live="polite">
            {storefront.newsletterStatus}
          </p>
        </form>
      </div>
    </section>
  );
}
