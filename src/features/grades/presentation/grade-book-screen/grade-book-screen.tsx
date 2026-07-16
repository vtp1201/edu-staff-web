"use client";

import { FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import {
  DestructiveConfirmDialog,
  type DestructiveConfirmErrorSlot,
} from "@/components/shared/destructive-confirm-dialog";
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
import { ChildSwitcher } from "../child-switcher/child-switcher";
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
  "teacher-not-assigned": "errorForbidden",
  "invalid-value": "errorUnknown",
  "not-draft": "errorUnknown",
  locked: "errorUnknown",
  "scale-not-configured": "errorUnknown",
  "scheme-not-configured": "errorUnknown",
  "column-not-in-scheme": "errorUnknown",
  "student-not-enrolled": "errorUnknown",
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
  onSelectionChange?: (next: {
    classId?: string;
    subjectId?: string;
    term?: string;
  }) => void;
  /** teacher CTA navigation (router-driven; stories omit it) */
  onEnterGrades?: (classId: string, subjectId: string) => void;
  /** retry the current query (RSC refresh) */
  onRetry?: () => void;
  /** parent only — called when a different child tab is clicked */
  onChildSwitch?: (childId: string) => void;
}

export function GradeBookScreen({
  vm,
  isLoading = false,
  onSelectionChange,
  onEnterGrades,
  onRetry,
  onChildSwitch,
}: GradeBookScreenProps) {
  const t = useTranslations("gradeBook");
  const [, startTransition] = useTransition();
  const [lockDialogOpen, setLockDialogOpen] = useState(false);
  const [lockPending, setLockPending] = useState(false);
  const [lockBanner, setLockBanner] = useState<string | null>(null);
  const [lockErrorKey, setLockErrorKey] = useState<
    GradesFailure["type"] | null
  >(null);

  const showSelectors =
    vm.role === "teacher" || vm.role === "principal" || vm.role === "admin";
  const needsSelection = showSelectors;
  const hasSelection = needsSelection
    ? Boolean(vm.selectedClassId && vm.selectedSubjectId && vm.selectedTerm)
    : Boolean(vm.selectedTerm);

  // parent-only child switcher: only shown when ≥2 children are linked.
  const showChildSwitcher =
    vm.role === "parent" &&
    Boolean(vm.childrenList) &&
    (vm.childrenList?.length ?? 0) >= 2;
  const resolvedActiveChildId =
    vm.activeChildId ?? vm.childrenList?.[0]?.childId;

  // the grade table region is a tabpanel only when the switcher is shown.
  const panelProps =
    showChildSwitcher && resolvedActiveChildId
      ? ({
          role: "tabpanel",
          id: `tabpanel-${resolvedActiveChildId}`,
          "aria-labelledby": `tab-${resolvedActiveChildId}`,
        } as const)
      : {};

  function changeSelection(next: {
    classId?: string;
    subjectId?: string;
    term?: string;
  }) {
    startTransition(() => onSelectionChange?.(next));
  }

  const hasPublishedCell =
    vm.gradeBook?.rows.some((r) =>
      Object.values(r.scores).some((c) => c.status === "PUBLISHED"),
    ) ?? false;

  const canLockTerm =
    Boolean(vm.lockTermAction) &&
    Boolean(vm.selectedClassId && vm.selectedSubjectId && vm.selectedTerm) &&
    hasPublishedCell;

  async function confirmLockTerm() {
    if (!vm.lockTermAction) return;
    setLockPending(true);
    setLockErrorKey(null);
    const result = await vm.lockTermAction();
    setLockPending(false);
    if (result.ok) {
      setLockDialogOpen(false);
      setLockBanner(t("lockTermSuccess", { count: result.lockedCount ?? 0 }));
      startTransition(() => onSelectionChange?.({}));
    } else {
      // A11Y-102: keep the dialog open on failure — surface the error via
      // the dialog's own errorSlot (forbidden = no retry, transient = retry)
      // instead of closing it and forcing a full re-open/re-confirm cycle.
      setLockErrorKey(result.errorKey);
    }
  }

  const lockErrorSlot: DestructiveConfirmErrorSlot | undefined = (() => {
    if (!lockErrorKey) return undefined;
    if (
      lockErrorKey === "forbidden" ||
      lockErrorKey === "teacher-not-assigned"
    ) {
      return { tone: "forbidden", message: t(ERROR_KEY_MAP[lockErrorKey]) };
    }
    return {
      tone: "transient",
      message: t(ERROR_KEY_MAP[lockErrorKey]),
      onRetry: confirmLockTerm,
    };
  })();

  return (
    <div className="flex flex-col gap-5 p-5">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-extrabold text-2xl text-foreground">
          {t("title")}
        </h1>
        {vm.role === "teacher" && vm.gradeEntryPath ? (
          <Button
            type="button"
            onClick={() =>
              vm.selectedClassId &&
              vm.selectedSubjectId &&
              onEnterGrades?.(vm.selectedClassId, vm.selectedSubjectId)
            }
            disabled={!(vm.selectedClassId && vm.selectedSubjectId)}
          >
            {t("enterGradesCta")}
          </Button>
        ) : null}
        {vm.lockTermAction ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setLockErrorKey(null);
              setLockDialogOpen(true);
            }}
            disabled={!canLockTerm}
          >
            {t("lockTermButton")}
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
              <SelectTrigger id="gb-cs">
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

      {lockBanner ? (
        <p
          className="rounded-[8px] bg-muted px-4 py-2 text-foreground text-sm"
          role="status"
        >
          {lockBanner}
        </p>
      ) : null}

      {showChildSwitcher && vm.childrenList ? (
        <ChildSwitcher
          childList={vm.childrenList}
          activeChildId={resolvedActiveChildId ?? vm.childrenList[0].childId}
          onSwitch={onChildSwitch ?? (() => {})}
          isLoading={isLoading}
        />
      ) : null}

      <div {...panelProps} className="flex flex-col gap-5">
        {isLoading ? (
          <GradeBookSkeleton />
        ) : !hasSelection ? (
          <EmptyState message={t("noSelection")} />
        ) : vm.error ? (
          <ErrorBanner message={t(ERROR_KEY_MAP[vm.error])} onRetry={onRetry} />
        ) : !vm.gradeBook ? (
          <GradeBookEmptyState />
        ) : (
          <>
            <GradeBookTable
              gradeBook={vm.gradeBook}
              role={vm.role}
              isPublished={vm.isPublished}
            />
            {showSelectors && vm.gradeBook.rows.length > 0 ? (
              <RankDistributionChart rows={vm.gradeBook.rows} />
            ) : null}
          </>
        )}
      </div>

      <DestructiveConfirmDialog
        open={lockDialogOpen}
        title={t("lockTermConfirmTitle")}
        body={t("lockTermConfirmBody", {
          className: vm.gradeBook?.className ?? "",
          subjectName: vm.gradeBook?.subjectName ?? "",
          term: vm.selectedTerm ?? "",
        })}
        confirmLabel={t("lockTermConfirmOk")}
        isLoading={lockPending}
        errorSlot={lockErrorSlot}
        onConfirm={confirmLockTerm}
        onCancel={() => {
          setLockDialogOpen(false);
          setLockErrorKey(null);
        }}
      />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div
      className="flex min-h-40 items-center justify-center rounded-[12px] border border-border border-dashed bg-card p-8 text-center text-muted-foreground text-sm"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {message}
    </div>
  );
}

/**
 * US-E17.5 — canonical `emptyStatePattern` (design-spec.jsonc) for the "no
 * grades yet" state (`vm.gradeBook === null` with a selection made). Replaces
 * the legacy dashed-border box. The "no selection" prompt above keeps using
 * the legacy `EmptyState` — unchanged per AC-02.
 */
function GradeBookEmptyState() {
  const t = useTranslations("gradeBook");
  return (
    <div
      className="flex flex-col items-center px-5 py-10 text-center"
      role="status"
      aria-live="polite"
    >
      <FileText className="size-16 text-edu-text-muted" aria-hidden="true" />
      <p className="mt-4 font-bold text-base text-foreground">
        {t("emptyState")}
      </p>
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
