"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { MailPlus, Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { DestructiveConfirmDialog } from "@/components/shared/destructive-confirm-dialog/destructive-confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state/empty-state";
import { ListError } from "@/components/shared/list-error";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { LoadMoreButton } from "@/components/shared/load-more-button";
import { Skeleton } from "@/components/ui/skeleton";
import type { InviteRoleOption } from "../../domain/entities/invitation.entity";
import type { InvitationFailure } from "../../domain/failures/invitation.failure";
import { buildRowVM, type RowVMLabels } from "./build-row-vm";
import { filterInvitations } from "./filter-invitations";
import { invitationKeys } from "./invitations.query-keys";
import { InvitationsCardList } from "./invitations-card-list";
import { InvitationsPageHeader } from "./invitations-page-header";
import type { InvitationsRowsLabels } from "./invitations-rows.i-vm";
import type {
  InvitationRowVM,
  InvitationsScreenProps,
  InvitationsStatusFilter,
  ListActionResult,
  SendBatchActionResult,
} from "./invitations-screen.i-vm";
import { InvitationsSearchInput } from "./invitations-search-input";
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

/**
 * One shimmer row of the loading table (AC-001.1, design-spec `states.loading`
 * rows=5): email + status pill + 2 md-only fields + trailing action. The wrapper
 * + a11y wiring come from the shared `ListSkeleton` (INFRA-shared-list-states).
 */
const invitationsSkeletonRow = () => (
  <div className="flex items-center gap-4 border-border border-b px-4 py-3.5 last:border-b-0">
    <Skeleton className="h-4 w-48" />
    <Skeleton className="h-5 w-20 rounded-full" />
    <Skeleton className="hidden h-4 w-28 md:block" />
    <Skeleton className="hidden h-4 w-24 md:block" />
    <Skeleton className="ml-auto h-8 w-24" />
  </div>
);

type OkPage = Extract<ListActionResult, { ok: true }>;

/** Thrown out of the queryFn so `getNextPageParam`/retry see a typed failure. */
interface ThrownFailure {
  type: InvitationFailure["type"];
}

/** DOM id linking the search field to its partial-results caveat (a11y). */
const SEARCH_HINT_ID = "invitations-search-partial-hint";

export function InvitationsScreen({
  initialPage,
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

  // Seed ONLY the tab RSC actually rendered ("all"), and only if that fetch
  // succeeded — every other tab runs a normal cold client fetch.
  const initialData = useMemo(() => {
    if (initialLoadFailed || tab !== "all") return undefined;
    return {
      pages: [{ ok: true, data: initialPage } satisfies OkPage],
      pageParams: [undefined as string | undefined],
    };
  }, [initialLoadFailed, tab, initialPage]);

  const listQuery = useInfiniteQuery({
    // `status` IS in the key: it is a real server param, so each tab is its own
    // independently-paginated cache entry (no cross-tab page appending).
    queryKey: invitationKeys.list(tenantId, tab),
    queryFn: async ({ pageParam }): Promise<OkPage> => {
      const res = await onRefresh({
        status: tab === "all" ? undefined : tab,
        cursor: pageParam,
      });
      if (!res.ok) throw { type: res.errorKey } as ThrownFailure;
      return res;
    },
    initialPageParam: undefined as string | undefined,
    // A short/empty page with hasMore:true is normal (BE filters after a keyset
    // read) — keep following the cursor, never stop on a short page.
    getNextPageParam: (last) =>
      last.data.hasMore ? (last.data.nextCursor ?? undefined) : undefined,
    initialData,
    refetchOnWindowFocus: false,
  });

  // A failed load-more flips `isError` even though earlier pages are cached;
  // only a first-page failure may replace the table with the error banner.
  const [loadMoreError, setLoadMoreError] = useState(false);
  // Reset the stale load-more error during render when the tab (= query key)
  // changes, so the retry copy never paints for a frame on the new tab.
  const [prevTab, setPrevTab] = useState(tab);
  if (prevTab !== tab) {
    setPrevTab(tab);
    setLoadMoreError(false);
  }

  /**
   * Resend/send/revoke can move a row ACROSS status partitions (resend:
   * `expired` → `pending`), which no single-page patch can express, so the whole
   * `lists(tenantId)` subtree is invalidated. Never-visited tabs have no cache
   * entry, so this is free for them.
   */
  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: invitationKeys.lists(tenantId),
    });

  const invitations = useMemo(
    () => listQuery.data?.pages.flatMap((p) => p.data.data) ?? [],
    [listQuery.data],
  );
  const emailOf = (id: string) =>
    invitations.find((i) => i.id === id)?.email ?? "";

  const resendMutation = useMutation({
    mutationFn: (id: string) => onResend(id),
    onSuccess: (res, id) => {
      if (!res.ok) {
        if (res.errorKey === "rate-limited") {
          // 429: the request was rejected BEFORE any server-side change — a
          // distinct toast, no refetch, and deliberately no lockout timer (the
          // limit is 3/h per invitation, i.e. near-unreachable in real use).
          toast.error(
            res.retryAfterSeconds === undefined
              ? t("toast.resendRateLimitedNoWait")
              : t("toast.resendRateLimited", {
                  seconds: res.retryAfterSeconds,
                }),
          );
          return;
        }
        if (
          res.errorKey === "invitation-invalid" ||
          res.errorKey === "invitation-not-resendable" ||
          res.errorKey === "invalid-state"
        ) {
          // The row's real status diverged from what the UI showed (409/410).
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
    // NOTE: `row.id` is a token stand-in — the real invite token is never on the
    // wire today (ground-truth #7). Revisit once US-E21.2 ships a real token.
    const url = `${origin}/invitations/accept?token=${row.id}`;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("no clipboard");
      await navigator.clipboard.writeText(url);
      toast.success(t("toast.copiedLink")); // AC-004.1
    } catch {
      toast.error(t("toast.clipboardDenied")); // AC-004.2
    }
  }

  const handleLoadMore = useCallback(() => {
    setLoadMoreError(false);
    // throwOnError:true — without it TanStack swallows the queryFn rejection
    // (QueryObserver catches with a noop), so `.catch` would never fire and a
    // failed page would be silent.
    listQuery
      .fetchNextPage({ throwOnError: true })
      .catch(() => setLoadMoreError(true));
  }, [listQuery]);

  const isRowMutating = (id: string) =>
    (resendMutation.isPending && resendMutation.variables === id) ||
    (revokeMutation.isPending && revokeMutation.variables === id);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === "en" ? "en-GB" : "vi-VN");

  const rowVMLabels: RowVMLabels = {
    roleLabelOf: (role) => t(`roleLabels.${role}`),
    statusLabelOf: (status) => t(`statusLabels.${status}`),
    sentAtLabelOf: formatDate,
    invitedByFallback: t("table.invitedByFallback"),
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
  // Status is filtered server-side (one query per tab); only the email search
  // runs client-side, over the pages loaded so far.
  const { rows, filteredCount } = filterInvitations(invitations, query);
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
  const hasNextPage = listQuery.hasNextPage ?? false;
  /**
   * Search only ever sees the pages already loaded (no server `q=` param), so
   * while more pages remain the result set is provably incomplete — say so
   * instead of silently under-communicating. Purely derived, no extra state.
   */
  const showPartialSearchHint = query.trim() !== "" && hasNextPage;
  // Page-1 failure replaces the table; a later page's failure keeps the rows.
  const showError = listQuery.isError && invitations.length === 0;
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
          labels={tabLabels}
          onChange={setTab}
        />
        <InvitationsSearchInput
          value={query}
          placeholder={t("search.placeholder")}
          ariaLabel={t("search.ariaLabel")}
          describedById={showPartialSearchHint ? SEARCH_HINT_ID : undefined}
          onChange={setQuery}
        />
      </div>

      {showPartialSearchHint && (
        <p id={SEARCH_HINT_ID} className="mb-3 text-muted-foreground text-xs">
          {t("search.partialResultsHint")}
        </p>
      )}

      {showLoading && (
        <ListSkeleton
          loadingAriaLabel={t("table.loadingAriaLabel")}
          rows={5}
          variant="bordered"
          renderRow={invitationsSkeletonRow}
        />
      )}

      {showError && (
        <ListError
          title={t("error.title")}
          description={t("error.description")}
          retryLabel={t("error.retry")}
          shape="bordered-card"
          iconSize={12}
          retryIcon="none"
          retryButtonVariant="secondary"
          className="px-5"
          titleClassName="mt-4 font-bold text-base text-foreground"
          descriptionClassName="mt-2 max-w-sm text-edu-text-secondary text-sm"
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

      {/* NOT gated on `showTable`: BE may return an EMPTY page while
          `hasMore` is true (status is applied after a bounded keyset read), so
          the control must stay reachable next to the empty state — otherwise
          the admin is stranded on "no invitations" with pages left to read. */}
      {!showError && !showLoading && (
        <LoadMoreButton
          hasMore={hasNextPage}
          isLoadingMore={listQuery.isFetchingNextPage}
          onLoadMore={handleLoadMore}
          label={t("loadMore")}
          errorLabel={t("loadMoreError")}
          hasError={loadMoreError}
        />
      )}

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
