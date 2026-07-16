"use client";

import Image from "next/image";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from "@/components/ui/select";
import {
  getAvailableForSale,
  getSaleUnitPrice,
  getSelectedSaleProduct,
  getSellableProducts,
} from "@/features/admin/record-sale/record-sale-selectors";
import type { RecordSaleValues } from "@/features/admin/record-sale/record-sale-types";
import { useAdmin } from "@/features/admin/state/admin-provider";
import { getProductCover } from "@/lib/admin/inventory/inventory-selectors";
import { formatNaira } from "@/lib/admin/shared/formatters";

export function RecordSaleItemStep() {
  const { state } = useAdmin();
  const methods = useFormContext<RecordSaleValues>();
  const productId = useWatch({ control: methods.control, name: "productId" });
  const variantId = useWatch({ control: methods.control, name: "variantId" });
  const quantity = useWatch({ control: methods.control, name: "quantity" });
  const unitPrice = useWatch({ control: methods.control, name: "unitPrice" });
  const products = getSellableProducts(state);
  const product = getSelectedSaleProduct(state, productId);
  const available = product ? getAvailableForSale(product, variantId) : 0;
  const cover = product ? getProductCover(product) : null;

  function changeProduct(nextProductId: string) {
    const nextProduct = getSelectedSaleProduct(state, nextProductId);
    const firstVariant =
      nextProduct?.inventoryMode === "variant"
        ? nextProduct.variants.find((variant) => variant.stock.available > 0)
        : undefined;
    const nextVariantId = firstVariant?.id ?? "";

    methods.setValue("productId", nextProductId, { shouldDirty: true });
    methods.setValue("variantId", nextVariantId, { shouldDirty: true });
    methods.setValue("unitPrice", getSaleUnitPrice(nextProduct, nextVariantId), {
      shouldDirty: true,
    });
    methods.setValue("quantity", 1, { shouldDirty: true });
    methods.clearErrors(["productId", "variantId", "quantity", "unitPrice"]);
  }

  function changeVariant(nextVariantId: string) {
    methods.setValue("variantId", nextVariantId, { shouldDirty: true });
    methods.setValue("unitPrice", getSaleUnitPrice(product, nextVariantId), {
      shouldDirty: true,
    });
    methods.setValue("quantity", 1, { shouldDirty: true });
    methods.clearErrors(["variantId", "quantity", "unitPrice"]);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <FieldGroup>
        <Controller
          control={methods.control}
          name="productId"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="record-sale-product">Product</FieldLabel>
              <Select onValueChange={(value) => value && changeProduct(value)} value={field.value}>
                <SelectTrigger
                  aria-invalid={fieldState.invalid}
                  className="h-12 w-full"
                  id="record-sale-product"
                >
                  <span className="flex-1 truncate text-left">
                    {product?.name ?? "Choose a product"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Available catalogue</SelectLabel>
                    {products.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} · {getAvailableForSale(item)} available
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldDescription>
                Only active, published products with available stock appear here.
              </FieldDescription>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        {product?.inventoryMode === "variant" ? (
          <Controller
            control={methods.control}
            name="variantId"
            render={({ field, fieldState }) => {
              const selected = product.variants.find((variant) => variant.id === field.value);
              return (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="record-sale-variant">Variant</FieldLabel>
                  <Select
                    onValueChange={(value) => value && changeVariant(value)}
                    value={field.value}
                  >
                    <SelectTrigger
                      aria-invalid={fieldState.invalid}
                      className="h-12 w-full"
                      id="record-sale-variant"
                    >
                      <span className="flex-1 truncate text-left">
                        {selected?.label ?? "Choose a variant"}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Sellable variants</SelectLabel>
                        {product.variants
                          .filter((variant) => variant.stock.available > 0)
                          .map((variant) => (
                            <SelectItem key={variant.id} value={variant.id}>
                              {variant.label} · {variant.stock.available} available
                            </SelectItem>
                          ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FieldError errors={[fieldState.error]} />
                </Field>
              );
            }}
          />
        ) : null}

        <div className="grid gap-5 sm:grid-cols-2">
          <Field data-invalid={Boolean(methods.formState.errors.quantity)}>
            <FieldLabel htmlFor="record-sale-quantity">Quantity</FieldLabel>
            <Input
              aria-invalid={Boolean(methods.formState.errors.quantity)}
              id="record-sale-quantity"
              max={Math.max(available, 1)}
              min={1}
              type="number"
              {...methods.register("quantity", { valueAsNumber: true })}
            />
            <FieldDescription>{available} available now</FieldDescription>
            <FieldError errors={[methods.formState.errors.quantity]} />
          </Field>

          <Field data-invalid={Boolean(methods.formState.errors.unitPrice)}>
            <FieldLabel htmlFor="record-sale-price">Final price per unit</FieldLabel>
            <Input
              aria-invalid={Boolean(methods.formState.errors.unitPrice)}
              id="record-sale-price"
              min={0}
              step={500}
              type="number"
              {...methods.register("unitPrice", { valueAsNumber: true })}
            />
            <FieldDescription>
              Catalogue price {formatNaira(getSaleUnitPrice(product, variantId))}
            </FieldDescription>
            <FieldError errors={[methods.formState.errors.unitPrice]} />
          </Field>
        </div>
      </FieldGroup>

      <aside className="self-start overflow-hidden rounded-[16px] border border-border bg-card">
        <div className="relative aspect-[4/3] bg-secondary">
          {cover ? (
            <Image
              alt={cover.alt || product?.name || "Selected product"}
              className="object-cover"
              fill
              sizes="(max-width: 1024px) 100vw, 280px"
              src={cover.url}
            />
          ) : null}
        </div>
        <div className="flex flex-col gap-2 p-4">
          <p className="font-serif text-[22px] font-medium">
            {product?.name ?? "Select a product"}
          </p>
          <p className="text-sm text-muted-foreground">
            {product?.inventoryMode === "unique"
              ? "One-of-one piece"
              : product?.inventoryMode === "variant"
                ? "Variant stock"
                : "Multiple units"}
          </p>
          <div className="mt-2 flex items-end justify-between gap-3 border-t border-border pt-3">
            <span className="text-xs text-muted-foreground">Sale total</span>
            <strong className="font-serif text-[24px] font-medium tabular-nums">
              {formatNaira((Number(quantity) || 0) * (Number(unitPrice) || 0))}
            </strong>
          </div>
        </div>
      </aside>
    </div>
  );
}
