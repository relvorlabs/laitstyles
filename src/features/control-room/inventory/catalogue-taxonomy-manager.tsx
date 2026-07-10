"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useControlRoom } from "@/features/control-room/state/control-room-provider";
import type { CatalogueTaxonomyKind } from "@/lib/control-room/types";

type TaxonomyValueEvent = {
  kind: CatalogueTaxonomyKind;
  name: string;
};

type TaxonomyRenameEvent = {
  kind: CatalogueTaxonomyKind;
  previousName: string;
  nextName: string;
};

export function CatalogueTaxonomyManager({
  className,
  initialKind = "category",
  triggerLabel = "Manage categories",
  onCreate,
  onRename,
  onDelete,
}: {
  className?: string;
  initialKind?: CatalogueTaxonomyKind;
  triggerLabel?: string;
  onCreate?: (event: TaxonomyValueEvent) => void;
  onRename?: (event: TaxonomyRenameEvent) => void;
  onDelete?: (event: TaxonomyValueEvent) => void;
}) {
  const {
    state,
    createCatalogueTaxonomy,
    renameCatalogueTaxonomy,
    deleteCatalogueTaxonomy,
  } = useControlRoom();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<CatalogueTaxonomyKind>(initialKind);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const items = useMemo(
    () =>
      (state.catalogueTaxonomy ?? [])
        .filter((item) => item.kind === kind)
        .toSorted((left, right) => left.name.localeCompare(right.name, "en-NG")),
    [kind, state.catalogueTaxonomy],
  );

  function createItem() {
    const result = createCatalogueTaxonomy({ kind, name: newName });
    if (!result.ok) {
      setFeedback(result.error.message);
      return;
    }
    if (result.value.item) {
      onCreate?.({
        kind: result.value.item.kind,
        name: result.value.item.name,
      });
    }
    setNewName("");
    setFeedback(result.value.message);
  }

  function saveRename() {
    if (!editingId) return;
    const currentItem = items.find((item) => item.id === editingId);
    const result = renameCatalogueTaxonomy(editingId, editingName);
    if (!result.ok) {
      setFeedback(result.error.message);
      return;
    }
    if (currentItem && result.value.item) {
      onRename?.({
        kind: currentItem.kind,
        previousName: currentItem.name,
        nextName: result.value.item.name,
      });
    }
    setEditingId(null);
    setEditingName("");
    setFeedback(result.value.message);
  }

  function deleteItem(id: string) {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      setFeedback("Select Delete again to confirm. Used groups cannot be deleted.");
      return;
    }
    const currentItem = items.find((item) => item.id === id);
    const result = deleteCatalogueTaxonomy(id);
    setConfirmDeleteId(null);
    if (!result.ok) {
      setFeedback(result.error.message);
      return;
    }
    if (currentItem) {
      onDelete?.({ kind: currentItem.kind, name: currentItem.name });
    }
    setFeedback(result.value.message);
  }

  function changeKind(next: string) {
    setKind(next as CatalogueTaxonomyKind);
    setEditingId(null);
    setConfirmDeleteId(null);
    setFeedback(null);
  }

  function changeOpen(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setEditingId(null);
      setEditingName("");
      setConfirmDeleteId(null);
      setFeedback(null);
      setNewName("");
    }
  }

  return (
    <>
      <Button
        className={className}
        onClick={() => {
          setKind(initialKind);
          setOpen(true);
        }}
        type="button"
        variant="outline"
      >
        <Tags aria-hidden="true" className="size-4" />
        {triggerLabel}
      </Button>
      <Dialog onOpenChange={changeOpen} open={open}>
        <DialogContent className="max-h-[min(88dvh,760px)] overflow-hidden sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Catalogue groups</DialogTitle>
            <DialogDescription>
              Categories organise product types. Collections group products for a season, edit or campaign. Creating or renaming a group updates the active product form; deleting is blocked while a group is in use.
            </DialogDescription>
          </DialogHeader>

          <Tabs onValueChange={changeKind} value={kind}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="category">Categories</TabsTrigger>
              <TabsTrigger value="collection">Collections</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid gap-3 rounded-2xl border border-border bg-surface-sunken p-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <Input
              aria-label={`New ${kind} name`}
              className="h-11"
              onChange={(event) => setNewName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  createItem();
                }
              }}
              placeholder={kind === "category" ? "e.g. Jeans" : "e.g. Weekend Denim"}
              value={newName}
            />
            <Button className="h-11" disabled={!newName.trim()} onClick={createItem} type="button">
              <Plus aria-hidden="true" className="size-4" />
              Add {kind}
            </Button>
          </div>

          {feedback ? (
            <p aria-live="polite" className="rounded-xl border border-border bg-surface-interactive px-3 py-2 text-sm text-surface-interactive-foreground">
              {feedback}
            </p>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-border">
            {items.length ? (
              <div className="divide-y divide-border">
                {items.map((item) => {
                  const usageCount = state.products.filter((product) =>
                    kind === "category"
                      ? product.category === item.name
                      : product.collection === item.name,
                  ).length;
                  const editing = editingId === item.id;

                  return (
                    <div className="flex min-h-16 items-center gap-3 p-3" key={item.id}>
                      <div className="min-w-0 flex-1">
                        {editing ? (
                          <Input
                            aria-label={`Rename ${item.name}`}
                            autoFocus
                            className="h-10"
                            onChange={(event) => setEditingName(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                saveRename();
                              }
                              if (event.key === "Escape") {
                                setEditingId(null);
                                setEditingName("");
                              }
                            }}
                            value={editingName}
                          />
                        ) : (
                          <>
                            <p className="truncate font-medium">{item.name}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {usageCount} connected product{usageCount === 1 ? "" : "s"}
                            </p>
                          </>
                        )}
                      </div>

                      {editing ? (
                        <>
                          <Button disabled={!editingName.trim()} onClick={saveRename} size="sm" type="button">
                            Save
                          </Button>
                          <Button
                            onClick={() => {
                              setEditingId(null);
                              setEditingName("");
                            }}
                            size="sm"
                            type="button"
                            variant="ghost"
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            aria-label={`Rename ${item.name}`}
                            className="size-10"
                            onClick={() => {
                              setEditingId(item.id);
                              setEditingName(item.name);
                              setConfirmDeleteId(null);
                              setFeedback(null);
                            }}
                            size="icon"
                            type="button"
                            variant="ghost"
                          >
                            <Pencil aria-hidden="true" className="size-4" />
                          </Button>
                          <Button
                            aria-label={`${confirmDeleteId === item.id ? "Confirm delete" : "Delete"} ${item.name}`}
                            className="size-10"
                            onClick={() => deleteItem(item.id)}
                            size="icon"
                            type="button"
                            variant={confirmDeleteId === item.id ? "destructive" : "ghost"}
                          >
                            <Trash2 aria-hidden="true" className="size-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid min-h-40 place-items-center p-6 text-center text-sm text-muted-foreground">
                No {kind === "category" ? "categories" : "collections"} yet.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
