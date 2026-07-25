"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarX, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import type { PublishConfirmErrorSlot } from "@/components/shared/publish-confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  StudentAbsenceEntity,
  StudentAbsenceKey,
} from "../../domain/entities/student-absence.entity";
import { studentAbsenceKeyOf } from "../../domain/entities/student-absence.entity";
import { isDuplicateAbsence } from "../../domain/use-cases/is-duplicate-absence";
import { isFutureDate } from "../../domain/use-cases/is-future-date";
import {
  SAAbsenceFormDialog,
  type SAAbsenceFormSubmitError,
} from "./sa-absence-form-dialog";
import { SAAbsenceRow } from "./sa-absence-row";
import { SADateField } from "./sa-date-field";
import { errorKeyOf, saStudentOf, useSAErrorMessage } from "./sa-error-message";
import { SAFlagConfirmDialog } from "./sa-flag-confirm-dialog";
import { SAListError } from "./sa-list-error";
import { SAListSkeleton } from "./sa-list-skeleton";
import { SAStatsRow } from "./sa-stats-row";
import type {
  StudentAbsencesErrorKey,
  StudentAbsencesScreenVM,
} from "./student-absences-screen.i-vm";
import {
  SA_LIST_QUERY_OPTIONS,
  studentAbsenceKeys,
} from "./student-absences-screen.query-keys";

/**
 * Student-absences screen — ONE role-conditional component serving BOTH
 * `/teacher/absences` and `/principal/absences` (ADR 0062, the `discipline-screen`
 * pattern). This story has ONE list / ONE query family, so this component is both
 * the orchestrator AND the only container (no tab split, unlike US-E09.5).
 *
 * Role split (structural, never "disabled"):
 *  - `teacher`  → own-class list + record CTA + per-row edit. NO flag action.
 *  - `principal`→ schoolwide/class-filtered list + per-row flag on `RECORDED`
 *    rows only. ZERO record/edit affordance anywhere in the tree (AC-006.5) —
 *    the CTA/edit branches are not rendered at all for this role.
 *
 * `flagAbsence` has NO optimistic update (AC-005.3 / NFR-008 pt.3): no
 * `onMutate` key exists on that mutation and `setQueryData` is never called
 * anywhere in this file. The flagged badge can only appear after the
 * `invalidateQueries` refetch settles.
 */
const ALL_CLASSES = "__all__";

export const SA_ALL_CLASSES_VALUE = ALL_CLASSES;

export type StudentAbsencesScreenProps = StudentAbsencesScreenVM;

interface EditTarget {
  key: StudentAbsenceKey;
  studentDisplay: string;
}

export function StudentAbsencesScreen(vm: StudentAbsencesScreenProps) {
  const t = useTranslations("studentAbsences");
  const tFilters = useTranslations("studentAbsences.filters");
  const tForm = useTranslations("studentAbsences.form");
  const tDiscipline = useTranslations("discipline.violations");
  const errorMessage = useSAErrorMessage();
  const queryClient = useQueryClient();

  /**
   * Narrowed views of the discriminated VM. Using consts (not a bare boolean)
   * keeps TypeScript's narrowing alive at every use site, so the record/edit
   * branches literally cannot compile for a principal and the flag branch cannot
   * compile for a teacher (AC-005.1/AC-006.5 as a type-level guarantee).
   */
  const teacherVm = vm.viewerRole === "teacher" ? vm : null;
  const principalVm = vm.viewerRole === "principal" ? vm : null;
  const isTeacher = teacherVm !== null;

  // --- filters (component state, feeding the query key — not URL params) ----
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [classFilter, setClassFilter] = useState<string>(ALL_CLASSES);

  const filter = useMemo(
    () => ({
      classId: teacherVm
        ? teacherVm.classId
        : classFilter === ALL_CLASSES
          ? undefined
          : classFilter,
      from: from || undefined,
      to: to || undefined,
    }),
    [teacherVm, classFilter, from, to],
  );

  // --- dialogs / local form state -------------------------------------------
  const [recordOpen, setRecordOpen] = useState(false);
  const [recordStudentId, setRecordStudentId] = useState("");
  const [recordDate, setRecordDate] = useState(vm.today);
  const [recordExcused, setRecordExcused] = useState(true);
  const [recordReason, setRecordReason] = useState("");
  const [recordError, setRecordError] = useState<
    SAAbsenceFormSubmitError | undefined
  >(undefined);
  /** Focus target for the client-side future-date rejection (AC-003.3). */
  const recordDateRef = useRef<HTMLInputElement>(null);

  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [editExcused, setEditExcused] = useState(true);
  const [editReason, setEditReason] = useState("");
  const [editInitial, setEditInitial] = useState({ excused: true, reason: "" });
  const [editError, setEditError] = useState<
    SAAbsenceFormSubmitError | undefined
  >(undefined);

  const [flagTarget, setFlagTarget] = useState<StudentAbsenceKey | null>(null);
  const [flagErrorKey, setFlagErrorKey] = useState<
    StudentAbsencesErrorKey | undefined
  >(undefined);

  // --- server state ---------------------------------------------------------
  /**
   * The filter the RSC actually fetched with. `initialData` is observer-scoped in
   * TanStack Query, NOT key-scoped: seeding it unconditionally would re-seed
   * EVERY changed filter with the first paint's rows, so a class/date-range
   * change would silently show stale data and never refetch (AC-002.2). Seed only
   * the initial key; every other filter is a genuinely cold fetch.
   */
  const [seededFilterKey] = useState(() => JSON.stringify(filter));
  const isSeededFilter = JSON.stringify(filter) === seededFilterKey;

  const query = useQuery({
    queryKey: studentAbsenceKeys.list(filter),
    queryFn: async () => {
      const res = await vm.listAbsencesAction(filter);
      if (!res.ok) throw { type: res.errorKey };
      return res.data;
    },
    // Seed only when the RSC fetch itself succeeded — error stays distinct from
    // an empty list (spec §5) — and only for the filter it fetched.
    initialData:
      vm.initialErrorKey || !isSeededFilter ? undefined : vm.initialAbsences,
    ...SA_LIST_QUERY_OPTIONS,
    retry: (count, error) => errorKeyOf(error) === "network-error" && count < 2,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: studentAbsenceKeys.lists() });

  const rows: StudentAbsenceEntity[] = query.data ?? [];

  const stats = useMemo(
    () => ({
      total: rows.length,
      unexcused: rows.filter((r) => !r.excused).length,
      flagged: rows.filter((r) => r.state === "FLAGGED_UNEXCUSED").length,
    }),
    [rows],
  );

  const listErrorKey: StudentAbsencesErrorKey | undefined = query.isError
    ? errorKeyOf(query.error)
    : vm.initialErrorKey && !query.isSuccess
      ? vm.initialErrorKey
      : undefined;

  // --- mutations ------------------------------------------------------------

  const recordMutation = useMutation({
    // No onMutate — a new row's server-assigned shape isn't known client-side.
    mutationFn: async () => {
      if (!teacherVm) throw { type: "forbidden" };
      const res = await teacherVm.recordAbsenceAction({
        classId: teacherVm.classId,
        studentMemberId: recordStudentId,
        date: recordDate,
        excused: recordExcused,
        reason: recordReason.trim() ? recordReason.trim() : undefined,
      });
      if (!res.ok) throw { type: res.errorKey };
      return res.data;
    },
    onSuccess: () => {
      setRecordError(undefined);
      setRecordOpen(false);
      setRecordReason("");
      // Announce the outcome (WCAG 4.1.3) — a closing dialog is not a status
      // message for a screen-reader user.
      toast.success(tForm("recordSuccess"));
      void invalidate();
    },
    onError: (error: unknown) => {
      // Dialog stays open, fields preserved (AC-003.8).
      const errorKey = errorKeyOf(error);
      setRecordError({ errorKey, message: errorMessage(errorKey) });
    },
  });

  const editMutation = useMutation({
    // No onMutate — the PATCH is partial and no AC demands perceived-instant edit.
    mutationFn: async () => {
      if (!editTarget || !teacherVm) throw { type: "invalid-input" };
      const res = await teacherVm.editAbsenceAction({
        ...editTarget.key,
        // ONLY the field(s) that actually changed (AC-004.2).
        ...(editExcused !== editInitial.excused
          ? { excused: editExcused }
          : {}),
        ...(editReason.trim() !== editInitial.reason
          ? { reason: editReason.trim() }
          : {}),
      });
      if (!res.ok) throw { type: res.errorKey };
      return res.data;
    },
    onSuccess: () => {
      setEditError(undefined);
      setEditTarget(null);
      toast.success(tForm("editSuccess"));
      void invalidate();
    },
    onError: (error: unknown) => {
      const errorKey = errorKeyOf(error);
      setEditError({ errorKey, message: errorMessage(errorKey) });
      // Server truth wins on a 404 race — reconcile the list (AC-004.5).
      if (errorKey === "not-found") void invalidate();
    },
  });

  /**
   * AC-005.3 / NFR-008 pt.3 — the hardest constraint in this story.
   * There is deliberately NO `onMutate` key here and NO `setQueryData` call
   * anywhere in this mutation's lifecycle: the returned entity is used only to
   * confirm the request resolved. The row's `state`/badges change ONLY after the
   * `invalidateQueries` refetch below settles.
   */
  const flagMutation = useMutation({
    mutationFn: async (key: StudentAbsenceKey) => {
      if (!principalVm) throw { type: "forbidden" };
      const res = await principalVm.flagAbsenceAction(key);
      if (!res.ok) throw { type: res.errorKey };
      return res.data;
    },
    onSuccess: () => {
      setFlagErrorKey(undefined);
      setFlagTarget(null);
      void invalidate();
    },
    onError: (error: unknown) => {
      const errorKey = errorKeyOf(error);
      if (errorKey === "not-found") {
        // Row already changed elsewhere (AC-005.7): server truth wins, so
        // reconcile and close instead of offering an inline retry. The failure is
        // still ANNOUNCED — closing silently would be indistinguishable from
        // success, which spec §"never a silent failure" forbids.
        setFlagTarget(null);
        setFlagErrorKey(undefined);
        toast.error(errorMessage("not-found"));
        void invalidate();
        return;
      }
      // Dialog stays open with an inline error; the cache is NOT touched, so the
      // row is byte-identical to before the click.
      setFlagErrorKey(errorKey);
    },
  });

  const flagErrorSlot: PublishConfirmErrorSlot | undefined = flagErrorKey
    ? {
        // A blocked failure can only fail again — confirm is force-disabled and
        // the only way out is Cancel. Only a transport failure is retryable.
        tone: flagErrorKey === "network-error" ? "transient" : "blocked",
        message: errorMessage(flagErrorKey),
      }
    : undefined;

  // --- record dialog helpers ------------------------------------------------

  const openRecordDialog = () => {
    setRecordError(undefined);
    setRecordStudentId(vm.roster[0]?.studentMemberId ?? "");
    setRecordDate(vm.today);
    setRecordExcused(true);
    setRecordReason("");
    setRecordOpen(true);
  };

  const submitRecord = () => {
    if (!teacherVm) return;
    const classId = teacherVm.classId;
    // Client-side guards, before any request (AC-003.3/AC-003.5). The server
    // re-checks both and renders the IDENTICAL error.
    if (isFutureDate(recordDate, vm.today)) {
      setRecordError({
        errorKey: "invalid-date",
        message: errorMessage("invalid-date"),
      });
      // AC-003.3 — the field the user must fix keeps focus, rather than leaving
      // it on the submit button next to an error the user has to hunt for.
      recordDateRef.current?.focus();
      return;
    }
    if (
      isDuplicateAbsence(
        { classId, studentMemberId: recordStudentId, date: recordDate },
        rows,
      )
    ) {
      setRecordError({
        errorKey: "duplicate-date",
        message: errorMessage("duplicate-date"),
      });
      return;
    }
    setRecordError(undefined);
    recordMutation.mutate();
  };

  const openEditDialog = (absence: StudentAbsenceEntity) => {
    setEditError(undefined);
    setEditTarget({
      key: {
        classId: absence.classId,
        studentMemberId: absence.studentMemberId,
        date: absence.date,
      },
      studentDisplay: saStudentOf(vm.roster, absence.studentMemberId).fullName,
    });
    setEditExcused(absence.excused);
    setEditReason(absence.reason ?? "");
    setEditInitial({ excused: absence.excused, reason: absence.reason ?? "" });
  };

  // --- render ---------------------------------------------------------------

  const body = () => {
    if (listErrorKey) {
      return (
        <SAListError
          message={errorMessage(listErrorKey)}
          onRetry={() => void query.refetch()}
        />
      );
    }
    if (query.isLoading) return <SAListSkeleton />;
    if (rows.length === 0) {
      return (
        <div className="rounded-[var(--edu-radius-card)] border border-border bg-card shadow-card">
          <EmptyState
            icon={CalendarX}
            title={t("empty")}
            // Teacher gets the CTA; the principal variant is STATIC with no CTA
            // at all — not a disabled one (AC-002.4).
            cta={
              isTeacher
                ? {
                    label: tForm("recordTitle"),
                    icon: Plus,
                    onClick: openRecordDialog,
                  }
                : undefined
            }
          />
        </div>
      );
    }
    return (
      <div
        data-slot="absences-list"
        className="divide-y divide-border overflow-hidden rounded-[var(--edu-radius-card)] border border-border bg-card shadow-card"
      >
        {rows.map((absence) => {
          const rowKey = studentAbsenceKeyOf(absence);
          const isFlagging =
            flagMutation.isPending &&
            flagMutation.variables !== undefined &&
            studentAbsenceKeyOf(flagMutation.variables) === rowKey;
          return (
            <SAAbsenceRow
              key={rowKey}
              absence={absence}
              student={saStudentOf(
                vm.roster,
                absence.studentMemberId,
                absence.classId,
              )}
              showClass={!isTeacher}
              canEdit={isTeacher}
              canFlag={!isTeacher && absence.state === "RECORDED"}
              isBusy={isFlagging}
              onEdit={() => openEditDialog(absence)}
              onFlag={() => {
                setFlagErrorKey(undefined);
                setFlagTarget({
                  classId: absence.classId,
                  studentMemberId: absence.studentMemberId,
                  date: absence.date,
                });
              }}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-[1160px] flex-col gap-5 px-4 py-5 sm:px-8 sm:py-7">
      <header>
        <h1 className="font-extrabold text-2xl text-foreground">
          {t("title")}
        </h1>
        <p className="mt-1 text-edu-text-secondary text-sm">{t("subtitle")}</p>
      </header>

      <SAStatsRow
        total={stats.total}
        unexcused={stats.unexcused}
        flagged={stats.flagged}
      />

      <div className="flex flex-wrap items-end gap-3 rounded-[var(--edu-radius-card)] border border-border bg-card p-4 shadow-card">
        {!isTeacher && (
          <div className="flex min-w-0 flex-col gap-1">
            <span
              className="font-bold text-edu-text-secondary text-xs uppercase tracking-wide"
              id="sa-class-filter-label"
            >
              {tFilters("class")}
            </span>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger
                className="min-h-11"
                aria-labelledby="sa-class-filter-label"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="pointer-events-auto">
                {/* "Tất cả lớp" — reused verbatim from the sibling conduct
                    namespace (`discipline.violations.allClasses`) rather than
                    inventing a new key; the same cross-namespace reuse pattern
                    `sd-error-message.ts` already established. */}
                <SelectItem value={ALL_CLASSES}>
                  {tDiscipline("allClasses")}
                </SelectItem>
                {(principalVm?.classOptions ?? []).map((option) => (
                  <SelectItem key={option.classId} value={option.classId}>
                    {option.className}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <SADateField
          label={tFilters("dateFrom")}
          value={from}
          onChange={setFrom}
          max={vm.today}
        />
        <SADateField
          label={tFilters("dateTo")}
          value={to}
          onChange={setTo}
          max={vm.today}
        />

        {isTeacher && (
          <Button
            type="button"
            onClick={openRecordDialog}
            className="ms-auto min-h-11"
          >
            <Plus className="size-4" aria-hidden="true" />
            {tForm("recordTitle")}
          </Button>
        )}
      </div>

      {body()}

      {/* Teacher-only dialogs — not rendered at all for a principal (AC-006.5). */}
      {teacherVm && (
        <>
          <SAAbsenceFormDialog
            mode="record"
            open={recordOpen}
            isSubmitting={recordMutation.isPending}
            roster={teacherVm.roster}
            studentMemberId={recordStudentId}
            onStudentChange={(value) => {
              setRecordStudentId(value);
              setRecordError(undefined);
            }}
            date={recordDate}
            onDateChange={(value) => {
              setRecordDate(value);
              setRecordError(undefined);
            }}
            today={vm.today}
            dateInputRef={recordDateRef}
            excused={recordExcused}
            onExcusedChange={setRecordExcused}
            reason={recordReason}
            onReasonChange={setRecordReason}
            submitError={recordError}
            onSubmit={submitRecord}
            onClose={() => {
              setRecordOpen(false);
              setRecordError(undefined);
            }}
          />

          {editTarget && (
            <SAAbsenceFormDialog
              mode="edit"
              open
              isSubmitting={editMutation.isPending}
              dateDisplay={editTarget.key.date}
              classDisplay={editTarget.key.classId}
              studentDisplay={editTarget.studentDisplay}
              excused={editExcused}
              onExcusedChange={setEditExcused}
              reason={editReason}
              onReasonChange={setEditReason}
              submitError={editError}
              onSubmit={() => editMutation.mutate()}
              onClose={() => {
                setEditTarget(null);
                setEditError(undefined);
              }}
            />
          )}
        </>
      )}

      {/* Principal-only: the ONLY path to the terminal transition (AC-005.2). */}
      {principalVm && (
        <SAFlagConfirmDialog
          open={flagTarget !== null}
          isLoading={flagMutation.isPending}
          errorSlot={flagErrorSlot}
          onConfirm={() => {
            if (flagTarget) flagMutation.mutate(flagTarget);
          }}
          onCancel={() => {
            setFlagTarget(null);
            setFlagErrorKey(undefined);
          }}
        />
      )}
    </div>
  );
}
