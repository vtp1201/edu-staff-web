"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useId, useState, useTransition } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
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
import type {
  ActionResult,
  GradeEntryScreenVM,
} from "./grade-entry-screen.i-vm";
import { GradeEntrySkeleton } from "./grade-entry-skeleton";
import { GradeEntryTable } from "./grade-entry-table";

type ErrorMsgKey =
  | "errorOutOfRange"
  | "errorAlreadyPublished"
  | "errorForbidden"
  | "errorNetworkError"
  | "errorUnknown";

const ERROR_KEY_MAP: Record<GradesFailure["type"], ErrorMsgKey> = {
  "not-found": "errorUnknown",
  forbidden: "errorForbidden",
  "score-out-of-range": "errorOutOfRange",
  "already-published": "errorAlreadyPublished",
  "network-error": "errorNetworkError",
  unknown: "errorUnknown",
};

const TERMS = ["HK1", "HK2"] as const;

export interface GradeEntryScreenProps {
  vm: GradeEntryScreenVM;
  /** loading flag for the grade sheet (RSC-driven) */
  isLoading?: boolean;
  /** invoked when the teacher changes class-subject or term */
  onSelectionChange?: (next: { csId?: string; term?: string }) => void;
}

function isLocked(sheet: GradeSheet): boolean {
  return sheet.rows.some((r) => r.publishStatus !== "DRAFT");
}

export function GradeEntryScreen({
  vm,
  isLoading = false,
  onSelectionChange,
}: GradeEntryScreenProps) {
  const t = useTranslations("gradeEntry");
  const queryClient = useQueryClient();
  const [, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const publishTitleId = useId();

  // Local working copy of the sheet so optimistic edits render immediately.
  const [sheet, setSheet] = useState<GradeSheet | null>(vm.sheet);
  // Keep local copy in sync when RSC delivers a new sheet (selection changed).
  const sheetKey = `${vm.selectedCsId}|${vm.selectedTerm}|${vm.sheet?.rows.length}`;
  const [syncKey, setSyncKey] = useState(sheetKey);
  if (syncKey !== sheetKey) {
    setSyncKey(sheetKey);
    setSheet(vm.sheet);
  }

  const maxScore = 10;
  const columns = sheet?.scheme.columns ?? [];
  const locked = sheet ? isLocked(sheet) : false;
  const pending =
    sheet?.rows.some((r) => r.publishStatus === "PENDING_APPROVAL") ?? false;
  const publishedDone =
    sheet?.rows.some((r) => r.publishStatus === "PUBLISHED") ?? false;

  const saveMutation = useMutation({
    mutationFn: async (vars: {
      studentId: string;
      columnId: string;
      value: number;
    }): Promise<ActionResult> => {
      if (!vm.selectedCsId) return { ok: false, errorKey: "unknown" };
      return vm.saveScoreAction(
        vm.selectedCsId,
        vars.studentId,
        vars.columnId,
        vars.value,
      );
    },
    onMutate: (vars) => {
      // Optimistic: patch the working copy + recompute the row average.
      const prev = sheet;
      if (sheet) {
        setSheet({
          ...sheet,
          rows: sheet.rows.map((r) =>
            r.studentId === vars.studentId
              ? {
                  ...r,
                  scores: { ...r.scores, [vars.columnId]: vars.value },
                  average: calculateWeightedAverage(
                    { ...r.scores, [vars.columnId]: vars.value },
                    columns,
                  ),
                }
              : r,
          ),
        });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) setSheet(ctx.prev); // rollback
      setBanner(t("errorNetworkError"));
    },
  });

  function errorMessage(key: GradesFailure["type"]): string {
    if (key === "score-out-of-range") {
      return t("errorOutOfRange", { max: maxScore });
    }
    return t(ERROR_KEY_MAP[key]);
  }

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!(vm.selectedCsId && vm.selectedTerm)) {
        const fail: ActionResult = { ok: false, errorKey: "unknown" };
        return fail;
      }
      return vm.publishAction(vm.selectedCsId, vm.selectedTerm);
    },
    onSuccess: (result) => {
      setConfirmOpen(false);
      if (result.ok) {
        const adminApproval = sheet?.publishMode === "ADMIN_APPROVAL";
        setBanner(
          adminApproval ? t("publishPendingApproval") : t("publishSuccess"),
        );
        queryClient.invalidateQueries({ queryKey: ["grades"] });
      } else {
        setBanner(errorMessage(result.errorKey));
      }
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

  function changeSelection(next: { csId?: string; term?: string }) {
    setBanner(null);
    startTransition(() => onSelectionChange?.(next));
  }

  const hasSelection = Boolean(vm.selectedCsId && vm.selectedTerm);

  return (
    <div className="flex flex-col gap-5 p-5">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-extrabold text-2xl text-foreground">
          {t("title")}
        </h1>
        {sheet && !locked ? (
          <Button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={publishMutation.isPending}
          >
            {t("publishButton")}
          </Button>
        ) : null}
        {pending ? (
          <Badge variant="secondary">{t("pendingApproval")}</Badge>
        ) : null}
        {publishedDone ? <Badge>{t("published")}</Badge> : null}
      </header>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex min-w-52 flex-col gap-1.5">
          <Label htmlFor="grade-cs" className="text-xs">
            {t("selectClass")}
          </Label>
          <Select
            value={vm.selectedCsId ?? undefined}
            onValueChange={(v) => changeSelection({ csId: v })}
          >
            <SelectTrigger id="grade-cs">
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
          readOnly={locked}
          onSaveScore={handleSaveScore}
        />
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent aria-labelledby={publishTitleId}>
          <AlertDialogHeader>
            <AlertDialogTitle id={publishTitleId}>
              {t("publishConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("publishConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("publishConfirmCancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                publishMutation.mutate();
              }}
            >
              {t("publishConfirmOk")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
