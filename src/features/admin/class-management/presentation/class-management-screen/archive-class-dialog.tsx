"use client";

import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
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
import type { Class } from "@/features/admin/class-management/domain/entities/class.entity";
import type { ClassActionResult } from "./class-management-screen.i-vm";

interface ArchiveClassDialogProps {
  target: Class | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (classId: string) => Promise<ClassActionResult>;
}

export function ArchiveClassDialog({
  target,
  onOpenChange,
  onConfirm,
}: ArchiveClassDialogProps) {
  const t = useTranslations("classManagement.archiveDialog");
  const [submitting, setSubmitting] = useState(false);

  const hasStudents = (target?.studentCount ?? 0) > 0;

  const handleConfirm = async () => {
    if (!target) return;
    setSubmitting(true);
    const result = await onConfirm(target.id);
    setSubmitting(false);
    if (result.ok) onOpenChange(false);
  };

  return (
    <AlertDialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open) onOpenChange(false);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("description", { name: target?.name ?? "" })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {hasStudents ? (
          <div className="flex items-start gap-2 rounded-[var(--edu-radius-card)] bg-edu-warning/15 px-3 py-2 text-sm text-edu-warning-foreground">
            <AlertTriangle
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0"
            />
            <p>
              {t("warningWithStudents", {
                count: target?.studentCount ?? 0,
              })}
            </p>
          </div>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={submitting}>
            {t("confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
