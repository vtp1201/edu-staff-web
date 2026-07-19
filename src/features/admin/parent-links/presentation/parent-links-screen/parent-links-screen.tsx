"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { DestructiveConfirmErrorSlot } from "@/components/shared/destructive-confirm-dialog";
import { LoadMoreButton } from "@/components/shared/load-more-button";
import type { ParentStudentLinkFailure } from "../../domain/failures/parent-student-link.failure";
import { buildRowVM, type RowVMLabels } from "./build-row-vm";
import {
  filtersEqual,
  filterToQueryString,
  hasActiveFilter,
  parseFilterFromParams,
} from "./filter-search-params";
import { parentLinksKeys } from "./parent-links.query-keys";
import type {
  ActionResult,
  CreateLinkActionInput,
  ParentLinkRowVM,
  ParentLinksFilter,
  ParentLinksPage,
  ParentLinksScreenProps,
  UnlinkTarget,
} from "./parent-links-screen.i-vm";
import { PLCardList } from "./pl-card-list";
import {
  PLCreateDialog,
  type PLCreateDialogSubmitError,
} from "./pl-create-dialog";
import { PLDetailDialog } from "./pl-detail-dialog";
import { PLEmpty } from "./pl-empty";
import { PLError } from "./pl-error";
import { PLFilterBar } from "./pl-filter-bar";
import { PLPageHeader } from "./pl-page-header";
import type { PLRowsLabels } from "./pl-rows.i-vm";
import { PLSkeleton } from "./pl-skeleton";
import { PLTable } from "./pl-table";
import { PLUnlinkDialog } from "./pl-unlink-dialog";
import { useIsMobile } from "./use-is-mobile";

type OkPage = Extract<ActionResult<ParentLinksPage>, { ok: true }>;

interface ThrownFailure {
  type: ParentStudentLinkFailure["type"];
  retryable: boolean;
  fields?: { field: string; message: string }[];
}

function isRetryable(err: unknown): boolean {
  return Boolean((err as ThrownFailure | undefined)?.retryable);
}
function failureType(err: unknown): ParentStudentLinkFailure["type"] {
  return (err as ThrownFailure | undefined)?.type ?? "network-error";
}
function failureFields(err: unknown): { field: string; message: string }[] {
  return (err as ThrownFailure | undefined)?.fields ?? [];
}

/**
 * Admin parent-student-link screen container (US-E20.1). The ONLY component
 * touching TanStack Query / URL search params / Server Action refs. Applied
 * filter lives in the URL; a debounced draft mirrors the inputs. RSC seeds page
 * 1. The unlink mutation is NON-OPTIMISTIC (NO onMutate/setQueryData) — the row
 * stays until the server confirms 2xx (AC-005.4, HIGH-RISK).
 */
export function ParentLinksScreen({
  initialFilter,
  initialPage,
  initialErrorKey,
  classOptions,
  listLinksAction,
  createLinkAction,
  unlinkLinkAction,
  getLinkConsentDetailAction,
  searchStudentCandidatesAction,
  searchParentCandidatesAction,
}: ParentLinksScreenProps) {
  const t = useTranslations("parentLinks");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const appliedQs = searchParams.toString();
  const appliedFilter = useMemo(
    () => parseFilterFromParams(new URLSearchParams(appliedQs)),
    [appliedQs],
  );

  const [draft, setDraft] = useState<ParentLinksFilter>(initialFilter);
  // URL → draft (incl. back/forward nav).
  useEffect(() => {
    setDraft(appliedFilter);
  }, [appliedFilter]);
  // Draft → URL (debounced); URL stays the single source of truth for the key.
  useEffect(() => {
    const nextQs = filterToQueryString(draft);
    if (nextQs === appliedQs) return;
    const id = setTimeout(() => {
      router.replace(nextQs ? `${pathname}?${nextQs}` : pathname, {
        scroll: false,
      });
    }, 300);
    return () => clearTimeout(id);
  }, [draft, appliedQs, pathname, router]);

  // Seed the infinite query ONLY for the exact filter RSC rendered (and only if
  // the RSC fetch succeeded — a failed RSC fetch runs fresh client-side).
  const initialData = useMemo(() => {
    if (initialErrorKey) return undefined;
    if (!filtersEqual(appliedFilter, initialFilter)) return undefined;
    return {
      pages: [{ ok: true, data: initialPage } satisfies OkPage],
      pageParams: [null as string | null],
    };
  }, [appliedFilter, initialFilter, initialErrorKey, initialPage]);

  const query = useInfiniteQuery({
    queryKey: parentLinksKeys.list(appliedFilter),
    queryFn: async ({ pageParam }): Promise<OkPage> => {
      const res = await listLinksAction(appliedFilter, pageParam);
      if (!res.ok) {
        throw { type: res.errorKey, retryable: res.retryable } as ThrownFailure;
      }
      return res;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (last) =>
      last.data.hasMore ? last.data.nextCursor : undefined,
    initialData,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    retry: (count, err) => isRetryable(err) && count < 2,
  });

  const items = useMemo(
    () => query.data?.pages.flatMap((p) => p.data.items) ?? [],
    [query.data],
  );

  // A failed load-more must not blank already-loaded rows.
  const [loadMoreError, setLoadMoreError] = useState(false);
  const [prevQs, setPrevQs] = useState(appliedQs);
  if (prevQs !== appliedQs) {
    setPrevQs(appliedQs);
    setLoadMoreError(false);
  }

  const firstPageError = query.isError && items.length === 0;
  const filterActive = hasActiveFilter(appliedFilter);

  // ── Row VMs ────────────────────────────────────────────────────────────────
  const formatDate = useCallback(
    (iso: string) =>
      new Date(iso).toLocaleDateString(locale === "en" ? "en-GB" : "vi-VN"),
    [locale],
  );

  const rowVMLabels: RowVMLabels = useMemo(
    () => ({
      relationshipLabelOf: (r) => t(`relationshipLabels.${r}`),
      consentLabelOf: (c) => t(`consentLabels.${c}`),
      formatDate,
    }),
    [t, formatDate],
  );

  const rows = useMemo(
    () => items.map((link) => buildRowVM(link, rowVMLabels)),
    [items, rowVMLabels],
  );

  const rowsLabels: PLRowsLabels = useMemo(
    () => ({
      columns: {
        student: t("table.columns.student"),
        parent: t("table.columns.parent"),
        relationship: t("table.columns.relationship"),
        consent: t("table.columns.consent"),
        linkedOn: t("table.columns.linkedOn"),
        actions: t("table.columns.actions"),
      },
      studentClassPrefix: (className) => t("classPrefix", { class: className }),
      linkedOnPrefix: t("card.linkedOnPrefix"),
      viewDetailLabel: t("rowMenu.viewDetail"),
      unlinkLabel: t("rowMenu.unlink"),
      rowMenuAriaLabelOf: (studentName, parentName) =>
        t("rowMenu.triggerAriaLabel", {
          student: studentName,
          parent: parentName,
        }),
    }),
    [t],
  );

  // ── Dialog state ─────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [detailRow, setDetailRow] = useState<ParentLinkRowVM | null>(null);
  const [unlinkTarget, setUnlinkTarget] = useState<UnlinkTarget | null>(null);

  // ── Consent sub-fetch (detail dialog only) ─────────────────────────────────
  const consentQuery = useQuery({
    queryKey: parentLinksKeys.consent(
      detailRow?.student.memberId ?? "none",
      detailRow?.parent.memberId ?? "none",
    ),
    queryFn: async () => {
      const res = await getLinkConsentDetailAction(
        detailRow?.student.memberId ?? "",
        detailRow?.parent.memberId ?? "",
      );
      if (!res.ok) {
        throw { type: res.errorKey, retryable: res.retryable } as ThrownFailure;
      }
      return res.data;
    },
    enabled: detailRow !== null,
    staleTime: 0,
    retry: (count, err) => isRetryable(err) && count < 2,
  });

  // ── Create mutation ────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (input: CreateLinkActionInput) => {
      const res = await createLinkAction(input);
      if (!res.ok) {
        throw {
          type: res.errorKey,
          retryable: res.retryable,
          fields: res.fields,
        } as ThrownFailure;
      }
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: parentLinksKeys.lists() });
      toast.success(
        t("toasts.created", {
          parent: data.parentName,
          student: data.studentName,
        }),
      );
      setCreateOpen(false);
    },
    onError: (err) => {
      // Dialog stays open, fields preserved (local state, untouched). No cache
      // disturbance. Duplicate/validation → inline; network → toast + inline.
      if (failureType(err) === "network-error") {
        toast.error(t("errors.createNetwork"));
      }
    },
  });

  const createSubmitError: PLCreateDialogSubmitError | undefined = (() => {
    if (!createMutation.isError) return undefined;
    const type = failureType(createMutation.error);
    if (type === "already-linked") {
      return { kind: "already-linked", message: t("errors.alreadyLinked") };
    }
    if (type === "validation") {
      const fieldErrors = failureFields(createMutation.error).map((f) => ({
        field: f.field as "studentId" | "parentId" | "relationship" | "note",
        message:
          f.field === "parentId"
            ? t("errors.parentNotEligible")
            : t("errors.studentInvalid"),
      }));
      return {
        kind: "validation",
        message: t("errors.validation"),
        fieldErrors,
      };
    }
    // network-error / forbidden (should not reach post route-gate)
    return { kind: "network-error", message: t("errors.createNetwork") };
  })();

  // ── Unlink mutation — NON-OPTIMISTIC (AC-005.4, HIGH-RISK) ──────────────────
  // *** NO onMutate. NO optimistic setQueryData. *** The row stays until 2xx.
  const unlinkMutation = useMutation({
    mutationFn: async (target: UnlinkTarget) => {
      const res = await unlinkLinkAction(target.linkId);
      if (!res.ok) {
        throw { type: res.errorKey, retryable: res.retryable } as ThrownFailure;
      }
    },
    onSuccess: (_data, target) => {
      queryClient.invalidateQueries({ queryKey: parentLinksKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: parentLinksKeys.detail(target.linkId),
      });
      queryClient.invalidateQueries({
        queryKey: parentLinksKeys.consent(target.studentId, target.parentId),
      });
      toast.success(t("toasts.unlinked", { parent: target.parentName }));
      setUnlinkTarget(null);
    },
    onError: (err) => {
      if (failureType(err) === "not-found") {
        // 404 race (AC-005.7): server truth wins — row IS gone. Invalidate so
        // refetch removes it (NOT a manual splice); close + info toast.
        queryClient.invalidateQueries({ queryKey: parentLinksKeys.lists() });
        setUnlinkTarget(null);
        toast.info(t("toasts.alreadyRemoved"));
        return;
      }
      // forbidden (403) + network-error: touch NOTHING in the cache. Dialog
      // stays open with an inline errorSlot (derived below).
    },
  });

  const unlinkErrorSlot: DestructiveConfirmErrorSlot | undefined = (() => {
    if (!unlinkMutation.isError) return undefined;
    const type = failureType(unlinkMutation.error);
    if (type === "forbidden") {
      return { tone: "forbidden", message: t("errors.unlinkForbidden") };
    }
    if (type === "network-error" || isRetryable(unlinkMutation.error)) {
      return {
        tone: "transient",
        message: t("errors.unlinkNetwork"),
        onRetry: () => unlinkTarget && unlinkMutation.mutate(unlinkTarget),
      };
    }
    return undefined; // not-found already closed the dialog
  })();

  // ── Handlers ─────────────────────────────────────────────────────────────
  const openCreate = useCallback(() => {
    createMutation.reset();
    setCreateOpen(true);
  }, [createMutation]);

  const handleUnlinkRequest = useCallback(
    (row: ParentLinkRowVM) => {
      unlinkMutation.reset();
      setUnlinkTarget({
        linkId: row.linkId,
        studentId: row.student.memberId,
        parentId: row.parent.memberId,
        parentName: row.parent.fullName,
        studentName: row.student.fullName,
        className: row.student.className,
      });
    },
    [unlinkMutation],
  );

  const onSearchStudents = useCallback(
    async (q: string) => {
      const res = await searchStudentCandidatesAction(q);
      if (!res.ok)
        throw { type: res.errorKey, retryable: res.retryable } as ThrownFailure;
      return res.data;
    },
    [searchStudentCandidatesAction],
  );
  const onSearchParents = useCallback(
    async (q: string) => {
      const res = await searchParentCandidatesAction(q);
      if (!res.ok)
        throw { type: res.errorKey, retryable: res.retryable } as ThrownFailure;
      return res.data;
    },
    [searchParentCandidatesAction],
  );

  const consentSection = {
    status: consentQuery.isLoading
      ? ("loading" as const)
      : consentQuery.isError
        ? ("error" as const)
        : ("success" as const),
    data: consentQuery.data,
    errorMessage: t("errors.consentUnavailable"),
    onRetry: () => consentQuery.refetch(),
    labels: {
      sectionTitle: t("detailDialog.consentSectionTitle"),
      disciplineAlerts: t("consentCategories.discipline"),
      absenceAlerts: t("consentCategories.absence"),
      gradeAlerts: t("consentCategories.grades"),
      onLabel: t("consentCategories.on"),
      offLabel: t("consentCategories.off"),
      loadingLabel: t("detailDialog.consentLoading"),
      retryLabel: t("errors.retry"),
    },
  };

  const showSkeleton = query.isLoading && items.length === 0;
  const showEmpty = !firstPageError && !query.isLoading && items.length === 0;
  const showList = !firstPageError && items.length > 0;

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-5 md:px-8 md:py-7">
      <PLPageHeader
        title={t("pageTitle")}
        subtitle={t("pageSubtitle")}
        createLabel={t("createButton")}
        onOpenCreateDialog={openCreate}
      />

      <PLFilterBar
        q={draft.q}
        classId={draft.classId}
        classOptions={classOptions}
        searchPlaceholder={t("filterBar.searchPlaceholder")}
        searchAriaLabel={t("filterBar.searchAriaLabel")}
        classFilterAriaLabel={t("filterBar.classFilterAriaLabel")}
        allClassesLabel={t("filterBar.allClasses")}
        clearFiltersLabel={t("filterBar.clearFilters")}
        hasActiveFilter={hasActiveFilter(draft)}
        onQChange={(q) => setDraft((d) => ({ ...d, q }))}
        onClassChange={(classId) => setDraft((d) => ({ ...d, classId }))}
        onClearFilters={() => setDraft({ q: "", classId: null })}
      />

      {showSkeleton && (
        <PLSkeleton loadingAriaLabel={t("states.loadingAriaLabel")} />
      )}

      {firstPageError && (
        <PLError
          title={t("errors.loadTitle")}
          description={t("errors.loadDescription")}
          retryLabel={t("errors.retry")}
          onRetry={() => query.refetch()}
        />
      )}

      {showEmpty && (
        <PLEmpty
          variant={filterActive ? "filtered" : "no-filter"}
          noFilterTitle={t("empty.noFilterTitle")}
          noFilterBody={t("empty.noFilterBody")}
          noFilterCreateLabel={t("empty.noFilterCreate")}
          filteredTitle={t("empty.filteredTitle")}
          filteredBody={t("empty.filteredBody")}
          filteredClearLabel={t("empty.filteredClear")}
          onOpenCreateDialog={openCreate}
          onClearFilters={() => setDraft({ q: "", classId: null })}
        />
      )}

      {showList &&
        (isMobile ? (
          <PLCardList
            rows={rows}
            labels={rowsLabels}
            onViewDetail={(linkId) =>
              setDetailRow(rows.find((r) => r.linkId === linkId) ?? null)
            }
            onUnlinkRequest={handleUnlinkRequest}
          />
        ) : (
          <PLTable
            rows={rows}
            labels={rowsLabels}
            onViewDetail={(linkId) =>
              setDetailRow(rows.find((r) => r.linkId === linkId) ?? null)
            }
            onUnlinkRequest={handleUnlinkRequest}
          />
        ))}

      {showList && (
        <LoadMoreButton
          hasMore={query.hasNextPage ?? false}
          isLoadingMore={query.isFetchingNextPage}
          onLoadMore={() => {
            setLoadMoreError(false);
            query
              .fetchNextPage({ throwOnError: true })
              .catch(() => setLoadMoreError(true));
          }}
          hasError={loadMoreError}
          label={t("loadMore")}
          errorLabel={t("loadMoreError")}
        />
      )}

      {showList && (
        <p className="mt-3 text-muted-foreground text-xs">
          {t("summary.count", { count: rows.length })}
          {filterActive ? t("summary.filtered") : ""}
        </p>
      )}

      <PLCreateDialog
        open={createOpen}
        isSubmitting={createMutation.isPending}
        submitError={createSubmitError}
        onSearchStudents={onSearchStudents}
        onSearchParents={onSearchParents}
        onSubmit={(input) => createMutation.mutate(input)}
        onClose={() => setCreateOpen(false)}
      />

      <PLDetailDialog
        open={detailRow !== null}
        row={detailRow}
        consent={consentSection}
        onClose={() => setDetailRow(null)}
      />

      <PLUnlinkDialog
        open={unlinkTarget !== null}
        target={unlinkTarget}
        isLoading={unlinkMutation.isPending}
        errorSlot={unlinkErrorSlot}
        onConfirm={() => unlinkTarget && unlinkMutation.mutate(unlinkTarget)}
        onCancel={() => setUnlinkTarget(null)}
      />
    </div>
  );
}
