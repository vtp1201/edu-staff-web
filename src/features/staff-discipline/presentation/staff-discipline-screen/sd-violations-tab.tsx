"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileWarning, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import type { StaffViolationEntity } from "../../domain/entities/staff-violation.entity";
import { CreateViolationDialog } from "./create-violation-dialog";
import { errorKeyOf, useSDErrorMessage } from "./sd-error-message";
import { SDListError } from "./sd-list-error";
import { SDListSkeleton } from "./sd-list-skeleton";
import { staffOf } from "./sd-roster-lookup";
import {
  SDViolationFilterBar,
  type SeverityFilter,
  type StateFilter,
} from "./sd-violation-filter-bar";
import { SDViolationRow } from "./sd-violation-row";
import {
  SD_LIST_QUERY_OPTIONS,
  staffDisciplineKeys,
} from "./staff-discipline.query-keys";
import type {
  StaffDisciplineErrorKey,
  StaffDisciplineScreenVM,
  StaffDisciplineSubmitError,
} from "./staff-discipline-screen.i-vm";

/**
 * Violations tab — its OWN container (own `useQuery`, own filters, own dialog and
 * reject state). Nothing is shared with the conduct-notes tab, which is what makes
 * AC-010.3 ("no carry-over error when switching tabs") structural.
 *
 * NO optimistic UI on any mutation (spec §5): the reject panel and the create
 * dialog stay open until the request settles; the list is refreshed by
 * invalidating this sub-resource's subtree only.
 */
export type SDViolationsTabProps = Pick<
  StaffDisciplineScreenVM,
  | "viewerRole"
  | "viewerMemberId"
  | "viewerStaffMemberId"
  | "initialViolations"
  | "initialViolationsErrorKey"
  | "staffRoster"
  | "violationCategories"
  | "listViolationsAction"
  | "createViolationAction"
  | "submitViolationAction"
  | "approveViolationAction"
  | "rejectViolationAction"
>;

export function SDViolationsTab({
  viewerRole,
  viewerMemberId,
  viewerStaffMemberId,
  initialViolations,
  initialViolationsErrorKey,
  staffRoster,
  violationCategories,
  listViolationsAction,
  createViolationAction,
  submitViolationAction,
  approveViolationAction,
  rejectViolationAction,
}: SDViolationsTabProps) {
  const t = useTranslations("staffDiscipline.violations");
  const errorMessage = useSDErrorMessage();
  const queryClient = useQueryClient();

  const isPrincipal = viewerRole === "principal";
  // The teacher's list is server-scoped anyway (NFR-008 pt.3); passing the id
  // keeps the query key honest about what was requested.
  const filter = useMemo(
    () => (isPrincipal ? {} : { staffMemberId: viewerStaffMemberId }),
    [isPrincipal, viewerStaffMemberId],
  );

  const [stateFilter, setStateFilter] = useState<StateFilter>("all");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<
    StaffDisciplineSubmitError | undefined
  >(undefined);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rowError, setRowError] = useState<{
    recordId: string;
    errorKey: StaffDisciplineErrorKey;
  } | null>(null);

  const query = useQuery({
    queryKey: staffDisciplineKeys.violationsList(filter),
    queryFn: async () => {
      const res = await listViolationsAction(filter);
      if (!res.ok) throw { type: res.errorKey, retryable: res.retryable };
      return res.data;
    },
    // Seed only when the RSC fetch itself succeeded (error stays distinct from
    // an empty list — spec §5).
    initialData: initialViolationsErrorKey ? undefined : initialViolations,
    ...SD_LIST_QUERY_OPTIONS,
    retry: (count, error) => errorKeyOf(error) === "network-error" && count < 2,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: staffDisciplineKeys.violations(),
    });

  const createMutation = useMutation({
    mutationFn: async (input: Parameters<typeof createViolationAction>[0]) => {
      const res = await createViolationAction(input);
      if (!res.ok) throw { type: res.errorKey, fields: res.fields };
      return res.data;
    },
    onSuccess: () => {
      setCreateError(undefined);
      setCreateOpen(false);
      void invalidate();
    },
    onError: (error: unknown) => {
      // Dialog stays open, values preserved (AC-002.7).
      setCreateError({
        errorKey: errorKeyOf(error),
        fields:
          error && typeof error === "object" && "fields" in error
            ? (error as StaffDisciplineSubmitError).fields
            : undefined,
      });
    },
  });

  const rowMutation = useMutation({
    mutationFn: async (
      action:
        | { kind: "submit"; recordId: string }
        | { kind: "approve"; recordId: string }
        | { kind: "reject"; recordId: string; reason: string },
    ) => {
      const res =
        action.kind === "submit"
          ? await submitViolationAction(action.recordId)
          : action.kind === "approve"
            ? await approveViolationAction(action.recordId)
            : await rejectViolationAction({
                recordId: action.recordId,
                rejectionReason: action.reason,
              });
      if (!res.ok) throw { type: res.errorKey, recordId: action.recordId };
      return res.data;
    },
    onSuccess: () => {
      setRowError(null);
      setRejectingId(null);
      setRejectReason("");
      void invalidate();
    },
    onError: (error: unknown, variables) => {
      // Nothing was set optimistically → nothing to roll back. The panel stays
      // open so the typed reason survives a retry (AC-005.6).
      setRowError({
        recordId: variables.recordId,
        errorKey: errorKeyOf(error),
      });
    },
  });

  const listErrorKey: StaffDisciplineErrorKey | undefined = query.isError
    ? errorKeyOf(query.error)
    : initialViolationsErrorKey && !query.isSuccess
      ? initialViolationsErrorKey
      : undefined;

  const rows: StaffViolationEntity[] = useMemo(() => {
    const data = query.data ?? [];
    return data.filter(
      (v) =>
        (stateFilter === "all" || v.state === stateFilter) &&
        (severityFilter === "all" || v.severity === severityFilter),
    );
  }, [query.data, stateFilter, severityFilter]);

  const body = () => {
    if (listErrorKey) {
      return (
        <SDListError
          message={errorMessage(listErrorKey)}
          onRetry={() => void query.refetch()}
        />
      );
    }
    if (query.isLoading) return <SDListSkeleton />;
    if (rows.length === 0) {
      return (
        <div className="rounded-[var(--edu-radius-card)] border border-border bg-card shadow-card">
          <EmptyState
            icon={FileWarning}
            title={isPrincipal ? t("empty.adminCta") : t("empty.readOnly")}
            cta={
              isPrincipal
                ? {
                    label: t("addNew"),
                    icon: Plus,
                    onClick: () => setCreateOpen(true),
                  }
                : undefined
            }
          />
        </div>
      );
    }
    return (
      <div className="divide-y divide-border overflow-hidden rounded-[var(--edu-radius-card)] border border-border bg-card shadow-card">
        {rows.map((violation) => {
          const busy =
            rowMutation.isPending &&
            rowMutation.variables?.recordId === violation.recordId;
          return (
            <SDViolationRow
              key={violation.recordId}
              violation={violation}
              staff={staffOf(staffRoster, violation.staffMemberId)}
              canSubmit={
                isPrincipal &&
                violation.state === "DRAFT" &&
                violation.authorMemberId === viewerMemberId
              }
              canDecide={isPrincipal && violation.state === "SUBMITTED"}
              isRejecting={rejectingId === violation.recordId}
              isBusy={busy}
              rejectReason={rejectReason}
              errorMessage={
                rowError?.recordId === violation.recordId &&
                rowError.errorKey !== "missing-reject-reason"
                  ? errorMessage(rowError.errorKey)
                  : undefined
              }
              rejectServerErrorKey={
                rowError?.recordId === violation.recordId
                  ? rowError.errorKey
                  : undefined
              }
              onSubmit={() =>
                rowMutation.mutate({
                  kind: "submit",
                  recordId: violation.recordId,
                })
              }
              onApprove={() =>
                rowMutation.mutate({
                  kind: "approve",
                  recordId: violation.recordId,
                })
              }
              onStartReject={() => {
                setRowError(null);
                setRejectReason("");
                setRejectingId(violation.recordId);
              }}
              onChangeRejectReason={setRejectReason}
              onConfirmReject={() =>
                rowMutation.mutate({
                  kind: "reject",
                  recordId: violation.recordId,
                  reason: rejectReason,
                })
              }
              onCancelReject={() => {
                setRejectingId(null);
                setRejectReason("");
              }}
            />
          );
        })}
      </div>
    );
  };

  return (
    <section className="flex flex-col gap-4" aria-label={t("title")}>
      {isPrincipal && (
        <SDViolationFilterBar
          stateFilter={stateFilter}
          severityFilter={severityFilter}
          onStateFilterChange={setStateFilter}
          onSeverityFilterChange={setSeverityFilter}
          onOpenCreateDialog={() => {
            setCreateError(undefined);
            setCreateOpen(true);
          }}
        />
      )}

      {body()}

      {isPrincipal && (
        <CreateViolationDialog
          open={createOpen}
          staffRoster={staffRoster}
          violationCategories={violationCategories}
          isSubmitting={createMutation.isPending}
          submitError={createError}
          onSubmit={(input) => createMutation.mutate(input)}
          onClose={() => {
            setCreateOpen(false);
            setCreateError(undefined);
          }}
        />
      )}
    </section>
  );
}
