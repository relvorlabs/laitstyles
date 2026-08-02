/** @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { CloudUploadButton } from "./cloud-upload-button";

type CapturedUploadProps = {
  "aria-disabled"?: boolean;
  "aria-label"?: string;
  children: ReactNode;
  folder?: string;
  onError?: () => void;
  onOpen?: () => void;
  onQueuesEnd?: () => void;
  onQueuesStart?: () => void;
  onSuccess?: (result: unknown) => void;
  options?: Record<string, unknown>;
  signatureEndpoint?: string;
};

let capturedProps: CapturedUploadProps | undefined;

vi.mock("next-cloudinary", () => ({
  CldUploadButton: (props: CapturedUploadProps) => {
    capturedProps = props;

    return (
      <button
        aria-disabled={props["aria-disabled"]}
        aria-label={props["aria-label"]}
        onClick={props.onOpen}
        type="button"
      >
        {props.children}
      </button>
    );
  },
}));

afterEach(cleanup);

describe("CloudUploadButton", () => {
  test("keeps the SDK boundary mounted and announces opening and upload lifecycle states", () => {
    render(<CloudUploadButton folder="products" label="Upload image" onAsset={() => undefined} />);

    fireEvent.click(screen.getByRole("button", { name: "Upload image" }));

    expect(screen.getByRole("button", { name: "Opening image uploader" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(
      screen
        .getAllByText("Opening image uploader")
        .some((element) => element.getAttribute("aria-live") === "polite"),
    ).toBe(true);

    act(() => capturedProps?.onQueuesStart?.());

    expect(screen.getByRole("button", { name: "Uploading images" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(
      screen
        .getAllByText("Uploading images")
        .some((element) => element.getAttribute("aria-live") === "polite"),
    ).toBe(true);
  });

  test("passes the shared Cloudinary options to the SDK boundary", () => {
    render(
      <CloudUploadButton
        folder="products/imports"
        label="Upload images"
        maxFiles={4}
        multiple
        onAsset={() => undefined}
      />,
    );

    expect(capturedProps).toMatchObject({
      signatureEndpoint: "/api/v1/admin/assets/sign",
      options: {
        folder: "products/imports",
        multiple: true,
        maxFiles: 4,
        sources: ["local", "camera"],
        clientAllowedFormats: ["png", "jpg", "jpeg", "webp", "avif"],
      },
    });
  });

  test("normalizes successful assets and exposes provider-neutral errors", () => {
    const onAsset = vi.fn();
    const onError = vi.fn();

    render(
      <CloudUploadButton
        folder="products"
        label="Upload image"
        onAsset={onAsset}
        onError={onError}
      />,
    );

    act(() =>
      capturedProps?.onSuccess?.({
        info: {
          public_id: "laitstyles/products/coat",
          secure_url: "https://res.cloudinary.com/store/image/upload/v1/coat.jpg",
          width: 1200,
          height: 1500,
          format: "jpg",
          bytes: 2048,
        },
      }),
    );
    act(() => capturedProps?.onError?.());

    expect(onAsset).toHaveBeenCalledWith({
      publicId: "laitstyles/products/coat",
      url: "https://res.cloudinary.com/store/image/upload/v1/coat.jpg",
      width: 1200,
      height: 1500,
      format: "jpg",
      bytes: 2048,
    });
    expect(onError).toHaveBeenCalledWith({
      code: "upload-failed",
      message: "Image upload failed. Try again.",
    });
  });

  test("does not complete a queue when consumers reject every asset", () => {
    const onComplete = vi.fn();

    render(
      <CloudUploadButton
        folder="products"
        label="Upload image"
        onAsset={() => false}
        onComplete={onComplete}
      />,
    );

    act(() => capturedProps?.onQueuesStart?.());
    act(() =>
      capturedProps?.onSuccess?.({
        info: {
          public_id: "laitstyles/products/coat",
          secure_url: "https://res.cloudinary.com/store/image/upload/v1/coat.jpg",
        },
      }),
    );
    act(() => capturedProps?.onQueuesEnd?.());

    expect(onComplete).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Upload image" })).not.toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });
});
