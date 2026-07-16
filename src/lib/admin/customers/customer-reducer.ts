import type {
  AddCustomerNoteInput,
  CustomerActionError,
  CustomerNote,
  CustomerNoteActionSuccess,
} from "@/lib/admin/customers/customer-types";
import { err, ok, type Result } from "@/lib/admin/shared/result";
import type { ControlRoomState } from "@/lib/admin/shared/types";

export type CustomerNoteStateResult = {
  state: ControlRoomState;
  action: CustomerNoteActionSuccess;
};

export function applyAddCustomerNote(
  state: ControlRoomState,
  input: AddCustomerNoteInput,
  now: string,
  idFactory: (prefix: string) => string = createActionId,
): Result<CustomerNoteStateResult, CustomerActionError> {
  const customer = state.customers.find((entry) => entry.id === input.customerId);
  if (!customer) {
    return err({
      code: "customer-not-found",
      customerId: input.customerId,
      message: "The selected customer could not be found.",
    });
  }

  const body = input.body.trim();
  if (!body) {
    return err({
      code: "empty-note",
      customerId: input.customerId,
      field: "body",
      message: "Enter a useful internal note before saving.",
    });
  }
  if (body.length > 600) {
    return err({
      code: "note-too-long",
      customerId: input.customerId,
      field: "body",
      message: "Keep the internal note within 600 characters.",
    });
  }

  const note: CustomerNote = {
    id: idFactory("customer-note"),
    body,
    createdAt: now,
    author: "Store owner",
  };
  const customers = state.customers.map((entry) =>
    entry.id === customer.id ? { ...entry, notes: [note, ...(entry.notes ?? [])] } : entry,
  );
  const message = `Internal note saved for ${customer.name}.`;

  return ok({
    state: {
      ...state,
      asOf: now,
      customers,
      activities: [
        {
          id: idFactory("activity"),
          kind: "customer",
          title: `Customer note added for ${customer.name}`,
          detail: "Internal relationship context updated in this prototype session.",
          occurredAt: now,
          customerId: customer.id,
        },
        ...state.activities,
      ],
    },
    action: {
      customerId: customer.id,
      note,
      message,
    },
  });
}

function createActionId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}
