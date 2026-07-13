"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  DestructiveConfirmDialog,
  type DestructiveConfirmErrorSlot,
} from "@/components/shared/destructive-confirm-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ReportQueueFilter } from "../../domain/entities/report-queue-filter.entity";
import type { ModerationFailure } from "../../domain/failures/moderation.failure";
import {
  type AuditStatus,
  AuditTimelineTab,
} from "./components/audit-timeline-tab";
import {
  filtersEqual,
  type ModerationTab,
  parseFilterFromParams,
  parseTabFromParams,
  toQueryString,
} from "./components/filter-search-params";
import { LoadMoreButton } from "./components/load-more-button";
import { QueueFilterBar } from "./components/queue-filter-bar";
import {
  type DetailSheetStatus,
  ReportDetailSheet,
} from "./components/report-detail-sheet";
import {
  type QueueStatus,
  ReportQueueResults,
} from "./components/report-queue-results";
import { StatRow } from "./components/stat-row";
import type {
  ModerationScreenProps,
  RemoveContentInput,
} from "./moderation-screen.i-vm";

/** Query-key factory (colocated with the container — matches auditLogKeys). */
export const moderationKeys = {
  all: () => ["moderation"] as const,
  lists: () => [...moderationKeys.all(), "list"] as const,
  list: (filter: ReportQueueFilter) =>
    [...moderationKeys.lists(), filter] as const,
  details: () => [...moderationKeys.all(), "detail"] as const,
  detail: (reportId: string) =>
    [...moderationKeys.details(), reportId] as const,
  audits: () => [...moderationKeys.all(), "audit"] as const,
  audit: () => moderationKeys.audits(),
} as const;

interface ThrownFailure {
  type: ModerationFailure["type"];
  retryable: boolean;
}

function isRetryable(err: unknown): boolean {
  return Boolean((err as ThrownFailure | undefined)?.retryable);
}
function failureType(err: unknown): ModerationFailure["type"] {
  return (err as ThrownFailure | undefined)?.type ?? "network-error";
}

/**
 * Moderation screen container (US-E19.2). The ONLY component touching TanStack
 * Query / URL search params / the Server Action refs. Queue filter + active tab
 * live in the URL; a debounced draft mirrors the filter inputs. RSC seeds queue
 * page 1 (+ embedded stats). Detail sheet + audit tab are client-only queries.
 *
 * `removeContent` is NEVER optimistic — the mutation below has NO `onMutate` /
 * `setQueryData`; content is only marked removed once the invalidated query
 * refetches the server-confirmed state (NFR-101 / AC-1928.4/1928.6).
 */
export function ModerationScreen({
  initialFilter,
  initialQueuePage,
  initialStats,
  initialErrorKey,
  auditScopeId,
  viewerRole,
  listReportsAction,
  getReportDetailAction,
  dismissReportAction,
  removeContentAction,
  getModerationAuditLogAction,
}: ModerationScreenProps) {
  const t = useTranslations("moderation");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const appliedQs = searchParams.toString();
  const appliedParams = useMemo(
    () => new URLSearchParams(appliedQs),
    [appliedQs],
  );
  const appliedFilter = useMemo(
    () => parseFilterFromParams(appliedParams),
    [appliedParams],
  );
  const tab = parseTabFromParams(appliedParams);

  const [draft, setDraft] = useState<ReportQueueFilter>(initialFilter);
  // URL → draft (incl. back/forward nav).
  useEffect(() => {
    setDraft(appliedFilter);
  }, [appliedFilter]);
  // Draft → URL (debounced); URL stays the single source of truth for the key.
  useEffect(() => {
    const nextQs = toQueryString(draft, tab);
    if (nextQs === appliedQs) return;
    const id = setTimeout(() => {
      router.replace(nextQs ? `${pathname}?${nextQs}` : pathname, {
        scroll: false,
      });
    }, 300);
    return () => clearTimeout(id);
  }, [draft, tab, appliedQs, pathname, router]);

  // ── Queue query (RSC-seeded page 1) ──────────────────────────────────────
  const queueInitialData = useMemo(() => {
    if (initialErrorKey) return undefined;
    if (!filtersEqual(appliedFilter, initialFilter)) return undefined;
    return {
      pages: [
        {
          ok: true as const,
          data: initialQueuePage,
          stats: initialStats,
        },
      ],
      pageParams: [null as string | null],
    };
  }, [
    appliedFilter,
    initialFilter,
    initialErrorKey,
    initialQueuePage,
    initialStats,
  ]);

  const queueQuery = useInfiniteQuery({
    queryKey: moderationKeys.list(appliedFilter),
    queryFn: async ({ pageParam }) => {
      const res = await listReportsAction(appliedFilter, pageParam);
      if (!res.ok) {
        throw { type: res.errorKey, retryable: res.retryable } as ThrownFailure;
      }
      return res;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (last) =>
      last.data.hasMore ? last.data.nextCursor : undefined,
    initialData: queueInitialData,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    retry: (count, err) => isRetryable(err) && count < 2,
  });

  const reports = useMemo(
    () => queueQuery.data?.pages.flatMap((p) => p.data.reports) ?? [],
    [queueQuery.data],
  );
  const latestStats = queueQuery.data?.pages.at(-1)?.stats ?? null;

  const firstPageError = queueQuery.isError && reports.length === 0;
  const queueErrorKey = firstPageError ? failureType(queueQuery.error) : null;
  const queueRetryable = firstPageError && isRetryable(queueQuery.error);

  const queueStatus: QueueStatus = firstPageError
    ? "error"
    : queueQuery.isLoading
      ? "loading"
      : reports.length === 0
        ? appliedFilter.status === "pending" &&
          (latestStats?.pendingCount ?? 0) === 0
          ? "empty-positive"
          : "empty-filtered"
        : "success";

  // ── Detail sheet query (client-only, always fresh) ───────────────────────
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const detailOpen = selectedReportId !== null;

  const detailQuery = useQuery({
    queryKey: moderationKeys.detail(selectedReportId ?? "none"),
    queryFn: async () => {
      const res = await getReportDetailAction(selectedReportId as string);
      if (!res.ok) {
        throw { type: res.errorKey, retryable: res.retryable } as ThrownFailure;
      }
      return res.data;
    },
    enabled: detailOpen && !!selectedReportId,
    staleTime: 0,
    retry: (count, err) => isRetryable(err) && count < 2,
  });

  const detailStatus: DetailSheetStatus = !detailOpen
    ? "loading"
    : detailQuery.isError
      ? failureType(detailQuery.error) === "not-found"
        ? "error-not-found"
        : "error-transient"
      : detailQuery.data
        ? "success"
        : "loading";

  // ── Audit tab query (client-only, enabled when active) ───────────────────
  const auditQuery = useInfiniteQuery({
    queryKey: moderationKeys.audit(),
    queryFn: async ({ pageParam }) => {
      const res = await getModerationAuditLogAction(auditScopeId, pageParam);
      if (!res.ok) {
        throw { type: res.errorKey, retryable: res.retryable } as ThrownFailure;
      }
      return res;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (last) =>
      last.data.hasMore ? last.data.nextCursor : undefined,
    enabled: tab === "audit",
    staleTime: 15_000,
    refetchOnWindowFocus: false,
    retry: (count, err) => isRetryable(err) && count < 2,
  });

  const auditEntries = useMemo(
    () => auditQuery.data?.pages.flatMap((p) => p.data.entries) ?? [],
    [auditQuery.data],
  );
  const auditFirstError = auditQuery.isError && auditEntries.length === 0;
  const auditStatus: AuditStatus = auditFirstError
    ? "error"
    : tab === "audit" && auditQuery.isLoading
      ? "loading"
      : auditEntries.length === 0
        ? "empty"
        : "success";

  // ── Mutations ────────────────────────────────────────────────────────────
  const dismissMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const res = await dismissReportAction(reportId);
      if (!res.ok) {
        throw { type: res.errorKey, retryable: res.retryable } as ThrownFailure;
      }
    },
    onSuccess: (_data, reportId) => {
      queryClient.invalidateQueries({ queryKey: moderationKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: moderationKeys.detail(reportId),
      });
      // Dismiss also records a server-side audit entry (NFR-101) — invalidate
      // audits() for cache-freshness parity with removeContent's invalidation
      // (QA finding, US-E19.2: previously only removeContent busted this key,
      // leaving an already-open/cached audit tab stale after a dismiss).
      queryClient.invalidateQueries({ queryKey: moderationKeys.audits() });
      toast.success(t("toasts.dismissed"));
      setSelectedReportId(null);
    },
    onError: (err, reportId) => {
      // 409 → refetch the detail so the sheet shows current state (no overwrite).
      if (failureType(err) === "already-resolved") {
        queryClient.invalidateQueries({
          queryKey: moderationKeys.detail(reportId),
        });
      }
      // forbidden/transient: inline error only (no cache disturbance).
    },
  });

  // Confirm-remove dialog. `removeVars` captured at open time (state-design §8).
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [removeVars, setRemoveVars] = useState<RemoveContentInput | null>(null);

  const removeMutation = useMutation({
    // *** NO onMutate. NO optimistic setQueryData. *** (NFR-101 / AC-1928.6)
    mutationFn: async (vars: RemoveContentInput) => {
      const res = await removeContentAction(vars);
      if (!res.ok) {
        throw { type: res.errorKey, retryable: res.retryable } as ThrownFailure;
      }
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: moderationKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: moderationKeys.detail(vars.reportId),
      });
      queryClient.invalidateQueries({ queryKey: moderationKeys.audits() });
      toast.success(t("toasts.removed"));
      setConfirmOpen(false);
      setSelectedReportId(null);
    },
    onError: (err, vars) => {
      // 409 only: dialog closes, queue + detail refetch (a real server-side
      // state change by a concurrent principal) — NOT "never invalidate on
      // error". forbidden/transient deliberately invalidate NOTHING.
      if (failureType(err) === "already-resolved") {
        queryClient.invalidateQueries({ queryKey: moderationKeys.lists() });
        queryClient.invalidateQueries({
          queryKey: moderationKeys.detail(vars.reportId),
        });
        setConfirmOpen(false);
        toast.error(t("errors.already-resolved"));
      }
    },
  });

  const removeErrorSlot: DestructiveConfirmErrorSlot | undefined = (() => {
    if (!removeMutation.isError) return undefined;
    const type = failureType(removeMutation.error);
    if (type === "forbidden") {
      return { tone: "forbidden", message: t("errors.forbidden") };
    }
    if (type === "network-error" || isRetryable(removeMutation.error)) {
      return {
        tone: "transient",
        message: t("errors.network-error"),
        onRetry: () => removeVars && removeMutation.mutate(removeVars),
      };
    }
    return undefined; // already-resolved closes the dialog (handled above)
  })();

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleTabChange = useCallback(
    (next: string) => {
      const nextQs = toQueryString(draft, next as ModerationTab);
      router.replace(nextQs ? `${pathname}?${nextQs}` : pathname, {
        scroll: false,
      });
    },
    [draft, pathname, router],
  );

  const handleFilterChange = useCallback(
    (patch: Partial<ReportQueueFilter>) => {
      setDraft((d) => ({ ...d, ...patch }));
    },
    [],
  );

  const handleOpenDetail = useCallback(
    (reportId: string) => {
      dismissMutation.reset();
      setSelectedReportId(reportId);
    },
    [dismissMutation],
  );

  const handleDetailOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setSelectedReportId(null);
      setConfirmOpen(false);
    }
  }, []);

  const handleDismiss = useCallback(() => {
    if (selectedReportId) dismissMutation.mutate(selectedReportId);
  }, [selectedReportId, dismissMutation]);

  const handleOpenRemoveConfirm = useCallback(() => {
    const d = detailQuery.data;
    if (!d || d.kind === "message") return;
    setRemoveVars({ kind: d.kind, contentId: d.contentId, reportId: d.id });
    removeMutation.reset();
    setConfirmOpen(true);
  }, [detailQuery.data, removeMutation]);

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-4 p-6 md:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="font-extrabold text-2xl text-foreground">
          {t("title")}
        </h1>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </header>

      <StatRow
        stats={latestStats}
        isLoading={queueQuery.isLoading || firstPageError}
      />

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="queue">{t("tabs.queue")}</TabsTrigger>
          <TabsTrigger value="audit">{t("tabs.audit")}</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "queue" ? (
        <div className="flex flex-col gap-4">
          <QueueFilterBar
            filter={draft}
            onFilterChange={handleFilterChange}
            onRefresh={() => queueQuery.refetch()}
          />
          <ReportQueueResults
            status={queueStatus}
            reports={reports}
            errorKey={queueErrorKey}
            errorRetryable={queueRetryable}
            onRetry={() => queueQuery.refetch()}
            onOpen={handleOpenDetail}
          />
          {queueStatus === "success" && (
            <LoadMoreButton
              hasMore={queueQuery.hasNextPage ?? false}
              isLoadingMore={queueQuery.isFetchingNextPage}
              onLoadMore={() => queueQuery.fetchNextPage()}
              hasError={queueQuery.isError && reports.length > 0}
            />
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <AuditTimelineTab
            status={auditStatus}
            entries={auditEntries}
            errorKey={auditFirstError ? failureType(auditQuery.error) : null}
            errorRetryable={auditFirstError && isRetryable(auditQuery.error)}
            onRetry={() => auditQuery.refetch()}
          />
          {auditStatus === "success" && (
            <LoadMoreButton
              hasMore={auditQuery.hasNextPage ?? false}
              isLoadingMore={auditQuery.isFetchingNextPage}
              onLoadMore={() => auditQuery.fetchNextPage()}
              hasError={auditQuery.isError && auditEntries.length > 0}
            />
          )}
        </div>
      )}

      <ReportDetailSheet
        open={detailOpen}
        onOpenChange={handleDetailOpenChange}
        status={detailStatus}
        detail={detailQuery.data ?? null}
        viewerRole={viewerRole}
        onDismiss={handleDismiss}
        dismissPending={dismissMutation.isPending}
        dismissErrorKey={
          dismissMutation.isError ? failureType(dismissMutation.error) : null
        }
        onRemove={handleOpenRemoveConfirm}
        onRetry={() => detailQuery.refetch()}
      />

      <DestructiveConfirmDialog
        open={confirmOpen}
        title={t("removeDialog.title")}
        body={t("removeDialog.body")}
        confirmLabel={t("removeDialog.confirm")}
        isLoading={removeMutation.isPending}
        errorSlot={removeErrorSlot}
        onConfirm={() => removeVars && removeMutation.mutate(removeVars)}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
