"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { DestructiveConfirmDialog } from "@/components/shared/destructive-confirm-dialog";
import { ReasonConfirmDialog } from "@/components/shared/reason-confirm-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MIN_REVISION_NOTE_LENGTH } from "@/features/grades/domain/use-cases/request-grade-revision.use-case";
import { cn } from "@/shared/utils";
import { BatchReviewSheet } from "./components/batch-review-sheet";
import { BatchStatusBadge } from "./components/batch-status-badge";
import { GradeApprovalSkeleton } from "./components/grade-approval-skeleton";
import { GradePublishModeWarning } from "./components/grade-publish-mode-warning";
import type {
  GradeApprovalScreenVM,
  StatusFilter,
} from "./grade-approval-screen.i-vm";

const FILTERS = [
  { value: "ALL", labelKey: "filterAll" },
  { value: "PENDING_APPROVAL", labelKey: "filterPending" },
  { value: "PUBLISHED", labelKey: "filterPublished" },
  { value: "LOCKED", labelKey: "filterLocked" },
] as const satisfies { value: StatusFilter; labelKey: string }[];

export function GradeApprovalScreen({ vm }: { vm: GradeApprovalScreenVM }) {
  const t = useTranslations("gradeApproval");
  const [approveOpen, setApproveOpen] = useState(false);
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [bulkLockOpen, setBulkLockOpen] = useState(false);

  if (vm.isSelfPublishMode) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <h1 className="text-2xl font-extrabold text-foreground">
          {t("title")}
        </h1>
        <GradePublishModeWarning />
      </div>
    );
  }

  const lockableSelected = vm.batches.filter(
    (b) => vm.selectedBatchIds.includes(b.id) && b.status === "PUBLISHED",
  );
  const allSelectable = vm.batches.filter((b) => b.status === "PUBLISHED");
  const allSelected =
    allSelectable.length > 0 &&
    allSelectable.every((b) => vm.selectedBatchIds.includes(b.id));

  const emptyMessage =
    vm.statusFilter === "PENDING_APPROVAL" || vm.statusFilter === "ALL"
      ? t("emptyState")
      : t("emptyStateAll");

  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-extrabold text-foreground">{t("title")}</h1>

      {/* Status filter pills */}
      <fieldset className="flex flex-wrap gap-2 border-0 p-0">
        <legend className="sr-only">{t("filterGroupLabel")}</legend>
        {FILTERS.map((f) => {
          const active = vm.statusFilter === f.value;
          return (
            <button
              key={f.value}
              type="button"
              aria-pressed={active}
              onClick={() => vm.onFilterChange(f.value)}
              className={cn(
                "min-h-11 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent",
              )}
            >
              {t(f.labelKey)}
            </button>
          );
        })}
      </fieldset>

      {/* Bulk-lock toolbar */}
      {lockableSelected.length > 0 ? (
        <div className="flex items-center justify-between rounded-[var(--edu-radius-card)] border border-border bg-card px-4 py-2">
          <span className="text-sm font-medium text-foreground">
            {t("bulkLockToolbar", { count: lockableSelected.length })}
          </span>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => setBulkLockOpen(true)}
            disabled={vm.isBulkLocking}
          >
            {t("actionBulkLock")}
          </Button>
        </div>
      ) : null}

      {vm.isLoading ? (
        <GradeApprovalSkeleton />
      ) : vm.batches.length === 0 ? (
        <div className="rounded-[var(--edu-radius-card)] border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--edu-radius-card)] border border-border bg-card">
          <Table aria-label={t("tableAriaLabel")}>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(c) => vm.onSelectAll(c === true)}
                    aria-label={t("selectAllLabel")}
                  />
                </TableHead>
                <TableHead>{t("colClass")}</TableHead>
                <TableHead>{t("colSubject")}</TableHead>
                <TableHead>{t("colTeacher")}</TableHead>
                <TableHead>{t("colTerm")}</TableHead>
                <TableHead className="text-right">
                  {t("colStudentCount")}
                </TableHead>
                <TableHead>{t("colStatus")}</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">{t("actionView")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vm.batches.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell>
                    <Checkbox
                      checked={vm.selectedBatchIds.includes(batch.id)}
                      disabled={batch.status !== "PUBLISHED"}
                      onCheckedChange={(c) =>
                        vm.onSelectBatch(batch.id, c === true)
                      }
                      aria-label={t("selectBatchLabel", { id: batch.id })}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {batch.className}
                  </TableCell>
                  <TableCell>{batch.subjectName}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {batch.teacherName}
                  </TableCell>
                  <TableCell>{batch.term}</TableCell>
                  <TableCell className="text-right">
                    {batch.studentCount}
                  </TableCell>
                  <TableCell>
                    <BatchStatusBadge status={batch.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => vm.onOpenBatchDetail(batch.id)}
                    >
                      {t("actionView")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <BatchReviewSheet
        open={vm.detailBatchId !== null}
        onOpenChange={(o) => {
          if (!o) vm.onCloseDetail();
        }}
        detail={vm.detail}
        isLoading={vm.isDetailLoading}
        isApproving={vm.isApproving}
        isRequestingRevision={vm.isRequestingRevision}
        onApprove={() => setApproveOpen(true)}
        onRequestRevision={() => setRevisionOpen(true)}
      />

      <DestructiveConfirmDialog
        open={approveOpen}
        title={t("approveDialog.title")}
        body={t("approveDialog.description")}
        confirmLabel={t("approveDialog.confirm")}
        isLoading={vm.isApproving}
        onConfirm={() => {
          if (vm.detailBatchId) vm.onApprove(vm.detailBatchId);
          setApproveOpen(false);
        }}
        onCancel={() => setApproveOpen(false)}
      />

      {/* US-E18.44: was a feature-local `RevisionRequestDialog` fork; now the
          canonical `ReasonConfirmDialog` (decision 0026), which additionally
          gives this field a counter, `role="alert"` errors and focus return.
          Copy + the ≥10-char domain rule are unchanged. */}
      <ReasonConfirmDialog
        open={revisionOpen}
        title={t("revisionDialog.title")}
        reasonLabel={t("revisionDialog.noteLabel")}
        reasonPlaceholder={t("revisionDialog.notePlaceholder")}
        confirmLabel={t("revisionDialog.confirm")}
        cancelLabel={t("revisionDialog.cancel")}
        // No `maxLength`: the revision note has no documented server cap, and
        // inventing one would fabricate a constraint (and an i18n string) that
        // no contract states.
        minLength={MIN_REVISION_NOTE_LENGTH}
        requiredMessage={t("revisionDialog.noteMinLength")}
        tooShortMessage={t("revisionDialog.noteMinLength")}
        isPending={vm.isRequestingRevision}
        onConfirm={(note) => {
          if (vm.detailBatchId) vm.onRequestRevision(vm.detailBatchId, note);
          setRevisionOpen(false);
        }}
        onOpenChange={setRevisionOpen}
      />

      <DestructiveConfirmDialog
        open={bulkLockOpen}
        title={t("bulkLockDialog.title")}
        body={t("bulkLockDialog.description", {
          count: lockableSelected.length,
        })}
        confirmLabel={t("bulkLockDialog.confirm")}
        isLoading={vm.isBulkLocking}
        onConfirm={() => {
          vm.onBulkLock();
          setBulkLockOpen(false);
        }}
        onCancel={() => setBulkLockOpen(false)}
      />
    </div>
  );
}
