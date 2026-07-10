"use client";

import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

export function CustomerNoteForm({
  customerId,
  onSubmit,
}: {
  customerId: string;
  onSubmit: (body: string) => string | null;
}) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submitNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const actionError = onSubmit(body);
    if (actionError) {
      setError(actionError);
      return;
    }
    setBody("");
    setError(null);
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={submitNote}>
      <Field data-invalid={Boolean(error)}>
        <FieldLabel htmlFor={`customer-note-${customerId}`}>Add internal note</FieldLabel>
        <Textarea
          aria-invalid={Boolean(error)}
          autoComplete="off"
          id={`customer-note-${customerId}`}
          maxLength={600}
          name="internal-note"
          onChange={(event) => {
            setBody(event.target.value);
            if (error) setError(null);
          }}
          placeholder="Add sizing, delivery or relationship context…"
          rows={4}
          value={body}
        />
        <div className="flex items-start justify-between gap-3">
          <FieldDescription>Session-only. This note is not sent to the customer.</FieldDescription>
          <span className="shrink-0 text-[10.5px] text-muted-foreground tabular-nums">
            {body.length}/600
          </span>
        </div>
        <FieldError aria-live="polite">{error}</FieldError>
      </Field>
      <Button className="self-start" type="submit">
        Save internal note
      </Button>
    </form>
  );
}
