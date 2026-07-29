import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .min(1, "Enter your email address.")
  .email("Enter a valid email address.")
  .max(320, "Enter a valid email address.");

const passwordSchema = z
  .string()
  .min(1, "Enter your password.")
  .max(1024, "Enter a valid password.");

const strongPasswordSchema = passwordSchema.min(8, "Password must be at least 8 characters.");

export const passwordSignInSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const passwordSignUpSchema = z
  .object({
    email: emailSchema,
    password: strongPasswordSchema,
    confirmPassword: z.string().min(1, "Confirm your password."),
    first: z.string().trim().min(1, "Enter your first name.").max(100, "First name is too long."),
    last: z.string().trim().min(1, "Enter your last name.").max(100, "Last name is too long."),
    terms: z.preprocess(
      (value) => value === true || value === "true",
      z.boolean().refine(Boolean, "Please accept the Terms to continue."),
    ),
    next: z.string().optional(),
    returnTo: z.string().optional(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export const authEmailSchema = z.object({
  email: emailSchema,
});

export const authEmailRequestSchema = authEmailSchema.extend({
  kind: z.enum(["recovery", "confirmation"]),
  returnTo: z.string().optional(),
});

export const recoveredPasswordSchema = z
  .object({
    password: strongPasswordSchema,
    confirmPassword: z.string().min(1, "Confirm your new password."),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export const accountEmailChangeSchema = z.object({
  email: emailSchema,
});

export const accountPasswordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password.").max(1024),
    password: strongPasswordSchema,
    confirmPassword: z.string().min(1, "Confirm your new password."),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export type AccountEmailChangeInput = z.infer<typeof accountEmailChangeSchema>;
export type AccountPasswordChangeInput = z.infer<typeof accountPasswordChangeSchema>;

export const mfaEnrollTotpSchema = z.object({
  friendlyName: z.string().trim().min(1, "Name this authenticator.").max(60).optional(),
});

export const mfaChallengeSchema = z.object({
  factorId: z.string().min(1, "Select an authenticator."),
});

export const mfaVerifySchema = z.object({
  factorId: z.string().min(1, "Select an authenticator."),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code from your authenticator app."),
});

export type MfaEnrollTotpInput = z.infer<typeof mfaEnrollTotpSchema>;
export type MfaChallengeInput = z.infer<typeof mfaChallengeSchema>;
export type MfaVerifyInput = z.infer<typeof mfaVerifySchema>;

export type PasswordSignInInput = z.infer<typeof passwordSignInSchema>;
export type PasswordSignUpInput = z.infer<typeof passwordSignUpSchema>;
export type AuthEmailInput = z.infer<typeof authEmailSchema>;
export type AuthEmailRequestInput = z.infer<typeof authEmailRequestSchema>;
export type RecoveredPasswordInput = z.infer<typeof recoveredPasswordSchema>;

type AuthField = "email" | "password" | "confirmPassword" | "first" | "last" | "terms";
const authFields = new Set<AuthField>([
  "email",
  "password",
  "confirmPassword",
  "first",
  "last",
  "terms",
]);

export function authFormDataInput(formData: FormData) {
  const next = formData.get("next");
  const returnTo = formData.get("returnTo");
  return {
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    first: formData.get("first"),
    last: formData.get("last"),
    terms: formData.get("terms"),
    next: typeof next === "string" ? next : undefined,
    returnTo: typeof returnTo === "string" ? returnTo : undefined,
  };
}

export function authEmailFormDataInput(formData: FormData) {
  return { email: formData.get("email") };
}

export function recoveredPasswordFormDataInput(formData: FormData) {
  return {
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  };
}

export function authFieldErrors(error: z.ZodError): Partial<Record<AuthField, string>> {
  const fields: Partial<Record<AuthField, string>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field !== "string" || !authFields.has(field as AuthField)) continue;
    const authField = field as AuthField;
    fields[authField] ??= issue.message;
  }
  return fields;
}
