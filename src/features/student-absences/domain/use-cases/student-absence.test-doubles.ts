import { vi } from "vitest";
import type { StudentAbsenceEntity } from "../entities/student-absence.entity";
import type { IStudentAbsenceRepository } from "../repositories/i-student-absence.repository";

/**
 * Test-only doubles for the domain use-case suite (`.claude/rules/tdd.md`: mock
 * the repository through its interface so use-cases never touch HTTP).
 * Not imported by any production module.
 */
export type StudentAbsenceRepoMock = {
  [K in keyof IStudentAbsenceRepository]: ReturnType<typeof vi.fn>;
} & IStudentAbsenceRepository;

export function makeRepoMock(): StudentAbsenceRepoMock {
  return {
    listAbsences: vi.fn(),
    recordAbsence: vi.fn(),
    editAbsence: vi.fn(),
    flagAbsence: vi.fn(),
  } as unknown as StudentAbsenceRepoMock;
}

/** Fixed "today" for every use-case test — never `Date.now()`. */
export const TODAY = "2026-05-06";

export function absence(
  over: Partial<StudentAbsenceEntity> = {},
): StudentAbsenceEntity {
  return {
    classId: "11B2",
    studentMemberId: "stu-1",
    date: "2026-05-05",
    reason: "Sốt cao, có giấy khám của trạm y tế phường.",
    excused: true,
    state: "RECORDED",
    recordedByMemberId: "teacher-1",
    createdAt: "2026-05-05T07:40:00Z",
    updatedAt: "2026-05-05T07:40:00Z",
    ...over,
  };
}
