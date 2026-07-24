"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/server/auth/session";

const profileFormSchema = z.object({
  firstName: z.string().trim().min(1, "Enter your first name.").max(100),
  lastName: z.string().trim().min(1, "Enter your last name.").max(100),
  preferredName: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(40).optional(),
});

type ProfileField = "firstName" | "lastName" | "preferredName" | "phone";

export type ProfileActionState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: Partial<Record<ProfileField, string>>;
};

export const INITIAL_PROFILE_ACTION_STATE: ProfileActionState = {
  status: "idle",
  message: "No unsaved changes.",
};

export async function updateAccountProfile(
  _previousState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const parsed = profileFormSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    preferredName: formData.get("preferredName"),
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    const fieldErrors: Partial<Record<ProfileField, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field !== "string") continue;
      if (["firstName", "lastName", "preferredName", "phone"].includes(field)) {
        fieldErrors[field as ProfileField] ??= issue.message;
      }
    }
    return {
      status: "error",
      message: "Check the highlighted fields and try again.",
      fieldErrors,
    };
  }

  const session = await getCurrentSession();
  if (session.kind === "anonymous") {
    return { status: "error", message: "Sign in before updating your profile." };
  }
  if (session.kind === "suspended") {
    return { status: "error", message: "This account is inactive." };
  }
  if (session.kind === "unavailable") {
    throw new Error(`Profile authorization unavailable: ${session.error}`);
  }

  const preferredName = parsed.data.preferredName || null;
  const phone = parsed.data.phone || null;
  const fullName = `${parsed.data.firstName} ${parsed.data.lastName}`.trim();
  const displayName = preferredName || fullName;

  await prisma.$transaction(async (transaction) => {
    await transaction.profiles.update({
      where: { id: session.authUserId },
      data: { display_name: displayName, phone },
    });

    await transaction.profile_details.upsert({
      where: { profile_id: session.authUserId },
      update: {
        first_name: parsed.data.firstName,
        last_name: parsed.data.lastName,
        preferred_name: preferredName,
      },
      create: {
        profile_id: session.authUserId,
        first_name: parsed.data.firstName,
        last_name: parsed.data.lastName,
        preferred_name: preferredName,
      },
    });

    if (session.kind === "consumer") {
      await transaction.customers.upsert({
        where: { profile_id: session.authUserId },
        update: {
          name: fullName,
          email: session.email,
          phone,
        },
        create: {
          profile_id: session.authUserId,
          name: fullName,
          email: session.email,
          phone,
        },
      });
    }
  });

  revalidatePath("/account/profile");
  revalidatePath("/account");

  return { status: "success", message: "Profile updated." };
}
