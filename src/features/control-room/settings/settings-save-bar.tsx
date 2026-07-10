"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export type SettingsFeedback = {
  tone: "success" | "error";
  title: string;
  message: string;
};

export function SettingsSaveBar({
  dirty,
  submitting,
  feedback,
  discardOpen,
  onDiscardOpenChange,
  onDiscard,
}: {
  dirty: boolean;
  submitting: boolean;
  feedback: SettingsFeedback | null;
  discardOpen: boolean;
  onDiscardOpenChange: (open: boolean) => void;
  onDiscard: () => void;
}) {
  return (
    <>
      <Card className="sticky bottom-3 z-30 mt-6 gap-4 border-border/80 bg-card/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div aria-live="polite" className="min-w-0">
          <p className="text-sm font-medium">
            {feedback?.title ?? (dirty ? "Unsaved store changes" : "Store settings are up to date")}
          </p>
          <p
            className={
              feedback?.tone === "error"
                ? "mt-1 text-xs leading-5 text-destructive"
                : "mt-1 text-xs leading-5 text-muted-foreground"
            }
          >
            {feedback?.message ??
              (dirty
                ? "Save once to apply every changed section to this prototype session."
                : "Changes are stored only for this browser session and reset after refresh.")}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            disabled={!dirty || submitting}
            onClick={() => onDiscardOpenChange(true)}
            type="button"
            variant="outline"
          >
            Discard changes
          </Button>
          <Button disabled={!dirty || submitting} type="submit">
            {submitting ? "Saving…" : "Save store settings"}
          </Button>
        </div>
      </Card>

      <AlertDialog onOpenChange={onDiscardOpenChange} open={discardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard all unsaved settings?</AlertDialogTitle>
            <AlertDialogDescription>
              Every change made across Store identity, Selling, Delivery, Payments, Notifications and Team will return to the last saved session values.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={onDiscard} variant="destructive">
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
