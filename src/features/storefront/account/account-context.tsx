"use client";

import { createContext, use } from "react";
import type { AccountRoute } from "./account-nav";

// Every modal in the prototype, keyed by the id the HTML used in `data-open`.
export type AccountModalId =
  | "verify-email"
  | "email"
  | "address"
  | "delete-address"
  | "payment"
  | "remove-payment"
  | "cancel"
  | "return"
  | "password"
  | "signout-all"
  | "export"
  | "delete"
  | "support";

export type AccountUi = {
  currentRoute: AccountRoute;
  /** Switch the visible section (mirrors the prototype `navigate()`). */
  navigate: (route: AccountRoute) => void;
  /** Open a modal (mirrors `data-open`). */
  openModal: (id: AccountModalId) => void;
  closeModal: () => void;
  /** Bottom-center pill toast (mirrors `showToast()` / `data-info` / `data-success`). */
  toast: (message: string) => void;
};

const AccountUiContext = createContext<AccountUi | null>(null);

export const AccountUiProvider = AccountUiContext.Provider;

export function useAccountUi(): AccountUi {
  const value = use(AccountUiContext);
  if (!value) throw new Error("useAccountUi must be used within the account workspace");
  return value;
}
