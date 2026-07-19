"use client";

import { useTranslations } from "next-intl";
import {
  DestructiveConfirmDialog,
  type DestructiveConfirmErrorSlot,
} from "@/components/shared/destructive-confirm-dialog";
import type { UnlinkTarget } from "./parent-links-screen.i-vm";

export interface PLUnlinkDialogProps {
  open: boolean;
  /** Minimal slice for consequence-copy interpolation (captured at open time). */
  target: UnlinkTarget | null;
  isLoading: boolean;
  /** "forbidden" → 403 role/tenant re-auth (AC-005.6, no retry). "transient" →
   * network/5xx (AC-005.8, retry). The 404 race (AC-005.7) is NEVER an
   * errorSlot — it resolves as a toast + close + refetch. */
  errorSlot?: DestructiveConfirmErrorSlot;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Unlink confirm dialog (FR-007, HIGH-RISK). Thin wrapper over the shared
 * `DestructiveConfirmDialog` (zero new props on it — pure composition). Renders
 * the EXACT DR-014 consequence copy (AC-005.1) with {parent}/{student}/{class}
 * interpolated — a generic "are you sure?" fails the AC. Danger button, focus
 * trap + focus-return are inherited from AlertDialog (AC-005.2/.9).
 */
export function PLUnlinkDialog({
  open,
  target,
  isLoading,
  errorSlot,
  onConfirm,
  onCancel,
}: PLUnlinkDialogProps) {
  const t = useTranslations("parentLinks");

  return (
    <DestructiveConfirmDialog
      open={open}
      title={t("unlinkDialog.title")}
      body={t("unlinkDialog.body", {
        parent: target?.parentName ?? "",
        student: target?.studentName ?? "",
        class: target?.className ?? "",
      })}
      confirmLabel={t("unlinkDialog.confirm")}
      isLoading={isLoading}
      errorSlot={errorSlot}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
