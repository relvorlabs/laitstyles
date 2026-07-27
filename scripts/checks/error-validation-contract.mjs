import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const errors = [];

function read(path) {
  const absolute = join(root, path);
  if (!existsSync(absolute)) {
    errors.push(`Required Phase 5 contract is missing: ${path}`);
    return "";
  }
  return readFileSync(absolute, "utf8");
}

function listFiles(directory, prefix = "") {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relative = join(prefix, entry.name).replaceAll("\\", "/");
    const absolute = join(directory, entry.name);
    return entry.isDirectory() ? listFiles(absolute, relative) : [relative];
  });
}

const canonicalResult = read("src/lib/errors/index.ts");
const compatibilityResult = read("src/lib/admin/shared/result.ts");
const authErrors = read("src/modules/auth/server/diagnostics.ts");
const authSchemas = read("src/modules/auth/schema.ts");
const authActions = read("src/app/auth/actions.ts");
const authCallback = read("src/app/auth/callback/route.ts");
const googleAuth = read("src/app/auth/google/route.ts");
const authErrorPage = read("src/app/auth/error/page.tsx");
const authProvider = read("src/features/storefront/shared/storefront-auth-provider.tsx");
const authRedirects = read("src/modules/auth/server/redirects.ts");
const authDiagnostics = read("src/modules/auth/server/diagnostics.ts");
const reviewActions = read(
  "src/app/(storefront)/account/orders/[orderNumber]/items/[orderLineId]/review/actions.ts",
);
const productSchema = read("src/modules/products/schema.ts");
const productsRoute = read("src/app/api/v1/admin/products/route.ts");
const productRoute = read("src/app/api/v1/admin/products/[id]/route.ts");
const productArchiveRoute = read("src/app/api/v1/admin/products/[id]/archive/route.ts");
const productRestoreRoute = read("src/app/api/v1/admin/products/[id]/restore/route.ts");
const productTaxonomyRoute = read("src/app/api/v1/admin/products/taxonomy/[id]/route.ts");
const browserContract = read("tests/e2e/error-validation.spec.ts");

if (!canonicalResult.includes("export type Result<")) {
  errors.push("The canonical Result implementation must remain in src/lib/errors/index.ts.");
}
if (
  /export\s+type\s+Result\s*</.test(compatibilityResult) ||
  /function\s+(?:ok|err)\s*</.test(compatibilityResult)
) {
  errors.push("src/lib/admin/shared/result.ts must not define a second Result implementation.");
}
if (!compatibilityResult.includes('from "@/lib/errors"')) {
  errors.push("The legacy admin Result path may only re-export the canonical helper while callers migrate.");
}

const resultDefinitions = listFiles(join(root, "src"), "src")
  .filter((path) => /\.[cm]?[jt]sx?$/.test(path))
  .filter((path) => /export\s+type\s+Result\s*</.test(readFileSync(join(root, path), "utf8")));
if (resultDefinitions.length !== 1 || resultDefinitions[0] !== "src/lib/errors/index.ts") {
  errors.push(`Expected one Result implementation; found ${resultDefinitions.join(", ") || "none"}.`);
}

if (!authErrors.includes("mapAuthProviderError") || !authErrors.includes("authFlowErrorCodes")) {
  errors.push("Auth provider failures must map through typed allow-listed error codes.");
}
if (!authSchemas.includes("passwordSignInSchema") || !authSchemas.includes("passwordSignUpSchema")) {
  errors.push("Password Server Actions must use the canonical Zod auth schemas.");
}
if (!authSchemas.includes("terms:") || !authProvider.includes('formData.set("terms"')) {
  errors.push("Terms acceptance must be enforced at the Server Action boundary, not only in client UI.");
}
if (!authActions.includes("safeParse") || !authActions.includes("mapAuthProviderError")) {
  errors.push("Password auth actions must Zod-parse input and map provider failures.");
}
if (!authActions.includes("logAuthProviderFailure")) {
  errors.push("Auth provider failures must retain structured server-side diagnostics.");
}
if (/error\.message|\.message\.toLowerCase|includes\(["']invalid/.test(authActions)) {
  errors.push("Password auth actions must not branch on or expose provider error messages.");
}
if (/withAuthErrorPath\([^,]*\.message/.test(authCallback + googleAuth + authActions)) {
  errors.push("Auth redirects must never carry raw provider error messages.");
}
if (/params\.message|searchParams:[\s\S]*message\?/.test(authErrorPage)) {
  errors.push("The auth error page must render allow-listed codes, not arbitrary message query values.");
}
if (!authRedirects.includes("code,") || authRedirects.includes("message,")) {
  errors.push("Auth error redirects must serialize an allow-listed code only.");
}
if (
  !authDiagnostics.includes('import "server-only"') ||
  !authDiagnostics.includes("logger.warn") ||
  !authDiagnostics.includes("providerCode") ||
  !authDiagnostics.includes("providerStatus") ||
  !authDiagnostics.includes("providerErrorName")
) {
  errors.push("Auth diagnostics must remain server-only and log structured provider metadata.");
}
if (/error\.message|providerMessage|rawMessage/.test(authDiagnostics)) {
  errors.push("Auth diagnostics must not log raw provider messages.");
}
if (
  !browserContract.includes("invalid-credentials") ||
  !browserContract.includes("raw-provider-detail") ||
  !browserContract.includes("toHaveCount(0)")
) {
  errors.push("Browser coverage must prove arbitrary auth query text is not reflected to users.");
}

if (!reviewActions.includes("reviewIdentifiersSchema.safeParse")) {
  errors.push("Review actions must Zod-parse order and line identifiers.");
}
if (
  /throw new Error\(identity\.state\.message\)|throw new Error\(["']This review link/.test(
    reviewActions,
  )
) {
  errors.push("Expected review auth/link failures must return typed action state instead of throwing.");
}
if (
  !productSchema.includes("productEditorDraftSchema") ||
  !productSchema.includes("productMutationSchema") ||
  !productsRoute.includes("parseJsonBody(request, productMutationSchema)") ||
  !productRoute.includes("parseJsonBody(request, productMutationSchema)")
) {
  errors.push("Product create and update routes must validate payloads and intents with the domain schema.");
}
if (
  !productSchema.includes("productIdSchema") ||
  !productRoute.includes("productIdSchema.safeParse") ||
  !productArchiveRoute.includes("productIdSchema.safeParse") ||
  !productRestoreRoute.includes("productIdSchema.safeParse")
) {
  errors.push("Product lifecycle routes must validate product identifiers at the transport boundary.");
}
if (
  !productSchema.includes("productTaxonomyIdSchema") ||
  !productSchema.includes("productTaxonomyRenameSchema") ||
  !productTaxonomyRoute.includes("productTaxonomyIdSchema.safeParse") ||
  !productTaxonomyRoute.includes("parseJsonBody(request, productTaxonomyRenameSchema)")
) {
  errors.push("Product taxonomy routes must validate encoded identifiers and names.");
}

const summary = [
  "## Phase 5 error and validation contract",
  "",
  `- Result implementations: ${resultDefinitions.length}`,
  `- Errors: ${errors.length}`,
];
if (errors.length) summary.push("", "### Failures", ...errors.map((error) => `- ${error}`));
const rendered = `${summary.join("\n")}\n`;
process.stdout.write(rendered);
if (process.env.GITHUB_STEP_SUMMARY) {
  const { appendFileSync } = await import("node:fs");
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, rendered);
}
if (errors.length) process.exit(1);
