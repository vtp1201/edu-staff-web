"use client";

import { Calendar as CalendarGlyph } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState, useTransition } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { ChildPicker } from "./child-picker";
import { ExportPdfButton } from "./export-pdf-button";
import { ReadOnlyBadge } from "./read-only-badge";
import { ReadOnlyField } from "./read-only-field";
import { SubjectLegend } from "./subject-legend";
import { TeacherPicker } from "./teacher-picker";
import { TimetableGrid } from "./timetable-grid";
import { TimetableSkeleton } from "./timetable-skeleton";
import {
  hasAnySlot,
  resolveRetryTarget,
  subjectsUsed,
  toDataState,
} from "./timetable-view.derive";
import type {
  TimetableDataState,
  TimetableErrorKey,
  TimetableRole,
  TimetableViewProps,
} from "./timetable-view.i-vm";
import { WeekNav } from "./week-nav";

const ERROR_KEYS: Record<
  TimetableErrorKey,
  "errors.network-error" | "errors.forbidden" | "errors.unknown"
> = {
  "network-error": "errors.network-error",
  forbidden: "errors.forbidden",
  "not-found": "errors.unknown",
  "no-child": "errors.unknown",
  unknown: "errors.unknown",
};

export function TimetableView({
  viewerRole,
  initialState,
  childList = [],
  initialChildId,
  fetchChildTimetable,
  teacherList = [],
  initialTeacherId,
  fetchMemberTimetable,
}: TimetableViewProps) {
  const t = useTranslations("timetableView");
  const router = useRouter();

  const [state, setState] = useState<TimetableDataState>(initialState);
  const [selectedChildId, setSelectedChildId] = useState(
    initialChildId ?? childList[0]?.childId ?? "",
  );
  const [selectedTeacherId, setSelectedTeacherId] = useState(
    initialTeacherId ?? teacherList[0]?.teacherId ?? "",
  );
  const [weekOffset, setWeekOffset] = useState(0);
  const [isPending, startTransition] = useTransition();

  // Named derivations (US-E15.3) — the old single `isParent` flag conflated
  // week-nav visibility, picker choice, grid variant and header copy.
  const showWeekNav = viewerRole === "parent" || viewerRole === "principal";
  const showChildPicker = viewerRole === "parent" && childList.length >= 2;
  const showTeacherPicker =
    viewerRole === "principal" && teacherList.length >= 2;
  const cellVariant = viewerRole === "principal" ? "teacher" : "class";

  const weekDates = useMemo(
    () => (showWeekNav ? buildWeekDates(weekOffset) : undefined),
    [showWeekNav, weekOffset],
  );

  // A teacher's week spans several classes, so the header carries NO class
  // suffix for the principal — `cellVariant="teacher"` names the class per slot.
  const displayClassName =
    viewerRole === "principal"
      ? ""
      : state.status === "success"
        ? state.timetable.className
        : (childList.find((c) => c.childId === selectedChildId)?.className ??
          "");

  const runChildFetch = useCallback(
    (childId: string) => {
      if (!fetchChildTimetable) return;
      startTransition(async () => {
        const result = await fetchChildTimetable(childId);
        setState(toDataState(result));
      });
    },
    [fetchChildTimetable],
  );

  const runTeacherFetch = useCallback(
    (teacherId: string) => {
      if (!fetchMemberTimetable) return;
      startTransition(async () => {
        const result = await fetchMemberTimetable(teacherId);
        setState(toDataState(result));
      });
    },
    [fetchMemberTimetable],
  );

  const onSelectChild = useCallback(
    (childId: string) => {
      if (childId === selectedChildId) return;
      setSelectedChildId(childId);
      runChildFetch(childId);
    },
    [selectedChildId, runChildFetch],
  );

  const onSelectTeacher = useCallback(
    (teacherId: string) => {
      if (teacherId === selectedTeacherId) return;
      setSelectedTeacherId(teacherId);
      runTeacherFetch(teacherId);
    },
    [selectedTeacherId, runTeacherFetch],
  );

  const onRetry = useCallback(() => {
    const target = resolveRetryTarget({
      viewerRole,
      selectedChildId,
      selectedTeacherId,
      canFetchChild: Boolean(fetchChildTimetable),
      canFetchMember: Boolean(fetchMemberTimetable),
    });
    if (target === "child") runChildFetch(selectedChildId);
    else if (target === "teacher") runTeacherFetch(selectedTeacherId);
    else router.refresh();
  }, [
    viewerRole,
    fetchChildTimetable,
    fetchMemberTimetable,
    runChildFetch,
    runTeacherFetch,
    selectedChildId,
    selectedTeacherId,
    router,
  ]);

  const view: TimetableDataState = isPending ? { status: "loading" } : state;

  return (
    <main className="flex-1 overflow-y-auto bg-edu-bg px-4 py-6 sm:px-8">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-4">
        <Header
          viewerRole={viewerRole}
          weekOffset={weekOffset}
          weekDates={weekDates}
          displayClassName={displayClassName}
        />

        {showWeekNav ? (
          <WeekNav
            weekOffset={weekOffset}
            weekDates={weekDates ?? []}
            onChange={setWeekOffset}
          />
        ) : (
          <ReadOnlySelectors
            academicYearLabel={
              view.status === "success"
                ? view.timetable.academicYearLabel
                : undefined
            }
            termName={
              view.status === "success" ? view.timetable.termName : undefined
            }
          />
        )}

        {showChildPicker && (
          <ChildPicker
            childList={childList}
            selectedChildId={selectedChildId}
            onSelect={onSelectChild}
            disabled={isPending}
          />
        )}

        {showTeacherPicker && (
          <TeacherPicker
            teacherList={teacherList}
            selectedTeacherId={selectedTeacherId}
            onSelect={onSelectTeacher}
            disabled={isPending}
          />
        )}

        {view.status === "loading" && <TimetableSkeleton />}

        {view.status === "error" && (
          <div
            role="alert"
            className="flex flex-col items-center gap-3 rounded-xl border border-edu-border bg-edu-card px-5 py-10 text-center shadow-card"
          >
            <p className="font-bold text-base text-edu-text-primary">
              {t("errorTitle")}
            </p>
            <p className="max-w-sm text-edu-text-secondary text-sm">
              {t(ERROR_KEYS[view.errorKey])}
            </p>
            <Button variant="outline" size="sm" onClick={onRetry}>
              {t("retry")}
            </Button>
          </div>
        )}

        {view.status === "empty" && (
          <div className="overflow-hidden rounded-xl border border-edu-border bg-edu-card shadow-card">
            <EmptyState
              icon={CalendarGlyph}
              title={t("emptyTitle")}
              body={t("emptyBody")}
              className="py-16"
            />
          </div>
        )}

        {view.status === "success" &&
          (hasAnySlot(view.timetable) ? (
            <>
              <TimetableGrid
                timetable={view.timetable}
                cellVariant={cellVariant}
                weekDates={weekDates}
              />
              <SubjectLegend subjects={subjectsUsed(view.timetable)} />
            </>
          ) : (
            <div className="overflow-hidden rounded-xl border border-edu-border bg-edu-card shadow-card">
              <EmptyState
                icon={CalendarGlyph}
                title={t("emptyTitle")}
                body={t("emptyBody")}
                className="py-16"
              />
            </div>
          ))}
      </div>
    </main>
  );
}

/* ── Header ─────────────────────────────────────────────────────────────── */

function Header({
  viewerRole,
  weekOffset,
  weekDates,
  displayClassName,
}: {
  viewerRole: TimetableRole;
  weekOffset: number;
  weekDates?: readonly Date[];
  displayClassName: string;
}) {
  const t = useTranslations("timetableView");
  const range =
    weekDates && weekDates.length === 6
      ? formatRange(weekDates[0], weekDates[5])
      : "";
  const title =
    viewerRole === "parent" && weekOffset === 0
      ? t("titleThisWeek")
      : t("title");
  const subtitle =
    viewerRole === "parent"
      ? t("subtitleParent", { range })
      : viewerRole === "principal"
        ? t("subtitlePrincipal", { range })
        : t("subtitleStudent");

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="min-w-[240px] flex-1">
        <p className="font-bold text-[11px] text-edu-text-secondary uppercase tracking-wide">
          {t("eyebrow")}
        </p>
        <h1 className="mt-1 font-extrabold text-2xl text-edu-text-primary">
          {title}
          {displayClassName && (
            <span className="ml-2 font-semibold text-base text-edu-text-secondary">
              · {t("classLabel", { className: displayClassName })}
            </span>
          )}
        </h1>
        <p className="mt-1 text-edu-text-secondary text-sm">{subtitle}</p>
      </div>
      <ExportPdfButton />
    </div>
  );
}

/* ── Student read-only selectors (decorative — no data reload) ──────────── */

function ReadOnlySelectors({
  academicYearLabel,
  termName,
}: {
  academicYearLabel?: string;
  termName?: string;
}) {
  const t = useTranslations("timetableView");
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-edu-border bg-edu-card px-5 py-3.5 shadow-card">
      {/* Real calendar labels when the read resolved them; the static strings
          remain only for mock mode / stories, which have no calendar. */}
      <ReadOnlyField
        label={t("academicYear")}
        value={academicYearLabel || t("yearValue")}
      />
      <ReadOnlyField
        label={t("semester")}
        value={termName || t("semesterValue")}
      />
      <div className="flex-1" />
      <ReadOnlyBadge />
    </div>
  );
}

/* ── Week date helpers ───────────────────────────────────────────────────── */

function buildWeekDates(weekOffset: number): Date[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dow = today.getDay(); // Sun=0..Sat=6
  const offsetToMon = dow === 0 ? -6 : 1 - dow;
  const mon = new Date(today);
  mon.setDate(today.getDate() + offsetToMon + weekOffset * 7);
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d;
  });
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatRange(a: Date, b: Date): string {
  const sameYear = a.getFullYear() === b.getFullYear();
  if (sameYear) {
    return `${pad2(a.getDate())}/${pad2(a.getMonth() + 1)} – ${pad2(b.getDate())}/${pad2(b.getMonth() + 1)}/${a.getFullYear()}`;
  }
  return `${pad2(a.getDate())}/${pad2(a.getMonth() + 1)}/${a.getFullYear()} – ${pad2(b.getDate())}/${pad2(b.getMonth() + 1)}/${b.getFullYear()}`;
}
