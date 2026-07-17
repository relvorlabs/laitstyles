"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdmin } from "@/features/admin/state/admin-provider";
import { returnsKeys } from "@/lib/admin/returns/returns-query-keys";
import { overviewKeys } from "@/lib/admin/shared/overview-query-keys";
import type { ControlRoomReturn, CreateReturnInput, ReturnStatus } from "@/lib/admin/shared/types";

function replaceReturnInCache(
  previous: ControlRoomReturn[] | undefined,
  returnRecord: ControlRoomReturn,
) {
  const withoutExisting = previous?.filter((entry) => entry.id !== returnRecord.id) ?? [];
  return [returnRecord, ...withoutExisting];
}

export function useCreateReturn() {
  const { createReturn } = useAdmin();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateReturnInput) => Promise.resolve(createReturn(input)),
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.setQueryData(returnsKeys.list(), (previous?: ControlRoomReturn[]) =>
          replaceReturnInCache(previous, result.value.returnRecord),
        );
        // Opening a return marks the order attention: "return", which Overview's
        // attention list can surface.
        queryClient.invalidateQueries({ queryKey: overviewKeys.overview() });
      }
    },
  });
}

export function useTransitionReturn() {
  const { transitionReturn } = useAdmin();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ returnId, nextStatus }: { returnId: string; nextStatus: ReturnStatus }) =>
      Promise.resolve(transitionReturn(returnId, nextStatus)),
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.setQueryData(returnsKeys.list(), (previous?: ControlRoomReturn[]) =>
          replaceReturnInCache(previous, result.value.returnRecord),
        );
        // received/restocked/damaged transitions mutate product stock, which
        // Overview's low-stock section derives from.
        queryClient.invalidateQueries({ queryKey: overviewKeys.overview() });
      }
    },
  });
}
