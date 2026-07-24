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

export function authFormDataInput(formData: FormData) {
  return {
    email: formData.get("email"),
    password: formData.get("password"),
    first: formData.get("first"),
    last: formData.get("last"),
    next: formData.get("next"),
  };
}

export function authFieldErrors(
  error: z.ZodError,
): Partial<Record<"email" | "password" | "first" | "last", string>> {
  const flattened = error.flatten().fieldErrors;
  return {
    email: flattened.email?.[0],
    password: flattened.password?.[0],
    first: flattened.first?.[0],
    last: flattened.last?.[0],
  };
}
