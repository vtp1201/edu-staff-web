"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MailPlus, Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { DestructiveConfirmDialog } from "@/components/shared/destructive-confirm-dialog/destructive-confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state/empty-state";
import type { InviteRoleOption } from "../../domain/entities/invitation.entity";
import { buildRowVM, type RowVMLabels } from "./build-row-vm";
import { filterInvitations, statusCounts } from "./filter-invitations";
import { invitationKeys } from "./invitations.query-keys";
import { InvitationsCardList } from "./invitations-card-list";
import { InvitationsErrorState } from "./invitations-error-state";
import { InvitationsPageHeader } from "./invitations-page-header";
import type { InvitationsRowsLabels } from "./invitations-rows.i-vm";
import type {
  InvitationRowVM,
  InvitationsScreenProps,
  InvitationsStatusFilter,
  SendBatchActionResult,
} from "./invitations-screen.i-vm";
import { InvitationsSearchInput } from "./invitations-search-input";
import { InvitationsSkeleton } from "./invitations-skeleton";
import { InvitationsStatusTabs } from "./invitations-status-tabs";
import { InvitationsTable } from "./invitations-table";
import { SendInvitationDialog } from "./send-invitation-dialog";
import { useIsMobile } from "./use-is-mobile";

const ROLE_OPTIONS: InviteRoleOption[] = [
  "teacher",
  "student",
  "parent",
  "manager",
  "admin",
];
const EXPIRY_OPTIONS = [7, 14, 30] as const;
/** Soft client cap on one batch (plan.md §4 OQ-C — guards an unbounded fan-out). */
const MAX_BATCH_EMAILS = 20;

export function InvitationsScreen({
  initialInvitations,
  initialLoadFailed,
  tenantId,
  onRefresh,
  onSendBatch,
  onResend,
  onRevoke,
}: InvitationsScreenProps) {
  const t = useTranslations("invitations");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const [tab, setTab] = useState<InvitationsStatusFilter>("all");
  const [query, setQuery] = useState("");
  const [sendOpen, setSendOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<InvitationRowVM | null>(
    null,
  );
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: invitationKeys.list(tenantId),
    queryFn: async () => {
      const res = await onRefresh();
      if (!res.ok) throw res.errorKey;
      return res.data;
    },
    initialData: initialLoadFailed ? undefined : initialInvitations,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: invitationKeys.list(tenantId),
    });

  const invitations = listQuery.data ?? [];
  const emailOf = (id: string) =>
    invitations.find((i) => i.id === id)?.email ?? "";

  const resendMutation = useMutation({
    mutationFn: (id: string) => onResend(id),
    onSuccess: (res, id) => {
      if (!res.ok) {
        if (
          res.errorKey === "invitation-invalid" ||
          res.errorKey === "invalid-state"
        ) {
          toast.error(t("toast.resendRaceError"));
          invalidate(); // AC-005.4 — reconcile from server truth
        } else {
          toast.error(t("toast.resendNetworkError")); // AC-005.5, no refetch
        }
        return;
      }
      const email = emailOf(id);
      toast.success(t("toast.resentTo", { email }));
      invalidate(); // AC-005.3
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => onRevoke(id),
    onSuccess: (res, id) => {
      if (!res.ok) {
        if (res.errorKey === "invitation-invalid") {
          toast.error(t("toast.revokeNotFoundRace"));
          setRevokeTarget(null);
          invalidate(); // AC-006.6
        } else {
          const msg = t("toast.revokeNetworkError");
          toast.error(msg);
          setRevokeError(msg); // AC-006.7 — dialog stays open with retry
        }
        return;
      }
      toast.success(t("toast.revokedOf", { email: emailOf(id) }));
      setRevokeTarget(null);
      invalidate(); // AC-006.5
    },
  });

  async function handleSendBatch(
    input: Parameters<typeof onSendBatch>[0],
  ): Promise<SendBatchActionResult> {
    const res = await onSendBatch(input);
    if (!res.ok) {
      toast.error(t("toast.networkError")); // AC-003.12
      return res;
    }
    const { succeeded, failed } = res.outcome;
    if (succeeded.length > 0) invalidate(); // full OR partial success
    if (failed.length === 0) {
      toast.success(
        succeeded.length === 1
          ? t("toast.sentOne", { email: succeeded[0].email })
          : t("toast.sentMany", {
              count: succeeded.length,
              role: t(`roleLabels.${input.role}`),
            }),
      );
    } else if (succeeded.length > 0) {
      toast.warning(
        t("toast.sentPartial", {
          succeeded: succeeded.length,
          failed: failed.length,
        }),
      ); // AC-003.10 partial
    } else if (failed.every((f) => f.failureKey === "network-error")) {
      toast.error(t("toast.networkError"));
    }
    return res;
  }

  async function handleCopyLink(row: InvitationRowVM) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/invitations/accept?token=${row.id}`;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("no clipboard");
      await navigator.clipboard.writeText(url);
      toast.success(t("toast.copiedLink")); // AC-004.1
    } catch {
      toast.error(t("toast.clipboardDenied")); // AC-004.2
    }
  }

  const isRowMutating = (id: string) =>
    (resendMutation.isPending && resendMutation.variables === id) ||
    (revokeMutation.isPending && revokeMutation.variables === id);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === "en" ? "en-GB" : "vi-VN");

  const rowVMLabels: RowVMLabels = {
    roleLabelOf: (role) => t(`roleLabels.${role}`),
    statusLabelOf: (status) => t(`statusLabels.${status}`),
    sentAtLabelOf: formatDate,
    countdown: {
      daysLeft: (days) => t("countdown.daysLeft", { days }),
      expiredOn: (date) => t("countdown.expiredOn", { date }),
      notApplicable: t("countdown.notApplicable"),
      formatDate,
    },
  };

  const rowsLabels: InvitationsRowsLabels = {
    columns: {
      email: t("table.columns.email"),
      role: t("table.columns.role"),
      invitedBy: t("table.columns.invitedBy"),
      sentDate: t("table.columns.sentDate"),
      expiry: t("table.columns.expiry"),
      status: t("table.columns.status"),
      actions: t("table.columns.actions"),
    },
    invitedByPrefix: t("table.columns.invitedBy"),
    copyLabelOf: (email) => t("a11y.copyLink", { email }),
    resendLabelOf: (email) => t("a11y.resend", { email }),
    revokeLabelOf: (email) => t("a11y.revoke", { email }),
    rowActionsGroupLabelOf: (email) => t("a11y.rowActionsLabel", { email }),
  };

  const now = Date.now();
  const { rows, filteredCount } = filterInvitations(invitations, tab, query);
  const counts = statusCounts(invitations);
  const rowVMs = rows.map((inv) =>
    buildRowVM(inv, now, rowVMLabels, isRowMutating(inv.id)),
  );

  const tabLabels: Record<InvitationsStatusFilter, string> = {
    all: t("tabs.all"),
    pending: t("tabs.pending"),
    accepted: t("tabs.accepted"),
    expired: t("tabs.expired"),
    revoked: t("tabs.revoked"),
  };

  const hasFilters = query.trim() !== "" || tab !== "all";
  const showError = listQuery.isError;
  const showLoading = !showError && listQuery.isPending;
  const showEmptyNoInvitations =
    !showError && !showLoading && invitations.length === 0;
  const showEmptyNoMatch =
    !showError && !showLoading && invitations.length > 0 && filteredCount === 0;
  const showTable =
    !showError && !showLoading && !showEmptyNoInvitations && !showEmptyNoMatch;

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-5 md:px-8 md:py-7">
      <InvitationsPageHeader
        title={t("pageTitle")}
        subtitle={t("pageSubtitle")}
        refreshLabel={t("refresh")}
        sendLabel={t("sendInvite")}
        isRefreshing={listQuery.isFetching}
        onRefresh={() => listQuery.refetch()}
        onOpenSendDialog={() => setSendOpen(true)}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <InvitationsStatusTabs
          value={tab}
          counts={counts}
          labels={tabLabels}
          onChange={setTab}
        />
        <InvitationsSearchInput
          value={query}
          placeholder={t("search.placeholder")}
          ariaLabel={t("search.ariaLabel")}
          onChange={setQuery}
        />
      </div>

      {showLoading && <InvitationsSkeleton />}

      {showError && (
        <InvitationsErrorState
          title={t("error.title")}
          description={t("error.description")}
          retryLabel={t("error.retry")}
          onRetry={() => listQuery.refetch()}
        />
      )}

      {showEmptyNoInvitations && (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState
            icon={MailPlus}
            title={t("empty.noInvitationsTitle")}
            body={t("empty.noInvitationsBody")}
            cta={{
              label: t("empty.noInvitationsCta"),
              icon: MailPlus,
              onClick: () => setSendOpen(true),
            }}
          />
        </div>
      )}

      {showEmptyNoMatch && (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState
            icon={Search}
            title={t("empty.noMatchTitle")}
            body={t("empty.noMatchBody")}
            cta={{
              label: t("empty.clearFiltersCta"),
              variant: "secondary",
              onClick: () => {
                setQuery("");
                setTab("all");
              },
            }}
          />
        </div>
      )}

      {showTable &&
        (isMobile ? (
          <InvitationsCardList
            rows={rowVMs}
            labels={rowsLabels}
            onCopyLink={handleCopyLink}
            onResend={(id) => resendMutation.mutate(id)}
            onRevokeRequest={(row) => {
              setRevokeError(null);
              setRevokeTarget(row);
            }}
          />
        ) : (
          <InvitationsTable
            rows={rowVMs}
            labels={rowsLabels}
            onCopyLink={handleCopyLink}
            onResend={(id) => resendMutation.mutate(id)}
            onRevokeRequest={(row) => {
              setRevokeError(null);
              setRevokeTarget(row);
            }}
          />
        ))}

      {showTable && filteredCount > 0 && (
        <p className="mt-3 text-muted-foreground text-xs">
          {t("summary.count", { count: filteredCount })}
          {hasFilters ? t("summary.filtered") : ""}
        </p>
      )}

      <SendInvitationDialog
        open={sendOpen}
        roleOptions={ROLE_OPTIONS}
        expiryOptions={[...EXPIRY_OPTIONS]}
        maxBatchEmails={MAX_BATCH_EMAILS}
        onSubmit={handleSendBatch}
        onClose={() => setSendOpen(false)}
      />

      <DestructiveConfirmDialog
        open={revokeTarget !== null}
        title={t("revokeDialog.title")}
        body={t("revokeDialog.body", { email: revokeTarget?.email ?? "" })}
        confirmLabel={t("revokeDialog.confirm")}
        isLoading={revokeMutation.isPending}
        errorSlot={
          revokeError
            ? {
                tone: "transient",
                message: revokeError,
                onRetry: () => {
                  if (revokeTarget) {
                    setRevokeError(null);
                    revokeMutation.mutate(revokeTarget.id);
                  }
                },
              }
            : undefined
        }
        onConfirm={() => {
          if (revokeTarget) {
            setRevokeError(null);
            revokeMutation.mutate(revokeTarget.id);
          }
        }}
        onCancel={() => {
          setRevokeTarget(null);
          setRevokeError(null);
        }}
      />
    </div>
  );
}
