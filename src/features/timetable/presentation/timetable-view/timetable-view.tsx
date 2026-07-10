"use client";

import { Calendar as CalendarGlyph, Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { ChildPicker } from "./child-picker";
import { ReadOnlyBadge } from "./read-only-badge";
import { SubjectLegend } from "./subject-legend";
import { TimetableGrid } from "./timetable-grid";
import { TimetableSkeleton } from "./timetable-skeleton";
import { hasAnySlot, subjectsUsed, toDataState } from "./timetable-view.derive";
import type {
  TimetableDataState,
  TimetableErrorKey,
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
};

export function TimetableView({
  viewerRole,
  initialState,
  childList = [],
  initialChildId,
  fetchChildTimetable,
}: TimetableViewProps) {
  const t = useTranslations("timetableView");
  const router = useRouter();
  const isParent = viewerRole === "parent";

  const [state, setState] = useState<TimetableDataState>(initialState);
  const [selectedChildId, setSelectedChildId] = useState(
    initialChildId ?? childList[0]?.childId ?? "",
  );
  const [weekOffset, setWeekOffset] = useState(0);
  const [isPending, startTransition] = useTransition();

  const showPicker = isParent && childList.length >= 2;

  const weekDates = useMemo(
    () => (isParent ? buildWeekDates(weekOffset) : undefined),
    [isParent, weekOffset],
  );

  const displayClassName =
    state.status === "success"
      ? state.timetable.className
      : (childList.find((c) => c.childId === selectedChildId)?.className ?? "");

  const runFetch = useCallback(
    (childId: string) => {
      if (!fetchChildTimetable) return;
      startTransition(async () => {
        const result = await fetchChildTimetable(childId);
        setState(toDataState(result));
      });
    },
    [fetchChildTimetable],
  );

  const onSelectChild = useCallback(
    (childId: string) => {
      if (childId === selectedChildId) return;
      setSelectedChildId(childId);
      runFetch(childId);
    },
    [selectedChildId, runFetch],
  );

  const onRetry = useCallback(() => {
    if (isParent && fetchChildTimetable) runFetch(selectedChildId);
    else router.refresh();
  }, [isParent, fetchChildTimetable, runFetch, selectedChildId, router]);

  const view: TimetableDataState = isPending ? { status: "loading" } : state;

  return (
    <main className="flex-1 overflow-y-auto bg-edu-bg px-4 py-6 sm:px-8">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-4">
        <Header
          isParent={isParent}
          weekOffset={weekOffset}
          weekDates={weekDates}
          displayClassName={displayClassName}
        />

        {isParent ? (
          <WeekNav
            weekOffset={weekOffset}
            weekDates={weekDates ?? []}
            onChange={setWeekOffset}
          />
        ) : (
          <ReadOnlySelectors />
        )}

        {showPicker && (
          <ChildPicker
            childList={childList}
            selectedChildId={selectedChildId}
            onSelect={onSelectChild}
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
                cellVariant="class"
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
  isParent,
  weekOffset,
  weekDates,
  displayClassName,
}: {
  isParent: boolean;
  weekOffset: number;
  weekDates?: readonly Date[];
  displayClassName: string;
}) {
  const t = useTranslations("timetableView");
  const range =
    weekDates && weekDates.length === 6
      ? formatRange(weekDates[0], weekDates[5])
      : "";

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="min-w-[240px] flex-1">
        <p className="font-bold text-[11px] text-edu-text-secondary uppercase tracking-wide">
          {t("eyebrow")}
        </p>
        <h1 className="mt-1 font-extrabold text-2xl text-edu-text-primary">
          {isParent && weekOffset === 0 ? t("titleThisWeek") : t("title")}
          {displayClassName && (
            <span className="ml-2 font-semibold text-base text-edu-text-secondary">
              · {t("classLabel", { className: displayClassName })}
            </span>
          )}
        </h1>
        <p className="mt-1 text-edu-text-secondary text-sm">
          {isParent ? t("subtitleParent", { range }) : t("subtitleStudent")}
        </p>
      </div>
      <ExportPdfButton />
    </div>
  );
}

function ExportPdfButton() {
  const t = useTranslations("timetableView");
  return (
    <Button
      variant="ghost"
      size="sm"
      className="motion-safe:transition-colors"
      onClick={() => toast(t("exportComingSoon"))}
    >
      <Download aria-hidden="true" />
      {t("exportPdf")}
    </Button>
  );
}

/* ── Student read-only selectors (decorative — no data reload) ──────────── */

function ReadOnlySelectors() {
  const t = useTranslations("timetableView");
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-edu-border bg-edu-card px-5 py-3.5 shadow-card">
      <ReadOnlyField label={t("academicYear")} value={t("yearValue")} />
      <ReadOnlyField label={t("semester")} value={t("semesterValue")} />
      <div className="flex-1" />
      <ReadOnlyBadge />
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[184px]">
      <div className="mb-1 font-bold text-[10px] text-edu-text-secondary uppercase tracking-wide">
        {label}
      </div>
      <div className="rounded-lg border border-edu-border bg-edu-card px-3 py-2 font-bold text-edu-text-primary text-sm">
        {value}
      </div>
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
