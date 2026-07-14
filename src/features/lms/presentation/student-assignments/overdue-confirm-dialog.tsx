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
import { useDialogReturnFocus } from "@/shared/use-dialog-return-focus";

export interface OverdueConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fired only when the student confirms the late submission. */
  onConfirm: () => void;
}

/**
 * "Nộp bài trễ hạn?" confirm gate for submitting an overdue assignment.
 * Radix AlertDialog handles focus-trap and Escape, but its modal `Content`
 * focus-restore defers to a `<Trigger>` ref that is null for this controlled
 * dialog — so `useDialogReturnFocus` restores focus to the invoking "Nộp bài"
 * button on Cancel/Escape with no state change (AC-1176.3).
 */
export function OverdueConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
}: OverdueConfirmDialogProps) {
  const t = useTranslations("assignments.submit.confirmOverdue");
  const restoreFocusOnClose = useDialogReturnFocus(open);
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm" onCloseAutoFocus={restoreFocusOnClose}>
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
