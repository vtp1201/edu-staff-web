"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SealBatchStatus } from "../../../domain/entities/seal-batch.entity";

export interface SealConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batch: SealBatchStatus;
  isPending: boolean;
  onConfirm: () => void;
}

/** AC-4 — clear seal-confirmation dialog. Radix Dialog provides the AC-10
 * focus-trap + role="dialog" + Esc-to-close out of the box. */
export function SealConfirmDialog({
  open,
  onOpenChange,
  batch,
  isPending,
  onConfirm,
}: SealConfirmDialogProps) {
  const t = useTranslations("academicRecordSeal.sealDialog");
  const term = useTranslations("academicRecordSeal.selector")(
    batch.term === "HK1" ? "term1" : "term2",
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t("body", { class: batch.classId, term, year: batch.year })}
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border border-edu-success/30 bg-edu-success/10 p-3 text-muted-foreground text-sm">
          {t("after")}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {t("cancel")}
          </Button>
          <Button type="button" onClick={onConfirm} disabled={isPending}>
            {isPending ? t("sealing") : t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
