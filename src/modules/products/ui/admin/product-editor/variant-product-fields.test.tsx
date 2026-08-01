/** @vitest-environment jsdom */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, test, vi } from "vitest";
import { createEmptyProductEditorValues } from "@/lib/admin/product-editor/product-editor-defaults";
import type { ProductEditorValues } from "@/lib/admin/shared/types";
import type { UploadedCloudinaryAsset } from "@/lib/assets/client/cloudinary-upload";
import { productKeys } from "@/modules/products/client/keys";
import { VariantProductFields } from "./variant-product-fields";

type CapturedUploadProps = {
  folder: string;
  label: string;
  maxFiles?: number;
  multiple?: boolean;
  onAsset: (asset: UploadedCloudinaryAsset) => boolean | undefined;
};

let capturedUploadProps: CapturedUploadProps | undefined;

vi.mock("@/components/ui/cloud-upload-button", () => ({
  CloudUploadButton: (props: CapturedUploadProps) => {
    capturedUploadProps = props;
    return <button type="button">{props.label}</button>;
  },
}));

describe("VariantProductFields", () => {
  test("assigns an uploaded image to the current variant row", () => {
    render(<VariantProductFieldsHarness />);

    expect(capturedUploadProps).toMatchObject({
      folder: "laitstyles/products/variants",
      label: "Upload image",
      multiple: false,
    });
    expect(capturedUploadProps?.maxFiles).toBeUndefined();

    act(() =>
      capturedUploadProps?.onAsset({
        publicId: "laitstyles/products/variants/cream-m",
        url: "https://res.cloudinary.com/store/image/upload/v1/cream-m.jpg",
        width: 1200,
        height: 1500,
        format: "jpg",
        bytes: 2048,
      }),
    );

    expect(screen.getByRole("button", { name: "Remove variant 1 image" })).toBeTruthy();
  });
});

function VariantProductFieldsHarness() {
  const methods = useForm<ProductEditorValues>({
    defaultValues: createEmptyProductEditorValues("variant"),
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(productKeys.list(), []);

  return (
    <QueryClientProvider client={client}>
      <FormProvider {...methods}>
        <VariantProductFields />
      </FormProvider>
    </QueryClientProvider>
  );
}
