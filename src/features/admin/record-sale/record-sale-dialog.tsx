"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Paystack from "@paystack/inline-js";
import { useQuery } from "@tanstack/react-query";
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
import { saleCustomersQueryOptions, useRecordOfflineSale } from "@/modules/orders/client/hooks";
import type { AdminOrderCustomer } from "@/modules/orders/types";
import { adminProductsQueryOptions } from "@/modules/products/client/hooks";
import type { AdminProduct } from "@/modules/products/types";

export function RecordSaleDialog({
  open,
  onOpenChange,
  onCompleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted: (result: RecordSaleCompletion) => void;
}) {
  const { data: products = [] } = useQuery(adminProductsQueryOptions());
  const { data: customers = [] } = useQuery(saleCustomersQueryOptions());
  if (!open) return null;

  return (
    <RecordSaleForm
      customers={customers}
      initialValues={createRecordSaleDefaults(products, customers)}
      key={`record-sale-${products.length}-${customers.length}`}
      onCompleted={onCompleted}
      onOpenChange={onOpenChange}
      open={open}
      products={products}
    />
  );
}

function RecordSaleForm({
  customers,
  initialValues,
  open,
  onOpenChange,
  onCompleted,
  products,
}: {
  customers: AdminOrderCustomer[];
  initialValues: RecordSaleValues;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted: (result: RecordSaleCompletion) => void;
  products: AdminProduct[];
}) {
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
    const product = getSelectedSaleProduct(products, values.productId);
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

  async function generateCheckout() {
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

    const completion: RecordSaleCompletion = {
      orderId: result.value.order.id,
      customerId: result.value.customerId,
      message: result.value.message,
      authorizationUrl: result.value.checkout.authorizationUrl,
      accessCode: result.value.checkout.accessCode,
      reference: result.value.checkout.reference,
    };

    methods.reset(initialValues);
    onCompleted(completion);
    onOpenChange(false);

    try {
      const popup = new Paystack();
      popup.resumeTransaction(completion.accessCode);
    } catch {
      // The persistent authorization URL remains available in the completion alert.
    }
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
              Record an in-person sale
            </DialogTitle>
            <DialogDescription>
              Create a pending order, reserve stock and hand the customer a tracked Paystack
              checkout.
            </DialogDescription>
          </DialogHeader>

          {actionError ? (
            <Alert className="mx-4 mt-4 shrink-0 sm:mx-6" variant="destructive">
              <AlertTitle>Checkout could not be generated</AlertTitle>
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
                    <StepContent customers={customers} step={activeStep} />
                  </div>
                </div>
              </div>

              <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-background px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
                <Button
                  size="lg"
                  disabled={activeIndex === 0 || recordOfflineSaleMutation.isPending}
                  onClick={goBack}
                  type="button"
                  variant="outline"
                >
                  Back
                </Button>
                {activeStep === "review" ? (
                  <Button
                    disabled={recordOfflineSaleMutation.isPending}
                    size="lg"
                    onClick={generateCheckout}
                    type="button"
                  >
                    {recordOfflineSaleMutation.isPending
                      ? "Generating checkout…"
                      : "Generate Paystack checkout"}
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
              The selected product and customer details will be lost. No order, Paystack attempt or
              stock reservation has been created yet.
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

function StepContent({
  customers,
  step,
}: {
  customers: AdminOrderCustomer[];
  step: RecordSaleStep;
}) {
  switch (step) {
    case "item":
      return <RecordSaleItemStep />;
    case "customer":
      return <RecordSaleCustomerStep customers={customers} />;
    case "payment":
      return <RecordSalePaymentStep />;
    case "review":
      return <RecordSaleReviewStep />;
  }
}
