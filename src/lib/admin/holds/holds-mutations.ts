"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdmin } from "@/features/admin/state/admin-provider";
import { holdsKeys } from "@/lib/admin/holds/holds-query-keys";
import { overviewKeys } from "@/lib/admin/shared/overview-query-keys";
import type { ControlRoomHold, ConvertHoldInput } from "@/lib/admin/shared/types";

function replaceHoldInCache(previous: ControlRoomHold[] | undefined, hold: ControlRoomHold) {
  return previous?.map((entry) => (entry.id === hold.id ? hold : entry));
}

export function useExtendHold() {
  const { extendHold } = useAdmin();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ holdId, minutes }: { holdId: string; minutes: number }) =>
      Promise.resolve(extendHold(holdId, minutes)),
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.setQueryData(holdsKeys.list(), (previous?: ControlRoomHold[]) =>
          replaceHoldInCache(previous, result.value.hold),
        );
        // Extending a hold can change Overview's "releasing soon" attention item.
        queryClient.invalidateQueries({ queryKey: overviewKeys.overview() });
      }
    },
  });
}

export function useReleaseHold() {
  const { releaseHold } = useAdmin();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (holdId: string) => Promise.resolve(releaseHold(holdId)),
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.setQueryData(holdsKeys.list(), (previous?: ControlRoomHold[]) =>
          replaceHoldInCache(previous, result.value.hold),
        );
        // Releasing a hold frees stock, which can change Overview's low-stock
        // and active-holds counts.
        queryClient.invalidateQueries({ queryKey: overviewKeys.overview() });
      }
    },
  });
}

export function useConvertHold() {
  const { convertHold } = useAdmin();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ConvertHoldInput) => Promise.resolve(convertHold(input)),
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.setQueryData(holdsKeys.list(), (previous?: ControlRoomHold[]) =>
          replaceHoldInCache(previous, result.value.hold),
        );
        // Converting a hold creates an order and sells reserved stock, both of
        // which feed Overview's revenue/orders-today and low-stock sections.
        queryClient.invalidateQueries({ queryKey: overviewKeys.overview() });
      }
    },
  });
}
