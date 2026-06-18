"use client";

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

type PublishConfirmDialogProps = {
  open: boolean;
  isPublishing?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function PublishConfirmDialog({
  open,
  isPublishing = false,
  onConfirm,
  onCancel,
}: PublishConfirmDialogProps) {
  const t = useTranslations("examBank");

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("publishDialog.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("publishDialog.body")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPublishing}>
            {t("publishDialog.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPublishing}
            aria-busy={isPublishing}
          >
            {isPublishing
              ? t("publishDialog.publishing")
              : t("publishDialog.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
