"use client";

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Download,
  Plus,
  Upload,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useId, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/shared/utils";
import { SlotEditorDialog, type SlotEditorTarget } from "./slot-editor-dialog";
import type {
  TimetableActions,
  TimetableScreenVM,
  TimetableSlotVM,
} from "./timetable-screen.i-vm";
import { findClass, TT_TEACHERS } from "./timetable-static";

const TEACHER_NAME_BY_ID: Record<string, string> = Object.fromEntries(
  TT_TEACHERS.map((tch) => [tch.id, tch.name]),
);

export interface TimetableScreenProps {
  vm: TimetableScreenVM;
  actions: TimetableActions;
  /**
   * Optional override for class/year selection (used by Storybook). When absent,
   * the screen updates the URL searchParams so the RSC page re-fetches.
   */
  onSelectClass?: (classId: string) => void;
  onSelectYear?: (yearId: string) => void;
}

const slotKeyOf = (classId: string, day: number, period: number) =>
  `${classId}|${day}|${period}`;

export function TimetableScreen({
  vm,
  actions,
  onSelectClass,
  onSelectYear,
}: TimetableScreenProps) {
  const t = useTranslations("timetable");
  const tErrors = useTranslations("timetable.errors");
  const locale = useLocale();
  const isEn = locale === "en";

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const navigate = useCallback(
    (param: "classId" | "yearId", value: string) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set(param, value);
      router.push(`${pathname}?${next.toString()}`);
    },
    [router, pathname, searchParams],
  );

  const selectClass = onSelectClass ?? ((id) => navigate("classId", id));
  const selectYear = onSelectYear ?? ((id) => navigate("yearId", id));

  const [editing, setEditing] = useState<SlotEditorTarget | null>(null);
  const [highlightKey, setHighlightKey] = useState<string | null>(null);
  const [jumpAnnounce, setJumpAnnounce] = useState("");
  const [saveError, setSaveError] = useState("");
  const [pending, startTransition] = useTransition();

  const yearSelectId = useId();
  const classSelectId = useId();

  const dayLabel = (idx: number) => {
    const d = vm.days[idx];
    return isEn ? d.en : d.vi;
  };

  const editingInitial = useMemo(() => {
    if (!editing) return null;
    const key = slotKeyOf(vm.classId, editing.day, editing.period);
    const s = vm.slots[key];
    return s
      ? { subjectId: s.subjectId, teacherId: s.teacherId, room: s.room }
      : null;
  }, [editing, vm.classId, vm.slots]);

  const handleSave = (data: {
    subjectId: string;
    teacherId: string;
    room: string;
  }) => {
    if (!editing) return;
    const { day, period } = editing;
    startTransition(async () => {
      const res = await actions.updateSlotAction(
        vm.classId,
        vm.yearId,
        day,
        period,
        data,
      );
      if (res.ok) {
        setSaveError("");
        setEditing(null);
      } else {
        const msg = tErrors(res.errorKey);
        toast.error(msg);
        setSaveError(msg);
      }
    });
  };

  const handleClear = () => {
    if (!editing) return;
    const { day, period } = editing;
    startTransition(async () => {
      const res = await actions.clearSlotAction(
        vm.classId,
        vm.yearId,
        day,
        period,
      );
      if (res.ok) {
        setEditing(null);
      } else {
        toast.error(tErrors(res.errorKey));
      }
    });
  };

  const jumpToConflict = (
    targetClassId: string,
    day: number,
    period: number,
  ) => {
    const key = slotKeyOf(targetClassId, day, period);
    if (targetClassId !== vm.classId) {
      selectClass(targetClassId);
    }
    setHighlightKey(key);
    window.setTimeout(() => {
      const cell = document.querySelector<HTMLElement>(
        `[data-slot-key="${CSS.escape(key)}"]`,
      );
      const btn = cell?.querySelector<HTMLButtonElement>("button") ?? null;
      cell?.scrollIntoView({ behavior: "smooth", block: "center" });
      btn?.focus();
      setJumpAnnounce(t("conflicts.jumpedTo"));
      window.setTimeout(() => setJumpAnnounce(""), 1000);
    }, 60);
  };

  const className = findClass(vm.classId)?.name ?? vm.classId;
  const classConflictCount = vm.conflictSlotKeys.size;

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-4 p-6 lg:p-8">
      {/* Page header */}
      <header className="flex flex-wrap items-end gap-4">
        <div className="min-w-60 flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {t("title")}
          </p>
          <h1 className="mt-1 text-2xl font-extrabold text-foreground">
            {t("titleForClass", { class: className })}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        {classConflictCount > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-edu-error/15 px-3 py-1 text-xs font-bold text-edu-error-text">
            <AlertTriangle className="size-3.5" aria-hidden />
            {t("classConflictCount", { count: classConflictCount })}
          </span>
        )}
      </header>

      {/* Top bar: selectors + export/import */}
      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-border bg-card p-4 shadow-card">
        <div className="flex flex-col gap-1">
          <Label
            htmlFor={yearSelectId}
            className="text-[10px] font-bold uppercase tracking-wide text-foreground"
          >
            {t("yearLabel")}
          </Label>
          <Select value={vm.yearId} onValueChange={selectYear}>
            <SelectTrigger id={yearSelectId} className="min-w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {vm.years.map((y) => (
                <SelectItem key={y.id} value={y.id}>
                  {y.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label
            htmlFor={classSelectId}
            className="text-[10px] font-bold uppercase tracking-wide text-foreground"
          >
            {t("classLabel")}
          </Label>
          <Select value={vm.classId} onValueChange={selectClass}>
            <SelectTrigger id={classSelectId} className="min-w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {vm.classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => toast.info(t("exportPdfToast"))}
        >
          <Download className="size-4" aria-hidden />
          {t("exportPdf")}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => toast.info(t("importTimetableToast"))}
        >
          <Upload className="size-4" aria-hidden />
          {t("importTimetable")}
        </Button>
      </div>

      {/* Weekly grid */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        {/* biome-ignore lint/a11y/useSemanticElements: a scrollable labelled region intentionally stays a div to avoid an extra <section> landmark */}
        <div
          className="overflow-x-auto"
          role="region"
          // biome-ignore lint/a11y/noNoninteractiveTabindex: scrollable region must be keyboard-focusable so keyboard users can pan it (WCAG 2.1.1)
          tabIndex={0}
          aria-label={t("gridScrollHint")}
        >
          <table className="w-full min-w-[920px] border-separate border-spacing-1 p-3">
            <caption className="sr-only">
              {t("titleForClass", { class: className })}
            </caption>
            <thead>
              <tr>
                <th className="w-24 px-3 py-2 text-left text-xs font-bold text-foreground">
                  <span className="sr-only">{t("periodColHeader")}</span>
                </th>
                {vm.days.map((_, di) => (
                  <th
                    // biome-ignore lint/suspicious/noArrayIndexKey: days are a fixed ordered set
                    key={di}
                    scope="col"
                    className="px-3 py-2 text-left text-xs font-extrabold text-foreground"
                  >
                    {dayLabel(di)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vm.periods.map((p) => {
                if ("recess" in p) {
                  return (
                    <tr key="recess">
                      <td
                        colSpan={vm.days.length + 1}
                        className="rounded-md border border-dashed border-border bg-muted px-3 py-2 text-center text-[11px] font-bold uppercase tracking-widest text-foreground"
                      >
                        {t("recessLabel")}
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={`p-${p.n}`}>
                    <th
                      scope="row"
                      className="w-24 border-r border-border px-2.5 py-1.5 text-left align-top"
                    >
                      <div className="text-xs font-extrabold text-foreground">
                        {t("periodN", { n: p.n })}
                      </div>
                      <div className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">
                        {p.start} – {p.end}
                      </div>
                    </th>
                    {vm.days.map((_, di) => {
                      const key = slotKeyOf(vm.classId, di, p.n);
                      const slot = vm.slots[key];
                      return (
                        <td
                          // biome-ignore lint/suspicious/noArrayIndexKey: day column index is stable
                          key={di}
                          data-slot-key={key}
                          className="min-w-30 align-stretch"
                        >
                          <SlotCell
                            slot={slot}
                            highlighted={highlightKey === key}
                            addLabel={t("addSlot")}
                            onClick={() => setEditing({ day: di, period: p.n })}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Conflict summary */}
      <ConflictSummary vm={vm} dayLabel={dayLabel} onJump={jumpToConflict} />

      <SlotEditorDialog
        open={editing !== null}
        onOpenChange={(o) => {
          if (!o) {
            setEditing(null);
            setSaveError("");
          }
        }}
        classId={vm.classId}
        target={editing}
        initial={editingInitial}
        dayLabel={editing ? dayLabel(editing.day) : ""}
        conflicts={vm.conflicts}
        submitting={pending}
        errorMsg={saveError}
        onSave={handleSave}
        onClear={handleClear}
      />

      <div role="status" aria-live="polite" className="sr-only">
        {jumpAnnounce}
      </div>
    </main>
  );
}

function SlotCell({
  slot,
  highlighted,
  addLabel,
  onClick,
}: {
  slot: TimetableSlotVM | undefined;
  highlighted: boolean;
  addLabel: string;
  onClick: () => void;
}) {
  if (!slot) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex min-h-[76px] w-full items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-background text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
      >
        <Plus className="size-3.5" aria-hidden />
        <span className="text-xs font-semibold">{addLabel}</span>
      </button>
    );
  }

  const conflict = slot.hasConflict;
  return (
    <button
      type="button"
      onClick={onClick}
      style={
        conflict
          ? undefined
          : {
              backgroundColor: `${slot.subjectColor}26`,
              borderLeftColor: slot.subjectColor,
            }
      }
      className={cn(
        "relative min-h-[76px] w-full rounded-lg border-l-[3px] px-2.5 py-2 text-left transition-shadow",
        conflict
          ? "border-l-edu-error-text bg-edu-error/15 ring-1 ring-edu-error-text/40"
          : "",
        highlighted && "outline outline-2 outline-edu-warning",
      )}
    >
      <div
        className={cn(
          "pr-4 text-xs font-bold leading-tight",
          conflict ? "text-edu-error-text" : "text-foreground",
        )}
      >
        {slot.subjectShort}
      </div>
      <div className="truncate pr-4 text-[10.5px] leading-snug text-muted-foreground">
        {slot.teacherName}
      </div>
      {slot.room && (
        <div className="text-[10.5px] tabular-nums leading-snug text-muted-foreground">
          {slot.room}
        </div>
      )}
      {conflict && (
        <AlertTriangle
          className="absolute right-1.5 top-1.5 size-3 text-edu-error-text"
          aria-hidden
        />
      )}
    </button>
  );
}

function ConflictSummary({
  vm,
  dayLabel,
  onJump,
}: {
  vm: TimetableScreenVM;
  dayLabel: (idx: number) => string;
  onJump: (classId: string, day: number, period: number) => void;
}) {
  const t = useTranslations("timetable");
  const tConf = useTranslations("timetable.conflicts");
  const hasConflicts = vm.conflicts.length > 0;

  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border bg-card shadow-card",
        hasConflicts ? "border-edu-error-text/40" : "border-border",
      )}
      aria-label={tConf("title")}
    >
      <div
        className={cn(
          "flex items-center gap-3 px-5 py-3.5",
          hasConflicts ? "bg-edu-error/10" : "bg-muted",
        )}
      >
        <span
          className={cn(
            "flex size-8 items-center justify-center rounded-lg",
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
          <p
            className={cn(
              "text-sm font-extrabold",
              hasConflicts ? "text-edu-error-text" : "text-edu-success-text",
            )}
          >
            {hasConflicts
              ? tConf("count", { count: vm.conflicts.length })
              : tConf("noConflicts")}
          </p>
          <p className="text-xs text-muted-foreground">
            {hasConflicts ? tConf("hint") : tConf("validHint")}
          </p>
        </div>
      </div>
      {hasConflicts && (
        <ul className="divide-y divide-border border-t border-border">
          {[...vm.conflicts]
            .sort(
              (a, b) =>
                a.day - b.day ||
                a.period - b.period ||
                a.teacherId.localeCompare(b.teacherId),
            )
            .map((c, i) => {
              const teacher = findTeacherName(c.teacherId);
              const otherClasses = c.classIds
                .filter((id) => id !== vm.classId)
                .map((id) => findClass(id)?.name ?? id)
                .join(", ");
              const targetClass = c.classIds.includes(vm.classId)
                ? vm.classId
                : c.classIds[0];
              return (
                <li key={`${c.teacherId}-${c.day}-${c.period}`}>
                  <button
                    type="button"
                    onClick={() => onJump(targetClass, c.day, c.period)}
                    className="flex w-full items-start gap-3 px-5 py-3 text-left transition-colors hover:bg-edu-error/10"
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-edu-error/15 text-[11px] font-extrabold text-edu-error-text">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 flex-1 text-xs leading-relaxed text-foreground">
                      <span className="font-extrabold">{teacher}</span>{" "}
                      <span className="text-muted-foreground">—</span>{" "}
                      <span className="font-bold">{dayLabel(c.day)}</span>{" "}
                      <span className="text-muted-foreground">—</span>{" "}
                      <span className="font-bold">
                        {t("periodN", { n: c.period })}
                      </span>
                      {": "}
                      <span className="font-bold text-edu-error-text">
                        {tConf("conflictsWith", { classes: otherClasses })}
                      </span>
                    </span>
                    <span className="flex items-center gap-1 text-xs font-bold text-primary">
                      {tConf("resolve")}
                      <ArrowRight className="size-3.5" aria-hidden />
                    </span>
                  </button>
                </li>
              );
            })}
        </ul>
      )}
    </section>
  );
}

function findTeacherName(teacherId: string): string {
  return TEACHER_NAME_BY_ID[teacherId] ?? teacherId;
}
