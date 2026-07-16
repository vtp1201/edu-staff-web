"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
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
import type { SubmitTarget } from "../../domain/use-cases/submit-column-scores.use-case";
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
  | "errorLocked"
  | "errorScaleNotConfigured"
  | "errorSchemeNotConfigured"
  | "errorColumnNotInScheme"
  | "errorStudentNotEnrolled"
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
  // US-E14.4 approval-pipeline failures are not reachable in grade-entry,
  // but the shared GradesFailure union now includes them.
  "not-pending-approval": "errorUnknown",
  "not-published": "errorUnknown",
  "invalid-revision-note": "errorUnknown",
  "batch-locked": "errorUnknown",
};

const TERMS = ["HK1", "HK2"] as const;

export interface GradeEntryScreenProps {
  vm: GradeEntryScreenVM;
  /** loading flag for the grade sheet (RSC-driven) */
  isLoading?: boolean;
  /** invoked when the teacher changes class-subject or term */
  onSelectionChange?: (next: {
    classId?: string;
    subjectId?: string;
    term?: string;
  }) => void;
}

export function GradeEntryScreen({
  vm,
  isLoading = false,
  onSelectionChange,
}: GradeEntryScreenProps) {
  const t = useTranslations("gradeEntry");
  const queryClient = useQueryClient();
  const [, startTransition] = useTransition();
  const [banner, setBanner] = useState<string | null>(null);

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
      return vm.saveScoreAction(vars.studentId, vars.columnId, vars.value);
    },
    onMutate: (vars) => {
      // Optimistic: patch the working copy + recompute the row average.
      const prev = sheet;
      if (sheet) {
        setSheet({
          ...sheet,
          rows: sheet.rows.map((r) => {
            if (r.studentId !== vars.studentId) return r;
            const nextScores = {
              ...r.scores,
              [vars.columnId]: { value: vars.value, status: "DRAFT" as const },
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
    return t(ERROR_KEY_MAP[key]);
  }

  const submitMutation = useMutation({
    mutationFn: async (targets: SubmitTarget[]) => {
      return vm.submitScoresAction(targets);
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

  return (
    <div className="flex flex-col gap-5 p-5">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-extrabold text-2xl text-foreground">
          {t("title")}
        </h1>
        {sheet ? (
          <Button
            type="button"
            onClick={handleSubmitAllDrafts}
            disabled={submitMutation.isPending || !hasAnyDraft}
          >
            {t("submitAllDraftsButton")}
          </Button>
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
        <GradeEntryTable
          columns={columns}
          rows={sheet.rows}
          maxScore={maxScore}
          onSaveScore={handleSaveScore}
          onSubmitCell={handleSubmitCell}
          onSubmitRow={handleSubmitRow}
        />
      )}
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
