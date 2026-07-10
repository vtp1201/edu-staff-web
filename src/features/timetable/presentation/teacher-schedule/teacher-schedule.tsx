"use client";

import { Calendar as CalendarGlyph } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { ExportPdfButton } from "../timetable-view/export-pdf-button";
import { ReadOnlyBadge } from "../timetable-view/read-only-badge";
import { ReadOnlyField } from "../timetable-view/read-only-field";
import { SubjectLegend } from "../timetable-view/subject-legend";
import { TimetableGrid } from "../timetable-view/timetable-grid";
import { TimetableSkeleton } from "../timetable-view/timetable-skeleton";
import {
  hasAnySlot,
  subjectsUsed,
} from "../timetable-view/timetable-view.derive";
import type { TimetableErrorKey } from "../timetable-view/timetable-view.i-vm";
import type { TeacherScheduleScreenProps } from "./teacher-schedule.i-vm";

const ERROR_KEYS: Record<
  TimetableErrorKey,
  "errors.network-error" | "errors.forbidden" | "errors.unknown"
> = {
  "network-error": "errors.network-error",
  forbidden: "errors.forbidden",
  "not-found": "errors.unknown",
  "no-child": "errors.unknown",
};

/**
 * Teacher read-only schedule screen (US-E15.2). A lighter sibling of
 * `TimetableView`: single self-scope week, no child-picker, no week-nav — so it
 * is a separate screen (plan §4) rather than a third role branch. Reuses the
 * genuinely shared pieces (`TimetableGrid` with `cellVariant="teacher"`,
 * `SubjectLegend`, `TimetableSkeleton`, `EmptyState`) verbatim.
 */
export function TeacherScheduleScreen({
  initialState,
}: TeacherScheduleScreenProps) {
  const t = useTranslations("timetableView");
  const router = useRouter();

  return (
    <main className="flex-1 overflow-y-auto bg-edu-bg px-4 py-6 sm:px-8">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-4">
        <Header />
        <ReadOnlySelectors />

        {initialState.status === "loading" && <TimetableSkeleton />}

        {initialState.status === "error" && (
          <div
            role="alert"
            className="flex flex-col items-center gap-3 rounded-xl border border-edu-border bg-edu-card px-5 py-10 text-center shadow-card"
          >
            <p className="font-bold text-base text-edu-text-primary">
              {t("errorTitle")}
            </p>
            <p className="max-w-sm text-edu-text-secondary text-sm">
              {t(ERROR_KEYS[initialState.errorKey])}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.refresh()}
            >
              {t("retry")}
            </Button>
          </div>
        )}

        {initialState.status === "empty" && <TeacherEmpty />}

        {initialState.status === "success" &&
          (hasAnySlot(initialState.timetable) ? (
            <>
              <TimetableGrid
                timetable={initialState.timetable}
                cellVariant="teacher"
              />
              <SubjectLegend subjects={subjectsUsed(initialState.timetable)} />
            </>
          ) : (
            <TeacherEmpty />
          ))}
      </div>
    </main>
  );
}

/* ── Header ─────────────────────────────────────────────────────────────── */

function Header() {
  const t = useTranslations("timetableView");
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="min-w-[240px] flex-1">
        <p className="font-bold text-[11px] text-edu-text-secondary uppercase tracking-wide">
          {t("teacherEyebrow")}
        </p>
        <h1 className="mt-1 font-extrabold text-2xl text-edu-text-primary">
          {t("teacherTitle")}
        </h1>
        <p className="mt-1 text-edu-text-secondary text-sm">
          {t("teacherSubtitle")}
        </p>
      </div>
      <ExportPdfButton />
    </div>
  );
}

/* ── Read-only selectors (decorative — no data reload) ──────────────────── */

function ReadOnlySelectors() {
  const t = useTranslations("timetableView");
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-edu-border bg-edu-card px-5 py-3.5 shadow-card">
      <ReadOnlyField label={t("academicYear")} value={t("yearValue")} />
      <div className="flex-1" />
      <ReadOnlyBadge />
    </div>
  );
}

/* ── Empty state (teacher-specific copy, AC5) ───────────────────────────── */

function TeacherEmpty() {
  const t = useTranslations("timetableView");
  return (
    <div className="overflow-hidden rounded-xl border border-edu-border bg-edu-card shadow-card">
      <EmptyState
        icon={CalendarGlyph}
        title={t("teacherEmptyTitle")}
        body={t("teacherEmptyBody")}
        className="py-16"
      />
    </div>
  );
}
