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
import type { UnsealRequest } from "../../../domain/entities/seal-batch.entity";

export interface UnsealSelfApproveDialogProps {
  open: boolean;
  request: UnsealRequest | null;
  currentAdminId: string;
  currentAdminName: string;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: (requestId: string) => void;
}

/** ADR-0037 single-admin fallback — a WARNING that still proceeds on confirm
 * (distinct from the same-admin blocking error). Shows the audit-entry preview
 * from the mockup so the admin sees exactly what is logged. */
export function UnsealSelfApproveDialog({
  open,
  request,
  currentAdminId,
  currentAdminName,
  isPending,
  onCancel,
  onConfirm,
}: UnsealSelfApproveDialogProps) {
  const t = useTranslations("academicRecordSeal.unseal.selfApproveDialog");

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onCancel();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <AlertDialogDescription>{t("body")}</AlertDialogDescription>
        </AlertDialogHeader>
        {request && (
          <div className="rounded-lg bg-muted p-3 font-mono text-muted-foreground text-xs leading-relaxed">
            <p className="font-bold text-edu-text-muted uppercase tracking-wide">
              {t("auditLabel")}
            </p>
            <p className="mt-1.5">
              self_approve · unseal_request: <strong>{request.id}</strong>
              <br />
              student: <strong>{request.studentName}</strong> · class:{" "}
              <strong>{request.classId}</strong>
              <br />
              admin: <strong>{currentAdminId}</strong> ({currentAdminName})
            </p>
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {t("cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending || !request}
            onClick={(e) => {
              if (!request) return;
              e.preventDefault();
              onConfirm(request.id);
            }}
          >
            {t("confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
