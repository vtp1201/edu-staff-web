import { vi } from "vitest";
import type { StaffConductNoteEntity } from "../entities/staff-conduct-note.entity";
import type { StaffDisciplineAuthContext } from "../entities/staff-discipline-auth-context.entity";
import type { StaffViolationEntity } from "../entities/staff-violation.entity";
import type { IStaffDisciplineRepository } from "../repositories/i-staff-discipline.repository";

/**
 * Test-only doubles for the domain use-case suite (`.claude/rules/tdd.md`:
 * mock the repository through its interface so use-cases never touch HTTP).
 * Not imported by any production module.
 */
export const PRINCIPAL_CTX: StaffDisciplineAuthContext = {
  role: "principal",
  memberId: "admin-1",
  staffMemberId: "staff-1",
};

export const TEACHER_CTX: StaffDisciplineAuthContext = {
  role: "teacher",
  memberId: "m-teacher",
  staffMemberId: "staff-1",
};

export function makeRepoMock(): {
  [K in keyof IStaffDisciplineRepository]: ReturnType<typeof vi.fn>;
} & IStaffDisciplineRepository {
  return {
    listStaffViolations: vi.fn(),
    createStaffViolation: vi.fn(),
    submitStaffViolation: vi.fn(),
    approveStaffViolation: vi.fn(),
    rejectStaffViolation: vi.fn(),
    listStaffConductNotes: vi.fn(),
    setStaffConductNote: vi.fn(),
    submitStaffConductNote: vi.fn(),
    approveStaffConductNote: vi.fn(),
    rejectStaffConductNote: vi.fn(),
  } as unknown as {
    [K in keyof IStaffDisciplineRepository]: ReturnType<typeof vi.fn>;
  } & IStaffDisciplineRepository;
}

export function violation(
  over: Partial<StaffViolationEntity> = {},
): StaffViolationEntity {
  return {
    recordId: "sv-001",
    staffMemberId: "staff-1",
    staffName: "Nguyễn Thị Hương",
    department: "Tổ Toán",
    category: "late",
    description: "Vào lớp trễ 20 phút.",
    severity: "MODERATE",
    occurredAt: "2026-05-04",
    state: "DRAFT",
    authorMemberId: "admin-1",
    selfApproved: false,
    createdAt: "2026-05-04T09:10:00Z",
    updatedAt: "2026-05-04T09:10:00Z",
    ...over,
  };
}

export function conductNote(
  over: Partial<StaffConductNoteEntity> = {},
): StaffConductNoteEntity {
  return {
    termId: "HK1-2025-2026",
    staffMemberId: "staff-1",
    staffName: "Nguyễn Thị Hương",
    department: "Tổ Toán",
    rating: "SATISFACTORY",
    note: "Hoàn thành tốt nhiệm vụ chuyên môn.",
    state: "DRAFT",
    authorMemberId: "admin-1",
    selfApproved: false,
    createdAt: "2026-01-10T09:00:00Z",
    updatedAt: "2026-01-10T09:00:00Z",
    ...over,
  };
}
