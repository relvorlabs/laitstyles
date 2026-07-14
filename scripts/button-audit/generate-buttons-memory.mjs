import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

const repositoryRoot = process.cwd();
const sourceRoot = path.join(repositoryRoot, "src");
const outputPath = path.join(repositoryRoot, "BUTTONS_MEMORY.md");
const checkOnly = process.argv.includes("--check");

const sharedButtonNames = new Set(["Button", "ShadcnButton", "AcctButton", "IconButton"]);
const specializedNames = new Set([
  "AccordionTrigger",
  "AlertDialogAction",
  "AlertDialogCancel",
  "AlertDialogTrigger",
  "CommandItem",
  "DialogClose",
  "DialogTrigger",
  "DropdownMenuCheckboxItem",
  "DropdownMenuItem",
  "DropdownMenuRadioItem",
  "DropdownMenuTrigger",
  "MenubarItem",
  "MenubarTrigger",
  "NavigationMenuTrigger",
  "PaginationLink",
  "PaginationNext",
  "PaginationPrevious",
  "PopoverTrigger",
  "SelectItem",
  "SelectTrigger",
  "SheetClose",
  "SheetTrigger",
  "TabsTrigger",
  "Toggle",
  "ToggleGroupItem",
  "TooltipTrigger",
]);
const nonSemanticTags = new Set(["article", "div", "li", "span"]);

async function collectTsxFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectTsxFiles(absolutePath)));
    else if (entry.isFile() && entry.name.endsWith(".tsx")) files.push(absolutePath);
  }
  return files.sort();
}

function tagText(tagName) {
  if (ts.isIdentifier(tagName)) return tagName.text;
  return tagName.getText();
}

function attribute(opening, name) {
  return opening.attributes.properties.find(
    (property) =>
      ts.isJsxAttribute(property) && ts.isIdentifier(property.name) && property.name.text === name,
  );
}

function attributeValue(opening, name, sourceFile) {
  const found = attribute(opening, name);
  if (!found || !ts.isJsxAttribute(found) || !found.initializer) return "";
  if (ts.isStringLiteral(found.initializer)) return found.initializer.text;
  if (ts.isJsxExpression(found.initializer)) {
    return found.initializer.expression?.getText(sourceFile) ?? "";
  }
  return found.initializer.getText(sourceFile);
}

function childLabel(children, sourceFile) {
  const parts = [];
  function collect(node) {
    if (ts.isJsxText(node)) {
      const text = node.getText(sourceFile).replace(/\s+/g, " ").trim();
      if (text) parts.push(text);
      return;
    }
    if (ts.isJsxExpression(node)) {
      if (node.expression && (ts.isStringLiteral(node.expression) || ts.isNoSubstitutionTemplateLiteral(node.expression))) {
        parts.push(node.expression.text);
      }
      return;
    }
    if (ts.isJsxElement(node)) node.children.forEach(collect);
    else if (ts.isJsxFragment(node)) node.children.forEach(collect);
  }
  children.forEach(collect);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function displayLabel(opening, children, sourceFile) {
  const aria = attributeValue(opening, "aria-label", sourceFile);
  if (aria) return aria;
  const title = attributeValue(opening, "title", sourceFile);
  if (title) return title;
  const text = childLabel(children, sourceFile);
  return text || "Dynamic or icon-only label — review call site";
}

function shorten(value, max = 110) {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function markdown(value) {
  return shorten(String(value || "—"), 150)
    .replaceAll("|", "\\|")
    .replaceAll("\n", " ");
}

function areaFor(relativePath) {
  if (relativePath.includes("/control-room/") || relativePath.startsWith("src/app/admin/")) return "Admin";
  if (relativePath.includes("/storefront/account/") || relativePath.startsWith("src/app/account/")) return "Account";
  if (relativePath.includes("/storefront/") || relativePath.startsWith("src/app/products/") || relativePath.startsWith("src/app/shop/")) return "Storefront";
  return "Shared";
}

function routeFor(relativePath) {
  if (!relativePath.startsWith("src/app/")) {
    if (relativePath.includes("/control-room/")) return "/admin/*";
    if (relativePath.includes("/storefront/account/")) return "/account/*";
    if (relativePath.includes("/storefront/")) return "Storefront shared";
    return "Shared";
  }
  const route = relativePath
    .replace(/^src\/app/, "")
    .replace(/\/(page|layout|loading|error|not-found)\.tsx$/, "")
    .replace(/\/\[\[\.\.\.([^\]]+)\]\]/g, "/*")
    .replace(/\/\[\.\.\.([^\]]+)\]/g, "/*")
    .replace(/\/\[([^\]]+)\]/g, "/:$1");
  return route || "/";
}

function implementationFor(tag, relativePath) {
  if (tag === "button") {
    return relativePath.startsWith("src/components/ui/")
      ? "Native button inside shared primitive"
      : "Native button";
  }
  if (sharedButtonNames.has(tag)) return tag === "Button" || tag === "ShadcnButton" ? "Shared shadcn Button" : `Shared Button wrapper (${tag})`;
  if (specializedNames.has(tag)) return `Specialized primitive (${tag})`;
  return `Non-semantic clickable ${tag}`;
}

function controlType(opening, tag, sourceFile) {
  if (specializedNames.has(tag)) return `${tag} specialized control`;
  const type = attributeValue(opening, "type", sourceFile);
  if (type === "submit" || type === "reset") return type;
  if (attribute(opening, "aria-pressed")) return "toggle";
  if (attribute(opening, "aria-haspopup")) return "menu/dialog trigger";
  if (attributeValue(opening, "render", sourceFile) || attributeValue(opening, "href", sourceFile)) return "navigation";
  const label = attributeValue(opening, "aria-label", sourceFile);
  return label ? "icon or named action" : "action";
}

function actionFor(opening, tag, sourceFile) {
  const onClick = attributeValue(opening, "onClick", sourceFile);
  if (onClick) return `onClick: ${shorten(onClick, 95)}`;
  const href = attributeValue(opening, "href", sourceFile);
  if (href) return `href: ${href}`;
  const render = attributeValue(opening, "render", sourceFile);
  if (render) return `render: ${shorten(render, 95)}`;
  const type = attributeValue(opening, "type", sourceFile);
  if (type === "submit") return "Form submission";
  if (type === "reset") return "Form reset";
  if (specializedNames.has(tag)) return "Managed by accessible primitive";
  return "No direct action found";
}

function statusFor(opening, tag, relativePath, label, sourceFile) {
  if (relativePath.endsWith("site-header.tsx") && (label === "Instagram" || label === "TikTok")) return "TODO fallback";
  if (tag === "button" && !relativePath.startsWith("src/components/ui/")) return "Unconverted";
  if (tag === "button") return "Documented primitive exception";
  if (nonSemanticTags.has(tag)) return "Needs semantic repair";
  if (
    attribute(opening, "onClick") ||
    attribute(opening, "href") ||
    attribute(opening, "render") ||
    attributeValue(opening, "type", sourceFile) === "submit" ||
    attributeValue(opening, "type", sourceFile) === "reset" ||
    specializedNames.has(tag)
  ) {
    return "Mapped action";
  }
  return "Needs action review";
}

function targetFor(tag, relativePath) {
  if (tag === "button" && relativePath.startsWith("src/components/ui/")) return "Retain primitive-native semantics";
  if (tag === "button" || nonSemanticTags.has(tag)) return "Shared shadcn Button or correct semantic primitive";
  if (specializedNames.has(tag)) return `Retain ${tag}`;
  return "Shared shadcn Button";
}

function toastFor(node, sourceFile, relativePath, label) {
  if (relativePath.endsWith("site-header.tsx") && label === "Instagram") return "Informational: Instagram still being connected";
  if (relativePath.endsWith("site-header.tsx") && label === "TikTok") return "Informational: TikTok still being connected";
  const source = node.getText(sourceFile);
  if (source.includes("toast.success") || source.includes("showToast(") || source.includes("toast(")) return "Existing toast/feedback";
  if (source.includes("toast.error")) return "Error toast";
  if (source.includes("toast.info")) return "Informational toast";
  return "None detected";
}

function todoFor(relativePath, label, node, sourceFile) {
  if (relativePath.endsWith("site-header.tsx") && label === "Instagram") return "Connect official Instagram URL";
  if (relativePath.endsWith("site-header.tsx") && label === "TikTok") return "Connect official TikTok URL";
  const start = Math.max(0, node.getFullStart() - 240);
  const context = sourceFile.text.slice(start, node.getStart(sourceFile));
  const match = context.match(/TODO\(button-action\):\s*([^\n]+)/);
  return match?.[1]?.trim() ?? "None";
}

function stableId(relativePath, ordinal, tag) {
  const hash = createHash("sha1").update(`${relativePath}:${ordinal}:${tag}`).digest("hex").slice(0, 8);
  return `BTN-${hash.toUpperCase()}`;
}

const files = await collectTsxFiles(sourceRoot);
const rows = [];
let ordinal = 0;

for (const absolutePath of files) {
  const relativePath = path.relative(repositoryRoot, absolutePath).replaceAll(path.sep, "/");
  const source = await readFile(absolutePath, "utf8");
  const sourceFile = ts.createSourceFile(
    absolutePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

  function record(opening, children, node) {
    const tag = tagText(opening.tagName);
    const isNative = tag === "button";
    const isShared = sharedButtonNames.has(tag);
    const isSpecialized = specializedNames.has(tag);
    const isClickableNonSemantic = nonSemanticTags.has(tag) && Boolean(attribute(opening, "onClick"));
    if (!isNative && !isShared && !isSpecialized && !isClickableNonSemantic) return;

    ordinal += 1;
    const line = sourceFile.getLineAndCharacterOfPosition(opening.getStart(sourceFile)).line + 1;
    const label = displayLabel(opening, children, sourceFile);
    const className = attributeValue(opening, "className", sourceFile);
    const variant = attributeValue(opening, "variant", sourceFile);
    const status = statusFor(opening, tag, relativePath, label, sourceFile);
    rows.push({
      id: stableId(relativePath, ordinal, tag),
      area: areaFor(relativePath),
      route: routeFor(relativePath),
      source: `${relativePath}:${line}`,
      label,
      controlType: controlType(opening, tag, sourceFile),
      implementation: implementationFor(tag, relativePath),
      variant: variant || className || "Inherited/default",
      purpose: label,
      currentAction: actionFor(opening, tag, sourceFile),
      target: targetFor(tag, relativePath),
      status,
      toast: toastFor(node, sourceFile, relativePath, label),
      phase:
        status === "Unconverted" || status === "Needs semantic repair" ? "Mapped — unresolved" : "Mapped",
      todo: todoFor(relativePath, label, node, sourceFile),
      verification: "Static TypeScript AST inventory",
      tag,
      relativePath,
    });
  }

  function visit(node) {
    if (ts.isJsxElement(node)) record(node.openingElement, node.children, node);
    else if (ts.isJsxSelfClosingElement(node)) record(node, [], node);
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

const nativeApplication = rows.filter(
  (row) => row.tag === "button" && !row.relativePath.startsWith("src/components/ui/"),
);
const nativePrimitive = rows.filter(
  (row) => row.tag === "button" && row.relativePath.startsWith("src/components/ui/"),
);
const shared = rows.filter((row) => sharedButtonNames.has(row.tag));
const specialized = rows.filter((row) => specializedNames.has(row.tag));
const nonSemantic = rows.filter((row) => nonSemanticTags.has(row.tag));
const mappedActions = rows.filter((row) => row.status === "Mapped action");
const actionReview = rows.filter((row) => row.status === "Needs action review");
const fallbacks = rows.filter((row) => row.status === "TODO fallback");

const lines = [
  "# Laitstyles Button Audit Memory",
  "",
  "> Generated deterministically from application-owned TSX by `scripts/button-audit/generate-buttons-memory.mjs`.",
  "> Static design-reference HTML under `docs/`, generated output, dependencies, and build artifacts are excluded.",
  "",
  "## Audit summary",
  "",
  "| Metric | Count |",
  "|---|---:|",
  `| Total interactive controls mapped | ${rows.length} |`,
  `| Shared shadcn Buttons and approved wrappers | ${shared.length} |`,
  `| Specialized shadcn/Base UI controls | ${specialized.length} |`,
  `| Native buttons remaining in application-owned source | ${nativeApplication.length} |`,
  `| Native buttons inside shared primitive implementations | ${nativePrimitive.length} |`,
  `| Non-semantic clickable elements requiring review | ${nonSemantic.length} |`,
  `| Controls with mapped direct/primitive actions | ${mappedActions.length} |`,
  `| Controls requiring action review | ${actionReview.length} |`,
  `| TODO + informational fallback controls | ${fallbacks.length} |`,
  "",
  "## Shared-system findings",
  "",
  "- The canonical action primitive is `src/components/ui/button.tsx`, backed by Base UI and exposed through the shadcn component API.",
  "- The scoped storefront rule `.lst-lab button { color: inherit; }` previously outranked ordinary foreground utilities. Filled variants now enforce semantic foregrounds and SVG descendants inherit `currentColor`.",
  "- Ghost controls preserve contextual foreground inheritance because they are used on both light and inverse surfaces.",
  "- `AcctButton` and `IconButton` preserve account-specific presentation while composing the shared shadcn Button.",
  "- Trigger/item controls remain on their correct accessible primitives rather than being wrapped in another button.",
  "",
  "## Control inventory",
  "",
  "| ID | Area | Route/page | Source | Label / accessible name | Control type | Current implementation | Variant/background | Purpose | Current action | Target implementation | Action status | Toast behavior | Phase | Remaining TODO | Verification |",
  "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|",
];

for (const row of rows) {
  lines.push(
    `| ${markdown(row.id)} | ${markdown(row.area)} | ${markdown(row.route)} | \`${markdown(row.source)}\` | ${markdown(row.label)} | ${markdown(row.controlType)} | ${markdown(row.implementation)} | ${markdown(row.variant)} | ${markdown(row.purpose)} | ${markdown(row.currentAction)} | ${markdown(row.target)} | ${markdown(row.status)} | ${markdown(row.toast)} | ${markdown(row.phase)} | ${markdown(row.todo)} | ${markdown(row.verification)} |`,
  );
}

lines.push(
  "",
  "## Final verification checklist",
  "",
  `- [${nativeApplication.length === 0 ? "x" : " "}] No ordinary native \`<button>\` remains in application-owned source.`,
  `- [${nonSemantic.length === 0 ? "x" : " "}] No action-style clickable \`div\`, \`span\`, \`li\`, or \`article\` remains.`,
  `- [${actionReview.length === 0 ? "x" : " "}] Every mapped action has an implementation, primitive-managed behavior, or documented fallback.`,
  "- [x] Filled shared variants enforce semantic foregrounds.",
  "- [x] Shared SVG descendants inherit the active foreground through `currentColor`.",
  "- [ ] Lint passes on Node 24.",
  "- [ ] Typecheck passes on Node 24.",
  "- [ ] Tests pass on Node 24.",
  "- [ ] Production build passes on Node 24.",
  "- [ ] Storefront and control-room browser workflows pass.",
  "",
);

const generated = `${lines.join("\n")}\n`;
if (checkOnly) {
  const current = await readFile(outputPath, "utf8").catch(() => "");
  if (current !== generated) {
    console.error("BUTTONS_MEMORY.md is out of date. Run pnpm buttons:audit.");
    process.exit(1);
  }
  console.log(`BUTTONS_MEMORY.md is current (${rows.length} controls).`);
} else {
  await writeFile(outputPath, generated);
  console.log(
    JSON.stringify(
      {
        totalControls: rows.length,
        sharedButtons: shared.length,
        specializedControls: specialized.length,
        nativeApplicationButtons: nativeApplication.length,
        nativePrimitiveButtons: nativePrimitive.length,
        nonSemanticClickables: nonSemantic.length,
        actionReview: actionReview.length,
        todoFallbacks: fallbacks.length,
      },
      null,
      2,
    ),
  );
}
