// Root-level Suspense fallback while the storefront catalogue promise (shared
// by both the storefront chrome and the admin surface, since both mount
// through the same provider tree) resolves. Deliberately neutral — it has to
// look reasonable ahead of either surface, not just the storefront.
export function AppShellFallback() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-background">
      <span className="text-[15px] font-semibold tracking-[.26em] text-foreground">LAITSTYLE</span>
    </div>
  );
}
