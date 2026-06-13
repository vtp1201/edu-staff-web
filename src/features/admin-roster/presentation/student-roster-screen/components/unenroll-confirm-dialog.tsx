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
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/shared/utils";

interface UnenrollConfirmDialogProps {
  open: boolean;
  /** Ids to remove — length drives the body copy. */
  targetIds: string[];
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function UnenrollConfirmDialog({
  open,
  targetIds,
  pending = false,
  onConfirm,
  onCancel,
}: UnenrollConfirmDialogProps) {
  const t = useTranslations("adminRoster");

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("confirm.unenrollTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("confirm.unenrollBody", { count: targetIds.length })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>
            {t("confirm.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={onConfirm}
            className={cn(buttonVariants({ variant: "destructive" }))}
          >
            {t("confirm.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
