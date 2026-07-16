import { err, ok, type Result } from "@/lib/admin/result";
import { parseStoreSettingsInput } from "@/lib/admin/settings-schema";
import type {
  ControlRoomState,
  SaveStoreSettingsInput,
  StoreSettingsActionError,
  StoreSettingsActionSuccess,
} from "@/lib/admin/types";

export type StoreSettingsStateResult = {
  state: ControlRoomState;
  action: StoreSettingsActionSuccess;
};

export function applySaveStoreSettings(
  state: ControlRoomState,
  input: SaveStoreSettingsInput,
  now: string,
  idFactory: (prefix: string) => string = createActionId,
): Result<StoreSettingsStateResult, StoreSettingsActionError> {
  const parsed = parseStoreSettingsInput(input);
  if (!parsed.ok) {
    return err({
      code: "invalid-settings",
      message: "Review the highlighted store settings before saving.",
      issues: parsed.issues,
    });
  }

  const settings = {
    ...parsed.value,
    updatedAt: now,
  };

  return ok({
    state: {
      ...state,
      asOf: now,
      storeName: settings.identity.storeName,
      currency: settings.selling.currency,
      settings,
      activities: [
        {
          id: idFactory("activity"),
          kind: "settings",
          title: "Store settings updated",
          detail:
            "Store identity, selling, delivery, payment and notification preferences were updated.",
          occurredAt: now,
        },
        ...state.activities,
      ],
    },
    action: {
      settings,
      message: "Store settings were saved until this page is refreshed.",
    },
  });
}

function createActionId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}
