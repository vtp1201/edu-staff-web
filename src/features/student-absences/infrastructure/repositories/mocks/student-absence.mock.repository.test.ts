import { beforeEach, describe, expect, it } from "vitest";
import type { StudentAbsenceAuthContext } from "../../../domain/entities/student-absence-auth-context.entity";
import {
  MOCK_EXCUSED_AND_FLAGGED_KEY,
  MOCK_FLAGGED_KEY,
  MOCK_FREE_DATE,
  MOCK_OTHER_CLASS_KEY,
  MOCK_RECORDED_EXCUSED_KEY,
  MOCK_RECORDED_UNEXCUSED_KEY,
  SA_PRINCIPAL_MEMBER_ID,
  SA_TEACHER_CLASS_ID,
  SA_TEACHER_MEMBER_ID,
  SA_TODAY,
} from "./fixtures";
import {
  MockStudentAbsenceRepository,
  resetStudentAbsenceMockStore,
} from "./student-absence.mock.repository";

/**
 * Integration tests for the mock repository — the CRUD happy paths plus ALL
 * documented `ABSENCE_*` error simulations (story.md Validation → Integration).
 * The load-bearing authorization proofs live in the sibling
 * `student-absence.mock.repository.security.test.ts`.
 */

const TEACHER: StudentAbsenceAuthContext = {
  role: "teacher",
  memberId: SA_TEACHER_MEMBER_ID,
  classId: SA_TEACHER_CLASS_ID,
};

const PRINCIPAL: StudentAbsenceAuthContext = {
  role: "principal",
  memberId: SA_PRINCIPAL_MEMBER_ID,
  classId: "",
};

const teacherRepo = () =>
  new MockStudentAbsenceRepository(TEACHER, { today: SA_TODAY, delayMs: 0 });
const principalRepo = () =>
  new MockStudentAbsenceRepository(PRINCIPAL, { today: SA_TODAY, delayMs: 0 });

beforeEach(() => {
  resetStudentAbsenceMockStore();
});

describe("listAbsences (INT-002)", () => {
  it("pins a teacher to their OWN homeroom class, ignoring the requested classId", async () => {
    const rows = await teacherRepo().listAbsences({
      classId: MOCK_OTHER_CLASS_KEY.classId,
    });

    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.classId === SA_TEACHER_CLASS_ID)).toBe(true);
  });

  it("returns schoolwide rows for a principal and filters by class on request", async () => {
    const all = await principalRepo().listAbsences({});
    const filtered = await principalRepo().listAbsences({
      classId: MOCK_OTHER_CLASS_KEY.classId,
    });

    expect(new Set(all.map((r) => r.classId)).size).toBeGreaterThan(1);
    expect(filtered.length).toBeGreaterThan(0);
    expect(
      filtered.every((r) => r.classId === MOCK_OTHER_CLASS_KEY.classId),
    ).toBe(true);
    expect(filtered.length).toBeLessThan(all.length);
  });

  it("applies the inclusive from/to date range", async () => {
    const rows = await principalRepo().listAbsences({
      from: "2026-05-04",
      to: "2026-05-05",
    });

    expect(rows.length).toBeGreaterThan(0);
    expect(
      rows.every((r) => r.date >= "2026-05-04" && r.date <= "2026-05-05"),
    ).toBe(true);
  });

  it("sorts newest date first", async () => {
    const rows = await principalRepo().listAbsences({});
    const dates = rows.map((r) => r.date);
    expect([...dates].sort((a, b) => b.localeCompare(a))).toEqual(dates);
  });

  it("returns an empty array (not an error) for a range with no records", async () => {
    await expect(
      principalRepo().listAbsences({ from: "2020-01-01", to: "2020-01-31" }),
    ).resolves.toEqual([]);
  });

  it("seeds all four excused × state combinations (FR-007/AC-007.4)", async () => {
    const rows = await principalRepo().listAbsences({});
    expect(rows.some((r) => r.state === "RECORDED" && r.excused === true)).toBe(
      true,
    );
    expect(
      rows.some((r) => r.state === "RECORDED" && r.excused === false),
    ).toBe(true);
    expect(
      rows.some((r) => r.state === "FLAGGED_UNEXCUSED" && r.excused === false),
    ).toBe(true);
    // The orthogonality proof: excused AND flagged at the same time.
    expect(
      rows.some((r) => r.state === "FLAGGED_UNEXCUSED" && r.excused === true),
    ).toBe(true);
  });
});

describe("recordAbsence (INT-001)", () => {
  it("creates a RECORDED row stamped with the token's member id", async () => {
    const repo = teacherRepo();

    const created = await repo.recordAbsence({
      classId: SA_TEACHER_CLASS_ID,
      studentMemberId: "stu-1",
      date: MOCK_FREE_DATE,
      excused: false,
      reason: "Không rõ lý do.",
    });

    expect(created.state).toBe("RECORDED");
    expect(created.recordedByMemberId).toBe(SA_TEACHER_MEMBER_ID);
    expect(created.flaggedByMemberId).toBeUndefined();
    const rows = await repo.listAbsences({});
    expect(
      rows.some(
        (r) => r.studentMemberId === "stu-1" && r.date === MOCK_FREE_DATE,
      ),
    ).toBe(true);
  });

  it("normalises a blank reason to undefined", async () => {
    const created = await teacherRepo().recordAbsence({
      classId: SA_TEACHER_CLASS_ID,
      studentMemberId: "stu-4",
      date: MOCK_FREE_DATE,
      excused: true,
      reason: "   ",
    });
    expect(created.reason).toBeUndefined();
  });

  it("rejects a duplicate natural key with duplicate-date and creates nothing (AC-003.6)", async () => {
    const repo = teacherRepo();
    const before = (await repo.listAbsences({})).length;

    await expect(
      repo.recordAbsence({ ...MOCK_RECORDED_EXCUSED_KEY, excused: false }),
    ).rejects.toEqual({ type: "duplicate-date" });

    expect((await repo.listAbsences({})).length).toBe(before);
  });

  it("rejects a FUTURE date with invalid-date even when the client guard was bypassed (AC-003.4)", async () => {
    const repo = teacherRepo();
    const before = (await repo.listAbsences({})).length;

    await expect(
      repo.recordAbsence({
        classId: SA_TEACHER_CLASS_ID,
        studentMemberId: "stu-1",
        date: "2026-05-07",
        excused: true,
      }),
    ).rejects.toEqual({ type: "invalid-date" });

    expect((await repo.listAbsences({})).length).toBe(before);
  });

  it("rejects a malformed/datetime date with invalid-input (NFR-009)", async () => {
    await expect(
      teacherRepo().recordAbsence({
        classId: SA_TEACHER_CLASS_ID,
        studentMemberId: "stu-1",
        date: "2026-05-07T00:00:00Z",
        excused: true,
      }),
    ).rejects.toEqual({ type: "invalid-input" });
  });

  it("rejects an over-long reason with invalid-input", async () => {
    await expect(
      teacherRepo().recordAbsence({
        classId: SA_TEACHER_CLASS_ID,
        studentMemberId: "stu-1",
        date: MOCK_FREE_DATE,
        excused: true,
        reason: "x".repeat(5001),
      }),
    ).rejects.toEqual({ type: "invalid-input" });
  });

  it("rejects an unknown student, and a student of ANOTHER class, with invalid-id", async () => {
    const repo = teacherRepo();

    await expect(
      repo.recordAbsence({
        classId: SA_TEACHER_CLASS_ID,
        studentMemberId: "stu-does-not-exist",
        date: MOCK_FREE_DATE,
        excused: true,
      }),
    ).rejects.toEqual({ type: "invalid-id" });

    await expect(
      repo.recordAbsence({
        classId: SA_TEACHER_CLASS_ID,
        // stu-2 belongs to 10A1, not the GVCN's homeroom.
        studentMemberId: "stu-2",
        date: MOCK_FREE_DATE,
        excused: true,
      }),
    ).rejects.toEqual({ type: "invalid-id" });
  });
});

describe("editAbsence (INT-003)", () => {
  it("patches ONLY excused and leaves reason untouched (AC-004.2)", async () => {
    const repo = teacherRepo();

    const updated = await repo.editAbsence({
      ...MOCK_RECORDED_EXCUSED_KEY,
      excused: false,
    });

    expect(updated.excused).toBe(false);
    expect(updated.reason).toBe("Sốt cao, có giấy khám của trạm y tế phường.");
  });

  it("patches ONLY reason and leaves excused untouched", async () => {
    const repo = teacherRepo();

    const updated = await repo.editAbsence({
      ...MOCK_RECORDED_EXCUSED_KEY,
      reason: "Đã bổ sung giấy khám.",
    });

    expect(updated.reason).toBe("Đã bổ sung giấy khám.");
    expect(updated.excused).toBe(true);
  });

  it("never mutates the natural key or the state", async () => {
    const repo = teacherRepo();

    const updated = await repo.editAbsence({
      ...MOCK_RECORDED_UNEXCUSED_KEY,
      excused: true,
    });

    expect(updated.classId).toBe(MOCK_RECORDED_UNEXCUSED_KEY.classId);
    expect(updated.studentMemberId).toBe(
      MOCK_RECORDED_UNEXCUSED_KEY.studentMemberId,
    );
    expect(updated.date).toBe(MOCK_RECORDED_UNEXCUSED_KEY.date);
    expect(updated.state).toBe("RECORDED");
  });

  it("can edit excused on an already-FLAGGED row without touching its state (FR-007 orthogonality)", async () => {
    const repo = teacherRepo();

    const updated = await repo.editAbsence({
      ...MOCK_FLAGGED_KEY,
      excused: true,
    });

    expect(updated.excused).toBe(true);
    expect(updated.state).toBe("FLAGGED_UNEXCUSED");
  });

  it("rejects an unknown record with not-found (AC-004.5)", async () => {
    await expect(
      teacherRepo().editAbsence({
        classId: SA_TEACHER_CLASS_ID,
        studentMemberId: "stu-1",
        date: "2019-01-01",
        excused: true,
      }),
    ).rejects.toEqual({ type: "not-found" });
  });

  it("rejects an empty patch and an over-long reason with invalid-input", async () => {
    const repo = teacherRepo();

    await expect(
      repo.editAbsence({ ...MOCK_RECORDED_EXCUSED_KEY }),
    ).rejects.toEqual({ type: "invalid-input" });
    await expect(
      repo.editAbsence({
        ...MOCK_RECORDED_EXCUSED_KEY,
        reason: "x".repeat(5001),
      }),
    ).rejects.toEqual({ type: "invalid-input" });
  });
});

describe("flagAbsence (INT-004)", () => {
  it("moves RECORDED → FLAGGED_UNEXCUSED and stamps flaggedByMemberId (AC-005.4)", async () => {
    const repo = principalRepo();

    const flagged = await repo.flagAbsence(MOCK_RECORDED_UNEXCUSED_KEY);

    expect(flagged.state).toBe("FLAGGED_UNEXCUSED");
    expect(flagged.flaggedByMemberId).toBe(SA_PRINCIPAL_MEMBER_ID);
  });

  it("leaves excused untouched — the two signals are independent (FR-007)", async () => {
    const flagged = await principalRepo().flagAbsence(
      MOCK_RECORDED_EXCUSED_KEY,
    );
    expect(flagged.excused).toBe(true);
    expect(flagged.state).toBe("FLAGGED_UNEXCUSED");
  });

  it("rejects an unknown record with not-found (AC-005.7)", async () => {
    await expect(
      principalRepo().flagAbsence({
        classId: SA_TEACHER_CLASS_ID,
        studentMemberId: "stu-1",
        date: "2019-01-01",
      }),
    ).rejects.toEqual({ type: "not-found" });
  });

  it("rejects a re-flag with invalid-state — the transition is terminal (AC-005.8)", async () => {
    await expect(principalRepo().flagAbsence(MOCK_FLAGGED_KEY)).rejects.toEqual(
      { type: "invalid-state" },
    );
    await expect(
      principalRepo().flagAbsence(MOCK_EXCUSED_AND_FLAGGED_KEY),
    ).rejects.toEqual({ type: "invalid-state" });
  });

  it("exposes NO unflag capability at all (FR-006/FR-013)", () => {
    const repo = principalRepo();
    expect("unflagAbsence" in repo).toBe(false);
    expect(
      Object.getOwnPropertyNames(MockStudentAbsenceRepository.prototype).filter(
        (n) => n.toLowerCase().includes("unflag"),
      ),
    ).toEqual([]);
  });
});

describe("mock store isolation", () => {
  it("resets to the deterministic seed between tests", async () => {
    const repo = principalRepo();
    const seeded = await repo.listAbsences({});
    resetStudentAbsenceMockStore();
    expect((await repo.listAbsences({})).length).toBe(seeded.length);
  });
});
