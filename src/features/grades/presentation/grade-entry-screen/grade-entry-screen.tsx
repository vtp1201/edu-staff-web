"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { ReasonConfirmDialog } from "@/components/shared/reason-confirm-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { GradeSheet } from "../../domain/entities/grade-sheet.entity";
import type { GradesFailure } from "../../domain/failures/grades.failure";
import { calculateWeightedAverage } from "../../domain/use-cases/calculate-weighted-average.use-case";
import { MAX_REJECTION_REASON_LENGTH } from "../../domain/use-cases/reject-column-entry.use-case";
import type { SubmitTarget } from "../../domain/use-cases/submit-column-scores.use-case";
import { LockTermControl } from "../components/lock-term-control";
import { RankDistributionChart } from "../components/rank-distribution-chart";
import type {
  ActionResult,
  GradeEntryScreenVM,
} from "./grade-entry-screen.i-vm";
import { GradeEntrySkeleton } from "./grade-entry-skeleton";
import { GradeEntryTable } from "./grade-entry-table";

type ErrorMsgKey =
  | "errorOutOfRange"
  | "errorForbidden"
  | "errorTeacherNotAssigned"
  | "errorNotDraft"
  | "errorNotPendingApproval"
  | "errorLocked"
  | "errorScaleNotConfigured"
  | "errorSchemeNotConfigured"
  | "errorColumnNotInScheme"
  | "errorStudentNotEnrolled"
  | "errorRejectionReasonRequired"
  | "errorRejectionReasonTooLong"
  | "errorNetworkError"
  | "errorUnknown";

const ERROR_KEY_MAP: Record<GradesFailure["type"], ErrorMsgKey> = {
  "not-found": "errorUnknown",
  forbidden: "errorForbidden",
  "teacher-not-assigned": "errorTeacherNotAssigned",
  "invalid-value": "errorOutOfRange",
  "not-draft": "errorNotDraft",
  locked: "errorLocked",
  "scale-not-configured": "errorScaleNotConfigured",
  "scheme-not-configured": "errorSchemeNotConfigured",
  "column-not-in-scheme": "errorColumnNotInScheme",
  "student-not-enrolled": "errorStudentNotEnrolled",
  "network-error": "errorNetworkError",
  unknown: "errorUnknown",
  // US-E18.44 — per-cell reject (ADMIN/MANAGER) failures.
  "not-pending-approval": "errorNotPendingApproval",
  "rejection-reason-required": "errorRejectionReasonRequired",
  "rejection-reason-too-long": "errorRejectionReasonTooLong",
  "not-published": "errorUnknown",
  "invalid-revision-note": "errorUnknown",
  "batch-locked": "errorUnknown",
};

const TERMS = ["HK1", "HK2"] as const;

export interface GradeEntryScreenProps {
  vm: GradeEntryScreenVM;
  /** loading flag for the grade sheet (RSC-driven) */
  isLoading?: boolean;
  /** invoked when the viewer changes class-subject or term */
  onSelectionChange?: (next: {
    classId?: string;
    subjectId?: string;
    term?: string;
  }) => void;
}

/**
 * The staff grade sheet. ONE screen, TWO role-discriminated modes (US-E18.44):
 *
 * - `viewerRole: "teacher"` (`/teacher/grades`) — enter + submit scores, never
 *   reject.
 * - `viewerRole: "approver"` (`/principal/grade-book`, `/admin/grade-book`) —
 *   read the roster, reject a `PENDING_APPROVAL` cell with a reason, and lock
 *   the term. Structurally CANNOT edit a score: the approver VM has no
 *   save/submit action, so the table renders read-only cells.
 *
 * Both modes read the STAFF sheet (`GradeSheet`/`StaffGradeCell`), which is the
 * only read shape that can carry a rejection — the student-self/parent-linked
 * path stays on the narrower `GradeBook`/`GradeCell` and is untouched here.
 */

export function GradeEntryScreen({
  vm,
  isLoading = false,
  onSelectionChange,
}: GradeEntryScreenProps) {
  const t = useTranslations("gradeEntry");
  // The term-lock + rank-distribution surfaces keep their original `gradeBook`
  // copy (they moved screens in US-E18.44, they did not change meaning) — no
  // duplicate keys were minted.
  const tGradeBook = useTranslations("gradeBook");
  const queryClient = useQueryClient();
  const [, startTransition] = useTransition();
  const [banner, setBanner] = useState<string | null>(null);
  // Narrowed capability handles — consts, not booleans, so every affordance is
  // gated on the actual action it needs (and TS proves the other mode's actions
  // are not even in scope).
  const teacherVM = vm.viewerRole === "teacher" ? vm : null;
  const approverVM = vm.viewerRole === "approver" ? vm : null;
  // A11Y-101: per-cell submit failures, keyed `${studentId}:${columnId}` →
  // the failure type — surfaced directly on the offending cell (aria-invalid
  // + message), not just aggregated into the banner, so a partial-failure
  // outcome tells the user exactly which cells to retry and why.
  const [failedCells, setFailedCells] = useState<
    Map<string, GradesFailure["type"]>
  >(new Map());

  function cellKey(studentId: string, columnId: string): string {
    return `${studentId}:${columnId}`;
  }

  // US-E18.44 — the cell whose reject dialog is open (null = dialog closed).
  // Identity only: the dialog's copy is generic, so the target's display labels
  // are deliberately NOT duplicated into state (they live on the sheet row).
  const [rejectTarget, setRejectTarget] = useState<{
    studentId: string;
    columnId: string;
  } | null>(null);
  const [rejectError, setRejectError] = useState<GradesFailure["type"] | null>(
    null,
  );

  // Local working copy of the sheet so optimistic edits render immediately.
  const [sheet, setSheet] = useState<GradeSheet | null>(vm.sheet);
  // Keep local copy in sync when RSC delivers a new sheet (selection changed).
  const sheetKey = `${vm.selectedClassId}|${vm.selectedSubjectId}|${vm.selectedTerm}|${vm.sheet?.rows.length}`;
  const [syncKey, setSyncKey] = useState(sheetKey);
  if (syncKey !== sheetKey) {
    setSyncKey(sheetKey);
    setSheet(vm.sheet);
  }

  const maxScore = 10;
  const columns = sheet?.scheme.columns ?? [];

  const saveMutation = useMutation({
    mutationFn: async (vars: {
      studentId: string;
      columnId: string;
      value: number;
    }): Promise<ActionResult> => {
      // Unreachable for an approver — the table renders no input without the
      // save capability. Fails closed rather than throwing.
      if (!teacherVM) return { ok: false, errorKey: "forbidden" };
      return teacherVM.saveScoreAction(
        vars.studentId,
        vars.columnId,
        vars.value,
      );
    },
    onMutate: (vars) => {
      // Editing a cell again clears any prior failed-submit indicator on it.
      setFailedCells((prevFailed) => {
        const key = cellKey(vars.studentId, vars.columnId);
        if (!prevFailed.has(key)) return prevFailed;
        const next = new Map(prevFailed);
        next.delete(key);
        return next;
      });
      // Optimistic: patch the working copy + recompute the row average.
      const prev = sheet;
      if (sheet) {
        setSheet({
          ...sheet,
          rows: sheet.rows.map((r) => {
            if (r.studentId !== vars.studentId) return r;
            const nextScores = {
              ...r.scores,
              [vars.columnId]: {
                // Keep any rejection payload — BE does not clear it on edit,
                // so the "why this came back" indicator must not blink away.
                ...r.scores[vars.columnId],
                value: vars.value,
                status: "DRAFT" as const,
              },
            };
            const values: Record<string, number | null> = {};
            for (const [colId, c] of Object.entries(nextScores))
              values[colId] = c.value;
            return {
              ...r,
              scores: nextScores,
              average: calculateWeightedAverage(values, columns),
            };
          }),
        });
      }
      return { prev };
    },
    onSuccess: (result, _vars, ctx) => {
      if (result.ok) {
        setBanner(t("saveSuccess"));
      } else {
        if (ctx?.prev) setSheet(ctx.prev); // rollback failed save
        setBanner(errorMessage(result.errorKey));
      }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) setSheet(ctx.prev); // rollback
      setBanner(t("errorNetworkError"));
    },
  });

  function errorMessage(key: GradesFailure["type"]): string {
    if (key === "invalid-value") {
      return t("errorOutOfRange", { max: maxScore });
    }
    if (key === "rejection-reason-too-long") {
      return t("errorRejectionReasonTooLong", {
        max: MAX_REJECTION_REASON_LENGTH,
      });
    }
    return t(ERROR_KEY_MAP[key]);
  }

  const submitMutation = useMutation({
    mutationFn: async (targets: SubmitTarget[]) => {
      // Unreachable for an approver — no submit affordance is rendered without
      // the capability. Fails closed.
      if (!teacherVM) {
        return { ok: false as const, errorKey: "forbidden" as const };
      }
      return teacherVM.submitScoresAction(targets);
    },
    onSuccess: (result) => {
      if (!result) {
        setBanner(t("errorUnknown"));
        return;
      }
      if (!result.ok) {
        setBanner(errorMessage(result.errorKey));
        return;
      }
      const { submitted, failed } = result.result;
      const total = submitted.length + failed.length;
      // A11Y-101: replace the failed-cell set with exactly this attempt's
      // failures — succeeded targets (this attempt or a prior one) are
      // implicitly cleared since they're no longer in the new set.
      setFailedCells(
        new Map(
          failed.map((f) => [
            cellKey(f.target.studentId, f.target.columnId),
            f.failure.type,
          ]),
        ),
      );
      if (failed.length === 0) {
        setBanner(t("submitSuccess", { count: submitted.length }));
      } else if (submitted.length > 0) {
        setBanner(
          t("submitPartialFailure", {
            submitted: submitted.length,
            total,
            failed: failed.length,
          }),
        );
      } else {
        setBanner(t("submitFullFailure", { failed: failed.length }));
      }
      // Server-authoritative — never trust a client-side guess about which
      // cells actually landed. Re-fetch the sheet (US-E18.12, ADR 0054 §2.2).
      queryClient.invalidateQueries({ queryKey: ["grades"] });
      startTransition(() => onSelectionChange?.({}));
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (vars: {
      studentId: string;
      columnId: string;
      reason: string;
    }): Promise<ActionResult> => {
      // Unreachable unless the viewer has the capability — the dialog can only
      // open from a control that is not rendered outside approver mode.
      if (!approverVM) {
        return { ok: false, errorKey: "forbidden" };
      }
      return approverVM.rejectEntryAction(
        vars.studentId,
        vars.columnId,
        vars.reason,
      );
    },
    onSuccess: (result) => {
      if (!result.ok) {
        // Keep the dialog open with the reason intact so the approver can retry.
        setRejectError(result.errorKey);
        return;
      }
      setRejectError(null);
      setRejectTarget(null);
      setBanner(t("rejectSuccess"));
      // Server-authoritative: re-read the sheet rather than guessing the new
      // cell state (same rule as submit).
      queryClient.invalidateQueries({ queryKey: ["grades"] });
      startTransition(() => onSelectionChange?.({}));
    },
    onError: () => {
      setRejectError("network-error");
    },
  });

  function handleRejectCell(studentId: string, columnId: string) {
    setRejectError(null);
    setRejectTarget({ studentId, columnId });
  }

  function handleRejectConfirm(reason: string) {
    if (!rejectTarget) return;
    rejectMutation.mutate({ ...rejectTarget, reason });
  }

  async function handleSaveScore(
    studentId: string,
    columnId: string,
    value: number,
  ): Promise<{ ok: boolean }> {
    const result = await saveMutation.mutateAsync({
      studentId,
      columnId,
      value,
    });
    return { ok: result.ok };
  }

  function handleSubmitCell(studentId: string, columnId: string) {
    submitMutation.mutate([{ studentId, columnId }]);
  }

  function handleSubmitRow(studentId: string) {
    if (!sheet) return;
    const row = sheet.rows.find((r) => r.studentId === studentId);
    if (!row) return;
    const targets: SubmitTarget[] = Object.entries(row.scores)
      .filter(([, cell]) => cell.status === "DRAFT" && cell.value !== null)
      .map(([columnId]) => ({ studentId, columnId }));
    if (targets.length > 0) submitMutation.mutate(targets);
  }

  function handleSubmitAllDrafts() {
    if (!sheet) return;
    const targets: SubmitTarget[] = [];
    for (const row of sheet.rows) {
      for (const [columnId, cell] of Object.entries(row.scores)) {
        if (cell.status === "DRAFT" && cell.value !== null) {
          targets.push({ studentId: row.studentId, columnId });
        }
      }
    }
    if (targets.length > 0) submitMutation.mutate(targets);
  }

  function changeSelection(next: {
    classId?: string;
    subjectId?: string;
    term?: string;
  }) {
    setBanner(null);
    startTransition(() => onSelectionChange?.(next));
  }

  const hasSelection = Boolean(
    vm.selectedClassId && vm.selectedSubjectId && vm.selectedTerm,
  );
  const hasAnyDraft =
    sheet?.rows.some((r) =>
      Object.values(r.scores).some(
        (c) => c.status === "DRAFT" && c.value !== null,
      ),
    ) ?? false;
  // Only a PUBLISHED cell is lockable (US-E18.12, ADR 0054 §4).
  const hasPublishedCell =
    sheet?.rows.some((r) =>
      Object.values(r.scores).some((c) => c.status === "PUBLISHED"),
    ) ?? false;

  return (
    <div className="flex flex-col gap-5 p-5">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-extrabold text-2xl text-foreground">
          {approverVM ? t("titleApprover") : t("title")}
        </h1>
        {teacherVM && sheet ? (
          <Button
            type="button"
            onClick={handleSubmitAllDrafts}
            disabled={submitMutation.isPending || !hasAnyDraft}
          >
            {t("submitAllDraftsButton")}
          </Button>
        ) : null}
        {approverVM?.lockTermAction ? (
          <LockTermControl
            action={approverVM.lockTermAction}
            enabled={hasSelection && hasPublishedCell}
            context={{
              className: approverVM.classLabel,
              subjectName: approverVM.subjectLabel,
              term: approverVM.selectedTerm ?? "",
            }}
            onLocked={(count) => {
              setBanner(tGradeBook("lockTermSuccess", { count }));
              startTransition(() => onSelectionChange?.({}));
            }}
          />
        ) : null}
      </header>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex min-w-52 flex-col gap-1.5">
          <Label htmlFor="grade-cs" className="text-xs">
            {t("selectClass")}
          </Label>
          <Select
            value={
              vm.selectedClassId && vm.selectedSubjectId
                ? `${vm.selectedClassId}:${vm.selectedSubjectId}`
                : undefined
            }
            onValueChange={(v) => {
              const [classId, subjectId] = v.split(":");
              changeSelection({ classId, subjectId });
            }}
          >
            <SelectTrigger id="grade-cs">
              <SelectValue placeholder={t("selectClass")} />
            </SelectTrigger>
            <SelectContent>
              {vm.classSubjects.map((cs) => (
                <SelectItem
                  key={`${cs.classId}:${cs.subjectId}`}
                  value={`${cs.classId}:${cs.subjectId}`}
                >
                  {cs.className} — {cs.subjectName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex min-w-40 flex-col gap-1.5">
          <Label htmlFor="grade-term" className="text-xs">
            {t("selectTerm")}
          </Label>
          <Select
            value={vm.selectedTerm ?? undefined}
            onValueChange={(v) => changeSelection({ term: v })}
          >
            <SelectTrigger id="grade-term">
              <SelectValue placeholder={t("selectTerm")} />
            </SelectTrigger>
            <SelectContent>
              {TERMS.map((term) => (
                <SelectItem key={term} value={term}>
                  {term === "HK1" ? t("termHK1") : t("termHK2")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {banner ? (
        <p
          className="rounded-[8px] bg-muted px-4 py-2 text-foreground text-sm"
          role="status"
        >
          {banner}
        </p>
      ) : null}

      {isLoading ? (
        <GradeEntrySkeleton />
      ) : !hasSelection ? (
        <EmptyState message={t("noSelection")} />
      ) : vm.error ? (
        <EmptyState message={errorMessage(vm.error)} />
      ) : !sheet ? (
        <EmptyState message={t("noSelection")} />
      ) : sheet.rows.length === 0 ? (
        <EmptyState message={t("emptyClass")} />
      ) : (
        <>
          <GradeEntryTable
            columns={columns}
            rows={sheet.rows}
            maxScore={maxScore}
            getFailureMessage={errorMessage}
            // Capability-as-presence: an approver's VM has no save/submit
            // action, so the table renders read-only cells and no submit
            // affordance at all.
            failedCells={teacherVM ? failedCells : undefined}
            onSaveScore={teacherVM ? handleSaveScore : undefined}
            onSubmitCell={teacherVM ? handleSubmitCell : undefined}
            onSubmitRow={teacherVM ? handleSubmitRow : undefined}
            onRejectCell={approverVM ? handleRejectCell : undefined}
          />
          {/* Five-band rank distribution (US-E13.6 AC) — the roster-wide read
              the principal/admin grade view has always shown. */}
          {approverVM ? <RankDistributionChart rows={sheet.rows} /> : null}
        </>
      )}
      {approverVM ? (
        <ReasonConfirmDialog
          open={rejectTarget !== null}
          title={t("rejectDialogTitle")}
          description={t("rejectDialogDescription")}
          reasonLabel={t("rejectReasonLabel")}
          reasonPlaceholder={t("rejectReasonPlaceholder")}
          confirmLabel={t("rejectConfirm")}
          maxLength={MAX_REJECTION_REASON_LENGTH}
          requiredMessage={t("errorRejectionReasonRequired")}
          tooLongMessage={t("errorRejectionReasonTooLong", {
            max: MAX_REJECTION_REASON_LENGTH,
          })}
          formatCounter={(count) =>
            t("rejectReasonCounter", {
              count,
              max: MAX_REJECTION_REASON_LENGTH,
            })
          }
          isPending={rejectMutation.isPending}
          errorMessage={rejectError ? errorMessage(rejectError) : null}
          onConfirm={handleRejectConfirm}
          onOpenChange={(open) => {
            if (!open) {
              setRejectTarget(null);
              setRejectError(null);
            }
          }}
        />
      ) : null}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center rounded-card border border-border border-dashed bg-card p-8 text-center text-muted-foreground text-sm">
      {message}
    </div>
  );
}
