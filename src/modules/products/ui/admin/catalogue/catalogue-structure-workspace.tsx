"use client";

import { useQuery } from "@tanstack/react-query";
import { Layers3, Plus, Search, Shapes } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  adminProductsQueryOptions,
  productTaxonomyQueryOptions,
  useReorderProductTaxonomy,
} from "@/modules/products/client/hooks";
import type { ProductTaxonomyItem, ProductTaxonomyKind } from "@/modules/products/types";
import { CategoryEditorDialog } from "@/modules/products/ui/admin/catalogue/category-editor-dialog";
import { CategoryGrid } from "@/modules/products/ui/admin/catalogue/category-grid";
import { CollectionEditorDialog } from "@/modules/products/ui/admin/catalogue/collection-editor-dialog";
import { CollectionStories } from "@/modules/products/ui/admin/catalogue/collection-stories";

type CatalogueTab = "categories" | "collections";

export function CatalogueStructureWorkspace({ initialTab }: { initialTab: CatalogueTab }) {
  const [tab, setTab] = useState<CatalogueTab>(initialTab);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<ProductTaxonomyItem | "new" | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const taxonomy = useQuery(productTaxonomyQueryOptions());
  const products = useQuery(adminProductsQueryOptions());
  const reorder = useReorderProductTaxonomy();
  const kind: ProductTaxonomyKind = tab === "categories" ? "category" : "collection";
  const items = useMemo(
    () =>
      (taxonomy.data ?? [])
        .filter(
          (item) =>
            item.kind === kind &&
            item.name.toLocaleLowerCase("en-NG").includes(query.trim().toLocaleLowerCase("en-NG")),
        )
        .toSorted((a, b) => a.position - b.position || a.name.localeCompare(b.name, "en-NG")),
    [kind, query, taxonomy.data],
  );

  async function move(item: ProductTaxonomyItem, offset: -1 | 1) {
    const all = (taxonomy.data ?? [])
      .filter((entry) => entry.kind === kind)
      .toSorted((a, b) => a.position - b.position || a.name.localeCompare(b.name, "en-NG"));
    const from = all.findIndex((entry) => entry.id === item.id);
    const to = from + offset;
    if (from < 0 || to < 0 || to >= all.length) return;
    const ordered = [...all];
    const [selected] = ordered.splice(from, 1);
    if (!selected) return;
    ordered.splice(to, 0, selected);
    const result = await reorder.mutateAsync({
      kind,
      orderedIds: ordered.map((entry) => entry.id),
    });
    setFeedback(result.ok ? result.value.message : result.error.message);
  }

  const loading = taxonomy.isLoading || products.isLoading;
  const error = taxonomy.error || products.error;

  return (
    <main className="min-h-full bg-background px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-[1440px] space-y-8">
        <header className="grid gap-6 border-b border-border pb-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Catalogue structure
            </p>
            <h1 className="mt-3 max-w-3xl font-serif text-4xl font-medium tracking-tight sm:text-5xl">
              Give every product a place and every collection a story.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
              Categories are image-led browsing anchors. Collections are editorial groupings built
              from the products inside them.
            </p>
          </div>
          <Button onClick={() => setEditing("new")} size="lg">
            <Plus aria-hidden="true" className="size-4" />
            New {kind}
          </Button>
        </header>

        <div className="grid gap-4 md:grid-cols-[auto_minmax(260px,420px)] md:items-center md:justify-between">
          <Tabs
            onValueChange={(value) => {
              setTab(value as CatalogueTab);
              setQuery("");
              setEditing(null);
            }}
            value={tab}
          >
            <TabsList className="grid w-full grid-cols-2 md:w-[420px]">
              <TabsTrigger value="categories">
                <Shapes aria-hidden="true" className="size-4" />
                Categories
              </TabsTrigger>
              <TabsTrigger value="collections">
                <Layers3 aria-hidden="true" className="size-4" />
                Collections
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              aria-label={`Search ${tab}`}
              className="pl-9"
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${tab}`}
              value={query}
            />
          </div>
        </div>

        {feedback ? (
          <p
            aria-live="polite"
            className="rounded-xl border border-border bg-surface-interactive px-4 py-3 text-sm"
          >
            {feedback}
          </p>
        ) : null}
        {error ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
            <h2 className="font-semibold">Catalogue structure could not be loaded</h2>
            <p className="mt-2 text-sm text-muted-foreground">Refresh the page and try again.</p>
          </div>
        ) : null}

        {tab === "categories" ? (
          <CategoryGrid items={items} loading={loading} onEdit={setEditing} onMove={move} />
        ) : (
          <CollectionStories items={items} loading={loading} onEdit={setEditing} onMove={move} />
        )}
      </div>

      <CategoryEditorDialog
        item={tab === "categories" ? editing : null}
        itemCount={(taxonomy.data ?? []).filter((entry) => entry.kind === "category").length}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      />
      <CollectionEditorDialog
        item={tab === "collections" ? editing : null}
        itemCount={(taxonomy.data ?? []).filter((entry) => entry.kind === "collection").length}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        products={products.data ?? []}
      />
    </main>
  );
}
