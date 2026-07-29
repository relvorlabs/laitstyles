"use client";

import { createContext, use } from "react";

export type AccountRoute =
  | "overview"
  | "profile"
  | "orders"
  | "order-detail"
  | "returns"
  | "return-detail"
  | "addresses"
  | "payments"
  | "saved"
  | "notifications"
  | "preferences"
  | "security"
  | "privacy"
  | "support"
  | "ticket-detail";

export type AccountModalId =
  | "verify-email"
  | "email"
  | "payment"
  | "remove-payment"
  | "password"
  | "signout-all";

export type AccountUi = {
  currentRoute: AccountRoute;
  navigate: (route: AccountRoute) => void;
  openModal: (id: AccountModalId) => void;
  closeModal: () => void;
  toast: (message: string) => void;
};

const AccountUiContext = createContext<AccountUi | null>(null);

export const AccountUiProvider = AccountUiContext.Provider;

export function useAccountUi(): AccountUi {
  const value = use(AccountUiContext);
  if (!value) throw new Error("useAccountUi must be used within the account workspace");
  return value;
}
