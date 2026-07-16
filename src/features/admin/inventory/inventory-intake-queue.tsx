"use client";

import { ArrowLeft01Icon, ArrowRight01Icon, Edit02Icon } from "@hugeicons/core-free-icons";
import Image from "next/image";
import { useMemo, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useProductEditorController } from "@/features/admin/product-editor/product-editor-controller";
import { AdminIcon } from "@/features/admin/shared/admin-icon";
import { useAdmin } from "@/features/admin/state/admin-provider";
import { formatIntakeStage, getAdjacentIntakeStages } from "@/lib/admin/product-editor-actions";
import type { IntakeRecord, IntakeStage, InventoryListItem } from "@/lib/admin/types";

const stageOrder: IntakeStage[] = [
  "received",
  "photographing",
  "details-required",
  "pricing-review",
  "ready-to-publish",
  "published",
];

export function InventoryIntakeQueue({ items }: { items: InventoryListItem[] }) {
  const { state, transitionIntake } = useAdmin();
  const { openExistingProduct } = useProductEditorController();
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const records = useMemo(() => {
    const productIds = new Set(items.map((item) => item.product.id));
    return (state.intake ?? [])
      .filter((record) => productIds.has(record.productId))
      .toSorted(
        (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
      );
  }, [items, state.intake]);
  const itemByProductId = useMemo(
    () => new Map(items.map((item) => [item.product.id, item])),
    [items],
  );

  function move(record: IntakeRecord, stage: IntakeStage) {
    const result = transitionIntake(record.productId, stage);
    if (!result.ok) {
      setFeedback({ tone: "error", message: result.error.message });
      return;
    }
    setFeedback({ tone: "success", message: result.value.message });
  }

  return (
    <section aria-labelledby="intake-queue-title" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Same product record · staged work
          </p>
          <h2
            className="mt-2 font-serif text-[28px] font-medium leading-tight"
            id="intake-queue-title"
          >
            Intake queue
          </h2>
          <p className="mt-2 max-w-[680px] text-[12.5px] leading-5 text-muted-foreground">
            Move each product one adjacent stage at a time. Continue product opens the same record
            in the seven-step editor; it never creates a duplicate.
          </p>
        </div>
        <Badge variant="outline">
          {records.length} product{records.length === 1 ? "" : "s"}
        </Badge>
      </div>

      {feedback ? (
        <Alert aria-live="polite" variant={feedback.tone === "error" ? "destructive" : "default"}>
          <AlertTitle>
            {feedback.tone === "error" ? "Intake action failed" : "Intake updated"}
          </AlertTitle>
          <AlertDescription>{feedback.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4">
        {records.map((record) => {
          const item = itemByProductId.get(record.productId);
          if (!item) return null;
          const adjacent = getAdjacentIntakeStages(record.stage);
          const stageIndex = stageOrder.indexOf(record.stage);
          const progress = ((stageIndex + 1) / stageOrder.length) * 100;

          return (
            <Card key={record.id}>
              <CardContent className="grid gap-5 py-5 md:grid-cols-[96px_minmax(0,1fr)_auto] md:items-center">
                <div className="relative aspect-[4/5] w-24 overflow-hidden rounded-[12px] bg-secondary">
                  <Image
                    alt={item.coverImage.alt || item.product.name}
                    className="object-cover"
                    fill
                    sizes="96px"
                    src={item.coverImage.url}
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{formatIntakeStage(record.stage)}</Badge>
                    <Badge variant="outline">{item.reference}</Badge>
                  </div>
                  <h3 className="mt-3 font-serif text-[24px] font-medium leading-tight">
                    {item.product.name}
                  </h3>
                  <p className="mt-2 text-[11.5px] leading-5 text-muted-foreground">
                    Assigned to {record.assignedTo} · {record.note}
                  </p>
                  <div className="mt-4 max-w-[520px]">
                    <div className="mb-2 flex justify-between gap-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      <span>
                        Stage {stageIndex + 1} of {stageOrder.length}
                      </span>
                      <span>{formatIntakeStage(record.stage)}</span>
                    </div>
                    <Progress value={progress} />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 md:max-w-[190px] md:justify-end">
                  <Button
                    size="lg"
                    onClick={() => openExistingProduct(record.productId)}
                    type="button"
                    variant="outline"
                  >
                    <AdminIcon icon={Edit02Icon} size={16} />
                    Continue product
                  </Button>
                  {adjacent.previous ? (
                    <Button
                      size="lg"
                      onClick={() => move(record, adjacent.previous as IntakeStage)}
                      type="button"
                      variant="ghost"
                    >
                      <AdminIcon icon={ArrowLeft01Icon} size={16} />
                      Previous stage
                    </Button>
                  ) : null}
                  {adjacent.next ? (
                    <Button
                      size="lg"
                      onClick={() => move(record, adjacent.next as IntakeStage)}
                      type="button"
                    >
                      Next stage
                      <AdminIcon icon={ArrowRight01Icon} size={16} />
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
