"use client";

import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel, FieldSuccess } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function NewsletterSection() {
  const [status, setStatus] = useState("");
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);

  const trimmedEmail = email.trim();
  const isValidEmail = emailPattern.test(trimmedEmail);
  const showError = touched && trimmedEmail.length > 0 && !isValidEmail;
  const showSuccess = touched && isValidEmail;

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched(true);
    const normalized = trimmedEmail.toLowerCase();
    if (!emailPattern.test(normalized)) {
      setStatus("Enter a valid email address.");
      return;
    }
    setStatus(
      normalized === "duplicate@example.com"
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
        <form className="newsletter-form" id="newsletterForm" noValidate onSubmit={onSubmit}>
          <Field data-invalid={showError}>
            <FieldLabel className="eyebrow" htmlFor="newsletterEmail">
              Email address
            </FieldLabel>
            <Input
              aria-invalid={showError}
              autoComplete="email"
              id="newsletterEmail"
              inputSize="lg"
              isValid={showSuccess}
              name="email"
              onBlur={() => setTouched(true)}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              type="email"
              value={email}
            />
            {showError ? <FieldError>Enter a valid email address.</FieldError> : null}
            {showSuccess ? <FieldSuccess>Looks good.</FieldSuccess> : null}
          </Field>
          <Button type="submit">Join the list</Button>
          <p aria-live="polite" className="newsletter-status" id="newsletterStatus">
            {status}
          </p>
        </form>
      </div>
    </section>
  );
}
