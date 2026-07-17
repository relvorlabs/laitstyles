"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { FormProvider, type Resolver, useForm } from "react-hook-form";
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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RecordSaleCustomerStep } from "@/features/admin/record-sale/record-sale-customer-step";
import { RecordSaleItemStep } from "@/features/admin/record-sale/record-sale-item-step";
import { RecordSalePaymentStep } from "@/features/admin/record-sale/record-sale-payment-step";
import { RecordSaleReviewStep } from "@/features/admin/record-sale/record-sale-review-step";
import {
  getRecordSaleStepFields,
  recordSaleSchema,
} from "@/features/admin/record-sale/record-sale-schema";
import {
  createRecordSaleDefaults,
  getAvailableForSale,
  getSelectedSaleProduct,
} from "@/features/admin/record-sale/record-sale-selectors";
import { RecordSaleStepper } from "@/features/admin/record-sale/record-sale-stepper";
import {
  type RecordSaleCompletion,
  type RecordSaleStep,
  type RecordSaleValues,
  recordSaleSteps,
  toOfflineSaleInput,
} from "@/features/admin/record-sale/record-sale-types";
import { useAdmin } from "@/features/admin/state/admin-provider";
import { useRecordOfflineSale } from "@/lib/admin/orders/orders-mutations";

export function RecordSaleDialog({
  open,
  onOpenChange,
  onCompleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted: (result: RecordSaleCompletion) => void;
}) {
  const { state } = useAdmin();
  if (!open) return null;

  return (
    <RecordSaleForm
      initialValues={createRecordSaleDefaults(state)}
      key={`record-sale-${state.products.length}-${state.orders.length}`}
      onCompleted={onCompleted}
      onOpenChange={onOpenChange}
      open={open}
    />
  );
}

function RecordSaleForm({
  initialValues,
  open,
  onOpenChange,
  onCompleted,
}: {
  initialValues: RecordSaleValues;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted: (result: RecordSaleCompletion) => void;
}) {
  const { state } = useAdmin();
  const recordOfflineSaleMutation = useRecordOfflineSale();
  const [activeStep, setActiveStep] = useState<RecordSaleStep>("item");
  const [highestVisited, setHighestVisited] = useState(0);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const methods = useForm<RecordSaleValues>({
    defaultValues: initialValues,
    mode: "onBlur",
    shouldUnregister: false,
    resolver: zodResolver(recordSaleSchema) as Resolver<RecordSaleValues>,
  });
  const activeIndex = recordSaleSteps.indexOf(activeStep);

  function requestClose(nextOpen: boolean) {
    if (nextOpen) return;
    if (methods.formState.isDirty) {
      setDiscardOpen(true);
      return;
    }
    onOpenChange(false);
  }

  function discardChanges() {
    methods.reset(initialValues);
    setDiscardOpen(false);
    onOpenChange(false);
  }

  function goBack() {
    const previous = recordSaleSteps[activeIndex - 1];
    if (previous) setActiveStep(previous);
  }

  async function goNext() {
    setActionError(null);
    const valid = await methods.trigger(getRecordSaleStepFields(activeStep));
    if (!valid || !validateOperationalItem()) return;

    const next = recordSaleSteps[activeIndex + 1];
    if (!next) return;
    setHighestVisited((current) => Math.max(current, activeIndex + 1));
    setActiveStep(next);
  }

  function validateOperationalItem() {
    if (activeStep !== "item" && activeStep !== "review") return true;

    const values = methods.getValues();
    const product = getSelectedSaleProduct(state.products, values.productId);
    if (!product) {
      methods.setError("productId", {
        type: "manual",
        message: "Choose a product that is still available.",
      });
      return false;
    }
    if (product.inventoryMode === "variant" && !values.variantId) {
      methods.setError("variantId", {
        type: "manual",
        message: "Choose the exact variant being sold.",
      });
      return false;
    }

    const available = getAvailableForSale(product, values.variantId);
    if (values.quantity > available) {
      methods.setError("quantity", {
        type: "manual",
        message: `Only ${available} unit${available === 1 ? " is" : "s are"} available for this selection.`,
      });
      return false;
    }
    return true;
  }

  async function confirmSale() {
    setActionError(null);
    const valid = await methods.trigger();
    if (!valid || !validateOperationalItem()) return;

    const result = await recordOfflineSaleMutation.mutateAsync(
      toOfflineSaleInput(methods.getValues()),
    );
    if (!result.ok) {
      const conflict = result.error.conflictingHoldIds?.length
        ? ` Active holds: ${result.error.conflictingHoldIds.join(", ")}.`
        : "";
      setActionError(`${result.error.message}${conflict}`);
      return;
    }

    methods.reset(initialValues);
    onCompleted({
      orderId: result.value.order.id,
      customerId: result.value.customerId,
      message: result.value.message,
    });
    onOpenChange(false);
  }

  return (
    <>
      <Dialog onOpenChange={requestClose} open={open}>
        <DialogContent className="flex flex-col gap-0 overflow-hidden p-0 max-sm:inset-0 max-sm:h-dvh max-sm:w-screen max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none max-sm:duration-0 max-sm:data-open:animate-none max-sm:data-closed:animate-none sm:h-[min(90dvh,820px)] sm:w-[min(94vw,1040px)] sm:max-w-[1040px] sm:rounded-[18px]">
          <DialogHeader className="shrink-0 border-b border-border px-5 py-5 pr-14 sm:px-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Global sales action
            </p>
            <DialogTitle className="font-serif text-[28px] font-medium leading-tight">
              Record an offline sale
            </DialogTitle>
            <DialogDescription>
              One connected flow for stock, orders, revenue, customer history and activity.
            </DialogDescription>
          </DialogHeader>

          {actionError ? (
            <Alert className="mx-4 mt-4 shrink-0 sm:mx-6" variant="destructive">
              <AlertTitle>Sale could not be recorded</AlertTitle>
              <AlertDescription>{actionError}</AlertDescription>
            </Alert>
          ) : null}

          <FormProvider {...methods}>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="grid min-h-0 flex-1 lg:grid-cols-[190px_minmax(0,1fr)]">
                <RecordSaleStepper
                  activeStep={activeStep}
                  highestVisited={highestVisited}
                  onStepChange={setActiveStep}
                />
                <div className="min-h-0 overflow-y-auto overscroll-contain px-5 py-6 sm:px-7 sm:py-8 lg:px-9">
                  <div className="mx-auto w-full max-w-[800px]">
                    <StepContent step={activeStep} />
                  </div>
                </div>
              </div>

              <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-background px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
                <Button
                  size="lg"
                  disabled={activeIndex === 0}
                  onClick={goBack}
                  type="button"
                  variant="outline"
                >
                  Back
                </Button>
                {activeStep === "review" ? (
                  <Button size="lg" onClick={confirmSale} type="button">
                    Confirm sale
                  </Button>
                ) : (
                  <Button size="lg" onClick={goNext} type="button">
                    Continue
                  </Button>
                )}
              </footer>
            </div>
          </FormProvider>
        </DialogContent>
      </Dialog>

      <AlertDialog onOpenChange={setDiscardOpen} open={discardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard this unrecorded sale?</AlertDialogTitle>
            <AlertDialogDescription>
              The selected product, customer and payment details will be lost. No stock has changed
              yet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={discardChanges} variant="destructive">
              Discard sale
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function StepContent({ step }: { step: RecordSaleStep }) {
  switch (step) {
    case "item":
      return <RecordSaleItemStep />;
    case "customer":
      return <RecordSaleCustomerStep />;
    case "payment":
      return <RecordSalePaymentStep />;
    case "review":
      return <RecordSaleReviewStep />;
  }
}
