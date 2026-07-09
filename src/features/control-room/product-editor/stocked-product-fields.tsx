import { FieldGroup } from "@/components/ui/field";
import {
  EditorNumberField,
  EditorTextField,
} from "@/features/control-room/product-editor/product-editor-fields";

export function StockedProductFields() {
  return (
    <div className="space-y-6">
      <div className="rounded-[16px] border border-border bg-secondary/45 p-4">
        <p className="text-[12.5px] font-semibold">One shared stock count.</p>
        <p className="mt-1 text-[11.5px] leading-5 text-muted-foreground">
          Use this when every unit is effectively interchangeable. If size, colour or another option needs its own quantity, switch to a product with variants.
        </p>
      </div>

      <FieldGroup>
        <div className="grid gap-5 md:grid-cols-2">
          <EditorTextField
            label="Size or fit label"
            name="stocked.sizeLabel"
            placeholder="Relaxed M/L or One size"
          />
          <EditorTextField
            label="Colour"
            name="stocked.colour"
            placeholder="Sage"
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <EditorNumberField
            description="The complete quantity received for this product record."
            label="Total received"
            min={1}
            name="stocked.quantity"
            placeholder="50"
          />
          <EditorNumberField
            description="The product appears in Low stock when available units reach this number."
            label="Low-stock threshold"
            min={0}
            name="lowStockThreshold"
            placeholder="5"
          />
        </div>
      </FieldGroup>
    </div>
  );
}
