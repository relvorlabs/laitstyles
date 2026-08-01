/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ProductEditorStep } from "@/lib/admin/shared/types";
import { ProductEditorStepper } from "./product-editor-stepper";

const steps = ["type", "identity", "details", "pricing", "media", "fulfilment", "review"] as const;
const completion = Object.fromEntries(steps.map((step) => [step, step === "type"])) as Record<ProductEditorStep, boolean>;

describe("ProductEditorStepper navigation modes", () => {
  it("keeps sequential steps gated by highest visited", () => {
    render(<ProductEditorStepper activeStep="type" highestVisited={0} onStepChange={vi.fn()} navigationMode="sequential" stepCompletion={completion} />);
    expect(screen.getByRole("button", { name: /identity/i })).toBeDisabled();
  });

  it("makes every step available in unrestricted mode", () => {
    render(<ProductEditorStepper activeStep="type" highestVisited={0} onStepChange={vi.fn()} navigationMode="unrestricted" stepCompletion={completion} />);
    expect(screen.getByRole("button", { name: /identity/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /identity/i })).not.toHaveAttribute("data-complete", "true");
  });
});
