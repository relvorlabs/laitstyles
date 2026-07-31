import "server-only";

type SafeDiagnosticContext = Readonly<Record<string, string | number | boolean | null>>;

/**
 * Writes bounded server-only diagnostics without invoking wall-clock APIs.
 *
 * Pino adds a timestamp with Date.now(), which is not safe from a Cache
 * Components prerender path before request or uncached data is observed.
 * Keep this helper deliberately small: no Error objects, messages, stacks,
 * database/provider identifiers, or arbitrary metadata may be passed through.
 */
export function reportPrerenderSafeServerError(
  message: string,
  context: SafeDiagnosticContext,
): void {
  try {
    process.stderr.write(
      `${JSON.stringify({ level: "error", message: sanitizeLabel(message), ...context })}\n`,
    );
  } catch {
    // Diagnostics must never replace a handled application failure with a new one.
  }
}

function sanitizeLabel(value: string): string {
  return value.replaceAll(/[\r\n\t]/g, " ").slice(0, 160);
}
