import { FieldGroup } from "@/components/ui/field";
import {
  EditorTextField,
  EditorTextareaField,
} from "@/features/control-room/product-editor/product-editor-fields";

export function ProductIdentityStep() {
  return (
    <section aria-labelledby="product-identity-title" className="space-y-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Product identity
        </p>
        <h2
          className="mt-2 font-serif text-[30px] font-medium leading-tight sm:text-[36px]"
          id="product-identity-title"
        >
          Give the catalogue record a clear identity.
        </h2>
        <p className="mt-3 max-w-[680px] text-[13px] leading-6 text-muted-foreground">
          Customer-facing language and the internal reference live together here, but they serve different jobs.
        </p>
      </div>

      <FieldGroup>
        <div className="grid gap-5 md:grid-cols-2">
          <EditorTextField
            label="Product name"
            name="name"
            placeholder="Botanical Studio Shirt"
          />
          <EditorTextField
            description="Archive number for a unique piece; SKU or reference prefix for stocked and variant products."
            label="Internal reference"
            name="internalReference"
            placeholder="LS-BSS-GRN"
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <EditorTextField
            label="Category"
            name="category"
            placeholder="Shirts"
          />
          <EditorTextField
            label="Brand or label"
            name="brand"
            placeholder="Laitstyle Studio or Unlabelled"
          />
        </div>

        <EditorTextField
          description="Optional. Leave blank when the product is not part of a named collection."
          label="Collection"
          name="collection"
          placeholder="Daily Form"
        />

        <EditorTextareaField
          description="Describe construction, material, finish and the details a shopper should understand."
          label="Product description"
          name="description"
          placeholder="A softly structured botanical shirt with…"
          rows={5}
        />
      </FieldGroup>
    </section>
  );
}
