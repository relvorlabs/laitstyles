/** @vitest-environment jsdom */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ProductEditorStep, ProductEditorValues } from "@/lib/admin/shared/types";
import { createEmptyProductEditorValues } from "@/modules/products/editor-defaults";
import { ProductEditorSurface } from "./product-editor-dialog";
import { ProductEditorStepper } from "./product-editor-stepper";

const mutateAsync = vi.fn();

vi.mock("@/modules/products/client/hooks", () => ({
  useSaveProduct: () => ({ mutateAsync }),
}));

const steps = ["type", "identity", "images", "stock", "pricing", "fulfilment", "review"] as const;
const completion = Object.fromEntries(steps.map((step) => [step, step === "type"])) as Record<ProductEditorStep, boolean>;

function validValues(): ProductEditorValues {
  const values = createEmptyProductEditorValues();
  return {
    ...values,
    name: "Archive utility vest",
    category: "Outerwear",
    brand: "Unlabelled",
    description: "A carefully inspected archive utility vest in excellent condition.",
    internalReference: "ARCH-001",
    media: [{
      id: "media-1", publicId: "vest-1", url: "https://example.com/vest.jpg", width: 100, height: 100,
      format: "jpg", bytes: 100, alt: "Front of vest", kind: "cover", position: 0, source: "upload",
    }],
    sellingPrice: 120,
    unique: {
      ...values.unique,
      size: "M",
      colour: "Olive",
      measurements: [{ id: "measurement-1", label: "Chest", value: "42 in" }],
    },
  };
}

function renderSurface(overrides: Partial<React.ComponentProps<typeof ProductEditorSurface>> = {}) {
  return render(
    <ProductEditorSurface
      initialValues={createEmptyProductEditorValues()}
      manageDiscardConfirmation={false}
      onRequestClose={vi.fn()}
      {...overrides}
    />,
  );
}

describe("ProductEditorStepper navigation modes", () => {
  it("allows a desktop jump to any step in unrestricted mode", async () => {
    const onStepChange = vi.fn();
    const user = userEvent.setup();
    render(<ProductEditorStepper activeStep="type" highestVisited={0} onStepChange={onStepChange} navigationMode="unrestricted" stepCompletion={completion} />);

    const review = screen.getByRole("button", { name: /review/i });
    expect(review).toBeEnabled();
    await user.click(review);
    expect(onStepChange).toHaveBeenCalledWith("review");
  });

  it("uses the compact Select to navigate unrestricted steps", async () => {
    const onStepChange = vi.fn();
    const user = userEvent.setup();
    render(<ProductEditorStepper activeStep="type" highestVisited={0} onStepChange={onStepChange} navigationMode="unrestricted" stepCompletion={completion} />);

    await user.click(screen.getByRole("combobox", { name: /product editor step/i }));
    await user.click(await screen.findByRole("option", { name: "Pricing" }));
    expect(onStepChange).toHaveBeenCalledWith("pricing");
  });

  it("keeps ordinary sequential navigation gated by the highest visited step", () => {
    render(<ProductEditorStepper activeStep="type" highestVisited={0} onStepChange={vi.fn()} navigationMode="sequential" stepCompletion={completion} />);
    expect(screen.getByRole("button", { name: /identity/i })).toBeDisabled();
  });
});

describe("ProductEditorSurface validation navigation", () => {
  it("blocks Continue on an invalid step and shows its validation error", async () => {
    const user = userEvent.setup();
    renderSurface();
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("heading", { name: /how should stock behave/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText(/enter a product name/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /how should stock behave/i })).toBeInTheDocument();
  });

  it("validates Publish now and Schedule before calling persistence", async () => {
    const user = userEvent.setup();
    mutateAsync.mockReset();
    const first = renderSurface({ navigationMode: "unrestricted" });
    await user.click(screen.getByRole("button", { name: /review/i }));
    await user.click(screen.getByRole("button", { name: /publish now/i }));
    await waitFor(() => expect(screen.getByText(/enter a product name/i)).toBeInTheDocument());
    expect(mutateAsync).not.toHaveBeenCalled();
    first.unmount();

    mutateAsync.mockReset();
    const { unmount } = renderSurface({ initialValues: validValues(), navigationMode: "unrestricted" });
    await user.click(screen.getByRole("button", { name: /review/i }));
    await user.click(screen.getByRole("button", { name: "Schedule" }));
    await waitFor(() => expect(screen.getByText(/choose a valid publication date/i)).toBeInTheDocument());
    expect(mutateAsync).not.toHaveBeenCalled();
    unmount();
  });
});
