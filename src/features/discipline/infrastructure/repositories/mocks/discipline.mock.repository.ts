import "server-only";
import { mockDelay } from "@/bootstrap/lib/mock";
import type { ChildEntity } from "../../../domain/entities/child.entity";
import type {
  ConductGrade,
  ConductSummaryEntity,
} from "../../../domain/entities/conduct-summary.entity";
import type {
  LeaveRequestEntity,
  SubmitChildLeaveRequestInput,
  SubmitLeaveRequestInput,
} from "../../../domain/entities/leave-request.entity";
import type {
  RecordViolationInput,
  ViolationEntity,
} from "../../../domain/entities/violation.entity";
import type { DisciplineFailure } from "../../../domain/failures/discipline.failure";
import type { IDisciplineRepository } from "../../../domain/repositories/i-discipline.repository";
import { initialsOf } from "../../mappers/discipline.mapper";
import {
  MOCK_CHILD_CONDUCT,
  MOCK_CHILD_LEAVE_REQUESTS,
  MOCK_CHILD_VIOLATIONS,
  MOCK_CHILDREN,
  MOCK_CONDUCT,
  MOCK_LEAVE_REQUESTS,
  MOCK_MY_CONDUCT,
  MOCK_MY_LEAVE_REQUESTS,
  MOCK_MY_VIOLATIONS,
  MOCK_VIOLATIONS,
} from "./fixtures";

const genId = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

/** Local date ISO "YYYY-MM-DD" (no timezone shift). */
function todayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** ISO "YYYY-MM-DD" → display "DD/MM/YYYY" (matches the mapper's format). */
function formatISODate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

/** Inclusive day span between two ISO dates (>= 1). */
function dayCountOf(startISO: string, endISO: string): number {
  const start = Date.parse(startISO);
  const end = Date.parse(endISO);
  if (Number.isNaN(start) || Number.isNaN(end)) return 1;
  const days = Math.round((end - start) / 86_400_000) + 1;
  return Math.max(1, days);
}

// Module-level mutable in-memory state (reset on each `new` for determinism).
// Student-scoped fixtures (US-E09.2) are merged in so self-service reads find
// the s-1 violations / leave history alongside the teacher-facing seed.
let _violations: ViolationEntity[] = [
  ...structuredClone(MOCK_MY_VIOLATIONS),
  ...structuredClone(MOCK_VIOLATIONS),
];
let _conduct: ConductSummaryEntity[] = structuredClone(MOCK_CONDUCT);
let _leave: LeaveRequestEntity[] = [
  ...structuredClone(MOCK_MY_LEAVE_REQUESTS),
  ...structuredClone(MOCK_LEAVE_REQUESTS),
];

// Per-child leave history (US-E09.4), keyed by childId, mutable for optimistic submit.
let _childLeave: Record<string, LeaveRequestEntity[]> = structuredClone(
  MOCK_CHILD_LEAVE_REQUESTS,
);

function fail(type: DisciplineFailure["type"]): never {
  const failure: DisciplineFailure = { type };
  throw failure;
}

export class MockDisciplineRepository implements IDisciplineRepository {
  constructor() {
    _violations = [
      ...structuredClone(MOCK_MY_VIOLATIONS),
      ...structuredClone(MOCK_VIOLATIONS),
    ];
    _conduct = structuredClone(MOCK_CONDUCT);
    _leave = [
      ...structuredClone(MOCK_MY_LEAVE_REQUESTS),
      ...structuredClone(MOCK_LEAVE_REQUESTS),
    ];
    _childLeave = structuredClone(MOCK_CHILD_LEAVE_REQUESTS);
  }

  async getViolations(params: {
    classId?: string;
    semester?: string;
  }): Promise<ViolationEntity[]> {
    await mockDelay();
    return _violations.filter(
      (v) => !params.classId || v.classId === params.classId,
    );
  }

  async recordViolation(input: RecordViolationInput): Promise<ViolationEntity> {
    await mockDelay();
    const violation: ViolationEntity = {
      id: genId("v"),
      studentId: genId("s"),
      studentName: input.studentName,
      initials: initialsOf(input.studentName),
      avatarTone: "primary",
      classId: input.classId,
      className: input.classId,
      type: input.type,
      date: input.date,
      period: input.period,
      description: input.description,
      severity: input.severity,
      handledBy: "Nguyễn Thị Hương",
      status: "recorded",
    };
    _violations = [violation, ..._violations];
    return structuredClone(violation);
  }

  async getConductSummary(params: {
    classId?: string;
    semester?: string;
  }): Promise<ConductSummaryEntity[]> {
    await mockDelay();
    return _conduct.filter(
      (c) =>
        (!params.classId || c.classId === params.classId) &&
        (!params.semester || c.semester === params.semester),
    );
  }

  async overrideConductGrade(
    studentId: string,
    grade: ConductGrade,
    note: string,
  ): Promise<ConductSummaryEntity> {
    await mockDelay();
    const summary = _conduct.find((c) => c.studentId === studentId);
    if (!summary) fail("invalid-conduct-grade");
    summary.grade = grade;
    summary.isOverridden = true;
    summary.overrideNote = note;
    return structuredClone(summary);
  }

  async getLeaveRequests(params: {
    classId?: string;
  }): Promise<LeaveRequestEntity[]> {
    await mockDelay();
    return _leave.filter(
      (l) => !params.classId || l.classId === params.classId,
    );
  }

  async approveLeave(id: string): Promise<LeaveRequestEntity> {
    await mockDelay();
    const req = _leave.find((l) => l.id === id);
    if (!req) fail("already-processed");
    if (req.status !== "pending") fail("already-processed");
    req.status = "approved";
    req.approvedBy = "Nguyễn Thị Hương";
    return structuredClone(req);
  }

  async rejectLeave(id: string, reason: string): Promise<LeaveRequestEntity> {
    await mockDelay();
    const req = _leave.find((l) => l.id === id);
    if (!req) fail("already-processed");
    if (req.status !== "pending") fail("already-processed");
    req.status = "rejected";
    req.rejectedBy = "Nguyễn Thị Hương";
    req.rejectionReason = reason;
    return structuredClone(req);
  }

  // --- Student / parent self-service (US-E09.2) ---

  async getMyConductSummary(
    studentId: string,
    _semester?: string,
  ): Promise<ConductSummaryEntity> {
    await mockDelay();
    const found = _conduct.find((c) => c.studentId === studentId);
    if (found) return structuredClone(found);
    // Fallback for an unknown student so the screen always has data (mock-first).
    return structuredClone(MOCK_MY_CONDUCT);
  }

  async getMyViolations(studentId: string): Promise<ViolationEntity[]> {
    await mockDelay();
    return structuredClone(
      _violations.filter((v) => v.studentId === studentId),
    );
  }

  async getMyLeaveRequests(studentId: string): Promise<LeaveRequestEntity[]> {
    await mockDelay();
    return structuredClone(_leave.filter((l) => l.studentId === studentId));
  }

  async submitLeaveRequest(
    input: SubmitLeaveRequestInput,
  ): Promise<LeaveRequestEntity> {
    await mockDelay();
    const req: LeaveRequestEntity = {
      id: genId("l"),
      studentId: input.studentId,
      studentName: "Học sinh",
      initials: "HS",
      avatarTone: "primary",
      classId: "11B2",
      className: "11B2",
      submittedBy: input.submittedBy,
      submitterName: input.submittedBy === "parent" ? "Phụ huynh" : "Học sinh",
      reason: input.reason,
      startDate: formatISODate(input.startDate),
      endDate: formatISODate(input.endDate),
      dayCount: dayCountOf(input.startDate, input.endDate),
      type: input.type,
      status: "pending",
      submittedAt: formatISODate(todayISO()),
      approvedBy: null,
      rejectedBy: null,
      rejectionReason: null,
    };
    _leave = [req, ..._leave];
    return structuredClone(req);
  }

  // --- Parent multi-child view (US-E09.4) ---

  async getChildren(): Promise<ChildEntity[]> {
    await mockDelay();
    return structuredClone(MOCK_CHILDREN);
  }

  async getChildConductSummary(childId: string): Promise<ConductSummaryEntity> {
    await mockDelay();
    const summary = MOCK_CHILD_CONDUCT[childId];
    if (!summary) fail("not-found");
    return structuredClone(summary);
  }

  async getChildViolations(childId: string): Promise<ViolationEntity[]> {
    await mockDelay();
    if (!MOCK_CHILD_CONDUCT[childId]) fail("not-found");
    return structuredClone(MOCK_CHILD_VIOLATIONS[childId] ?? []);
  }

  async getChildLeaveRequests(childId: string): Promise<LeaveRequestEntity[]> {
    await mockDelay();
    if (!MOCK_CHILD_CONDUCT[childId]) fail("not-found");
    return structuredClone(_childLeave[childId] ?? []);
  }

  async submitLeaveForChild(
    childId: string,
    input: SubmitChildLeaveRequestInput,
  ): Promise<LeaveRequestEntity> {
    await mockDelay();
    const child = MOCK_CHILDREN.find((c) => c.childId === childId);
    if (!child) fail("not-found");
    if (input.reason.trim().length < 10) fail("reason-too-short");
    const req: LeaveRequestEntity = {
      id: genId("cl"),
      studentId: childId,
      studentName: child.name,
      initials: child.avatar,
      avatarTone: "primary",
      classId: child.className,
      className: child.className,
      submittedBy: "parent",
      submitterName: `${child.gvcnName}`,
      reason: input.reason.trim(),
      startDate: formatISODate(input.startDate),
      endDate: formatISODate(input.endDate),
      dayCount: dayCountOf(input.startDate, input.endDate),
      type: input.type,
      status: "pending",
      submittedAt: formatISODate(todayISO()),
      approvedBy: null,
      rejectedBy: null,
      rejectionReason: null,
    };
    _childLeave[childId] = [req, ...(_childLeave[childId] ?? [])];
    return structuredClone(req);
  }
}
