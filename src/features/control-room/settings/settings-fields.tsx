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
import { getSettingsFieldError } from "@/features/control-room/settings/settings-errors";
import type { SaveStoreSettingsInput } from "@/lib/control-room/types";

export type SettingsFieldName = FieldPath<SaveStoreSettingsInput>;

type BaseFieldProps = {
  name: SettingsFieldName;
  label: string;
  description?: string;
};

export function SettingsTextField({
  name,
  label,
  description,
  placeholder,
  autoComplete = "off",
  type = "text",
  readOnly = false,
}: BaseFieldProps & {
  placeholder?: string;
  autoComplete?: string;
  type?: "text" | "email" | "tel" | "url";
  readOnly?: boolean;
}) {
  const {
    register,
    formState: { errors },
  } = useFormContext<SaveStoreSettingsInput>();
  const error = getSettingsFieldError(errors, name);
  const descriptionId = description ? `${fieldId(name)}-description` : undefined;
  const errorId = error ? `${fieldId(name)}-error` : undefined;

  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={fieldId(name)}>{label}</FieldLabel>
      {description ? <FieldDescription id={descriptionId}>{description}</FieldDescription> : null}
      <Input
        {...register(name)}
        aria-describedby={[descriptionId, errorId].filter(Boolean).join(" ")}
        aria-invalid={Boolean(error)}
        autoComplete={autoComplete}
        className="h-11 read-only:bg-muted/50 read-only:text-muted-foreground"
        id={fieldId(name)}
        placeholder={placeholder}
        readOnly={readOnly}
        type={type}
      />
      <FieldError id={errorId}>{error}</FieldError>
    </Field>
  );
}

export function SettingsNumberField({
  name,
  label,
  description,
  placeholder,
  min = 0,
  max,
  step = 1,
  suffix,
}: BaseFieldProps & {
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  const {
    register,
    formState: { errors },
  } = useFormContext<SaveStoreSettingsInput>();
  const error = getSettingsFieldError(errors, name);

  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={fieldId(name)}>{label}</FieldLabel>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <div className="relative">
        <Input
          {...register(name, {
            setValueAs: (value) => (value === "" ? Number.NaN : Number(value)),
          })}
          aria-invalid={Boolean(error)}
          className={suffix ? "h-11 pr-20 tabular-nums" : "h-11 tabular-nums"}
          id={fieldId(name)}
          inputMode="decimal"
          max={max}
          min={min}
          placeholder={placeholder}
          step={step}
          type="number"
        />
        {suffix ? (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </div>
      <FieldError>{error}</FieldError>
    </Field>
  );
}

export function SettingsTextareaField({
  name,
  label,
  description,
  placeholder,
  rows = 4,
}: BaseFieldProps & {
  placeholder?: string;
  rows?: number;
}) {
  const {
    register,
    formState: { errors },
  } = useFormContext<SaveStoreSettingsInput>();
  const error = getSettingsFieldError(errors, name);

  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={fieldId(name)}>{label}</FieldLabel>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <Textarea
        {...register(name)}
        aria-invalid={Boolean(error)}
        className="min-h-28 resize-y"
        id={fieldId(name)}
        placeholder={placeholder}
        rows={rows}
      />
      <FieldError>{error}</FieldError>
    </Field>
  );
}

export function SettingsSelectField({
  name,
  label,
  description,
  options,
}: BaseFieldProps & {
  options: ReadonlyArray<readonly [string, string]>;
}) {
  const {
    control,
    formState: { errors },
  } = useFormContext<SaveStoreSettingsInput>();
  const error = getSettingsFieldError(errors, name);

  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel>{label}</FieldLabel>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Select
            onValueChange={(value) => field.onChange(value ?? "")}
            value={String(field.value ?? "")}
          >
            <SelectTrigger aria-invalid={Boolean(error)} className="h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
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

export function SettingsCheckboxField({ name, label, description }: BaseFieldProps) {
  const { control } = useFormContext<SaveStoreSettingsInput>();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Field
          className="rounded-xl border border-border p-4 transition-colors"
          orientation="horizontal"
        >
          <Checkbox
            aria-label={label}
            checked={Boolean(field.value)}
            onCheckedChange={(checked) => field.onChange(Boolean(checked))}
          />
          <div className="min-w-0 flex-1">
            <FieldLabel>{label}</FieldLabel>
            {description ? (
              <FieldDescription className="mt-1 leading-5">{description}</FieldDescription>
            ) : null}
          </div>
        </Field>
      )}
    />
  );
}

function fieldId(name: string) {
  return `settings-${name.replaceAll(".", "-")}`;
}
