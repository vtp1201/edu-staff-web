"use client";

import { TriangleAlert } from "lucide-react";
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
import type { SearchStudent } from "@/features/admin-roster/domain/entities/search-student.entity";

interface TransferConfirmDialogProps {
  open: boolean;
  student: SearchStudent | null;
  toClassName: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function TransferConfirmDialog({
  open,
  student,
  toClassName,
  pending = false,
  onConfirm,
  onCancel,
}: TransferConfirmDialogProps) {
  const t = useTranslations("adminRoster");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("confirm.transferTitle")}</DialogTitle>
          <DialogDescription>
            {student
              ? t("confirm.transferBody", {
                  name: student.name,
                  fromClass: student.currentClassName ?? "",
                })
              : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-start gap-2 rounded-lg border border-edu-warning/30 bg-edu-warning/15 px-3 py-2.5">
          <TriangleAlert
            className="mt-0.5 size-4 shrink-0 text-edu-warning-foreground"
            aria-hidden="true"
          />
          <p className="font-medium text-edu-warning-foreground text-sm">
            {student?.currentClassName} → {toClassName}
          </p>
        </div>
        <DialogFooter>
          <Button variant="secondary" disabled={pending} onClick={onCancel}>
            {t("confirm.cancel")}
          </Button>
          <Button disabled={pending} onClick={onConfirm}>
            {t("confirm.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
