"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { StarIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { startTransition, useActionState, useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { reviewInputSchema } from "@/modules/reviews/schema";
import type { ReviewActionState, ReviewInput } from "@/modules/reviews/types";

export type ReviewFormIntent = "create" | "edit" | "revise" | "resubmit";
export type ReviewFormAction = (
  previous: ReviewActionState,
  formData: FormData,
) => Promise<ReviewActionState>;

export interface ReviewFormProps {
  orderNumber: string;
  orderLineId: string;
  intent: ReviewFormIntent;
  submitAction: ReviewFormAction;
  withdrawAction: ReviewFormAction;
  defaultValues?: Partial<ReviewInput>;
  allowWithdrawal?: boolean;
  canSubmit?: boolean;
  unavailableMessage?: string;
}

const initialActionState: ReviewActionState = { status: "idle" };
const ratingOptions = [1, 2, 3, 4, 5] as const;

const submitCopy: Record<ReviewFormIntent, string> = {
  create: "Submit review",
  edit: "Update review",
  revise: "Submit revised review",
  resubmit: "Resubmit review",
};

export function ReviewForm({
  orderNumber,
  orderLineId,
  intent,
  submitAction,
  withdrawAction,
  defaultValues,
  allowWithdrawal = false,
  canSubmit = true,
  unavailableMessage,
}: ReviewFormProps) {
  const form = useForm<ReviewInput>({
    resolver: zodResolver(reviewInputSchema),
    defaultValues: {
      rating: defaultValues?.rating ?? 0,
      title: defaultValues?.title ?? "",
      body: defaultValues?.body ?? "",
      fit: defaultValues?.fit ?? "not_applicable",
    },
  });
  const [state, formAction, pending] = useActionState(submitAction, initialActionState);
  const [withdrawState, withdrawFormAction, withdrawPending] = useActionState(
    withdrawAction,
    initialActionState,
  );
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const bodyValue = useWatch({ control: form.control, name: "body" }) ?? "";
  const isMutating = pending || withdrawPending;
  const actionError =
    state.status === "error"
      ? { title: "We could not save your review", state }
      : withdrawState.status === "error"
        ? { title: "We could not withdraw your review", state: withdrawState }
        : null;

  useEffect(() => {
    if (!form.formState.isDirty || isMutating) return;

    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    const warnBeforeLinkNavigation = (event: MouseEvent) => {
      const target = event.target;
      const link = target instanceof Element ? target.closest("a[href]") : null;
      if (!link) return;
      if (!window.confirm("Discard your unsaved review changes?")) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };

    window.addEventListener("beforeunload", warnBeforeUnload);
    document.addEventListener("click", warnBeforeLinkNavigation, true);
    return () => {
      window.removeEventListener("beforeunload", warnBeforeUnload);
      document.removeEventListener("click", warnBeforeLinkNavigation, true);
    };
  }, [form.formState.isDirty, isMutating]);

  const serverFieldErrors = state.status === "error" ? state.fieldErrors : undefined;
  const ratingError = form.formState.errors.rating?.message ?? serverFieldErrors?.rating?.[0];
  const titleError = form.formState.errors.title?.message ?? serverFieldErrors?.title?.[0];
  const bodyError = form.formState.errors.body?.message ?? serverFieldErrors?.body?.[0];
  const fitError = form.formState.errors.fit?.message ?? serverFieldErrors?.fit?.[0];

  const onSubmit = form.handleSubmit((values) => {
    const data = new FormData();
    data.set("orderNumber", orderNumber);
    data.set("orderLineId", orderLineId);
    data.set("rating", String(values.rating));
    data.set("title", values.title ?? "");
    data.set("body", values.body);
    data.set("fit", values.fit);
    startTransition(() => formAction(data));
  });

  function confirmWithdrawal() {
    const data = new FormData();
    data.set("orderNumber", orderNumber);
    data.set("orderLineId", orderLineId);
    setWithdrawOpen(false);
    startTransition(() => withdrawFormAction(data));
  }

  return (
    <div className="space-y-6">
      {actionError ? (
        <Alert variant="destructive">
          <AlertTitle>{actionError.title}</AlertTitle>
          <AlertDescription>{actionError.state.message}</AlertDescription>
        </Alert>
      ) : null}

      {!canSubmit && unavailableMessage ? (
        <Alert>
          <AlertTitle>This review is read-only</AlertTitle>
          <AlertDescription>{unavailableMessage}</AlertDescription>
        </Alert>
      ) : null}

      <form aria-busy={isMutating} className="space-y-6" noValidate onSubmit={onSubmit}>
        <FieldGroup>
          <FieldSet data-invalid={Boolean(ratingError)}>
            <FieldLegend>Rating</FieldLegend>
            <FieldDescription>Choose the rating that best reflects this piece.</FieldDescription>
            <Controller
              control={form.control}
              name="rating"
              render={({ field }) => (
                <div className="flex flex-wrap gap-2" data-slot="radio-group">
                  {ratingOptions.map((value) => {
                    const label = `${value} ${value === 1 ? "star" : "stars"}`;
                    const selected = field.value === value;
                    return (
                      <label
                        className="relative flex size-11 cursor-pointer items-center justify-center rounded-lg border border-border bg-control text-muted-foreground transition-colors hover:bg-control-hover has-[:focus-visible]:border-ring has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50 has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground"
                        key={value}
                      >
                        <input
                          aria-label={label}
                          checked={selected}
                          className="sr-only"
                          disabled={!canSubmit || isMutating}
                          name={field.name}
                          onBlur={field.onBlur}
                          onChange={() => field.onChange(value)}
                          ref={field.ref}
                          type="radio"
                          value={value}
                        />
                        <HugeiconsIcon
                          aria-hidden="true"
                          className="size-5"
                          fill={selected ? "currentColor" : "none"}
                          icon={StarIcon}
                          strokeWidth={1.8}
                        />
                      </label>
                    );
                  })}
                </div>
              )}
            />
            <FieldError>{ratingError}</FieldError>
          </FieldSet>

          <Field data-invalid={Boolean(titleError)}>
            <FieldLabel htmlFor="review-title">Review title (optional)</FieldLabel>
            <Input
              aria-invalid={Boolean(titleError)}
              autoComplete="off"
              disabled={!canSubmit || isMutating}
              id="review-title"
              maxLength={120}
              placeholder="Sum up your experience…"
              {...form.register("title")}
            />
            <FieldError>{titleError}</FieldError>
          </Field>

          <Field data-invalid={Boolean(bodyError)}>
            <div className="flex items-end justify-between gap-4">
              <FieldLabel htmlFor="review-body">Your review</FieldLabel>
              <span aria-live="polite" className="text-xs tabular-nums text-muted-foreground">
                {bodyValue.length}/2000
              </span>
            </div>
            <Textarea
              aria-invalid={Boolean(bodyError)}
              autoComplete="off"
              disabled={!canSubmit || isMutating}
              id="review-body"
              maxLength={2000}
              placeholder="Share what future shoppers should know about quality, condition and fit…"
              rows={7}
              {...form.register("body")}
            />
            <FieldDescription>
              Write at least 20 characters. Avoid personal delivery details.
            </FieldDescription>
            <FieldError>{bodyError}</FieldError>
          </Field>

          <Field data-invalid={Boolean(fitError)}>
            <FieldLabel htmlFor="review-fit">Fit</FieldLabel>
            <select
              aria-invalid={Boolean(fitError)}
              className="h-11 w-full rounded-lg border border-input bg-control px-3 text-base text-control-foreground outline-none transition-colors hover:bg-control-hover focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:bg-surface-sunken disabled:opacity-50 md:text-sm"
              disabled={!canSubmit || isMutating}
              id="review-fit"
              {...form.register("fit")}
            >
              <option value="not_applicable">Not applicable</option>
              <option value="runs_small">Runs small</option>
              <option value="true_to_size">True to size</option>
              <option value="runs_large">Runs large</option>
            </select>
            <FieldError>{fitError}</FieldError>
          </Field>
        </FieldGroup>

        <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
          {canSubmit ? (
            <Button disabled={isMutating} size="lg" type="submit">
              {pending ? "Submitting review…" : submitCopy[intent]}
            </Button>
          ) : (
            <span className="text-sm text-muted-foreground">No review changes are available.</span>
          )}

          {allowWithdrawal ? (
            <AlertDialog
              onOpenChange={(open) => {
                if (!isMutating) setWithdrawOpen(open);
              }}
              open={withdrawOpen}
            >
              <AlertDialogTrigger
                render={<Button disabled={isMutating} size="lg" type="button" variant="outline" />}
              >
                Withdraw review
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Withdraw your review?</AlertDialogTitle>
                  <AlertDialogDescription>
                    It will disappear from the product page. You can resubmit it only while this
                    order item remains eligible.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={withdrawPending}>Keep review</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={withdrawPending}
                    onClick={confirmWithdrawal}
                    type="button"
                    variant="destructive"
                  >
                    {withdrawPending ? "Withdrawing…" : "Yes, withdraw review"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </div>
      </form>
    </div>
  );
}
