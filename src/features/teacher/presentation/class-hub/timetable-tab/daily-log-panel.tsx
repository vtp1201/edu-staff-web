"use client";

import { FileText, PenLine } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState, useTransition } from "react";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { HomeroomEntry } from "@/features/class-log/domain/entities/homeroom-entry.entity";
import type { ClassLogFailure } from "@/features/class-log/domain/failures/class-log.failure";
import { STATUS_TONE } from "@/features/class-log/presentation/class-log-screen/status-tone";
import type { TimetableTabActions } from "./timetable-tab.i-vm";

export interface DailyLogPanelProps {
  classId: string;
  /** YYYY-MM-DD */
  date: string;
  entry?: HomeroomEntry;
  actions: TimetableTabActions;
  onSaved: (entry: HomeroomEntry) => void;
}

/**
 * Sổ chủ nhiệm (theo ngày) — one strip at the bottom of each day card.
 *
 * A NEW component rather than an embed of `ClassLogEntryForm`: that one renders
 * its own full-page chrome (back button, centred card, page title) and is a
 * screen body, not an inline strip. What is REUSED is everything that carries
 * behaviour — the `createEntry`/`submitEntry`/`reviseEntry` Server Actions
 * (threaded in as refs) and class-log's own `STATUS_TONE` map + `classLog.*`
 * i18n namespace. No forked business logic, no second translation of the same
 * status words.
 *
 * THREE disjoint states, because core exposes CREATE + SUBMIT + REVISE and no
 * update endpoint at all (`/homeroom-entries/{entryId}` is GET-only, and a
 * second create for the same (class, date) is a 409
 * `HOMEROOM_ENTRY_ALREADY_EXISTS`):
 *
 * 1. NO entry yet → the editor, with "Lưu nháp" (create DRAFT) and "Gửi BGH
 *    duyệt" (create then submit — the same two-step `ClassLogScreen` uses; if
 *    the submit half fails the DRAFT that succeeded is kept and shown, so
 *    nothing is lost and the teacher can retry the submit alone).
 * 2. Entry EXISTS and is DRAFT → submit ONLY (`submitDailyEntry` with the
 *    entry's id). The content is deliberately not re-openable: routing "Sửa"
 *    back through create would 409 every time, which is exactly the dead end
 *    this component shipped with. The lock is stated in VISIBLE text, not
 *    inferred from a missing button.
 * 3. Entry REJECTED → "Sửa & gửi lại" calls `reviseDailyEntry`, which returns
 *    it to DRAFT (state 2), where it can be submitted again. It never touches
 *    the create path.
 *
 * SUBMITTED / APPROVED expose no action at all — the teacher owns neither.
 *
 * Rendered ONLY for the class's GVCN — `DayCard` owns that decision, because
 * core restricts the homeroom-entries list to the homeroom teacher and BGH, so
 * a subject teacher has nothing readable here (a read-only strip would just be
 * a permanently empty box). The Server Actions re-derive the same role from the
 * token regardless: mounting is convenience, never the enforcement.
 */
export function DailyLogPanel({
  classId,
  date,
  entry,
  actions,
  onSaved,
}: DailyLogPanelProps) {
  const t = useTranslations("teacherClasses.hub.timetable.daily");
  const tStatus = useTranslations("classLog.status");
  const tErr = useTranslations("classLog.errors");
  const summaryId = useId();
  const notesId = useId();

  const [isEditing, setIsEditing] = useState(false);
  const [summary, setSummary] = useState(entry?.summary ?? "");
  const [notableEvents, setNotableEvents] = useState(
    entry?.notableEvents ?? "",
  );
  const [showRequired, setShowRequired] = useState(false);
  const [errorKey, setErrorKey] = useState<ClassLogFailure["type"] | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  const status = entry?.status;
  /** No saved entry yet — the ONLY state where the editor may be opened. */
  const isNew = !entry;
  /** Saved DRAFT: submit-only (no update endpoint exists). */
  const isSavedDraft = !!entry && status === "DRAFT";
  const canRevise = status === "REJECTED";

  /** State 1 only: create the entry, optionally submitting it straight after. */
  const create = (alsoSubmit: boolean) => {
    if (summary.trim().length === 0) {
      setShowRequired(true);
      return;
    }
    setErrorKey(null);
    startTransition(async () => {
      const saved = await actions.saveDailyEntry(
        classId,
        date,
        summary.trim(),
        notableEvents.trim() || undefined,
      );
      if (!saved.ok) {
        setErrorKey(saved.errorKey);
        return;
      }
      // Keep the DRAFT even if the submit half fails — it is real, saved work.
      onSaved(saved.entry);
      setIsEditing(false);
      if (!alsoSubmit) return;
      const submitted = await actions.submitDailyEntry(
        classId,
        saved.entry.entryId,
      );
      if (!submitted.ok) {
        setErrorKey(submitted.errorKey);
        return;
      }
      onSaved(submitted.entry);
    });
  };

  /** State 2: submit an ALREADY-SAVED draft by id — never a second create. */
  const submitSaved = () => {
    if (!entry) return;
    setErrorKey(null);
    startTransition(async () => {
      const res = await actions.submitDailyEntry(classId, entry.entryId);
      if (!res.ok) {
        setErrorKey(res.errorKey);
        return;
      }
      onSaved(res.entry);
    });
  };

  /** State 3: send a rejected entry back to DRAFT so it can be re-submitted. */
  const revise = () => {
    if (!entry) return;
    setErrorKey(null);
    startTransition(async () => {
      const res = await actions.reviseDailyEntry(classId, entry.entryId);
      if (!res.ok) {
        setErrorKey(res.errorKey);
        return;
      }
      onSaved(res.entry);
      // NOT `setIsEditing(true)`: the content still cannot be edited (no update
      // endpoint) — the entry is now a DRAFT awaiting re-submission.
      setIsEditing(false);
    });
  };

  return (
    <div className="bg-background px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <FileText
          className="size-3.5 text-edu-text-secondary"
          aria-hidden="true"
        />
        <span className="font-extrabold text-edu-text-secondary text-[11px] uppercase tracking-[0.06em]">
          {t("title")}
        </span>
        {status && (
          <StatusBadge tone={STATUS_TONE[status]}>
            {tStatus(status)}
          </StatusBadge>
        )}
        <span className="flex-1" />
        <div className="flex flex-wrap gap-2">
          {isNew && isEditing && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => create(false)}
              >
                {isPending ? t("saving") : t("saveDraft")}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isPending}
                onClick={() => create(true)}
              >
                {t("submit")}
              </Button>
            </>
          )}
          {isNew && !isEditing && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-primary"
              onClick={() => setIsEditing(true)}
            >
              <PenLine className="size-3.5" aria-hidden="true" />
              {t("write")}
            </Button>
          )}
          {isSavedDraft && (
            <Button
              type="button"
              size="sm"
              disabled={isPending}
              onClick={submitSaved}
            >
              {isPending ? t("saving") : t("submit")}
            </Button>
          )}
          {canRevise && (
            <Button
              type="button"
              size="sm"
              disabled={isPending}
              onClick={revise}
            >
              {isPending ? t("saving") : t("revise")}
            </Button>
          )}
        </div>
      </div>

      {isSavedDraft && (
        <p className="mt-2 text-edu-text-secondary text-xs">
          {t("draftLocked")}
        </p>
      )}

      {status === "REJECTED" && entry?.reason && (
        <p className="mt-2 rounded-[8px] bg-edu-error/15 px-3 py-2 text-edu-error-text text-xs">
          {t("rejectedReason", { reason: entry.reason })}
        </p>
      )}

      {errorKey && (
        <p
          role="alert"
          className="mt-2 rounded-[8px] bg-edu-error/15 px-3 py-2 text-edu-error-text text-xs"
        >
          {tErr(errorKey)}
        </p>
      )}

      {isNew && isEditing ? (
        <div className="mt-2 flex flex-col gap-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={summaryId}>
              {t("summary")}{" "}
              <span aria-hidden="true" className="text-edu-error-text">
                *
              </span>
            </Label>
            <Textarea
              id={summaryId}
              rows={2}
              value={summary}
              aria-required="true"
              aria-invalid={showRequired && summary.trim().length === 0}
              aria-describedby={
                showRequired && summary.trim().length === 0
                  ? `${summaryId}-err`
                  : undefined
              }
              placeholder={t("summaryPlaceholder")}
              disabled={isPending}
              onChange={(e) => {
                setSummary(e.target.value);
                if (showRequired) setShowRequired(false);
              }}
            />
            {showRequired && summary.trim().length === 0 && (
              <p
                id={`${summaryId}-err`}
                className="text-edu-error-text text-xs"
              >
                {t("summaryRequired")}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={notesId}>{t("notableEvents")}</Label>
            <Textarea
              id={notesId}
              rows={2}
              value={notableEvents}
              disabled={isPending}
              onChange={(e) => setNotableEvents(e.target.value)}
            />
          </div>
          <div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={() => setIsEditing(false)}
            >
              {t("cancel")}
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-edu-text-secondary text-sm leading-relaxed">
          {entry?.summary || t("empty")}
        </p>
      )}
    </div>
  );
}
