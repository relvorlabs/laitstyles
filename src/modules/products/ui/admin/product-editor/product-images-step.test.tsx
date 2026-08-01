/** @vitest-environment jsdom */

import { act, fireEvent, render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, test, vi } from "vitest";
import { createEmptyProductEditorValues } from "@/lib/admin/product-editor/product-editor-defaults";
import type { ProductEditorValues } from "@/lib/admin/shared/types";
import type { UploadedCloudinaryAsset } from "@/lib/assets/client/cloudinary-upload";
import { ProductImagesStep } from "@/modules/products/ui/admin/product-editor/product-images-step";

type CapturedUploadProps = {
  disabled?: boolean;
  folder: string;
  label: string;
  maxFiles?: number;
  multiple?: boolean;
  onAsset: (asset: UploadedCloudinaryAsset) => boolean | undefined;
  size?: string;
  variant?: string;
};

let capturedUploadProps: CapturedUploadProps | undefined;

vi.mock("@/components/ui/cloud-upload-button", () => ({
  CloudUploadButton: (props: CapturedUploadProps) => {
    capturedUploadProps = props;
    return <button type="button">{props.label}</button>;
  },
}));

describe("ProductImagesStep", () => {
  test("keeps the shared upload trigger mounted while the widget opens", () => {
    render(<ProductImagesStepHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Upload images" }));

    expect(screen.getByRole("button", { name: "Upload images" })).toBeTruthy();
  });

  test("adds a normalized uploaded image as the featured cover with remaining capacity", () => {
    render(<ProductImagesStepHarness />);

    expect(capturedUploadProps).toMatchObject({
      disabled: false,
      folder: "laitstyles/products",
      label: "Upload images",
      maxFiles: 12,
      multiple: true,
      size: "lg",
      variant: "outline",
    });

    act(() =>
      capturedUploadProps?.onAsset({
        publicId: "laitstyles/products/coat",
        url: "https://res.cloudinary.com/store/image/upload/v1/coat.jpg",
        width: 1200,
        height: 1500,
        format: "jpg",
        bytes: 2048,
      }),
    );

    expect(screen.getByText("Featured cover")).toBeTruthy();
    expect(screen.getByText(/Image added and selected as the featured cover/i)).toBeTruthy();
  });
});

function ProductImagesStepHarness() {
  const methods = useForm<ProductEditorValues>({
    defaultValues: createEmptyProductEditorValues(),
  });

  return (
    <FormProvider {...methods}>
      <ProductImagesStep />
    </FormProvider>
  );
}
