export type StorefrontAuthSession = {
  signedIn: boolean;
  email: string | null;
  displayName: string | null;
};

export const ANONYMOUS_STOREFRONT_AUTH_SESSION: StorefrontAuthSession = {
  signedIn: false,
  email: null,
  displayName: null,
};
