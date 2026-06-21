"use client";

import { AlertTriangle } from "lucide-react";
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

export interface SubmitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  answeredCount: number;
  totalCount: number;
  hasEmptyEssay?: boolean;
  onConfirm: () => void;
}

export function SubmitModal({
  open,
  onOpenChange,
  answeredCount,
  totalCount,
  hasEmptyEssay = false,
  onConfirm,
}: SubmitModalProps) {
  const t = useTranslations("exam");
  const unanswered = totalCount - answeredCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("submitModal.title")}</DialogTitle>
          <DialogDescription>
            {t("submitModal.answered")}: {answeredCount} / {totalCount}
          </DialogDescription>
        </DialogHeader>

        {unanswered > 0 && (
          <div className="flex items-start gap-2 rounded-[var(--edu-radius-btn)] bg-edu-warning/15 p-3 text-sm text-edu-warning-foreground">
            <AlertTriangle
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            <span>{t("submitModal.warningText", { count: unanswered })}</span>
          </div>
        )}

        {hasEmptyEssay && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-[var(--edu-radius-btn)] bg-edu-warning/15 p-3 text-sm text-edu-warning-foreground"
          >
            <AlertTriangle
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            <span>{t("taking.essayEmptyWarning")}</span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("submitModal.reviewBtn")}
          </Button>
          <Button onClick={onConfirm}>{t("submitModal.confirmBtn")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
