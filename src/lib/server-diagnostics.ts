import "server-only";

type SafeDiagnosticContext = Readonly<Record<string, string | number | boolean | null>>;

/**
 * Writes bounded server-only diagnostics without reading the current time.
 * Keep this helper deliberately small: do not pass Error objects, messages,
 * stacks, database identifiers, provider details, or arbitrary metadata.
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
