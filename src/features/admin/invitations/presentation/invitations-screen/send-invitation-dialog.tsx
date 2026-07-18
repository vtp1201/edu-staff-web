"use client";

import { Loader2, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  ExpiryDays,
  InviteRoleOption,
  SendInvitationBatchInput,
} from "../../domain/entities/invitation.entity";
import type { InvitationFailure } from "../../domain/failures/invitation.failure";
import {
  InvitationEmailChipsInput,
  isValidEmail,
} from "./invitation-email-chips-input";
import { InvitationExpirySelect } from "./invitation-expiry-select";
import { InvitationRoleRadioGroup } from "./invitation-role-radio-group";
import type { SendBatchActionResult } from "./invitations-screen.i-vm";

export interface SendInvitationDialogProps {
  open: boolean;
  roleOptions: InviteRoleOption[];
  expiryOptions: ExpiryDays[];
  maxBatchEmails: number;
  /** Runs the send (toasts + list invalidation happen in the container) and
   *  returns the result so the dialog can reconcile its own chips. */
  onSubmit: (input: SendInvitationBatchInput) => Promise<SendBatchActionResult>;
  onClose: () => void;
}

export function SendInvitationDialog({
  open,
  roleOptions,
  expiryOptions,
  maxBatchEmails,
  onSubmit,
  onClose,
}: SendInvitationDialogProps) {
  const t = useTranslations("invitations");
  const [emails, setEmails] = useState<string[]>([]);
  const [role, setRole] = useState<InviteRoleOption>("teacher");
  const [expiry, setExpiry] = useState<ExpiryDays>(14);
  const [submitting, setSubmitting] = useState(false);
  const [serverRejected, setServerRejected] = useState<
    Record<string, InvitationFailure["type"]>
  >({});
  // DEF-1 (US-E21.1 QA): the expiry Select's listbox is a Radix portal outside
  // this Dialog's DOM subtree. Select and Dialog each run their own
  // independent Escape-key handling (uncoordinated), so pressing Escape to
  // close JUST the listbox was ALSO closing the whole Dialog and discarding
  // in-progress chips. Fix: make the Select's open state fully controlled
  // here, and intercept Escape ourselves via a document-level CAPTURE-phase
  // listener while it's open — capture-phase runs before either Select's or
  // Dialog's own (bubble-phase) Escape handling, so `stopPropagation` there
  // reliably suppresses both, and we close the Select ourselves instead.
  const [expiryOpen, setExpiryOpen] = useState(false);

  useEffect(() => {
    if (!expiryOpen) return;
    function onKeyDownCapture(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      setExpiryOpen(false);
    }
    document.addEventListener("keydown", onKeyDownCapture, true);
    return () =>
      document.removeEventListener("keydown", onKeyDownCapture, true);
  }, [expiryOpen]);

  // Reset the form each time the dialog opens.
  useEffect(() => {
    if (open) {
      setEmails([]);
      setRole("teacher");
      setExpiry(14);
      setSubmitting(false);
      setServerRejected({});
      setExpiryOpen(false);
    }
  }, [open]);

  const canSubmit =
    emails.length > 0 && emails.every(isValidEmail) && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    const res = await onSubmit({ emails, role, expiryDays: expiry });
    setSubmitting(false);
    if (!res.ok) return; // container toasted; keep dialog open (AC-003.12)
    if (res.outcome.failed.length === 0) {
      onClose(); // full success — AC-003.9
      return;
    }
    // Partial: keep only the failed chips, marked with their server error.
    const rejected: Record<string, InvitationFailure["type"]> = {};
    for (const f of res.outcome.failed) {
      rejected[f.email.toLowerCase()] = f.failureKey;
    }
    setServerRejected(rejected);
    setEmails(res.outcome.failed.map((f) => f.email));
  }

  const submitLabel =
    emails.length > 1
      ? t("sendDialog.submitMany", { count: emails.length })
      : t("sendDialog.submitOne");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !submitting) onClose();
      }}
    >
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t("sendDialog.title")}</DialogTitle>
          <DialogDescription>{t("sendDialog.subtitle")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <InvitationEmailChipsInput
            emails={emails}
            serverRejectedEmails={serverRejected}
            maxBatchEmails={maxBatchEmails}
            onChange={(next) => {
              setEmails(next);
              setServerRejected({});
            }}
            labels={{
              fieldLabel: t("sendDialog.emailChipsLabel"),
              placeholder: t("sendDialog.emailChipsPlaceholder"),
              helper: t("sendDialog.emailChipsHelper"),
              invalidError: t("sendDialog.invalidEmailError"),
              duplicateError: t("sendDialog.duplicateEmailError"),
              inputAriaLabel: t("sendDialog.emailChipsLabel"),
              maxTagsHelper: t("sendDialog.emailChipsHelper"),
              tagTooLongError: t("sendDialog.invalidEmailError"),
              removeAriaLabelOf: (email) => t("a11y.removeChip", { email }),
            }}
          />

          <div>
            <p className="mb-1.5 font-bold text-edu-text-secondary text-xs">
              {t("sendDialog.roleLabel")}
            </p>
            <InvitationRoleRadioGroup
              value={role}
              onChange={setRole}
              groupLabel={t("sendDialog.roleLabel")}
              options={roleOptions.map((value) => ({
                value,
                label: t(`roleLabels.${value}`),
              }))}
            />
          </div>

          <div>
            <p className="mb-1.5 font-bold text-edu-text-secondary text-xs">
              {t("sendDialog.expiryLabel")}
            </p>
            <InvitationExpirySelect
              value={expiry}
              onChange={setExpiry}
              open={expiryOpen}
              onOpenChange={setExpiryOpen}
              triggerAriaLabel={t("sendDialog.expiryLabel")}
              options={expiryOptions.map((value) => ({
                value,
                label: t("sendDialog.expiryOption", { days: value }),
              }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting}
          >
            {t("sendDialog.cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            aria-busy={submitting}
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="size-4" aria-hidden="true" />
            )}
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
