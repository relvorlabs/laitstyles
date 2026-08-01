import { describe, expect, it } from "vitest";
import { overlayLayer } from "@/components/ui/overlay-layers";

function zIndex(value: string): number {
  const match = /z-\[(\d+)\]/.exec(value);
  if (!match) throw new Error(`Overlay layer is not an explicit z-index: ${value}`);
  return Number(match[1]);
}

describe("overlayLayer", () => {
  it("renders dialogs and alert dialogs above side sheets", () => {
    expect(zIndex(overlayLayer.dialogBackdrop)).toBeGreaterThan(
      zIndex(overlayLayer.sheetContent),
    );
    expect(zIndex(overlayLayer.dialogContent)).toBeGreaterThan(
      zIndex(overlayLayer.dialogBackdrop),
    );
  });

  it("keeps floating controls and toast feedback above modal content", () => {
    expect(zIndex(overlayLayer.floating)).toBeGreaterThan(zIndex(overlayLayer.dialogContent));
    expect(zIndex(overlayLayer.toast)).toBeGreaterThan(zIndex(overlayLayer.floating));
  });
});
