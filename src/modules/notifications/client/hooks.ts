"use client";

import { keepPreviousData, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listNotificationPreferencesRequest,
  listNotificationsRequest,
  markAllNotificationsReadRequest,
  markNotificationReadRequest,
  updateNotificationPreferenceRequest,
} from "@/modules/notifications/client/api";
import { notificationKeys } from "@/modules/notifications/client/keys";
import type { NotificationListInput } from "@/modules/notifications/types";

export function notificationsQueryOptions(input: NotificationListInput) {
  return queryOptions({
    queryKey: notificationKeys.list(input),
    queryFn: ({ signal }) => listNotificationsRequest(input, signal),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}

export function notificationPreferencesQueryOptions() {
  return queryOptions({
    queryKey: notificationKeys.preferences(),
    queryFn: ({ signal }) => listNotificationPreferencesRequest(signal),
    staleTime: 30_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markNotificationReadRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsReadRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
    },
  });
}

export function useUpdateNotificationPreference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateNotificationPreferenceRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.preferences() });
    },
  });
}
