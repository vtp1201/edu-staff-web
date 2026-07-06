"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
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

  const pendingQuery = useQuery({
    queryKey: academicRecordSealKeys.pendingUnsealRequests(),
    staleTime: 0,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const res = await actions.getPendingUnsealRequests();
      if (!res.ok) throw res.errorKey;
      return res.data;
    },
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
      queryClient.invalidateQueries({
        queryKey: academicRecordSealKeys.pendingUnsealRequests(),
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
    }) => actions.confirmUnseal(requestId, coSignerId),
    onSuccess: (res, { requestId, coSignerId }) => {
      if (!res.ok) {
        if (res.errorKey === "same-admin-as-initiator") {
          setSameAdminErrorRequestId(requestId);
          return;
        }
        if (res.errorKey === "no-pending-request") {
          queryClient.invalidateQueries({
            queryKey: academicRecordSealKeys.pendingUnsealRequests(),
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
        queryKey: academicRecordSealKeys.pendingUnsealRequests(),
      });
      queryClient.invalidateQueries({
        queryKey: academicRecordSealKeys.auditTrail(),
      });
      queryClient.invalidateQueries({
        queryKey: academicRecordSealKeys.all,
      });
    },
  });

  const pendingRequests = pendingQuery.data ?? [];
  const isSealLoading = classesQuery.isPending;
  const isUnsealLoading = pendingQuery.isPending;

  // Surface the active tab's primary-fetch failure as the full-screen error
  // state (AC-1). The stable errorKey is thrown from each queryFn above.
  const activeError = (
    activeTab === "seal" ? classesQuery.error : pendingQuery.error
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
          pendingRequests,
          isRequestsLoading: pendingQuery.isPending,
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
