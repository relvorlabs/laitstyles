import "server-only";

import { AUTH_DENIED_MESSAGES } from "@/lib/auth/auth-errors";
import { ApiError } from "@/lib/errors/api-error";
import { hasCapability, type StaffCapability } from "@/modules/auth/permissions";
import {
  type ConsumerSession,
  type CurrentSession,
  getCurrentSession,
  type StaffSession,
} from "@/modules/auth/server/session";

export async function requireApiSession(): Promise<ConsumerSession | StaffSession> {
  const session = await getCurrentSession();
  return requireAuthenticatedSession(session);
}

export async function requireApiConsumer(): Promise<ConsumerSession> {
  const session = await requireApiSession();
  if (session.kind !== "consumer") {
    throw forbiddenError();
  }

  return session;
}

export async function requireApiStaff(
  capability: StaffCapability = "admin:access",
): Promise<StaffSession> {
  const session = await requireApiSession();
  if (session.kind !== "staff" || !hasCapability(session.role, capability)) {
    throw new ApiError({
      code: "MISSING_CAPABILITY",
      message: AUTH_DENIED_MESSAGES["missing-capability"],
      status: 403,
    });
  }

  return session;
}

function requireAuthenticatedSession(session: CurrentSession): ConsumerSession | StaffSession {
  switch (session.kind) {
    case "consumer":
    case "staff":
      return session;
    case "anonymous":
      throw new ApiError({
        code: "AUTHENTICATION_REQUIRED",
        message: AUTH_DENIED_MESSAGES["signed-out"],
        status: 401,
      });
    case "suspended":
      throw new ApiError({
        code: "ACCOUNT_INACTIVE",
        message: AUTH_DENIED_MESSAGES["account-inactive"],
        status: 403,
      });
    case "unavailable":
      throw new ApiError({
        code: "AUTHORIZATION_UNAVAILABLE",
        message: AUTH_DENIED_MESSAGES["authorization-unavailable"],
        status: 503,
      });
  }
}

function forbiddenError(): ApiError {
  return new ApiError({
    code: "FORBIDDEN",
    message: "This account cannot access that resource.",
    status: 403,
  });
}
