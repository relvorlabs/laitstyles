"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type FieldPath, FormProvider, type Resolver, useForm, useWatch } from "react-hook-form";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  InventoryMode,
  ProductEditorActionSuccess,
  ProductEditorIntent,
  ProductEditorIssue,
  ProductEditorStep,
  ProductEditorValues,
} from "@/lib/admin/shared/types";
import { adminProductsQueryOptions, useSaveProduct } from "@/modules/products/client/hooks";
import {
  changeProductEditorMode,
  createEmptyProductEditorValues,
  createProductEditorValues,
} from "@/modules/products/editor-defaults";
import {
  productEditorDraftSchema,
  validateProductEditorStep,
  validateProductForPublish,
  validateProductForSchedule,
} from "@/modules/products/editor-schema";
import { productEditorSteps } from "@/modules/products/types";
import { ProductEditorFooter } from "@/modules/products/ui/admin/product-editor/product-editor-footer";
import { ProductEditorStepContent } from "@/modules/products/ui/admin/product-editor/product-editor-step-content";
import { ProductEditorStepper } from "@/modules/products/ui/admin/product-editor/product-editor-stepper";

export type ProductEditorNavigationMode = "sequential" | "unrestricted";

export function ProductEditorDialog({
  open,
  productId = null,
  onOpenChange,
  onCompleted,
}: {
  open: boolean;
  productId?: string | null;
  onOpenChange: (open: boolean) => void;
  onCompleted?: (result: ProductEditorActionSuccess) => void;
}) {
  const closeRequest = useRef<(nextOpen: boolean) => void>(() => {});
  const { data: products = [] } = useQuery(adminProductsQueryOptions());
  const product = productId ? products.find((item) => item.id === productId) : undefined;

  if (!open) return null;

  return (
    <Dialog onOpenChange={(nextOpen) => closeRequest.current(nextOpen)} open={open}>
      <DialogContent className="flex flex-col gap-0 overflow-hidden p-0 max-sm:inset-0 max-sm:h-dvh max-sm:w-screen max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none max-sm:duration-0 max-sm:data-open:animate-none max-sm:data-closed:animate-none sm:h-[min(92dvh,900px)] sm:w-[min(94vw,1120px)] sm:max-w-[1120px] sm:rounded-[18px]">
        <ProductEditorExperience
          initialValues={
            product ? createProductEditorValues(product) : createEmptyProductEditorValues()
          }
          key={product?.id ?? "new-product"}
          onCompleted={onCompleted}
          registerCloseRequest={(handler) => {
            closeRequest.current = handler;
          }}
          onRequestClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

export type ProductEditorSurfaceProps = {
  initialValues: ProductEditorValues;
  onCompleted?: (result: ProductEditorActionSuccess) => void;
  onValuesChange?: (values: ProductEditorValues) => void;
  onPersistenceStatusChange?: (status: "saving" | "saved" | "failed") => void;
  onRequestClose: () => void;
  queueNavigation?: ReactNode;
  manageDiscardConfirmation?: boolean;
  closeAfterSave?: boolean;
  navigationMode?: ProductEditorNavigationMode;
};

type ProductEditorExperienceProps = ProductEditorSurfaceProps & {
  registerCloseRequest?: (handler: (nextOpen: boolean) => void) => void;
};

export function ProductEditorSurface(props: ProductEditorSurfaceProps) {
  return <ProductEditorExperience {...props} />;
}

function ProductEditorExperience({
  initialValues,
  onCompleted,
  onValuesChange,
  onPersistenceStatusChange,
  onRequestClose,
  queueNavigation,
  manageDiscardConfirmation = true,
  closeAfterSave = true,
  navigationMode = "sequential",
  registerCloseRequest,
}: ProductEditorExperienceProps) {
  const saveProductMutation = useSaveProduct();
  const [activeStep, setActiveStep] = useState<ProductEditorStep>("type");
  const [highestVisited, setHighestVisited] = useState(0);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const methods = useForm<ProductEditorValues>({
    defaultValues: initialValues,
    mode: "onBlur",
    shouldUnregister: false,
    resolver: zodResolver(productEditorDraftSchema) as Resolver<ProductEditorValues>,
  });
  const watchedValues = useWatch({
    control: methods.control,
  }) as ProductEditorValues;
  useEffect(() => {
    if (methods.formState.isDirty) onValuesChange?.(watchedValues);
  }, [methods.formState.isDirty, onValuesChange, watchedValues]);
  const publishIssues = useMemo(() => validateProductForPublish(watchedValues), [watchedValues]);
  const stepCompletion = useMemo(
    () =>
      Object.fromEntries(
        productEditorSteps.map((step) => [
          step,
          validateProductEditorStep(watchedValues, step).length === 0,
        ]),
      ) as Record<ProductEditorStep, boolean>,
    [watchedValues],
  );
  const activeIndex = productEditorSteps.indexOf(activeStep);
  const editing = Boolean(initialValues.productId);

  function applyIssues(issues: ProductEditorIssue[]) {
    methods.clearErrors();
    for (const issue of issues) {
      methods.setError(issue.path as FieldPath<ProductEditorValues>, {
        type: "manual",
        message: issue.message,
      });
    }
  }

  function goToStep(step: ProductEditorStep) {
    const index = productEditorSteps.indexOf(step);
    if (navigationMode === "unrestricted" || index <= highestVisited) setActiveStep(step);
  }

  function goBack() {
    const previous = productEditorSteps[activeIndex - 1];
    if (previous) setActiveStep(previous);
  }

  function goNext() {
    const issues = validateProductEditorStep(methods.getValues(), activeStep);
    applyIssues(issues);
    setActionError(null);
    if (issues.length) return;

    const next = productEditorSteps[activeIndex + 1];
    if (!next) return;
    setHighestVisited((current) => Math.max(current, activeIndex + 1));
    setActiveStep(next);
  }

  function changeMode(mode: InventoryMode) {
    if (methods.getValues("inventoryMode") === mode) return;
    methods.reset(changeProductEditorMode(methods.getValues(), mode), {
      keepDefaultValues: true,
    });
    methods.clearErrors();
    setActionError(null);
  }

  const requestClose = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) return;
      if (!manageDiscardConfirmation) {
        onRequestClose();
        return;
      }
      if (methods.formState.isDirty) {
        setDiscardOpen(true);
        return;
      }
      onRequestClose();
    },
    [manageDiscardConfirmation, methods.formState.isDirty, onRequestClose],
  );

  useEffect(() => {
    registerCloseRequest?.(requestClose);
  }, [registerCloseRequest, requestClose]);

  function discardChanges() {
    methods.reset(initialValues);
    setDiscardOpen(false);
    onRequestClose();
  }

  async function commit(intent: ProductEditorIntent) {
    const values = methods.getValues();
    const issues =
      intent === "draft"
        ? []
        : intent === "schedule"
          ? validateProductForSchedule(values)
          : validateProductForPublish(values);

    applyIssues(issues);
    setActionError(null);
    if (issues.length) {
      onPersistenceStatusChange?.("failed");
      setHighestVisited(productEditorSteps.length - 1);
      setActiveStep(getFirstIssueStep(issues));
      return;
    }

    onPersistenceStatusChange?.("saving");
    const result = await saveProductMutation.mutateAsync({ values, intent });
    if (!result.ok) {
      onPersistenceStatusChange?.("failed");
      const resultIssues = result.error.issues ?? [];
      applyIssues(resultIssues);
      setActionError(result.error.message);
      if (resultIssues.length) {
        setHighestVisited(productEditorSteps.length - 1);
        setActiveStep(getFirstIssueStep(resultIssues));
      }
      return;
    }

    methods.reset(createProductEditorValues(result.value.product));
    onPersistenceStatusChange?.("saved");
    onCompleted?.(result.value);
    if (closeAfterSave) onRequestClose();
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <DialogHeader className="shrink-0 border-b border-border px-5 py-5 pr-14 sm:px-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {editing ? "Continue product" : "Add product"}
          </p>
          <DialogTitle className="font-serif text-[28px] font-medium leading-tight">
            {editing ? initialValues.name || "Untitled product" : "Create a catalogue record"}
          </DialogTitle>
          <DialogDescription>
            Seven guided steps · changes are saved to the shared catalogue
          </DialogDescription>
        </DialogHeader>

        {actionError ? (
          <Alert className="mx-4 mt-4 shrink-0 sm:mx-6" variant="destructive">
            <AlertTitle>Product action could not be completed</AlertTitle>
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        ) : null}

        <FormProvider {...methods}>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div
              className={
                queueNavigation
                  ? "grid min-h-0 flex-1 lg:grid-cols-[230px_220px_minmax(0,1fr)]"
                  : "grid min-h-0 flex-1 lg:grid-cols-[230px_minmax(0,1fr)]"
              }
            >
              <ProductEditorStepper
                activeStep={activeStep}
                highestVisited={highestVisited}
                navigationMode={navigationMode}
                stepCompletion={stepCompletion}
                onStepChange={goToStep}
              />
              {queueNavigation}
              <div className="min-h-0 overflow-y-auto overscroll-contain px-5 py-6 sm:px-7 sm:py-8 lg:px-9">
                <div className="mx-auto w-full max-w-[820px]">
                  <ProductEditorStepContent
                    activeStep={activeStep}
                    issues={publishIssues}
                    onModeChange={changeMode}
                    onStepChange={(step) => {
                      setHighestVisited(productEditorSteps.length - 1);
                      setActiveStep(step);
                    }}
                  />
                </div>
              </div>
            </div>

            <ProductEditorFooter
              activeStep={activeStep}
              onBack={goBack}
              onNext={goNext}
              onPublish={() => commit("publish")}
              onSaveDraft={() => commit("draft")}
              onSchedule={() => commit("schedule")}
            />
          </div>
        </FormProvider>
      </div>

      <AlertDialog onOpenChange={setDiscardOpen} open={discardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved product changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Values entered since the last successful save will be lost. Save a draft when the work
              should remain available after reload.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={discardChanges} variant="destructive">
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function getFirstIssueStep(issues: ProductEditorIssue[]) {
  for (const step of productEditorSteps) {
    if (issues.some((issue) => issue.step === step)) return step;
  }
  return "review";
}
