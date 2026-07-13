import { Badge } from "@/components/ui/badge";

export function SettingsHeader() {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">Store</Badge>
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Business preferences
          </span>
        </div>
        <h1 className="mt-3 text-balance font-serif text-[38px] font-medium leading-none sm:text-[46px]">
          Settings
        </h1>
        <p className="mt-3 max-w-2xl text-pretty text-sm leading-6 text-muted-foreground">
          Shape how the store appears, sells, delivers, accepts payment and shares responsibility in
          clear business language.
        </p>
      </div>
      <p className="max-w-sm text-pretty text-xs leading-5 text-muted-foreground md:text-right">
        Changes remain until the page is refreshed. Payment collection, delivery booking and staff
        sign-in are not connected here.
      </p>
    </header>
  );
}
