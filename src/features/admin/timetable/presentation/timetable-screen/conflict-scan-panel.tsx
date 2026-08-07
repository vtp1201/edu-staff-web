"use client";

import { AlertTriangle, ArrowRight, CheckCircle2, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { ListError } from "@/components/shared/list-error";
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import { cn } from "@/shared/utils";
import type {
  ConflictRowVM,
  ConflictScanVM,
  TimetableConflictType,
} from "./timetable-screen.i-vm";

/**
 * Whole-school conflicts panel (US-E18.48 — BE US-188's tenant-wide scan).
 *
 * Feature-local by decision 0026: exactly one screen renders it. It replaces the
 * previous mock-only teacher-clash summary rather than sitting beside it — one
 * conflicts surface, one source of truth.
 *
 * Two kinds are rendered DISTINCTLY because their remedies differ (BE ADR 0128):
 * a teacher clash is rejected by the write path, a room clash is NOT — it is
 * detected on read only, so its row carries an explicit "needs manual
 * resolution" note and a warning (not error) tone. No copy anywhere here may
 * suggest saving a duplicate room will be blocked.
 */
export interface ConflictScanPanelProps {
  scan: ConflictScanVM;
  /** Localized day label for a 0-indexed day. */
  dayLabel: (dayIndex: number) => string;
  /** Open the offending cell in the builder grid. */
  onJump: (classId: string, day: number, period: number) => void;
  /** Re-run the scan (the RSC page refetches). */
  onRetry: () => void;
}

const TYPE_TONE: Record<TimetableConflictType, StatusTone> = {
  // The write path REJECTS this one — it is a hard error in the data.
  "teacher-double-booked": "error",
  // Detected-only (ADR 0128): actionable, but nothing is broken at save time.
  "room-double-booked": "warning",
};

export function ConflictScanPanel({
  scan,
  dayLabel,
  onJump,
  onRetry,
}: ConflictScanPanelProps) {
  const t = useTranslations("timetable.conflicts");
  const tErrors = useTranslations("timetable.errors");

  if (scan.status === "error") {
    return (
      <section aria-label={t("title")}>
        <ListError
          shape="bordered-card"
          iconVariant="boxed"
          iconSize={6}
          title={t("errorTitle")}
          description={tErrors(scan.errorKey)}
          retryLabel={t("retry")}
          retryIcon="refresh"
          onRetry={onRetry}
        />
      </section>
    );
  }

  const hasConflicts = scan.rows.length > 0;

  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border bg-card shadow-card",
        hasConflicts ? "border-edu-error-text/40" : "border-border",
      )}
      aria-label={t("title")}
    >
      <div
        className={cn(
          "flex items-center gap-3 px-5 py-3.5",
          hasConflicts ? "bg-edu-error/10" : "bg-muted",
        )}
      >
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg",
            hasConflicts ? "bg-edu-error/20" : "bg-edu-success/20",
          )}
        >
          {hasConflicts ? (
            <AlertTriangle className="size-4 text-edu-error-text" aria-hidden />
          ) : (
            <CheckCircle2
              className="size-4 text-edu-success-text"
              aria-hidden
            />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            {t("title")}
          </p>
          <p
            className={cn(
              "text-sm font-extrabold",
              hasConflicts ? "text-edu-error-text" : "text-edu-success-text",
            )}
          >
            {hasConflicts
              ? t("count", { count: scan.rows.length })
              : t("noConflicts")}
          </p>
          <p className="text-xs text-muted-foreground">
            {hasConflicts ? t("hint") : t("validHint")}
          </p>
        </div>
      </div>

      {scan.truncated && (
        <p
          role="status"
          className="flex items-start gap-2 border-t border-edu-warning/40 bg-edu-warning/10 px-5 py-2.5 text-xs text-edu-warning-foreground"
        >
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {t("truncatedHint")}
        </p>
      )}

      {hasConflicts && (
        <ul className="divide-y divide-border border-t border-border">
          {scan.rows.map((row, index) => (
            <li key={row.id}>
              <ConflictRow
                row={row}
                index={index}
                dayLabel={dayLabel}
                onJump={onJump}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ConflictRow({
  row,
  index,
  dayLabel,
  onJump,
}: {
  row: ConflictRowVM;
  index: number;
  dayLabel: (dayIndex: number) => string;
  onJump: (classId: string, day: number, period: number) => void;
}) {
  const t = useTranslations("timetable.conflicts");
  const tType = useTranslations("timetable.conflicts.type");

  const classNames = row.classes.map((c) => c.className).join(", ");
  const isRoom = row.type === "room-double-booked";

  return (
    <button
      type="button"
      onClick={() => onJump(row.targetClassId, row.day, row.period)}
      // ≥44px touch target (accessibility.md) via py-3 + the row's own content height.
      className="flex w-full items-start gap-3 px-5 py-3 text-left transition-colors hover:bg-muted focus-visible:bg-muted"
    >
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold",
          isRoom
            ? "bg-edu-warning/15 text-edu-warning-foreground"
            : "bg-edu-error/15 text-edu-error-text",
        )}
        aria-hidden
      >
        {String(index + 1).padStart(2, "0")}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={TYPE_TONE[row.type]}>
            {tType(row.type)}
          </StatusBadge>
          <span className="text-xs font-bold text-foreground">
            {t("cellLabel", {
              day: dayLabel(row.day),
              period: row.period,
            })}
          </span>
        </span>

        <span className="mt-1 block text-xs leading-relaxed text-foreground">
          {isRoom
            ? t("roomDetail", { room: row.room ?? "", classes: classNames })
            : t("teacherDetail", {
                teacher: row.teacherName ?? "",
                classes: classNames,
              })}
        </span>

        {/* ADR 0128: the write path does NOT reject a duplicate room, so this
            row must never read as "the system will stop this next time". */}
        {isRoom && (
          <span className="mt-1 block text-[11px] leading-snug text-muted-foreground">
            {t("roomManualHint")}
          </span>
        )}
      </span>

      <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-primary">
        {isRoom ? t("review") : t("resolve")}
        <ArrowRight className="size-3.5" aria-hidden />
      </span>
    </button>
  );
}
