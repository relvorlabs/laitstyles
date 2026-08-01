// Phase 7 authentication and Phase 8 checkout exceptions are retired.
export const legacyArchitectureExceptions = Object.freeze([]);

// No legacy top-level auth files remain; src/server/auth/** no longer exists
// (retired across P7-T03/T04).
export const legacyTopLevelServerFiles = new Set();

const edgeKeys = legacyArchitectureExceptions.map(
  ({ importer, imported }) => `${importer}->${imported}`,
);
if (new Set(edgeKeys).size !== edgeKeys.length) {
  throw new Error("Duplicate legacy architecture exception edge.");
}

for (const entry of legacyArchitectureExceptions) {
  if (
    entry.importer.length === 0 ||
    entry.imported.length === 0 ||
    ![7, 8].includes(entry.removalPhase) ||
    !["domain-engineer", "ui-engineer"].includes(entry.owner)
  ) {
    throw new Error(`Invalid legacy architecture exception: ${entry.importer}->${entry.imported}`);
  }
}
