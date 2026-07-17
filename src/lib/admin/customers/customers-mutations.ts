"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdmin } from "@/features/admin/state/admin-provider";
import type {
  AddCustomerNoteInput,
  ControlRoomCustomer,
} from "@/lib/admin/customers/customer-types";
import { customersKeys } from "@/lib/admin/customers/customers-query-keys";

export function useAddCustomerNote() {
  const { addCustomerNote } = useAdmin();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AddCustomerNoteInput) => Promise.resolve(addCustomerNote(input)),
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.setQueryData(customersKeys.list(), (previous?: ControlRoomCustomer[]) =>
          previous?.map((customer) =>
            customer.id === result.value.customerId
              ? { ...customer, notes: [result.value.note, ...(customer.notes ?? [])] }
              : customer,
          ),
        );
      }
    },
  });
}
