"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/shared/utils";
import {
  type SetStaffConductNoteInput,
  STAFF_CONDUCT_NOTE_MAX_LENGTH,
  STAFF_CONDUCT_RATINGS,
  type StaffConductRating,
} from "../../domain/entities/staff-conduct-note.entity";
import type { StaffRosterEntry } from "../../domain/entities/staff-roster.entity";
import {
  fieldErrorFor,
  useSDErrorMessage,
  useSDFieldErrorMessage,
} from "./sd-error-message";
import type { StaffDisciplineSubmitError } from "./staff-discipline-screen.i-vm";

/**
 * Set (create/overwrite) conduct-note dialog — principal only, constructive.
 *
 * There is DELIBERATELY no prop for an APPROVED/locked source record: an APPROVED
 * note can never reach this component (the row renders no trigger — see
 * `sd-conduct-note-row.tsx`), which is what makes AC-007.4 structural. `locked`
 * IS representable in `submitError` — that is the race/stale-request server
 * backstop (AC-007.5) only.
 *
 * The 5000-char cap is enforced by `maxLength` + a live counter (AC-007.10), and
 * submit stays disabled while the note is empty, so the note field can't produce
 * a server validation error from the UI.
 */
const RATING_LABEL_KEY = {
  SATISFACTORY: "satisfactory",
  NEEDS_IMPROVEMENT: "needsImprovement",
  UNSATISFACTORY: "unsatisfactory",
} as const;

export interface SetConductNoteDialogProps {
  open: boolean;
  /** Existing record being overwritten; `null` for a brand-new note. */
  target: { staffMemberId: string } | null;
  existing?: { rating: StaffConductRating; note: string };
  termId: string;
  staffRoster: StaffRosterEntry[];
  isSubmitting: boolean;
  submitError?: StaffDisciplineSubmitError;
  onSubmit: (input: SetStaffConductNoteInput) => void;
  onClose: () => void;
}

export function SetConductNoteDialog({
  open,
  target,
  existing,
  termId,
  staffRoster,
  isSubmitting,
  submitError,
  onSubmit,
  onClose,
}: SetConductNoteDialogProps) {
  const t = useTranslations("staffDiscipline.conductNotes");
  const tForm = useTranslations("staffDiscipline.conductNotes.form");
  const tRating = useTranslations("staffDiscipline.conductNotes.rating");
  const tCommon = useTranslations("Common.confirmDialog");
  const errorMessage = useSDErrorMessage();
  const fieldErrorMessage = useSDFieldErrorMessage();

  const staffFieldId = useId();
  const ratingFieldId = useId();
  const noteFieldId = useId();
  const ratingErrorId = useId();
  const counterId = useId();

  const [staffMemberId, setStaffMemberId] = useState("");
  const [rating, setRating] = useState<StaffConductRating | "">("");
  const [note, setNote] = useState("");

  // Pre-fill on overwrite (AC-007.2); empty for a new note (AC-007.1).
  useEffect(() => {
    if (!open) return;
    setStaffMemberId(target?.staffMemberId ?? "");
    setRating(existing?.rating ?? "");
    setNote(existing?.note ?? "");
  }, [open, target?.staffMemberId, existing?.rating, existing?.note]);

  const ratingFieldError = fieldErrorFor("rating", submitError?.fields);
  const showRatingError =
    Boolean(ratingFieldError) || submitError?.errorKey === "invalid-rating";
  const canSubmit =
    staffMemberId !== "" &&
    rating !== "" &&
    note.trim() !== "" &&
    !isSubmitting;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !isSubmitting) onClose();
      }}
    >
      <DialogContent className="max-w-lg [&>*]:min-w-0">
        <DialogHeader>
          <DialogTitle>{tForm("title")}</DialogTitle>
          <DialogDescription>{t("subtitle")}</DialogDescription>
        </DialogHeader>

        {submitError && !ratingFieldError && (
          <p
            role="alert"
            className="rounded-[var(--edu-radius-btn)] border border-edu-error/20 bg-edu-error/10 px-3 py-2 font-semibold text-edu-error-text text-xs"
          >
            {errorMessage(submitError.errorKey)}
          </p>
        )}

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={staffFieldId}
              className="font-bold text-foreground text-xs"
            >
              {tForm("staffMember")}
            </label>
            <Select
              value={staffMemberId}
              onValueChange={setStaffMemberId}
              // Overwrite targets a fixed natural key — the staff member is not
              // re-selectable, only shown.
              disabled={target !== null}
            >
              <SelectTrigger id={staffFieldId} className="min-h-11">
                <SelectValue placeholder={tForm("staffMemberPlaceholder")} />
              </SelectTrigger>
              <SelectContent className="pointer-events-auto">
                {staffRoster.map((s) => (
                  <SelectItem key={s.staffMemberId} value={s.staffMemberId}>
                    {s.staffName} — {s.department}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={ratingFieldId}
              className="font-bold text-foreground text-xs"
            >
              {tForm("rating")}
            </label>
            <Select
              value={rating}
              onValueChange={(v) => setRating(v as StaffConductRating)}
            >
              <SelectTrigger
                id={ratingFieldId}
                aria-invalid={showRatingError}
                aria-describedby={showRatingError ? ratingErrorId : undefined}
                className="min-h-11"
              >
                <SelectValue placeholder={tForm("rating")} />
              </SelectTrigger>
              <SelectContent className="pointer-events-auto">
                {STAFF_CONDUCT_RATINGS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {tRating(RATING_LABEL_KEY[r])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {showRatingError && (
              <p
                id={ratingErrorId}
                className="font-semibold text-edu-error-text text-xs"
              >
                {fieldErrorMessage("rating")}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={noteFieldId}
              className="font-bold text-foreground text-xs"
            >
              {tForm("note")}
            </label>
            <Textarea
              id={noteFieldId}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={5}
              maxLength={STAFF_CONDUCT_NOTE_MAX_LENGTH}
              aria-describedby={counterId}
              placeholder={tForm("notePlaceholder")}
              className={cn("resize-y")}
            />
            <p
              id={counterId}
              className="text-right text-edu-text-secondary text-xs"
            >
              {note.length}/{STAFF_CONDUCT_NOTE_MAX_LENGTH}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="min-h-11"
          >
            {tCommon("cancel")}
          </Button>
          <Button
            type="button"
            disabled={!canSubmit}
            aria-busy={isSubmitting}
            onClick={() =>
              onSubmit({
                staffMemberId,
                termId,
                rating: rating as StaffConductRating,
                note: note.trim(),
              })
            }
            className="min-h-11"
          >
            {isSubmitting && (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            )}
            {isSubmitting ? t("saving") : tCommon("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
