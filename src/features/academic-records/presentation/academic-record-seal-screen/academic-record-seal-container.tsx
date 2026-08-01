"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import type {
  SealBatchKey,
  Term,
} from "../../domain/entities/seal-batch.entity";
import type { AcademicRecordsFailure } from "../../domain/failures/academic-records.failure";
import { academicRecordSealKeys } from "./academic-record-seal-keys";
import { AcademicRecordSealScreen } from "./academic-record-seal-screen";
import type {
  AcademicRecordSealContainerProps,
  InitiateUnsealInput,
  SealTabId,
} from "./academic-record-seal-screen.i-vm";

const DEFAULT_YEAR = "2025-2026";
const DEFAULT_TERM: Term = "HK1";

export function AcademicRecordSealContainer({
  actions,
  currentAdminId,
}: AcademicRecordSealContainerProps) {
  const t = useTranslations("academicRecordSeal");
  const tSelector = useTranslations("academicRecordSeal.selector");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const activeTab = (searchParams.get("tab") as SealTabId) ?? "seal";
  const year = searchParams.get("year") ?? DEFAULT_YEAR;
  const term = (searchParams.get("term") as Term) ?? DEFAULT_TERM;
  const classId = searchParams.get("classId");

  const setParam = useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null) params.delete(k);
        else params.set(k, v);
      }
      router.replace(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  const [isConfirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [isInitiateFormOpen, setInitiateFormOpen] = useState(false);
  const [sameAdminErrorRequestId, setSameAdminErrorRequestId] = useState<
    string | null
  >(null);
  const [selfApproveTargetRequestId, setSelfApproveTargetRequestId] = useState<
    string | null
  >(null);

  const showError = useCallback(
    (errorKey: AcademicRecordsFailure["type"]) => {
      toast.error(t(`errors.${errorKey}`));
    },
    [t],
  );

  // ── Queries ────────────────────────────────────────────────────────────────
  const classesQuery = useQuery({
    queryKey: academicRecordSealKeys.availableClasses(term, year),
    queryFn: async () => {
      const res = await actions.listAvailableClasses({ term, year });
      if (!res.ok) throw res.errorKey;
      return res.data;
    },
  });

  const key: SealBatchKey | null = classId ? { classId, term, year } : null;

  const sealStatusQuery = useQuery({
    queryKey: key
      ? academicRecordSealKeys.sealStatus(key)
      : academicRecordSealKeys.sealStatus({ classId: "", term, year }),
    enabled: key !== null,
    staleTime: 0,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      if (!key) return null;
      const res = await actions.getSealStatus(key);
      if (!res.ok) throw res.errorKey;
      return res.data;
    },
  });

  const auditQuery = useQuery({
    queryKey: academicRecordSealKeys.auditTrail(),
    staleTime: 15_000,
    queryFn: async () => {
      const res = await actions.getAuditTrail();
      if (!res.ok) throw res.errorKey;
      return res.data;
    },
  });

  const sealedStudentsQuery = useQuery({
    queryKey: academicRecordSealKeys.sealedStudents(),
    queryFn: async () => {
      const res = await actions.listSealedStudents();
      if (!res.ok) throw res.errorKey;
      return res.data;
    },
  });

  // US-E18.24 — cursor-paginated + class/term-scoped (mirrors audit-log's
  // `useInfiniteQuery` pattern). Disabled until a class is chosen: there is no
  // tenant-wide unseal listing on the wire.
  const pendingQuery = useInfiniteQuery({
    queryKey: academicRecordSealKeys.pendingUnsealRequests(classId ?? "", term),
    enabled: classId !== null,
    staleTime: 0,
    refetchOnWindowFocus: true,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      if (!classId) {
        return { items: [], nextCursor: null as string | null, hasMore: false };
      }
      const res = await actions.getPendingUnsealRequests(classId, term, {
        cursor: pageParam,
      });
      if (!res.ok) throw res.errorKey;
      return res.data;
    },
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? (lastPage.nextCursor ?? undefined) : undefined,
  });

  const adminsQuery = useQuery({
    queryKey: academicRecordSealKeys.tenantAdmins(),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const res = await actions.listTenantAdmins();
      if (!res.ok) throw res.errorKey;
      return res.data;
    },
  });

  const admins = adminsQuery.data ?? [];
  const currentAdminName =
    admins.find((a) => a.id === currentAdminId)?.name ?? currentAdminId;

  // ── Mutations ────────────────────────────────────────────────────────────────
  const sealMutation = useMutation({
    mutationFn: (batchKey: SealBatchKey) => actions.seal(batchKey),
    onSuccess: (res, batchKey) => {
      if (!res.ok) {
        showError(res.errorKey);
        return;
      }
      toast.success(
        t("sealSuccess.toast", {
          class: batchKey.classId,
          term: tSelector(batchKey.term === "HK1" ? "term1" : "term2"),
        }),
      );
      setConfirmDialogOpen(false);
      queryClient.invalidateQueries({
        queryKey: academicRecordSealKeys.sealStatus(batchKey),
      });
      queryClient.invalidateQueries({
        queryKey: academicRecordSealKeys.auditTrail(),
      });
    },
  });

  const initiateMutation = useMutation({
    mutationFn: (input: InitiateUnsealInput) => actions.initiateUnseal(input),
    onSuccess: (res) => {
      if (!res.ok) {
        showError(res.errorKey);
        return;
      }
      toast.success(t("unseal.success.initiateToast"));
      setInitiateFormOpen(false);
      // Broad prefix invalidation: the created request may belong to a class
      // other than the selected one, and the BE listing is served from a
      // reconciler-maintained clone table (eventually consistent).
      queryClient.invalidateQueries({
        queryKey: academicRecordSealKeys.all,
      });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: ({
      requestId,
      coSignerId,
    }: {
      requestId: string;
      coSignerId: string | null;
    }) => actions.confirmUnseal(requestId, coSignerId, classId ?? "", term),
    onSuccess: (res, { requestId, coSignerId }) => {
      if (!res.ok) {
        if (res.errorKey === "same-admin-as-initiator") {
          setSameAdminErrorRequestId(requestId);
          return;
        }
        if (
          res.errorKey === "no-pending-request" ||
          res.errorKey === "unseal-request-already-approved"
        ) {
          queryClient.invalidateQueries({
            queryKey: academicRecordSealKeys.all,
          });
        }
        showError(res.errorKey);
        return;
      }
      toast.success(
        coSignerId === null
          ? t("unseal.success.selfApproveToast")
          : t("unseal.success.confirmToast"),
      );
      setSelfApproveTargetRequestId(null);
      queryClient.invalidateQueries({
        queryKey: academicRecordSealKeys.auditTrail(),
      });
      queryClient.invalidateQueries({
        queryKey: academicRecordSealKeys.all,
      });
    },
  });

  const pendingRequests = useMemo(
    () => pendingQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [pendingQuery.data],
  );
  const isSealLoading = classesQuery.isPending;
  // With `enabled: false` (no class selected) TanStack keeps the query pending
  // forever — that must NOT read as "loading" or the tab would never render
  // its "pick a class" prompt.
  const isUnsealLoading = classId !== null && pendingQuery.isPending;

  // Surface the active tab's primary-fetch failure as the full-screen error
  // state (AC-1). The stable errorKey is thrown from each queryFn above.
  // A failed load-more must not blank an already-rendered list, so only a
  // first-page failure (nothing loaded yet) escalates to the screen-level error.
  const activeError = (
    activeTab === "seal"
      ? classesQuery.error
      : pendingRequests.length === 0
        ? pendingQuery.error
        : null
  ) as AcademicRecordsFailure["type"] | null;

  return (
    <AcademicRecordSealScreen
      onGoToApproval={() =>
        router.push(pathname.replace(/\/academic-records$/, "/grades/approval"))
      }
      vm={{
        activeTab,
        onTabChange: (tab) => setParam({ tab }),
        pendingUnsealCount: pendingRequests.length,
        currentAdminName,
        isLoading: activeTab === "seal" ? isSealLoading : isUnsealLoading,
        error: activeError ?? null,
        seal: {
          year,
          term,
          classId,
          classOptions: classesQuery.data ?? [],
          isClassOptionsLoading: classesQuery.isPending,
          onYearChange: (y) => setParam({ year: y, classId: null }),
          onTermChange: (tm) => setParam({ term: tm, classId: null }),
          onClassChange: (c) => setParam({ classId: c }),
          batch: sealStatusQuery.data ?? null,
          isBatchLoading: sealStatusQuery.isPending && key !== null,
          batchError:
            (sealStatusQuery.error as unknown as AcademicRecordsFailure["type"]) ??
            null,
          isConfirmDialogOpen,
          onOpenConfirmDialog: () => setConfirmDialogOpen(true),
          onCloseConfirmDialog: () => setConfirmDialogOpen(false),
          onConfirmSeal: () => {
            if (key) sealMutation.mutate(key);
          },
          isSealing: sealMutation.isPending,
          auditTrail: auditQuery.data ?? [],
          isAuditTrailLoading: auditQuery.isPending,
        },
        unseal: {
          currentAdminId,
          currentAdminName,
          tenantAdminCount: admins.length,
          classId,
          pendingRequests,
          isRequestsLoading: isUnsealLoading,
          hasNextPage: pendingQuery.hasNextPage,
          isFetchingNextPage: pendingQuery.isFetchingNextPage,
          // Rows already on screen + query in error = the LOAD-MORE fetch is
          // what failed (a first-page failure escalates to `error` above and
          // never reaches here). Same convention as feed/moderation screens.
          hasLoadMoreError: pendingQuery.isError && pendingRequests.length > 0,
          onLoadMore: () => {
            pendingQuery.fetchNextPage();
          },
          isInitiateFormOpen,
          onOpenInitiateForm: () => setInitiateFormOpen(true),
          onCloseInitiateForm: () => setInitiateFormOpen(false),
          sealedStudentOptions: sealedStudentsQuery.data ?? [],
          isSealedStudentOptionsLoading: sealedStudentsQuery.isPending,
          onSubmitInitiate: (input) => initiateMutation.mutate({ ...input }),
          isInitiating: initiateMutation.isPending,
          onConfirmRequest: (requestId) =>
            confirmMutation.mutate({ requestId, coSignerId: currentAdminId }),
          isConfirming: confirmMutation.isPending,
          sameAdminErrorRequestId,
          onDismissSameAdminError: () => setSameAdminErrorRequestId(null),
          selfApproveTargetRequestId,
          onRequestSelfApprove: (requestId) =>
            setSelfApproveTargetRequestId(requestId),
          onDismissSelfApprove: () => setSelfApproveTargetRequestId(null),
          onConfirmSelfApprove: (requestId) =>
            confirmMutation.mutate({ requestId, coSignerId: null }),
        },
      }}
    />
  );
}
