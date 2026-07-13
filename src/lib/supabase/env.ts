export type SupabasePublicConfig = {
  url: string;
  publishableKey: string;
};

export class SupabaseConfigError extends Error {
  constructor(missingKeys: readonly string[]) {
    super(`Missing Supabase public configuration: ${missingKeys.join(", ")}`);
    this.name = "SupabaseConfigError";
  }
}

export function getSupabasePublicConfig():
  | { configured: true; config: SupabasePublicConfig }
  | { configured: false; missingKeys: readonly string[] } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    const missingKeys: string[] = [];

    if (!url) missingKeys.push("NEXT_PUBLIC_SUPABASE_URL");
    if (!publishableKey) {
      missingKeys.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    }

    return { configured: false, missingKeys };
  }

  return {
    configured: true,
    config: {
      url,
      publishableKey,
    },
  };
}

export function requireSupabasePublicConfig(): SupabasePublicConfig {
  const result = getSupabasePublicConfig();

  if (!result.configured) {
    throw new SupabaseConfigError(result.missingKeys);
  }

  return result.config;
}
