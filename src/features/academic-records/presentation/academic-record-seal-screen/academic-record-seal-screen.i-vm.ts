import type {
  SealAuditEntry,
  SealBatchKey,
  SealBatchStatus,
  SealedStudentOption,
  TenantAdminSummary,
  Term,
  UnsealRequest,
} from "../../domain/entities/seal-batch.entity";
import type { AcademicRecordsFailure } from "../../domain/failures/academic-records.failure";

/** Stable result shape returned by every seal/unseal Server Action. */
export type SealActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; errorKey: AcademicRecordsFailure["type"] };

export interface ClassOption {
  classId: string;
  className: string;
}

export interface InitiateUnsealInput {
  studentId: string;
  classId: string;
  term: Term;
  year: string;
  reason: string;
}

/** Server Action signatures the container invokes (passed as props from page.tsx). */
export interface AcademicRecordSealActions {
  listAvailableClasses: (filter: {
    term: Term;
    year: string;
  }) => Promise<SealActionResult<ClassOption[]>>;
  getSealStatus: (
    key: SealBatchKey,
  ) => Promise<SealActionResult<SealBatchStatus>>;
  seal: (key: SealBatchKey) => Promise<SealActionResult<SealBatchStatus>>;
  getAuditTrail: (
    key?: Partial<SealBatchKey>,
  ) => Promise<SealActionResult<SealAuditEntry[]>>;
  listSealedStudents: (
    filter?: Partial<SealBatchKey>,
  ) => Promise<SealActionResult<SealedStudentOption[]>>;
  getPendingUnsealRequests: () => Promise<SealActionResult<UnsealRequest[]>>;
  initiateUnseal: (
    input: InitiateUnsealInput,
  ) => Promise<SealActionResult<UnsealRequest>>;
  confirmUnseal: (
    requestId: string,
    coSignerId: string | null,
  ) => Promise<SealActionResult<{ request: UnsealRequest; fallback: boolean }>>;
  listTenantAdmins: () => Promise<SealActionResult<TenantAdminSummary[]>>;
}

/** page.tsx (RSC) → AcademicRecordSealContainer props. */
export interface AcademicRecordSealContainerProps {
  actions: AcademicRecordSealActions;
  currentAdminId: string;
}

export type SealTabId = "seal" | "unseal";

// ── Per-tab ViewModels (built by the container from TanStack Query state) ────

export interface SealTabVM {
  year: string;
  term: Term;
  classId: string | null;
  classOptions: ClassOption[];
  isClassOptionsLoading: boolean;
  onYearChange: (year: string) => void;
  onTermChange: (term: Term) => void;
  onClassChange: (classId: string) => void;

  batch: SealBatchStatus | null;
  isBatchLoading: boolean;
  batchError: AcademicRecordsFailure["type"] | null;

  isConfirmDialogOpen: boolean;
  onOpenConfirmDialog: () => void;
  onCloseConfirmDialog: () => void;
  onConfirmSeal: () => void;
  isSealing: boolean;

  auditTrail: SealAuditEntry[];
  isAuditTrailLoading: boolean;
}

export interface UnsealTabVM {
  currentAdminId: string;
  currentAdminName: string;
  tenantAdminCount: number; // drives the self-approve-fallback affordance (ADR 0037)

  pendingRequests: UnsealRequest[];
  resolvedRequests: UnsealRequest[];
  isRequestsLoading: boolean;

  isInitiateFormOpen: boolean;
  onOpenInitiateForm: () => void;
  onCloseInitiateForm: () => void;
  sealedStudentOptions: SealedStudentOption[];
  isSealedStudentOptionsLoading: boolean;
  onSubmitInitiate: (input: InitiateUnsealInput) => void;
  isInitiating: boolean;

  /** Admin2 confirms from the pending list (AC-8) — no active co-signer picker. */
  onConfirmRequest: (requestId: string) => void;
  isConfirming: boolean;
  /** Non-null → same-admin-as-initiator (AC-8); opens UnsealSameAdminDialog. */
  sameAdminErrorRequestId: string | null;
  onDismissSameAdminError: () => void;

  /** Non-null → opens UnsealSelfApproveDialog (ADR 0037 fallback, adminCount === 1). */
  selfApproveTargetRequestId: string | null;
  onRequestSelfApprove: (requestId: string) => void;
  onDismissSelfApprove: () => void;
  onConfirmSelfApprove: (requestId: string) => void;
}

export interface AcademicRecordSealScreenVM {
  activeTab: SealTabId;
  onTabChange: (tab: SealTabId) => void;
  pendingUnsealCount: number; // tab badge

  currentAdminName: string; // "signed in as" chip in the header
  isLoading: boolean; // AC-1 — true while the initial fetch is in flight
  error: AcademicRecordsFailure["type"] | null;

  seal: SealTabVM;
  unseal: UnsealTabVM;
}
