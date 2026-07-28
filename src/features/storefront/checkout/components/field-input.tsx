"use client";

import { useState } from "react";
import { Field, FieldError, FieldSuccess } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function FieldInput({
  ariaLabel,
  error,
  onChange,
  placeholder,
  successMessage,
  type = "text",
  value,
  withRightPadding = false,
}: {
  ariaLabel: string;
  error?: string;
  onChange: (value: string) => void;
  placeholder: string;
  successMessage?: string;
  type?: string;
  value: string;
  withRightPadding?: boolean;
}) {
  const [touched, setTouched] = useState(false);
  const isValid = touched && !error && value.trim().length > 0;

  return (
    <Field data-invalid={Boolean(error)}>
      <Input
        aria-invalid={Boolean(error)}
        aria-label={ariaLabel}
        className={cn(withRightPadding && "pr-11")}
        inputSize="lg"
        isValid={isValid}
        onBlur={() => setTouched(true)}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
      <FieldError>{error}</FieldError>
      {!error && isValid ? <FieldSuccess>{successMessage ?? "Looks good"}</FieldSuccess> : null}
    </Field>
  );
}
