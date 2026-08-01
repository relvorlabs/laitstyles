/** @vitest-environment jsdom */

import { act, render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, test, vi } from "vitest";
import type { SaveStoreSettingsInput } from "@/lib/admin/shared/types";
import type { UploadedCloudinaryAsset } from "@/lib/assets/client/cloudinary-upload";
import { StoreIdentitySection } from "./store-identity-section";

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

describe("StoreIdentitySection", () => {
  test("stores the provider-neutral uploaded logo asset in the identity form", () => {
    render(<StoreIdentitySectionHarness />);

    expect(capturedUploadProps).toMatchObject({
      folder: "laitstyles/brand",
      label: "Upload logo",
      multiple: false,
    });
    expect(capturedUploadProps?.maxFiles).toBeUndefined();

    act(() =>
      capturedUploadProps?.onAsset({
        publicId: "laitstyles/brand/mark",
        url: "https://res.cloudinary.com/store/image/upload/v1/mark.png",
        width: 512,
        height: 512,
        format: "png",
        bytes: 2048,
      }),
    );

    expect(screen.getByText("Logo: laitstyles/brand/mark")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Remove logo" })).toBeTruthy();
  });
});

function StoreIdentitySectionHarness() {
  const methods = useForm<SaveStoreSettingsInput>({
    defaultValues: {
      identity: {
        storeName: "Laitstyle",
        description: "A considered fashion store.",
        contactEmail: "hello@example.com",
        contactPhone: "",
        whatsappNumber: "",
        instagramHandle: "@laitstyle",
        websiteUrl: "",
        logo: null,
      },
      selling: {
        currency: "NGN",
        holdDurationMinutes: 60,
        lowStockThreshold: 3,
        defaultProductMode: "unique",
        payOnDeliveryEnabled: false,
      },
      delivery: { zones: [], pickupLocations: [] },
      payments: {
        acceptedMethods: [],
        bankTransferInstructions: "",
        payOnDeliveryDepositPercent: 0,
        refundPreference: "original-method",
      },
      notifications: {
        newOrders: false,
        expiringHolds: false,
        lowStock: false,
        paymentIssues: false,
        deliveryExceptions: false,
      },
    },
  });

  return (
    <FormProvider {...methods}>
      <StoreIdentitySection />
    </FormProvider>
  );
}
