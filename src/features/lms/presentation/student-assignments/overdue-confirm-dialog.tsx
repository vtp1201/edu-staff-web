import { useTranslations } from "next-intl";
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

export interface OverdueConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fired only when the student confirms the late submission. */
  onConfirm: () => void;
}

/**
 * "Nộp bài trễ hạn?" confirm gate for submitting an overdue assignment.
 * Radix AlertDialog handles focus-trap, Escape, and focus-restore to the
 * element focused when it opened (the "Nộp bài" trigger) — Cancel therefore
 * restores focus with no state change (AC-1176.3).
 */
export function OverdueConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
}: OverdueConfirmDialogProps) {
  const t = useTranslations("assignments.submit.confirmOverdue");
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <AlertDialogDescription>{t("description")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            {t("confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
