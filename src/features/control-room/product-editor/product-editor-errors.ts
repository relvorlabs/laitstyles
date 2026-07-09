import type { FieldErrors } from "react-hook-form";
import type { ProductEditorValues } from "@/lib/control-room/types";

export function getProductEditorFieldError(
  errors: FieldErrors<ProductEditorValues>,
  name: string,
) {
  let current: unknown = errors;
  for (const segment of name.split(".")) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[segment];
  }

  if (
    current &&
    typeof current === "object" &&
    "message" in current &&
    typeof current.message === "string"
  ) {
    return current.message;
  }

  return undefined;
}
