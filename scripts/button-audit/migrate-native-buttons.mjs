import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import ts from "typescript";

const repositoryRoot = process.cwd();
const sourceRoot = path.join(repositoryRoot, "src");
const sharedButtonModule = "@/components/ui/button";
const excludedDirectory = path.join(sourceRoot, "components", "ui") + path.sep;

async function collectTsxFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectTsxFiles(absolutePath)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".tsx")) files.push(absolutePath);
  }

  return files.sort();
}

function hasLocalButtonConflict(sourceFile) {
  return sourceFile.statements.some((statement) => {
    if (
      (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) &&
      statement.name?.text === "Button"
    ) {
      return true;
    }
    if (!ts.isVariableStatement(statement)) return false;
    return statement.declarationList.declarations.some(
      (declaration) => ts.isIdentifier(declaration.name) && declaration.name.text === "Button",
    );
  });
}

function resolveButtonImport(sourceFile, source) {
  let moduleImport;
  for (const statement of sourceFile.statements) {
    if (
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text === sharedButtonModule
    ) {
      moduleImport = statement;
      const namedBindings = statement.importClause?.namedBindings;
      if (namedBindings && ts.isNamedImports(namedBindings)) {
        const buttonImport = namedBindings.elements.find(
          (element) => (element.propertyName?.text ?? element.name.text) === "Button",
        );
        if (buttonImport) return { localName: buttonImport.name.text, importEdit: null };
      }
    }
  }

  const localName = hasLocalButtonConflict(sourceFile) ? "ShadcnButton" : "Button";
  if (moduleImport) {
    const namedBindings = moduleImport.importClause?.namedBindings;
    if (namedBindings && ts.isNamedImports(namedBindings)) {
      const insertion = namedBindings.elements.end;
      const prefix = namedBindings.elements.length > 0 ? ", " : "";
      const imported = localName === "Button" ? "Button" : `Button as ${localName}`;
      return {
        localName,
        importEdit: { start: insertion, end: insertion, text: `${prefix}${imported}` },
      };
    }
  }

  const imported = localName === "Button" ? "Button" : `Button as ${localName}`;
  const lastImport = [...sourceFile.statements]
    .reverse()
    .find((statement) => ts.isImportDeclaration(statement));
  const insertion = lastImport?.end ?? (source.startsWith('"use client";') ? source.indexOf("\n") + 1 : 0);
  return {
    localName,
    importEdit: {
      start: insertion,
      end: insertion,
      text: `${insertion > 0 ? "\n" : ""}import { ${imported} } from "${sharedButtonModule}";`,
    },
  };
}

function hasAttribute(attributes, name) {
  return attributes.properties.some(
    (property) => ts.isJsxAttribute(property) && property.name.text === name,
  );
}

function applyEdits(source, edits) {
  return [...edits]
    .sort((left, right) => right.start - left.start || right.end - left.end)
    .reduce(
      (current, edit) => `${current.slice(0, edit.start)}${edit.text}${current.slice(edit.end)}`,
      source,
    );
}

function migrateFile(source, filePath) {
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const nativeOpenings = [];
  const nativeClosings = [];

  function visit(node) {
    if (ts.isJsxElement(node) && ts.isIdentifier(node.openingElement.tagName)) {
      if (node.openingElement.tagName.text === "button") {
        nativeOpenings.push(node.openingElement);
        if (ts.isIdentifier(node.closingElement.tagName)) nativeClosings.push(node.closingElement);
      }
    } else if (ts.isJsxSelfClosingElement(node) && ts.isIdentifier(node.tagName)) {
      if (node.tagName.text === "button") nativeOpenings.push(node);
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);

  if (nativeOpenings.length === 0) return null;

  const { localName, importEdit } = resolveButtonImport(sourceFile, source);
  const edits = [];
  if (importEdit) edits.push(importEdit);

  for (const opening of nativeOpenings) {
    const tagName = opening.tagName;
    edits.push({ start: tagName.getStart(sourceFile), end: tagName.end, text: localName });
    if (!hasAttribute(opening.attributes, "variant")) {
      edits.push({ start: tagName.end, end: tagName.end, text: ' variant="ghost"' });
    }
  }

  for (const closing of nativeClosings) {
    const tagName = closing.tagName;
    edits.push({ start: tagName.getStart(sourceFile), end: tagName.end, text: localName });
  }

  return { content: applyEdits(source, edits), converted: nativeOpenings.length };
}

const files = await collectTsxFiles(sourceRoot);
const changedFiles = [];
let converted = 0;

for (const filePath of files) {
  if (filePath.startsWith(excludedDirectory)) continue;
  const fileStats = await stat(filePath);
  if (!fileStats.isFile()) continue;

  const source = await readFile(filePath, "utf8");
  const result = migrateFile(source, filePath);
  if (!result) continue;

  await writeFile(filePath, result.content);
  changedFiles.push(path.relative(repositoryRoot, filePath));
  converted += result.converted;
}

if (changedFiles.length > 0) {
  const format = spawnSync(
    "pnpm",
    ["exec", "biome", "format", "--write", ...changedFiles],
    { cwd: repositoryRoot, encoding: "utf8", stdio: "inherit" },
  );
  if (format.status !== 0) process.exit(format.status ?? 1);
}

console.log(
  JSON.stringify(
    {
      convertedNativeButtons: converted,
      changedFiles,
      excludedPrimitiveDirectory: path.relative(repositoryRoot, excludedDirectory),
    },
    null,
    2,
  ),
);
