import "server-only";

import type { User } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getAuthRedirectUrl } from "@/modules/auth/server/redirects";
import { getCurrentSession } from "@/modules/auth/server/session";

export type ManagerInvitationInput = {
  email: string;
  firstName: string;
  lastName: string;
};

export type ManagerMember = {
  id: string;
  email: string;
  displayName: string;
  state: "invited" | "active";
  invitedAt: string | null;
  lastSeenAt: string | null;
};

export type ManagerInvitationResult =
  | { ok: true; member: ManagerMember; message: string }
  | {
      ok: false;
      message: string;
      fieldErrors?: Partial<Record<"email" | "firstName" | "lastName", string>>;
    };

export async function listStoreManagers(): Promise<ManagerMember[]> {
  await requireOwner();
  const profiles = await prisma.profiles.findMany({
    where: { role: "manager", status: "active" },
    orderBy: [{ created_at: "desc" }],
    select: {
      id: true,
      email: true,
      display_name: true,
      last_seen_at: true,
      created_at: true,
    },
  });

  const users = await listAuthUsers();
  const authById = new Map(users.map((user) => [user.id, user]));

  return profiles.map((profile) => {
    const authUser = authById.get(profile.id);
    return {
      id: profile.id,
      email: profile.email ?? authUser?.email ?? "",
      displayName: profile.display_name ?? profile.email?.split("@")[0] ?? "Store manager",
      state: authUser?.email_confirmed_at ? "active" : "invited",
      invitedAt: authUser?.invited_at ?? profile.created_at.toISOString(),
      lastSeenAt: profile.last_seen_at?.toISOString() ?? authUser?.last_sign_in_at ?? null,
    };
  });
}

export async function inviteStoreManager(
  input: ManagerInvitationInput,
): Promise<ManagerInvitationResult> {
  const owner = await requireOwner();
  const parsed = validateInvitation(input);
  if (!parsed.ok) return parsed;

  const email = parsed.value.email;
  const existingProfile = await prisma.profiles.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, role: true },
  });
  if (existingProfile) {
    return {
      ok: false,
      message:
        existingProfile.role === "manager"
          ? "This manager has already been invited or joined the store."
          : "An account already exists for this email and cannot be silently changed into a manager.",
      fieldErrors: { email: "Use an email that is not already attached to an account." },
    };
  }

  const supabase = createSupabaseAdminClient();
  const redirectTo = await getAuthRedirectUrl("/auth/invite/setup");
  const fullName = `${parsed.value.firstName} ${parsed.value.lastName}`.trim();
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: {
      first_name: parsed.value.firstName,
      last_name: parsed.value.lastName,
      full_name: fullName,
      invited_role: "manager",
    },
  });

  if (error || !data.user) {
    return {
      ok: false,
      message:
        error?.code === "email_exists" ||
        /already.+registered|already.+exists/i.test(error?.message ?? "")
          ? "An account already exists for this email."
          : "The manager invitation could not be sent. Check the address and try again.",
      fieldErrors: error ? { email: "Supabase did not accept this invitation." } : undefined,
    };
  }

  const profile = await prisma.$transaction(async (transaction) => {
    const result = await transaction.profiles.upsert({
      where: { id: data.user.id },
      update: {
        email,
        role: "manager",
        status: "active",
        display_name: fullName,
      },
      create: {
        id: data.user.id,
        email,
        role: "manager",
        status: "active",
        display_name: fullName,
      },
      select: { id: true, email: true, display_name: true, created_at: true },
    });

    await transaction.profile_details.upsert({
      where: { profile_id: data.user.id },
      update: {
        first_name: parsed.value.firstName,
        last_name: parsed.value.lastName,
      },
      create: {
        profile_id: data.user.id,
        first_name: parsed.value.firstName,
        last_name: parsed.value.lastName,
      },
    });

    await transaction.customers.deleteMany({ where: { profile_id: data.user.id } });
    await transaction.audit_events.create({
      data: {
        actor_profile_id: owner.authUserId,
        action: "staff.manager.invited",
        target_table: "profiles",
        target_id: data.user.id,
        metadata: { email },
      },
    });
    return result;
  });

  return {
    ok: true,
    message:
      "Invitation sent. The manager can set a password and finish their profile from the email link.",
    member: {
      id: profile.id,
      email: profile.email ?? email,
      displayName: profile.display_name ?? fullName,
      state: "invited",
      invitedAt: data.user.invited_at ?? profile.created_at.toISOString(),
      lastSeenAt: null,
    },
  };
}

export async function completeManagerSetup(input: {
  firstName: string;
  lastName: string;
  password: string;
  confirmPassword: string;
}) {
  const validation = validateManagerSetup(input);
  if (!validation.ok) return validation;

  const supabase = await createClient();
  const userResult = await supabase.auth.getUser();
  const user = userResult.data.user;
  if (!user || userResult.error) {
    return { ok: false as const, message: "This invitation session is missing or has expired." };
  }

  const profile = await prisma.profiles.findUnique({
    where: { id: user.id },
    select: { role: true, status: true },
  });
  if (!profile || profile.role !== "manager" || profile.status !== "active") {
    return { ok: false as const, message: "This invitation is not approved for a store manager." };
  }

  const fullName = `${validation.value.firstName} ${validation.value.lastName}`.trim();
  const updateResult = await supabase.auth.updateUser({
    password: validation.value.password,
    data: {
      first_name: validation.value.firstName,
      last_name: validation.value.lastName,
      full_name: fullName,
      invited_role: "manager",
    },
  });
  if (updateResult.error) {
    return {
      ok: false as const,
      message: /password/i.test(updateResult.error.message)
        ? "Choose a stronger password and try again."
        : "Your manager account could not be completed. Request a new invitation if this continues.",
    };
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.profiles.update({
      where: { id: user.id },
      data: {
        display_name: fullName,
        email: user.email ?? null,
        role: "manager",
        status: "active",
      },
    });
    await transaction.profile_details.upsert({
      where: { profile_id: user.id },
      update: { first_name: validation.value.firstName, last_name: validation.value.lastName },
      create: {
        profile_id: user.id,
        first_name: validation.value.firstName,
        last_name: validation.value.lastName,
      },
    });
    await transaction.customers.deleteMany({ where: { profile_id: user.id } });
    await transaction.audit_events.create({
      data: {
        actor_profile_id: user.id,
        action: "staff.manager.joined",
        target_table: "profiles",
        target_id: user.id,
        metadata: { email: user.email ?? null },
      },
    });
  });

  return { ok: true as const, message: "Your store-manager account is ready." };
}

async function requireOwner() {
  const session = await getCurrentSession();
  if (session.kind !== "staff" || session.role !== "admin") {
    throw new Error("Only the store owner can manage staff invitations.");
  }
  return session;
}

async function listAuthUsers(): Promise<User[]> {
  const supabase = createSupabaseAdminClient();
  const users: User[] = [];
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw new Error("Could not read invited staff accounts.");
    users.push(...data.users);
    if (data.users.length < 100) break;
  }
  return users;
}

function validateInvitation(input: ManagerInvitationInput) {
  const email = input.email.trim().toLowerCase();
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const fieldErrors: Partial<Record<"email" | "firstName" | "lastName", string>> = {};
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    fieldErrors.email = "Enter a valid email address.";
  }
  if (!firstName) fieldErrors.firstName = "Enter the manager's first name.";
  if (!lastName) fieldErrors.lastName = "Enter the manager's last name.";
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false as const, message: "Check the highlighted invitation fields.", fieldErrors };
  }
  return { ok: true as const, value: { email, firstName, lastName } };
}

function validateManagerSetup(input: {
  firstName: string;
  lastName: string;
  password: string;
  confirmPassword: string;
}) {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  if (!firstName || !lastName) {
    return { ok: false as const, message: "Enter your first and last name." };
  }
  if (input.password.length < 8) {
    return { ok: false as const, message: "Password must be at least 8 characters." };
  }
  if (input.password !== input.confirmPassword) {
    return { ok: false as const, message: "Passwords do not match." };
  }
  return { ok: true as const, value: { firstName, lastName, password: input.password } };
}
