import type {
  BatchStatus,
  GradeApprovalBatch,
  GradeApprovalBatchDetail,
} from "../../domain/entities/grade-approval-batch.entity";
import type { GradesFailure } from "../../domain/failures/grades.failure";

export type StatusFilter = "ALL" | BatchStatus;

/** Stable result shape returned by the approval Server Actions. */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; errorKey: GradesFailure["type"] };

/** Server Action signatures the screen invokes (passed as props). */
export interface GradeApprovalActions {
  approve: (batchId: string) => Promise<ActionResult<GradeApprovalBatch>>;
  requestRevision: (
    batchId: string,
    note: string,
  ) => Promise<ActionResult<GradeApprovalBatch>>;
  bulkLock: (batchIds: string[]) => Promise<ActionResult<GradeApprovalBatch[]>>;
  listBatches: (
    statusFilter?: BatchStatus,
  ) => Promise<ActionResult<GradeApprovalBatch[]>>;
  getDetail: (
    batchId: string,
  ) => Promise<ActionResult<GradeApprovalBatchDetail>>;
}

export interface GradeApprovalScreenVM {
  batches: GradeApprovalBatch[];
  isLoading: boolean;
  error: GradesFailure["type"] | null;
  statusFilter: StatusFilter;
  onFilterChange: (f: StatusFilter) => void;

  selectedBatchIds: string[];
  onSelectBatch: (id: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;

  onOpenBatchDetail: (id: string) => void;
  detailBatchId: string | null;
  onCloseDetail: () => void;
  detail: GradeApprovalBatchDetail | null;
  isDetailLoading: boolean;

  onApprove: (batchId: string) => void;
  onRequestRevision: (batchId: string, note: string) => void;
  onBulkLock: () => void;
  isApproving: boolean;
  isRequestingRevision: boolean;
  isBulkLocking: boolean;

  /** gradePublishMode === SELF_PUBLISH → show warning instead of the queue. */
  isSelfPublishMode: boolean;
}
