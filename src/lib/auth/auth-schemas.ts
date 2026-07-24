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

export const passwordSignInSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const passwordSignUpSchema = passwordSignInSchema.extend({
  first: z.string().trim().min(1, "Enter your first name.").max(100, "First name is too long."),
  last: z.string().trim().min(1, "Enter your last name.").max(100, "Last name is too long."),
  password: passwordSchema.min(8, "Password must be at least 8 characters."),
  next: z.string().optional(),
});

export type PasswordSignInInput = z.infer<typeof passwordSignInSchema>;
export type PasswordSignUpInput = z.infer<typeof passwordSignUpSchema>;

type AuthField = "email" | "password" | "first" | "last";
const authFields = new Set<AuthField>(["email", "password", "first", "last"]);

export function authFormDataInput(formData: FormData) {
  return {
    email: formData.get("email"),
    password: formData.get("password"),
    first: formData.get("first"),
    last: formData.get("last"),
    next: formData.get("next"),
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
