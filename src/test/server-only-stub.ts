// Test stub for the `server-only` package. In a plain node/vitest run there is
// no `react-server` export condition, so the real package throws on import.
// Server modules are unit-tested in the node environment, so we alias
// `server-only` here to a harmless empty module (see vitest.config.ts).
export {};
