"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import type { BatchStatus } from "../../domain/entities/grade-approval-batch.entity";
import type { GradesFailure } from "../../domain/failures/grades.failure";
import { gradeApprovalKeys } from "./grade-approval-keys";
import { GradeApprovalScreen } from "./grade-approval-screen";
import type {
  GradeApprovalActions,
  StatusFilter,
} from "./grade-approval-screen.i-vm";

type ErrorMsgKey =
  | "errorNotPendingApproval"
  | "errorNotPublished"
  | "errorBatchLocked"
  | "errorForbidden"
  | "errorNetworkError"
  | "errorUnknown";

/**
 * Maps a stable failure key → the localized error toast message.
 * NOTE (US-E18.12, ADR 0054): `GradesFailure` is a shared union with the now
 * real-wired `IGradesRepository`/`IGradeBookRepository` — the extra members
 * below (`teacher-not-assigned`, `invalid-value`, `not-draft`, `locked`,
 * `scale-not-configured`, `scheme-not-configured`, `column-not-in-scheme`,
 * `student-not-enrolled`) are unreachable from this screen (it never calls
 * those repositories) but must be present for this Record to stay exhaustive.
 * This screen itself is UNCHANGED/out of scope for US-E18.12 (ADR 0054 — stays
 * mock-first permanently).
 */
const ERROR_KEY: Record<GradesFailure["type"], ErrorMsgKey> = {
  "not-found": "errorUnknown",
  forbidden: "errorForbidden",
  "teacher-not-assigned": "errorUnknown",
  "invalid-value": "errorUnknown",
  "not-draft": "errorUnknown",
  locked: "errorUnknown",
  "scale-not-configured": "errorUnknown",
  "scheme-not-configured": "errorUnknown",
  "column-not-in-scheme": "errorUnknown",
  "student-not-enrolled": "errorUnknown",
  "network-error": "errorNetworkError",
  unknown: "errorUnknown",
  "not-pending-approval": "errorNotPendingApproval",
  "not-published": "errorNotPublished",
  "invalid-revision-note": "errorUnknown",
  "batch-locked": "errorBatchLocked",
};

type Props = {
  actions: GradeApprovalActions;
  isSelfPublishMode: boolean;
};

export function GradeApprovalContainer({ actions, isSelfPublishMode }: Props) {
  const t = useTranslations("gradeApproval");
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [detailBatchId, setDetailBatchId] = useState<string | null>(null);

  function showError(errorKey: GradesFailure["type"]) {
    toast.error(t(ERROR_KEY[errorKey]));
  }

  const listQuery = useQuery({
    queryKey: gradeApprovalKeys.batches(statusFilter),
    queryFn: async () => {
      const filter =
        statusFilter === "ALL" ? undefined : (statusFilter as BatchStatus);
      const result = await actions.listBatches(filter);
      if (!result.ok) throw result.errorKey;
      return result.data;
    },
  });

  const detailQuery = useQuery({
    queryKey: gradeApprovalKeys.batchDetail(detailBatchId),
    enabled: detailBatchId !== null,
    queryFn: async () => {
      if (!detailBatchId) return null;
      const result = await actions.getDetail(detailBatchId);
      if (!result.ok) throw result.errorKey;
      return result.data;
    },
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["grade-approval-batches"] });
  }

  const approveMutation = useMutation({
    mutationFn: (batchId: string) => actions.approve(batchId),
    onSuccess: (result) => {
      if (!result.ok) {
        showError(result.errorKey);
        return;
      }
      toast.success(
        t("approveSuccess", {
          subject: result.data.subjectName,
          class: result.data.className,
        }),
      );
      setDetailBatchId(null);
      invalidate();
    },
  });

  const revisionMutation = useMutation({
    mutationFn: ({ batchId, note }: { batchId: string; note: string }) =>
      actions.requestRevision(batchId, note),
    onSuccess: (result) => {
      if (!result.ok) {
        showError(result.errorKey);
        return;
      }
      toast.success(t("revisionSuccess"));
      setDetailBatchId(null);
      invalidate();
    },
  });

  const bulkLockMutation = useMutation({
    mutationFn: (batchIds: string[]) => actions.bulkLock(batchIds),
    onSuccess: (result) => {
      if (!result.ok) {
        showError(result.errorKey);
        return;
      }
      toast.success(t("bulkLockSuccess", { count: result.data.length }));
      setSelectedBatchIds([]);
      invalidate();
    },
  });

  const errorKey = listQuery.error as unknown as
    | GradesFailure["type"]
    | undefined;

  return (
    <GradeApprovalScreen
      vm={{
        batches: listQuery.data ?? [],
        isLoading: listQuery.isPending,
        error: errorKey ?? null,
        statusFilter,
        onFilterChange: (f) => {
          setStatusFilter(f);
          setSelectedBatchIds([]);
        },
        selectedBatchIds,
        onSelectBatch: (id, checked) =>
          setSelectedBatchIds((prev) =>
            checked ? [...prev, id] : prev.filter((x) => x !== id),
          ),
        onSelectAll: (checked) => {
          const lockable = (listQuery.data ?? [])
            .filter((b) => b.status === "PUBLISHED")
            .map((b) => b.id);
          setSelectedBatchIds(checked ? lockable : []);
        },
        onOpenBatchDetail: setDetailBatchId,
        detailBatchId,
        onCloseDetail: () => setDetailBatchId(null),
        detail: detailQuery.data ?? null,
        isDetailLoading: detailQuery.isPending && detailBatchId !== null,
        onApprove: (batchId) => approveMutation.mutate(batchId),
        onRequestRevision: (batchId, note) =>
          revisionMutation.mutate({ batchId, note }),
        onBulkLock: () => {
          const lockable = (listQuery.data ?? [])
            .filter(
              (b) =>
                selectedBatchIds.includes(b.id) && b.status === "PUBLISHED",
            )
            .map((b) => b.id);
          bulkLockMutation.mutate(lockable);
        },
        isApproving: approveMutation.isPending,
        isRequestingRevision: revisionMutation.isPending,
        isBulkLocking: bulkLockMutation.isPending,
        isSelfPublishMode,
      }}
    />
  );
}
