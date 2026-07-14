"use client";

import { Controller, type FieldPath, useFormContext } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getProductEditorFieldError } from "@/features/admin/product-editor/product-editor-errors";
import type { ProductEditorValues } from "@/lib/admin/types";

export type EditorFieldName = FieldPath<ProductEditorValues>;

type EditorTextFieldProps = {
  name: EditorFieldName;
  label: string;
  description?: string;
  placeholder?: string;
  autoComplete?: string;
  type?: "text" | "datetime-local";
};

export function EditorTextField({
  name,
  label,
  description,
  placeholder,
  autoComplete = "off",
  type = "text",
}: EditorTextFieldProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext<ProductEditorValues>();
  const error = getProductEditorFieldError(errors, name);
  const descriptionId = description ? `${name}-description` : undefined;
  const errorId = error ? `${name}-error` : undefined;

  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      {description ? <FieldDescription id={descriptionId}>{description}</FieldDescription> : null}
      <Input
        {...register(name)}
        aria-describedby={[descriptionId, errorId].filter(Boolean).join(" ")}
        aria-invalid={Boolean(error)}
        autoComplete={autoComplete}
        className="h-11"
        id={name}
        placeholder={placeholder}
        type={type}
      />
      <FieldError id={errorId}>{error}</FieldError>
    </Field>
  );
}

type EditorNumberFieldProps = {
  name: EditorFieldName;
  label: string;
  description?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
};

export function EditorNumberField({
  name,
  label,
  description,
  placeholder,
  min = 0,
  max,
  step = 1,
}: EditorNumberFieldProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext<ProductEditorValues>();
  const error = getProductEditorFieldError(errors, name);

  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <Input
        {...register(name, {
          setValueAs: (value) => (value === "" ? null : Number(value)),
        })}
        aria-invalid={Boolean(error)}
        className="h-11 tabular-nums"
        id={name}
        inputMode="decimal"
        max={max}
        min={min}
        placeholder={placeholder}
        step={step}
        type="number"
      />
      <FieldError>{error}</FieldError>
    </Field>
  );
}

type EditorTextareaFieldProps = {
  name: EditorFieldName;
  label: string;
  description?: string;
  placeholder?: string;
  rows?: number;
};

export function EditorTextareaField({
  name,
  label,
  description,
  placeholder,
  rows = 4,
}: EditorTextareaFieldProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext<ProductEditorValues>();
  const error = getProductEditorFieldError(errors, name);

  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <Textarea
        {...register(name)}
        aria-invalid={Boolean(error)}
        className="min-h-28 resize-y"
        id={name}
        placeholder={placeholder}
        rows={rows}
      />
      <FieldError>{error}</FieldError>
    </Field>
  );
}

type EditorSelectFieldProps = {
  name: EditorFieldName;
  label: string;
  description?: string;
  options: ReadonlyArray<readonly [string, string]>;
  emptyLabel?: string;
};

export function EditorSelectField({
  name,
  label,
  description,
  options,
  emptyLabel,
}: EditorSelectFieldProps) {
  const {
    control,
    formState: { errors },
  } = useFormContext<ProductEditorValues>();
  const error = getProductEditorFieldError(errors, name);
  const emptyValue = "__none__";

  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel>{label}</FieldLabel>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Select
            onValueChange={(value) => field.onChange(value === emptyValue ? "" : (value ?? ""))}
            value={String(field.value || (emptyLabel ? emptyValue : ""))}
          >
            <SelectTrigger aria-label={label} aria-invalid={Boolean(error)} className="h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {emptyLabel ? <SelectItem value={emptyValue}>{emptyLabel}</SelectItem> : null}
                {options.map(([value, optionLabel]) => (
                  <SelectItem key={value} value={value}>
                    {optionLabel}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        )}
      />
      <FieldError>{error}</FieldError>
    </Field>
  );
}

type EditorCheckboxFieldProps = {
  name: EditorFieldName;
  label: string;
  description?: string;
};

export function EditorCheckboxField({ name, label, description }: EditorCheckboxFieldProps) {
  const { control } = useFormContext<ProductEditorValues>();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Field orientation="horizontal">
          <Checkbox
            aria-label={label}
            checked={Boolean(field.value)}
            onCheckedChange={(checked) => field.onChange(Boolean(checked))}
          />
          <div className="flex flex-col gap-1">
            <FieldLabel>{label}</FieldLabel>
            {description ? <FieldDescription>{description}</FieldDescription> : null}
          </div>
        </Field>
      )}
    />
  );
}
