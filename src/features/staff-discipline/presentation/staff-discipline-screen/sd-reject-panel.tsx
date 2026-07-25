"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/shared/utils";
import { useSDErrorMessage } from "./sd-error-message";

/**
 * Inline (NOT modal) reject panel — shared by BOTH tabs (INT-009 grouping note).
 * Fully controlled. Two independent validation layers are visible here:
 *  - layer 1 (client UX): confirm disabled until ≥10 trimmed chars;
 *  - layer 2 (server): `serverErrorKey="missing-reject-reason"` renders an inline
 *    textarea error with aria-invalid + aria-describedby (AC-005.3/AC-008.6).
 *
 * `MIN_REJECT_LENGTH` is a LOCAL constant (presentation may not import
 * `domain/use-cases` values) — same intentional duplication as
 * `StaffLeaveRequestCard`.
 */
const MIN_REJECT_LENGTH = 10;

export interface SDRejectPanelProps {
  reason: string;
  onChangeReason: (value: string) => void;
  isBusy: boolean;
  /**
   * Busy label for the confirm button ("Đang từ chối…"). Passed in because the
   * copy lives per-tab (`staffDiscipline.{violations,conductNotes}.actions.
   * rejecting`) while this panel is shared by BOTH tabs.
   */
  busyLabel: string;
  /** Server-side bypass of the client guard — distinct from the client hint. */
  serverErrorKey?: "missing-reject-reason";
  onConfirm: () => void;
  onCancel: () => void;
}

export function SDRejectPanel({
  reason,
  onChangeReason,
  isBusy,
  busyLabel,
  serverErrorKey,
  onConfirm,
  onCancel,
}: SDRejectPanelProps) {
  const t = useTranslations("staffDiscipline.rejectDialog");
  const errorMessage = useSDErrorMessage();
  const fieldId = useId();
  const hintId = useId();
  const errorId = useId();
  const fieldRef = useRef<HTMLTextAreaElement>(null);

  // Move focus into the textarea when the panel opens (NFR-003).
  useEffect(() => {
    fieldRef.current?.focus();
  }, []);

  const valid = reason.trim().length >= MIN_REJECT_LENGTH;

  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-edu-error/20 bg-edu-error/10 p-3.5 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1">
      <label
        htmlFor={fieldId}
        className="mb-1.5 block font-extrabold text-[11px] text-edu-error-text uppercase tracking-wide"
      >
        {t("title")} <span aria-hidden="true">*</span>
      </label>
      <p className="mb-2 text-edu-text-secondary text-xs">{t("description")}</p>
      <Textarea
        ref={fieldRef}
        id={fieldId}
        value={reason}
        onChange={(e) => onChangeReason(e.target.value)}
        rows={3}
        aria-required="true"
        // A11Y-001: `aria-invalid` marks an ACTUAL validation failure, never the
        // still-being-typed state. The client guard can't fail on submit (confirm
        // stays disabled below `MIN_REJECT_LENGTH`), so the only real failure
        // reachable here is the server's own guard. The "≥10 chars" requirement
        // is still conveyed to AT through `aria-required` + the `hintId` text.
        aria-invalid={Boolean(serverErrorKey)}
        aria-describedby={serverErrorKey ? `${hintId} ${errorId}` : hintId}
        placeholder={t("reasonPlaceholder")}
        className="resize-y bg-card"
      />
      {serverErrorKey && (
        <p
          id={errorId}
          role="alert"
          className="mt-1.5 font-semibold text-edu-error-text text-xs"
        >
          {errorMessage(serverErrorKey)}
        </p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span
          id={hintId}
          className={cn(
            "flex-1 text-xs",
            valid ? "text-edu-success-text" : "text-edu-text-secondary",
          )}
        >
          {valid ? "" : t("reasonMinLength")}
        </span>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isBusy}
          className="min-h-11"
        >
          {t("cancel")}
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={onConfirm}
          disabled={!valid || isBusy}
          aria-busy={isBusy}
          className="min-h-11"
        >
          <X className="size-4" aria-hidden="true" />
          {isBusy ? busyLabel : t("confirm")}
        </Button>
      </div>
    </div>
  );
}
