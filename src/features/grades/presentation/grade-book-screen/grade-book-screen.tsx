"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { GradeBookTable } from "@/components/shared/grade-book-table";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { GradesFailure } from "../../domain/failures/grades.failure";
import { RankDistributionChart } from "./components/rank-distribution-chart";
import type { GradeBookScreenVM } from "./grade-book-screen.i-vm";
import { GradeBookSkeleton } from "./grade-book-skeleton";

type ErrorMsgKey =
  | "errorNotFound"
  | "errorForbidden"
  | "errorNetworkError"
  | "errorUnknown";

const ERROR_KEY_MAP: Record<GradesFailure["type"], ErrorMsgKey> = {
  "not-found": "errorNotFound",
  forbidden: "errorForbidden",
  "score-out-of-range": "errorUnknown",
  "already-published": "errorUnknown",
  "incomplete-scores": "errorUnknown",
  "network-error": "errorNetworkError",
  unknown: "errorUnknown",
  "not-pending-approval": "errorUnknown",
  "not-published": "errorUnknown",
  "invalid-revision-note": "errorUnknown",
  "batch-locked": "errorUnknown",
};

const TERMS = ["HK1", "HK2"] as const;

export interface GradeBookScreenProps {
  vm: GradeBookScreenVM;
  isLoading?: boolean;
  /** invoked when the viewer changes class-subject or term (RSC re-fetch) */
  onSelectionChange?: (next: { csId?: string; term?: string }) => void;
  /** teacher CTA navigation (router-driven; stories omit it) */
  onEnterGrades?: (csId: string) => void;
  /** retry the current query (RSC refresh) */
  onRetry?: () => void;
}

export function GradeBookScreen({
  vm,
  isLoading = false,
  onSelectionChange,
  onEnterGrades,
  onRetry,
}: GradeBookScreenProps) {
  const t = useTranslations("gradeBook");
  const [, startTransition] = useTransition();

  const showSelectors =
    vm.role === "teacher" || vm.role === "principal" || vm.role === "admin";
  const needsSelection = showSelectors;
  const hasSelection = needsSelection
    ? Boolean(vm.selectedCsId && vm.selectedTerm)
    : Boolean(vm.selectedTerm);

  function changeSelection(next: { csId?: string; term?: string }) {
    startTransition(() => onSelectionChange?.(next));
  }

  return (
    <div className="flex flex-col gap-5 p-5">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-extrabold text-2xl text-foreground">
          {t("title")}
        </h1>
        {vm.role === "teacher" && vm.gradeEntryPath ? (
          <Button
            type="button"
            onClick={() => vm.selectedCsId && onEnterGrades?.(vm.selectedCsId)}
            disabled={!vm.selectedCsId}
          >
            {t("enterGradesCta")}
          </Button>
        ) : null}
      </header>

      {showSelectors ? (
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex min-w-52 flex-col gap-1.5">
            <Label htmlFor="gb-cs" className="text-xs">
              {t("selectClass")}
            </Label>
            <Select
              value={vm.selectedCsId ?? undefined}
              onValueChange={(v) => changeSelection({ csId: v })}
            >
              <SelectTrigger id="gb-cs">
                <SelectValue placeholder={t("selectClass")} />
              </SelectTrigger>
              <SelectContent>
                {vm.classSubjects.map((cs) => (
                  <SelectItem key={cs.id} value={cs.id}>
                    {cs.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex min-w-40 flex-col gap-1.5">
            <Label htmlFor="gb-term" className="text-xs">
              {t("selectTerm")}
            </Label>
            <Select
              value={vm.selectedTerm ?? undefined}
              onValueChange={(v) => changeSelection({ term: v })}
            >
              <SelectTrigger id="gb-term">
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
      ) : null}

      {isLoading ? (
        <GradeBookSkeleton />
      ) : !hasSelection ? (
        <EmptyState message={t("noSelection")} />
      ) : vm.error ? (
        <ErrorBanner message={t(ERROR_KEY_MAP[vm.error])} onRetry={onRetry} />
      ) : !vm.gradeBook ? (
        <EmptyState message={t("emptyState")} />
      ) : (
        <>
          <GradeBookTable
            gradeBook={vm.gradeBook}
            role={vm.role}
            isPublished={vm.isPublished}
            onEnterGrades={vm.role === "teacher" ? onEnterGrades : undefined}
          />
          {showSelectors && vm.gradeBook.rows.length > 0 ? (
            <RankDistributionChart rows={vm.gradeBook.rows} />
          ) : null}
        </>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center rounded-[12px] border border-border border-dashed bg-card p-8 text-center text-muted-foreground text-sm">
      {message}
    </div>
  );
}

function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  const t = useTranslations("gradeBook");
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 rounded-[12px] border border-edu-error border-dashed bg-edu-error-light p-8 text-center"
    >
      <p className="text-edu-error-text text-sm">{message}</p>
      {onRetry ? (
        <Button type="button" variant="outline" onClick={onRetry}>
          {t("retry")}
        </Button>
      ) : null}
    </div>
  );
}
