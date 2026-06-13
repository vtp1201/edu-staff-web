import "server-only";
import { mockDelay } from "@/bootstrap/lib/mock";
import type {
  CreateDepartmentInput,
  Department,
  DepartmentStatus,
  PatchDepartmentInput,
} from "../../../domain/entities/department.entity";
import type {
  AssignmentStatus,
  CopyAssignmentsInput,
  CopyAssignmentsResult,
  CreateAssignmentInput,
  PositionAssignment,
} from "../../../domain/entities/position-assignment.entity";
import type {
  CreatePositionTitleInput,
  PatchPositionTitleInput,
  PositionTitle,
  PositionTitleStatus,
  ScopeType,
} from "../../../domain/entities/position-title.entity";
import type { StaffingFailure } from "../../../domain/failures/staffing.failure";
import type { IStaffingRepository } from "../../../domain/repositories/i-staffing.repository";
import { fail, ok, type Result } from "../../../domain/use-cases/result";
import {
  MOCK_ASSIGNMENTS,
  MOCK_DEPARTMENTS,
  MOCK_POSITION_TITLES,
} from "./fixtures";

const genId = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

// Module-level mutable in-memory state (reset on each `new` for deterministic tests).
let _departments: Department[] = structuredClone(MOCK_DEPARTMENTS);
let _titles: PositionTitle[] = structuredClone(MOCK_POSITION_TITLES);
let _assignments: PositionAssignment[] = structuredClone(MOCK_ASSIGNMENTS);

export class MockStaffingRepository implements IStaffingRepository {
  constructor() {
    _departments = structuredClone(MOCK_DEPARTMENTS);
    _titles = structuredClone(MOCK_POSITION_TITLES);
    _assignments = structuredClone(MOCK_ASSIGNMENTS);
  }

  // --- Departments ---

  async listDepartments(
    status?: DepartmentStatus,
  ): Promise<Result<Department[], StaffingFailure>> {
    await mockDelay(150);
    const list = status
      ? _departments.filter((d) => d.status === status)
      : _departments;
    return ok(list.map((d) => ({ ...d })));
  }

  async getDepartment(
    id: string,
  ): Promise<Result<Department, StaffingFailure>> {
    await mockDelay(150);
    const dep = _departments.find((d) => d.id === id);
    if (!dep) return fail({ type: "not-found" });
    return ok({ ...dep });
  }

  async createDepartment(
    input: CreateDepartmentInput,
  ): Promise<Result<Department, StaffingFailure>> {
    await mockDelay(200);
    if (_departments.some((d) => d.name === input.name)) {
      return fail({ type: "already-exists" });
    }
    const dep: Department = {
      id: genId("dep"),
      name: input.name,
      conceptLabel: input.conceptLabel,
      subjectParentIds: input.subjectParentIds,
      status: "ACTIVE",
      activeAssignmentCount: 0,
    };
    _departments.unshift(dep);
    return ok({ ...dep });
  }

  async patchDepartment(
    id: string,
    input: PatchDepartmentInput,
  ): Promise<Result<Department, StaffingFailure>> {
    await mockDelay(200);
    const dep = _departments.find((d) => d.id === id);
    if (!dep) return fail({ type: "not-found" });
    if (input.name !== undefined) dep.name = input.name;
    if (input.conceptLabel !== undefined) dep.conceptLabel = input.conceptLabel;
    if (input.subjectParentIds !== undefined)
      dep.subjectParentIds = input.subjectParentIds;
    return ok({ ...dep });
  }

  async archiveDepartment(id: string): Promise<Result<void, StaffingFailure>> {
    await mockDelay(200);
    const dep = _departments.find((d) => d.id === id);
    if (!dep) return fail({ type: "not-found" });
    if (dep.activeAssignmentCount > 0) {
      return fail({ type: "has-active-assignments" });
    }
    dep.status = "ARCHIVED";
    return ok(undefined);
  }

  // --- Position Titles ---

  async listPositionTitles(filter?: {
    scopeType?: ScopeType;
    status?: PositionTitleStatus;
  }): Promise<Result<PositionTitle[], StaffingFailure>> {
    await mockDelay(150);
    let list = _titles;
    if (filter?.scopeType)
      list = list.filter((t) => t.scopeType === filter.scopeType);
    if (filter?.status) list = list.filter((t) => t.status === filter.status);
    return ok(list.map((t) => ({ ...t })));
  }

  async getPositionTitle(
    id: string,
  ): Promise<Result<PositionTitle, StaffingFailure>> {
    await mockDelay(150);
    const title = _titles.find((t) => t.id === id);
    if (!title) return fail({ type: "not-found" });
    return ok({ ...title });
  }

  async createPositionTitle(
    input: CreatePositionTitleInput,
  ): Promise<Result<PositionTitle, StaffingFailure>> {
    await mockDelay(200);
    if (_titles.some((t) => t.name === input.name)) {
      return fail({ type: "already-exists" });
    }
    if (
      input.permissions.includes("MANAGE_SUBJECT_CONTENT") &&
      input.scopeType !== "SUBJECT_PARENT"
    ) {
      return fail({ type: "invalid-permissions" });
    }
    const title: PositionTitle = {
      id: genId("pt"),
      name: input.name,
      scopeType: input.scopeType,
      permissions: input.permissions,
      status: "ACTIVE",
      activeAssignmentCount: 0,
    };
    _titles.unshift(title);
    return ok({ ...title });
  }

  async patchPositionTitle(
    id: string,
    input: PatchPositionTitleInput,
  ): Promise<Result<PositionTitle, StaffingFailure>> {
    await mockDelay(200);
    const title = _titles.find((t) => t.id === id);
    if (!title) return fail({ type: "not-found" });
    if (
      input.permissions.includes("MANAGE_SUBJECT_CONTENT") &&
      title.scopeType !== "SUBJECT_PARENT"
    ) {
      return fail({ type: "invalid-permissions" });
    }
    title.permissions = input.permissions;
    return ok({ ...title });
  }

  async archivePositionTitle(
    id: string,
  ): Promise<Result<void, StaffingFailure>> {
    await mockDelay(200);
    const title = _titles.find((t) => t.id === id);
    if (!title) return fail({ type: "not-found" });
    if (title.activeAssignmentCount > 0) {
      return fail({ type: "has-active-assignments" });
    }
    title.status = "ARCHIVED";
    return ok(undefined);
  }

  // --- Position Assignments ---

  async listAssignments(filter?: {
    memberId?: string;
    academicYearId?: string;
    status?: AssignmentStatus;
  }): Promise<Result<PositionAssignment[], StaffingFailure>> {
    await mockDelay(150);
    let list = _assignments;
    if (filter?.memberId)
      list = list.filter((a) => a.memberId === filter.memberId);
    if (filter?.academicYearId)
      list = list.filter((a) => a.academicYearId === filter.academicYearId);
    if (filter?.status) list = list.filter((a) => a.status === filter.status);
    return ok(list.map((a) => ({ ...a })));
  }

  async getAssignment(
    id: string,
  ): Promise<Result<PositionAssignment, StaffingFailure>> {
    await mockDelay(150);
    const assignment = _assignments.find((a) => a.id === id);
    if (!assignment) return fail({ type: "not-found" });
    return ok({ ...assignment });
  }

  async createAssignment(
    input: CreateAssignmentInput,
  ): Promise<Result<PositionAssignment, StaffingFailure>> {
    await mockDelay(200);
    const title = _titles.find((t) => t.id === input.positionTitleId);
    if (!title) return fail({ type: "not-found" });
    const duplicate = _assignments.some(
      (a) =>
        a.memberId === input.memberId &&
        a.positionTitleId === input.positionTitleId &&
        a.academicYearId === input.academicYearId &&
        a.status === "ACTIVE",
    );
    if (duplicate) return fail({ type: "already-exists" });
    const assignment: PositionAssignment = {
      id: genId("pa"),
      memberId: input.memberId,
      memberName: "Giáo viên mới",
      positionTitleId: input.positionTitleId,
      positionTitleName: title.name,
      scopeEntityId: input.scopeEntityId,
      academicYearId: input.academicYearId,
      status: "ACTIVE",
      assignedAt: new Date().toISOString(),
    };
    _assignments.unshift(assignment);
    title.activeAssignmentCount += 1;
    return ok({ ...assignment });
  }

  async revokeAssignment(id: string): Promise<Result<void, StaffingFailure>> {
    await mockDelay(200);
    const assignment = _assignments.find((a) => a.id === id);
    if (!assignment) return fail({ type: "not-found" });
    if (assignment.status === "ACTIVE") {
      assignment.status = "REVOKED";
      const title = _titles.find((t) => t.id === assignment.positionTitleId);
      if (title && title.activeAssignmentCount > 0)
        title.activeAssignmentCount -= 1;
    }
    return ok(undefined);
  }

  async copyAssignments(
    input: CopyAssignmentsInput,
  ): Promise<Result<CopyAssignmentsResult, StaffingFailure>> {
    await mockDelay(300);
    const source = _assignments.filter(
      (a) =>
        a.academicYearId === input.sourceAcademicYearId &&
        a.status === "ACTIVE",
    );
    let copiedCount = 0;
    let skippedCount = 0;
    for (const src of source) {
      const exists = _assignments.some(
        (a) =>
          a.memberId === src.memberId &&
          a.positionTitleId === src.positionTitleId &&
          a.academicYearId === input.targetAcademicYearId,
      );
      if (exists) {
        skippedCount += 1;
        continue;
      }
      _assignments.unshift({
        ...src,
        id: genId("pa"),
        academicYearId: input.targetAcademicYearId,
        status: "ACTIVE",
        assignedAt: new Date().toISOString(),
      });
      copiedCount += 1;
    }
    return ok({ copiedCount, skippedCount });
  }
}
