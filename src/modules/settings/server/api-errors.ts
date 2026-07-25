import { ApiError } from "@/lib/errors/api-error";
import type { StoreSettingsActionError } from "@/modules/settings/types";

export function throwSettingsActionError(error: StoreSettingsActionError): never {
  const fieldErrors = Object.fromEntries(
    (error.issues ?? []).map((issue) => [issue.path, issue.message]),
  );
  throw new ApiError({
    code: error.code.toUpperCase().replaceAll("-", "_"),
    message: error.message,
    status: error.code === "settings-not-available" ? 404 : 422,
    ...(Object.keys(fieldErrors).length ? { fieldErrors } : {}),
  });
}
