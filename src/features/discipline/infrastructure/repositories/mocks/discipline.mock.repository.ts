import "server-only";
import { mockDelay } from "@/bootstrap/lib/mock";
import type {
  ConductGrade,
  ConductSummaryEntity,
} from "../../../domain/entities/conduct-summary.entity";
import type { LeaveRequestEntity } from "../../../domain/entities/leave-request.entity";
import type {
  RecordViolationInput,
  ViolationEntity,
} from "../../../domain/entities/violation.entity";
import type { DisciplineFailure } from "../../../domain/failures/discipline.failure";
import type { IDisciplineRepository } from "../../../domain/repositories/i-discipline.repository";
import { initialsOf } from "../../mappers/discipline.mapper";
import { MOCK_CONDUCT, MOCK_LEAVE_REQUESTS, MOCK_VIOLATIONS } from "./fixtures";

const genId = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

// Module-level mutable in-memory state (reset on each `new` for determinism).
let _violations: ViolationEntity[] = structuredClone(MOCK_VIOLATIONS);
let _conduct: ConductSummaryEntity[] = structuredClone(MOCK_CONDUCT);
let _leave: LeaveRequestEntity[] = structuredClone(MOCK_LEAVE_REQUESTS);

function fail(type: DisciplineFailure["type"]): never {
  const failure: DisciplineFailure = { type };
  throw failure;
}

export class MockDisciplineRepository implements IDisciplineRepository {
  constructor() {
    _violations = structuredClone(MOCK_VIOLATIONS);
    _conduct = structuredClone(MOCK_CONDUCT);
    _leave = structuredClone(MOCK_LEAVE_REQUESTS);
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
}
