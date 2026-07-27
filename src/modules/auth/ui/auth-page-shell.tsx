import { CheckCircle2, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { LaitstyleSymbol } from "@/components/brand/laitstyle-symbol";
import { cn } from "@/lib/utils";

export const AUTH_INPUT_CLASS_NAME =
  "h-[54px] rounded-xl border-border/80 bg-background/90 px-4 text-[15px] font-medium shadow-[0_1px_0_rgba(24,32,23,.04)] transition-[border-color,box-shadow,background-color] placeholder:text-muted-foreground/55 hover:border-foreground/25 focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/15";

export const AUTH_PRIMARY_BUTTON_CLASS_NAME =
  "h-[54px] rounded-xl text-[14px] font-semibold shadow-[0_12px_30px_rgba(51,72,43,.18)]";

export const AUTH_SECONDARY_BUTTON_CLASS_NAME =
  "h-[54px] rounded-xl border-border/80 bg-background/75 text-[14px] font-semibold shadow-sm hover:bg-muted/60";

type AuthPageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  sideTitle: string;
  sideDescription: string;
  highlights?: readonly string[];
  children: ReactNode;
  footer?: ReactNode;
  staff?: boolean;
};

export function AuthPageShell({
  eyebrow,
  title,
  description,
  sideTitle,
  sideDescription,
  highlights = [
    "Protected account and session handling",
    "Clear recovery and confirmation paths",
    "Your account data stays attached to you",
  ],
  children,
  footer,
  staff = false,
}: AuthPageShellProps) {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-background px-3 py-3 sm:px-6 sm:py-6">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
      <div className="pointer-events-none absolute -left-24 top-10 size-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 right-0 size-80 rounded-full bg-accent/10 blur-3xl" />

      <div className="relative mx-auto grid min-h-[calc(100dvh-1.5rem)] max-w-[1180px] overflow-hidden rounded-[30px] border border-border/70 bg-card shadow-[0_35px_120px_rgba(23,31,22,.18)] sm:min-h-[calc(100dvh-3rem)] lg:grid-cols-[.92fr_1.08fr]">
        <aside className="relative hidden overflow-hidden bg-sidebar text-sidebar-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(145deg,rgba(255,255,255,.08),transparent_45%,rgba(184,206,142,.08))]" />
          <div className="pointer-events-none absolute -right-20 top-28 size-72 rounded-full border border-sidebar-border/70" />
          <div className="pointer-events-none absolute -right-8 top-40 size-44 rounded-full border border-sidebar-border/50" />

          <Link className="relative inline-flex w-fit items-center gap-3" href="/">
            <span className="grid size-12 place-items-center rounded-2xl border border-sidebar-border bg-sidebar-accent/80 shadow-sm">
              <LaitstyleSymbol aria-hidden="true" className="h-8 w-5" focusable="false" />
            </span>
            <span>
              <span className="block font-serif text-[25px] leading-none">Laitstyle</span>
              <span className="mt-1.5 block text-[10px] font-semibold uppercase tracking-[0.22em] text-sidebar-foreground/58">
                {staff ? "Store workspace" : "Private account"}
              </span>
            </span>
          </Link>

          <div className="relative max-w-[470px]">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-sidebar-border bg-sidebar-accent/55 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/75">
              {staff ? <ShieldCheck className="size-3.5" /> : <Sparkles className="size-3.5" />}
              {staff ? "Authorised staff only" : "One account, every find"}
            </div>
            <h2 className="font-serif text-[48px] font-medium leading-[1.02] xl:text-[58px]">
              {sideTitle}
            </h2>
            <p className="mt-6 max-w-[430px] text-[15px] leading-7 text-sidebar-foreground/68">
              {sideDescription}
            </p>

            <div className="mt-9 grid gap-4">
              {highlights.map((highlight) => (
                <div
                  className="flex items-center gap-3 text-sm text-sidebar-foreground/82"
                  key={highlight}
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-full border border-sidebar-border bg-sidebar-accent/70">
                    <CheckCircle2 className="size-4" />
                  </span>
                  <span>{highlight}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative flex items-center gap-3 border-t border-sidebar-border/70 pt-6 text-xs leading-5 text-sidebar-foreground/58">
            <LockKeyhole className="size-4 shrink-0" />
            Authentication is handled securely and account permissions are checked on the server.
          </div>
        </aside>

        <section className="flex items-center justify-center px-5 py-8 sm:px-10 sm:py-12 lg:px-14">
          <div className="w-full max-w-[470px]">
            <Link className="mb-10 inline-flex items-center gap-3 lg:hidden" href="/">
              <span className="grid size-11 place-items-center rounded-2xl border border-border bg-muted/45">
                <LaitstyleSymbol aria-hidden="true" className="h-7 w-5" focusable="false" />
              </span>
              <span className="font-serif text-2xl">Laitstyle</span>
            </Link>

            <header className="mb-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                {eyebrow}
              </p>
              <h1 className="mt-3 font-serif text-[38px] font-medium leading-[1.05] tracking-[-0.02em] sm:text-[46px]">
                {title}
              </h1>
              <p className="mt-4 max-w-[440px] text-[14px] leading-6 text-muted-foreground sm:text-[15px]">
                {description}
              </p>
            </header>

            {children}

            {footer ? <div className="mt-7 border-t border-border/70 pt-6">{footer}</div> : null}
          </div>
        </section>
      </div>
    </main>
  );
}

export function AuthField({
  children,
  htmlFor,
  label,
  hint,
}: {
  children: ReactNode;
  htmlFor: string;
  label: string;
  hint?: string;
}) {
  return (
    <label className="grid gap-2 text-[13px] font-semibold text-foreground" htmlFor={htmlFor}>
      <span className="flex items-center justify-between gap-3">
        <span>{label}</span>
        {hint ? (
          <span className="text-[11px] font-medium text-muted-foreground">{hint}</span>
        ) : null}
      </span>
      {children}
    </label>
  );
}

export function AuthStatusNotice({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "error" | "info" | "success";
}) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-2xl border px-4 py-3.5 text-[13px] leading-5",
        tone === "error" &&
          "border-destructive/25 bg-destructive-surface text-destructive-surface-foreground",
        tone === "success" && "border-primary/20 bg-primary/10 text-foreground",
        tone === "info" && "border-border/80 bg-muted/45 text-muted-foreground",
      )}
      role={tone === "error" ? "alert" : "status"}
    >
      {tone === "error" ? (
        <ShieldCheck className="mt-0.5 size-4 shrink-0" />
      ) : tone === "success" ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
      ) : (
        <LockKeyhole className="mt-0.5 size-4 shrink-0" />
      )}
      <div>{children}</div>
    </div>
  );
}
