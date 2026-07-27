import { ArrowRight, Mail, UserRound } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  AUTH_INPUT_CLASS_NAME,
  AUTH_PRIMARY_BUTTON_CLASS_NAME,
  AUTH_SECONDARY_BUTTON_CLASS_NAME,
  AuthField,
} from "@/modules/auth/ui/auth-page-shell";

type AuthFormAction = (formData: FormData) => Promise<void> | void;

export function SignUpForm({ action }: { action: AuthFormAction }) {
  return (
    <div className="grid gap-6">
      <form action="/auth/google" method="post">
        <input name="next" type="hidden" value="/account" />
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

      <form action={action} className="grid gap-[18px]">
        <input name="next" type="hidden" value="/account" />

        <div className="grid gap-[18px] sm:grid-cols-2">
          <AuthField htmlFor="signup-first" label="First name">
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
              <Input
                autoComplete="given-name"
                className={`${AUTH_INPUT_CLASS_NAME} pl-11`}
                id="signup-first"
                name="first"
                placeholder="First name"
                required
              />
            </div>
          </AuthField>
          <AuthField htmlFor="signup-last" label="Last name">
            <Input
              autoComplete="family-name"
              className={AUTH_INPUT_CLASS_NAME}
              id="signup-last"
              name="last"
              placeholder="Last name"
              required
            />
          </AuthField>
        </div>

        <AuthField htmlFor="signup-email" label="Email address">
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
            <Input
              autoComplete="email"
              className={`${AUTH_INPUT_CLASS_NAME} pl-11`}
              id="signup-email"
              name="email"
              placeholder="you@example.com"
              required
              type="email"
            />
          </div>
        </AuthField>

        <AuthField htmlFor="signup-password" hint="At least 8 characters" label="Password">
          <Input
            autoComplete="new-password"
            className={AUTH_INPUT_CLASS_NAME}
            id="signup-password"
            minLength={8}
            name="password"
            placeholder="Create a strong password"
            required
            type="password"
          />
        </AuthField>

        <Label className="cursor-pointer items-start gap-3 rounded-2xl border border-border/75 bg-muted/35 p-4 text-[13px] leading-5 text-muted-foreground">
          <Checkbox className="mt-0.5" name="terms" required value="true" />
          <span>I agree to the Terms and Privacy Policy and understand that my account is used for orders, saved pieces and delivery details.</span>
        </Label>

        <Button className={`w-full ${AUTH_PRIMARY_BUTTON_CLASS_NAME}`} size="lg" type="submit">
          Create my account
          <ArrowRight className="size-4" />
        </Button>
      </form>

      <p className="text-center text-[13px] text-muted-foreground">
        Already registered?{" "}
        <Link className="font-semibold text-foreground underline-offset-4 hover:underline" href="/?auth=signin">
          Sign in
        </Link>
      </p>
    </div>
  );
}
