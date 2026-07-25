"use client";

import { useTranslations } from "next-intl";
import {
  PublishConfirmDialog,
  type PublishConfirmErrorSlot,
} from "@/components/shared/publish-confirm-dialog";

/**
 * Irreversible flag confirm (FR-005/AC-005.2) — a THIN wrapper over the already
 * shared `PublishConfirmDialog`, which design-spec.jsonc itself names as the
 * pattern (`adminPrincipalView.flagAction.confirmDialog.pattern`: "mirrors
 * lesson-plan.jsx LPConfirmDialog one-way publish confirm"). Irreversibility ≠
 * destructiveness — flagging moves a record forward into a follow-up state, it
 * deletes nothing, so this is NOT `DestructiveConfirmDialog`.
 *
 * `role="alertdialog"`, focus trap and focus-restore-to-trigger are inherited
 * from the Radix `AlertDialog` underneath (NFR-003).
 *
 * This component holds NO optimistic state and no state at all: the row keeps
 * showing `RECORDED` until the container's mutation settles (AC-005.3 is enforced
 * at the mutation level — no `onMutate`, no `setQueryData`).
 */
export interface SAFlagConfirmDialogProps {
  open: boolean;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** Inline failure (AC-005.6 forbidden / AC-005.8 invalid-state / network). */
  errorSlot?: PublishConfirmErrorSlot;
}

export function SAFlagConfirmDialog({
  open,
  isLoading,
  onConfirm,
  onCancel,
  errorSlot,
}: SAFlagConfirmDialogProps) {
  const t = useTranslations("studentAbsences.flagConfirm");
  const tForm = useTranslations("studentAbsences.form");

  return (
    <PublishConfirmDialog
      open={open}
      isLoading={isLoading}
      onConfirm={onConfirm}
      onCancel={onCancel}
      errorSlot={errorSlot}
      labels={{
        title: t("title"),
        // Already states the action cannot be undone (AC-005.2).
        body: t("description"),
        confirm: t("confirm"),
        publishing: tForm("saving"),
        cancel: t("cancel"),
      }}
    />
  );
}
