"use client";

import { useTranslations } from "next-intl";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface UnsealSameAdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** AC-8 — blocking error: the same admin cannot co-sign their own request.
 * Acknowledge-only (no path forward). Radix AlertDialog = role="alertdialog"
 * + focus-trap (AC-10). */
export function UnsealSameAdminDialog({
  open,
  onOpenChange,
}: UnsealSameAdminDialogProps) {
  const t = useTranslations("academicRecordSeal.unseal.sameAdminDialog");

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <AlertDialogDescription>{t("body")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction>{t("ok")}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
