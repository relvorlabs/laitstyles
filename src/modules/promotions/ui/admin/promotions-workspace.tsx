"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from "@/components/ui/select";
import { ApiClientError } from "@/lib/http/client";
import {
  promotionCouponsQueryOptions,
  useCreatePromotionCoupon,
  useUpdatePromotionCoupon,
} from "@/modules/promotions/client/hooks";
import type {
  CreatePromotionCouponInput,
  PromotionCoupon,
  PromotionCouponList,
  PromotionDiscountKind,
} from "@/modules/promotions/types";

type CouponForm = {
  code: string;
  prefix: string;
  enabled: boolean;
  kind: PromotionDiscountKind;
  value: string;
  minimumSpend: string;
  maximumDiscount: string;
  startsAt: string;
  expiresAt: string;
  usageLimit: string;
};

const emptyForm: CouponForm = {
  code: "",
  prefix: "LAIT",
  enabled: true,
  kind: "percent",
  value: "10",
  minimumSpend: "",
  maximumDiscount: "",
  startsAt: "",
  expiresAt: "",
  usageLimit: "",
};

export function PromotionsWorkspace({
  canManage,
  initialData,
}: {
  canManage: boolean;
  initialData: PromotionCouponList;
}) {
  const couponsQuery = useQuery({ ...promotionCouponsQueryOptions(), initialData });
  const createCoupon = useCreatePromotionCoupon();
  const updateCoupon = useUpdatePromotionCoupon();
  const [form, setForm] = useState<CouponForm>(emptyForm);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const coupons = couponsQuery.data.coupons;
  const summary = useMemo(() => summarizeCoupons(coupons), [coupons]);
  const saving = createCoupon.isPending || updateCoupon.isPending;

  function updateForm(patch: Partial<CouponForm>): void {
    setForm((current) => ({ ...current, ...patch }));
  }

  function resetForm(): void {
    setEditingCode(null);
    setForm(emptyForm);
  }

  function editCoupon(coupon: PromotionCoupon): void {
    setEditingCode(coupon.code);
    setForm({
      code: coupon.code,
      prefix: "LAIT",
      enabled: coupon.enabled,
      kind: coupon.kind,
      value: String(coupon.kind === "fixed" ? coupon.value / 100 : coupon.value),
      minimumSpend:
        coupon.minimumSubtotalMinor === null ? "" : String(coupon.minimumSubtotalMinor / 100),
      maximumDiscount:
        coupon.maximumDiscountMinor === null ? "" : String(coupon.maximumDiscountMinor / 100),
      startsAt: toDateTimeLocal(coupon.startsAt),
      expiresAt: toDateTimeLocal(coupon.expiresAt),
      usageLimit: coupon.usageLimit === null ? "" : String(coupon.usageLimit),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitCoupon(): Promise<void> {
    if (!canManage) return;
    const input = toCreateInput(form);
    if (!input) return;
    try {
      const result = editingCode
        ? await updateCoupon.mutateAsync({ ...input, currentCode: editingCode })
        : await createCoupon.mutateAsync(input);
      toast.success(result.message);
      resetForm();
    } catch (error: unknown) {
      toast.error(
        error instanceof ApiClientError ? error.message : "The coupon could not be saved.",
      );
    }
  }

  async function toggleCoupon(coupon: PromotionCoupon): Promise<void> {
    if (!canManage) return;
    try {
      const result = await updateCoupon.mutateAsync({
        currentCode: coupon.code,
        code: coupon.code,
        enabled: !coupon.enabled,
        kind: coupon.kind,
        value: coupon.value,
        ...(coupon.minimumSubtotalMinor !== null
          ? { minimumSubtotalMinor: coupon.minimumSubtotalMinor }
          : {}),
        ...(coupon.maximumDiscountMinor !== null
          ? { maximumDiscountMinor: coupon.maximumDiscountMinor }
          : {}),
        ...(coupon.startsAt ? { startsAt: coupon.startsAt } : {}),
        ...(coupon.expiresAt ? { expiresAt: coupon.expiresAt } : {}),
        ...(coupon.usageLimit !== null ? { usageLimit: coupon.usageLimit } : {}),
      });
      toast.success(result.message);
    } catch (error: unknown) {
      toast.error(
        error instanceof ApiClientError ? error.message : "The coupon could not be updated.",
      );
    }
  }

  return (
    <div className="space-y-6 pb-12">
      <section className="overflow-hidden rounded-3xl border bg-card">
        <div className="grid gap-8 bg-[radial-gradient(circle_at_top_right,var(--color-muted),transparent_48%)] p-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:p-8">
          <div className="self-end">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Promotions atelier
            </p>
            <h1 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
              Create private offers without leaving the store desk.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
              Generate a unique code or write your own, set the value and window, then activate it
              for customer checkout. Usage counts include verified paid orders only.
            </p>
            {!canManage ? (
              <p className="mt-4 rounded-2xl border bg-background/80 p-3 text-sm text-muted-foreground">
                You can review promotions, but only an administrator can create or change them.
              </p>
            ) : null}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <SummaryMetric label="Total" value={summary.total} />
            <SummaryMetric label="Live" value={summary.live} />
            <SummaryMetric label="Used" value={summary.used} />
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(360px,0.8fr)_minmax(0,1.2fr)]">
        <Card className="h-fit gap-0 overflow-hidden p-0 xl:sticky xl:top-6">
          <div className="border-b p-5 sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {editingCode ? "Edit offer" : "Generate offer"}
            </p>
            <h2 className="mt-2 text-xl font-semibold">
              {editingCode ? editingCode : "New coupon code"}
            </h2>
          </div>
          <div className="space-y-5 p-5 sm:p-6">
            <Field label="Custom code" hint="Leave blank to generate a code from the prefix.">
              <Input
                autoComplete="off"
                className="font-mono uppercase tracking-[0.1em]"
                disabled={!canManage || saving}
                onChange={(event) => updateForm({ code: event.target.value.toUpperCase() })}
                placeholder="LAIT-PRIVATE"
                value={form.code}
              />
            </Field>
            {!editingCode && !form.code.trim() ? (
              <Field label="Generator prefix" hint="A secure random suffix is added on the server.">
                <Input
                  autoComplete="off"
                  className="font-mono uppercase tracking-[0.1em]"
                  disabled={!canManage || saving}
                  onChange={(event) => updateForm({ prefix: event.target.value.toUpperCase() })}
                  value={form.prefix}
                />
              </Field>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Discount type">
                <Select
                  disabled={!canManage || saving}
                  onValueChange={(value) => {
                    if (value === "percent" || value === "fixed") updateForm({ kind: value });
                  }}
                  value={form.kind}
                >
                  <SelectTrigger aria-label="Discount type" className="w-full">
                    <span>{form.kind === "percent" ? "Percentage" : "Fixed amount"}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Discount type</SelectLabel>
                      <SelectItem value="percent">Percentage</SelectItem>
                      <SelectItem value="fixed">Fixed amount</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field label={form.kind === "percent" ? "Percentage" : "Amount (NGN)"}>
                <Input
                  disabled={!canManage || saving}
                  inputMode="decimal"
                  min="0"
                  onChange={(event) => updateForm({ value: event.target.value })}
                  type="number"
                  value={form.value}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Minimum spend (NGN)" hint="Optional">
                <Input
                  disabled={!canManage || saving}
                  inputMode="decimal"
                  min="0"
                  onChange={(event) => updateForm({ minimumSpend: event.target.value })}
                  type="number"
                  value={form.minimumSpend}
                />
              </Field>
              <Field label="Maximum discount (NGN)" hint="Optional cap">
                <Input
                  disabled={!canManage || saving}
                  inputMode="decimal"
                  min="0"
                  onChange={(event) => updateForm({ maximumDiscount: event.target.value })}
                  type="number"
                  value={form.maximumDiscount}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Starts" hint="Optional">
                <Input
                  disabled={!canManage || saving}
                  onChange={(event) => updateForm({ startsAt: event.target.value })}
                  type="datetime-local"
                  value={form.startsAt}
                />
              </Field>
              <Field label="Ends" hint="Optional">
                <Input
                  disabled={!canManage || saving}
                  onChange={(event) => updateForm({ expiresAt: event.target.value })}
                  type="datetime-local"
                  value={form.expiresAt}
                />
              </Field>
            </div>

            <Field label="Verified-order usage limit" hint="Optional">
              <Input
                disabled={!canManage || saving}
                inputMode="numeric"
                min="1"
                onChange={(event) => updateForm({ usageLimit: event.target.value })}
                type="number"
                value={form.usageLimit}
              />
            </Field>

            <label className="flex items-start gap-3 rounded-2xl border p-4">
              <Checkbox
                checked={form.enabled}
                disabled={!canManage || saving}
                onCheckedChange={(checked) => updateForm({ enabled: Boolean(checked) })}
              />
              <span>
                <span className="block text-sm font-medium">Activate after saving</span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  Date and usage rules still decide whether checkout can apply the code.
                </span>
              </span>
            </label>

            <div className="flex flex-wrap gap-3">
              <Button
                className="flex-1"
                disabled={!canManage || saving}
                onClick={() => void submitCoupon()}
                type="button"
              >
                {saving ? "Saving…" : editingCode ? "Save changes" : "Generate coupon"}
              </Button>
              {editingCode ? (
                <Button disabled={saving} onClick={resetForm} type="button" variant="outline">
                  Cancel
                </Button>
              ) : null}
            </div>
          </div>
        </Card>

        <section aria-labelledby="promotion-list-title" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Offer library
              </p>
              <h2 className="mt-1 text-2xl font-semibold" id="promotion-list-title">
                Coupon codes
              </h2>
            </div>
            <Button
              disabled={couponsQuery.isFetching}
              onClick={() => void couponsQuery.refetch()}
              type="button"
              variant="outline"
            >
              {couponsQuery.isFetching ? "Refreshing…" : "Refresh"}
            </Button>
          </div>

          {coupons.length === 0 ? (
            <Card className="grid min-h-64 place-items-center p-8 text-center">
              <div>
                <p className="text-lg font-semibold">No private offers yet</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Generate the first coupon from the form beside this list.
                </p>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4">
              {coupons.map((coupon) => (
                <CouponCard
                  canManage={canManage}
                  coupon={coupon}
                  key={`promotion-coupon:${coupon.code}`}
                  onEdit={() => editCoupon(coupon)}
                  onToggle={() => void toggleCoupon(coupon)}
                  saving={saving}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function CouponCard({
  canManage,
  coupon,
  onEdit,
  onToggle,
  saving,
}: {
  canManage: boolean;
  coupon: PromotionCoupon;
  onEdit: () => void;
  onToggle: () => void;
  saving: boolean;
}) {
  const status = getCouponStatus(coupon);
  return (
    <Card className="gap-5 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded-lg bg-muted px-2.5 py-1 text-sm font-semibold tracking-[0.08em]">
              {coupon.code}
            </code>
            <span
              className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${status.className}`}
            >
              {status.label}
            </span>
          </div>
          <p className="mt-3 text-2xl font-semibold">
            {coupon.kind === "percent"
              ? `${coupon.value}% off`
              : `${formatNaira(coupon.value)} off`}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {coupon.minimumSubtotalMinor
              ? `Minimum spend ${formatNaira(coupon.minimumSubtotalMinor)}`
              : "No minimum spend"}
            {coupon.maximumDiscountMinor
              ? ` · capped at ${formatNaira(coupon.maximumDiscountMinor)}`
              : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button disabled={!canManage || saving} onClick={onEdit} type="button" variant="outline">
            Edit
          </Button>
          <Button disabled={!canManage || saving} onClick={onToggle} type="button" variant="ghost">
            {coupon.enabled ? "Deactivate" : "Activate"}
          </Button>
        </div>
      </div>
      <div className="grid gap-3 border-t pt-4 text-xs text-muted-foreground sm:grid-cols-3">
        <Meta label="Window" value={couponWindow(coupon)} />
        <Meta
          label="Verified uses"
          value={
            coupon.usageLimit === null
              ? String(coupon.usedCount)
              : `${coupon.usedCount} of ${coupon.usageLimit}`
          }
        />
        <Meta
          label="Checkout"
          value={coupon.enabled ? "Available when rules pass" : "Not available"}
        />
      </div>
    </Card>
  );
}

function SummaryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-background/80 p-4 text-center backdrop-blur">
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function Field({
  children,
  hint,
  label,
}: {
  children: React.ReactNode;
  hint?: string;
  label: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      <span className="flex items-center justify-between gap-2">
        <span>{label}</span>
        {hint ? (
          <span className="text-[11px] font-normal text-muted-foreground">{hint}</span>
        ) : null}
      </span>
      {children}
    </label>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-semibold uppercase tracking-[0.12em]">{label}</p>
      <p className="mt-1 leading-5 text-foreground">{value}</p>
    </div>
  );
}

function toCreateInput(form: CouponForm): CreatePromotionCouponInput | null {
  const value = Number(form.value);
  if (!Number.isFinite(value) || value <= 0) {
    toast.error("Enter a discount value greater than zero.");
    return null;
  }
  if (form.kind === "percent" && value > 100) {
    toast.error("Percentage discounts cannot exceed 100%.");
    return null;
  }
  const startsAt = toIsoDate(form.startsAt);
  const expiresAt = toIsoDate(form.expiresAt);
  if (startsAt && expiresAt && Date.parse(expiresAt) <= Date.parse(startsAt)) {
    toast.error("The end date must be later than the start date.");
    return null;
  }
  return {
    ...(form.code.trim() ? { code: form.code.trim() } : {}),
    ...(!form.code.trim() && form.prefix.trim() ? { prefix: form.prefix.trim() } : {}),
    enabled: form.enabled,
    kind: form.kind,
    value: form.kind === "fixed" ? toMinor(value) : value,
    ...(optionalNumber(form.minimumSpend) !== null
      ? { minimumSubtotalMinor: toMinor(optionalNumber(form.minimumSpend)!) }
      : {}),
    ...(optionalNumber(form.maximumDiscount) !== null
      ? { maximumDiscountMinor: toMinor(optionalNumber(form.maximumDiscount)!) }
      : {}),
    ...(startsAt ? { startsAt } : {}),
    ...(expiresAt ? { expiresAt } : {}),
    ...(optionalInteger(form.usageLimit) !== null
      ? { usageLimit: optionalInteger(form.usageLimit)! }
      : {}),
  };
}

function summarizeCoupons(coupons: PromotionCoupon[]) {
  return {
    total: coupons.length,
    live: coupons.filter((coupon) => getCouponStatus(coupon).label === "Live").length,
    used: coupons.reduce((total, coupon) => total + coupon.usedCount, 0),
  };
}

function getCouponStatus(coupon: PromotionCoupon) {
  const now = Date.now();
  if (!coupon.enabled) {
    return { label: "Inactive", className: "border-border bg-muted text-muted-foreground" };
  }
  if (coupon.startsAt && Date.parse(coupon.startsAt) > now) {
    return { label: "Scheduled", className: "border-blue-300 bg-blue-50 text-blue-800" };
  }
  if (coupon.expiresAt && Date.parse(coupon.expiresAt) <= now) {
    return { label: "Expired", className: "border-amber-300 bg-amber-50 text-amber-900" };
  }
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    return { label: "Limit reached", className: "border-amber-300 bg-amber-50 text-amber-900" };
  }
  return { label: "Live", className: "border-emerald-300 bg-emerald-50 text-emerald-800" };
}

function couponWindow(coupon: PromotionCoupon): string {
  if (!coupon.startsAt && !coupon.expiresAt) return "Always available while active";
  if (coupon.startsAt && coupon.expiresAt) {
    return `${formatDate(coupon.startsAt)} – ${formatDate(coupon.expiresAt)}`;
  }
  return coupon.startsAt
    ? `From ${formatDate(coupon.startsAt)}`
    : `Until ${formatDate(coupon.expiresAt!)}`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

function formatNaira(amountMinor: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}

function optionalNumber(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function optionalInteger(value: string): number | null {
  const parsed = optionalNumber(value);
  return parsed !== null && Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function toMinor(value: number): number {
  return Math.round(value * 100);
}

function toIsoDate(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toDateTimeLocal(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
