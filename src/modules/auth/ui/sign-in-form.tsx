import { ArrowRight, Mail } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  AUTH_INPUT_CLASS_NAME,
  AUTH_PRIMARY_BUTTON_CLASS_NAME,
  AUTH_SECONDARY_BUTTON_CLASS_NAME,
  AuthField,
} from "@/modules/auth/ui/auth-page-shell";

type AuthFormAction = (formData: FormData) => Promise<void> | void;

export function SignInForm({ action, next }: { action: AuthFormAction; next: string }) {
  return (
    <div className="grid gap-6">
      <form action="/auth/google" method="post">
        <input name="next" type="hidden" value={next} />
        <Button
          className={`w-full ${AUTH_SECONDARY_BUTTON_CLASS_NAME}`}
          size="lg"
          type="submit"
          variant="outline"
        >
          <span className="grid size-7 place-items-center rounded-full border border-border bg-card font-semibold">
            G
          </span>
          Continue with Google
        </Button>
      </form>

      <div className="flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        <Separator className="flex-1" />
        or use email
        <Separator className="flex-1" />
      </div>

      <form action={action} className="grid gap-4.5">
        <input name="next" type="hidden" value={next} />
        <AuthField htmlFor="auth-email" label="Email address">
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
            <Input
              autoComplete="email"
              className={`${AUTH_INPUT_CLASS_NAME} pl-11`}
              id="auth-email"
              name="email"
              placeholder="you@example.com"
              required
              type="email"
            />
          </div>
        </AuthField>

        <AuthField htmlFor="auth-password" label="Password">
          <Input
            autoComplete="current-password"
            className={AUTH_INPUT_CLASS_NAME}
            id="auth-password"
            name="password"
            placeholder="Enter your password"
            required
            type="password"
          />
        </AuthField>

        <div className="flex flex-wrap items-center justify-between gap-3 text-[13px]">
          <Link className="font-semibold text-foreground underline-offset-4 hover:underline" href="/auth/forgot-password">
            Forgot password?
          </Link>
          <Link
            className="font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            href="/auth/resend-confirmation"
          >
            Resend confirmation
          </Link>
        </div>

        <Button className={`mt-1 w-full ${AUTH_PRIMARY_BUTTON_CLASS_NAME}`} size="lg" type="submit">
          Sign in to workspace
          <ArrowRight className="size-4" />
        </Button>
      </form>
    </div>
  );
}
