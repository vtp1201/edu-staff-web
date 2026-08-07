import type { ClassSubjectTermKey } from "../../domain/entities/class-subject-term-key.entity";
import type { GradeSheet } from "../../domain/entities/grade-sheet.entity";
import type { GradesFailure } from "../../domain/failures/grades.failure";
import type {
  ActionResult,
  ApproverGradeEntryVM,
  ClassSubjectOption,
  PendingApprovalPageResult,
  PendingApprovalVM,
} from "./grade-entry-screen.i-vm";

export interface BuildApproverGradeVmInput {
  classSubjects: ClassSubjectOption[];
  selectedClassId: string | null;
  selectedSubjectId: string | null;
  selectedTerm: string | null;
  academicYearLabel: string;
  sheet: GradeSheet | null;
  error: GradesFailure["type"] | null;
  /** null until a full class-subject-term is selected */
  key: ClassSubjectTermKey | null;
  /** unbound Server Action — bound to the key here */
  rejectEntryAction: (
    key: ClassSubjectTermKey,
    studentId: string,
    columnId: string,
    reason: string,
  ) => Promise<ActionResult>;
  /** unbound Server Action — bound to the key here */
  approveEntryAction: (
    key: ClassSubjectTermKey,
    studentId: string,
    columnId: string,
  ) => Promise<ActionResult>;
  /**
   * US-E18.46 — RSC-seeded first page of the tenant-wide rollup + the Server
   * Action that fetches further pages. The action is passed through UNBOUND
   * (it takes only a cursor and is addressed tenant-wide, not by key).
   */
  pendingApproval: PendingApprovalVM;
  loadPendingApprovalPage: (
    cursor: string | null,
  ) => Promise<PendingApprovalPageResult>;
  /** unbound Server Action — bound to the key here */
  lockTermAction: (
    key: ClassSubjectTermKey,
  ) => Promise<ActionResult & { lockedCount?: number }>;
}

/**
 * Builds the ADMIN/MANAGER approver VM for the staff grade sheet (US-E18.44).
 *
 * Extracted as a PURE function because `/admin/grade-book` and
 * `/principal/grade-book` are two separately-guarded routes that compose the
 * exact same VM — one implementation, tested once, rather than a copy per route
 * that can silently drift (the sibling `build-grade-book-vm.ts` follows the same
 * convention).
 *
 * Note on the key: when no full selection exists yet, `rejectEntryAction` is
 * still bound to a real Server Action (with an empty-string key) instead of a
 * locally-defined stub function. A plain function cannot be handed from an RSC
 * to a Client Component, and there is nothing to reject in that state anyway —
 * no sheet renders, so no reject control exists to invoke it.
 */
export function buildApproverGradeVm(
  input: BuildApproverGradeVmInput,
): ApproverGradeEntryVM {
  const {
    classSubjects,
    selectedClassId,
    selectedSubjectId,
    selectedTerm,
    academicYearLabel,
    sheet,
    error,
    key,
    rejectEntryAction,
    approveEntryAction,
    pendingApproval,
    loadPendingApprovalPage,
    lockTermAction,
  } = input;

  // `GradeSheet` carries ids only; the lock confirmation must name its target in
  // words, and the picker option already holds the resolved display labels.
  const selected = classSubjects.find(
    (cs) =>
      cs.classId === selectedClassId && cs.subjectId === selectedSubjectId,
  );

  const boundKey: ClassSubjectTermKey = key ?? {
    classId: selectedClassId ?? "",
    subjectId: selectedSubjectId ?? "",
    termId: selectedTerm ?? "",
    academicYearLabel,
  };

  return {
    viewerRole: "approver",
    classSubjects,
    selectedClassId,
    selectedSubjectId,
    selectedTerm,
    sheet,
    error,
    classLabel: selected?.className ?? "",
    subjectLabel: selected?.subjectName ?? "",
    rejectEntryAction: rejectEntryAction.bind(null, boundKey),
    approveEntryAction: approveEntryAction.bind(null, boundKey),
    pendingApproval,
    // Deliberately NOT bound to the key: the rollup is what DISCOVERS keys, so
    // it is addressed tenant-wide and takes only a cursor.
    loadPendingApprovalPage,
    // Absent until a full selection exists ⇒ no lock control is rendered.
    lockTermAction: key ? lockTermAction.bind(null, key) : undefined,
  };
}
