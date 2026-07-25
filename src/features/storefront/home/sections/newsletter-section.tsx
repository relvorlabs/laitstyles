"use client";

import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";

export function NewsletterSection() {
  const [status, setStatus] = useState("");

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email =
      new FormData(event.currentTarget).get("email")?.toString().trim().toLowerCase() ?? "";
    setStatus(
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
        <form className="newsletter-form" id="newsletterForm" onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="newsletterEmail">Email address</label>
            <input
              autoComplete="email"
              id="newsletterEmail"
              name="email"
              placeholder="you@example.com"
              required
              type="email"
            />
          </div>
          <Button type="submit">Join the list</Button>
          <p aria-live="polite" className="newsletter-status" id="newsletterStatus">
            {status}
          </p>
        </form>
      </div>
    </section>
  );
}
