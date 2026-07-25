import { beforeEach, describe, expect, it } from "vitest";
import type { UserRole } from "@/features/auth/domain/entities/auth-user.entity";
import type { StudentAbsenceAuthContext } from "../../../domain/entities/student-absence-auth-context.entity";
import { EditStudentAbsenceUseCase } from "../../../domain/use-cases/edit-student-absence.use-case";
import { FlagStudentAbsenceUseCase } from "../../../domain/use-cases/flag-student-absence.use-case";
import { RecordStudentAbsenceUseCase } from "../../../domain/use-cases/record-student-absence.use-case";
import {
  MOCK_EXCUSED_AND_FLAGGED_KEY,
  MOCK_FLAGGED_KEY,
  MOCK_FREE_DATE,
  MOCK_OTHER_CLASS_KEY,
  MOCK_RECORDED_EXCUSED_KEY,
  MOCK_RECORDED_UNEXCUSED_KEY,
  SA_FORBIDDEN_CLASS_ID,
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
 * ============================================================================
 * SECURITY-GRADE PROOF SWEEP — US-E09.6 NFR-008 / NFR-009 (release-blocking)
 * spec.md §"High-Risk-Grade Security Enforcement" · plan.md Phase 8 · UC-006
 * ============================================================================
 *
 * These are the load-bearing proofs, deliberately in their OWN file so a
 * reviewer can find them by name. Each test constructs the repository (the
 * authorization boundary while this feature is mock-first, spec pt. 5) with a
 * FORGED `StudentAbsenceAuthContext` and invokes it DIRECTLY — no UI involved.
 * A test that only proves a button is hidden does NOT satisfy NFR-008
 * (AC-006.4).
 *
 * Covered here:
 *   1. Teacher forging a classId outside their homeroom on recordAbsence AND
 *      editAbsence → { type: "forbidden" }, no mutation (AC-006.2/.4).
 *   2. Non-`principal` role invoking flagAbsence → { type: "forbidden" }, no
 *      state transition (AC-006.1/.4).
 *   3. Re-flag on an already-FLAGGED_UNEXCUSED seed → { type: "invalid-state" }
 *      (AC-005.8) — terminal, and no unflag path exists at all.
 *   4. The same denials hold through the USE-CASE layer (the exact path a
 *      Server Action takes), so the guarantee is not an artefact of calling the
 *      repo directly.
 *
 * The remaining two Phase-8 items are UI-side and proved in Storybook:
 *   - no optimistic client-only flip on flag →
 *     `FlagConfirmDialog_NoOptimisticUpdate`
 *   - zero record/edit affordance in the principal's view →
 *     `PrincipalList_Success` / `PrincipalZeroRecordEditAffordance`
 * (see `presentation/student-absences-screen/student-absences-screen.stories.tsx`).
 */

const OWN_CLASS = SA_TEACHER_CLASS_ID;

const TEACHER: StudentAbsenceAuthContext = {
  role: "teacher",
  memberId: SA_TEACHER_MEMBER_ID,
  classId: OWN_CLASS,
};

const PRINCIPAL: StudentAbsenceAuthContext = {
  role: "principal",
  memberId: SA_PRINCIPAL_MEMBER_ID,
  classId: "",
};

/** Every role that must NOT be able to flag. */
const NON_PRINCIPAL_ROLES: readonly UserRole[] = [
  "teacher",
  "student",
  "parent",
  "admin",
];

/** Every role that must NOT be able to record/edit. */
const NON_TEACHER_ROLES: readonly UserRole[] = [
  "principal",
  "student",
  "parent",
  "admin",
];

function repo(
  authCtx: StudentAbsenceAuthContext,
): MockStudentAbsenceRepository {
  return new MockStudentAbsenceRepository(authCtx, {
    today: SA_TODAY,
    delayMs: 0,
  });
}

/** Reads the store through a legitimately authorized principal. */
async function readAll() {
  return repo(PRINCIPAL).listAbsences({});
}

async function rowOf(key: {
  classId: string;
  studentMemberId: string;
  date: string;
}) {
  return (await readAll()).find(
    (r) =>
      r.classId === key.classId &&
      r.studentMemberId === key.studentMemberId &&
      r.date === key.date,
  );
}

beforeEach(() => {
  resetStudentAbsenceMockStore();
});

// ---------------------------------------------------------------------------
// 1. Teacher class-ownership re-check (FR-008 / NFR-008 pt.1 / AC-006.2/.4)
// ---------------------------------------------------------------------------

describe("NFR-008 pt.1 — forged classId on recordAbsence is denied (AC-006.2/.4)", () => {
  it("rejects a GVCN recording into ANOTHER homeroom with forbidden, creating nothing", async () => {
    const before = (await readAll()).length;

    await expect(
      repo(TEACHER).recordAbsence({
        classId: SA_FORBIDDEN_CLASS_ID, // forged — not this GVCN's class
        studentMemberId: "stu-2",
        date: MOCK_FREE_DATE,
        excused: false,
        reason: "Bản ghi giả mạo cho lớp khác.",
      }),
    ).rejects.toEqual({ type: "forbidden" });

    expect((await readAll()).length).toBe(before);
    expect(
      await rowOf({
        classId: SA_FORBIDDEN_CLASS_ID,
        studentMemberId: "stu-2",
        date: MOCK_FREE_DATE,
      }),
    ).toBeUndefined();
  });

  it("denies BEFORE any existence check — forged class + unknown student is forbidden, never invalid-id/not-found (no leak)", async () => {
    await expect(
      repo(TEACHER).recordAbsence({
        classId: SA_FORBIDDEN_CLASS_ID,
        studentMemberId: "stu-does-not-exist",
        date: MOCK_FREE_DATE,
        excused: false,
      }),
    ).rejects.toEqual({ type: "forbidden" });
  });

  it("denies even when the forged date is in the future (forbidden wins over invalid-date)", async () => {
    await expect(
      repo(TEACHER).recordAbsence({
        classId: SA_FORBIDDEN_CLASS_ID,
        studentMemberId: "stu-2",
        date: "2027-01-01",
        excused: false,
      }),
    ).rejects.toEqual({ type: "forbidden" });
  });

  it('denies a deny-by-default context (unresolvable homeroom ⇒ classId "") for ANY class', async () => {
    const denied: StudentAbsenceAuthContext = {
      role: "teacher",
      memberId: "m-unknown",
      classId: "", // resolver's fail-closed value (risk #8)
    };

    await expect(
      repo(denied).recordAbsence({
        classId: OWN_CLASS,
        studentMemberId: "stu-1",
        date: MOCK_FREE_DATE,
        excused: true,
      }),
    ).rejects.toEqual({ type: "forbidden" });
    await expect(
      repo(denied).recordAbsence({
        classId: "",
        studentMemberId: "stu-1",
        date: MOCK_FREE_DATE,
        excused: true,
      }),
    ).rejects.toEqual({ type: "forbidden" });
  });

  for (const role of NON_TEACHER_ROLES) {
    it(`rejects recordAbsence for forged caller role="${role}" even on their own-looking class`, async () => {
      const before = (await readAll()).length;

      await expect(
        repo({
          role,
          memberId: SA_TEACHER_MEMBER_ID,
          classId: OWN_CLASS,
        }).recordAbsence({
          classId: OWN_CLASS,
          studentMemberId: "stu-1",
          date: MOCK_FREE_DATE,
          excused: true,
        }),
      ).rejects.toEqual({ type: "forbidden" });

      expect((await readAll()).length).toBe(before);
    });
  }
});

describe("NFR-008 pt.1 — forged classId on editAbsence is denied (AC-006.2/.4)", () => {
  it("rejects a GVCN editing a row in ANOTHER homeroom with forbidden, mutating nothing", async () => {
    const before = await rowOf(MOCK_OTHER_CLASS_KEY);

    await expect(
      repo(TEACHER).editAbsence({
        ...MOCK_OTHER_CLASS_KEY, // forged — a real row, but not this GVCN's class
        excused: true,
        reason: "Ghi đè giả mạo.",
      }),
    ).rejects.toEqual({ type: "forbidden" });

    const after = await rowOf(MOCK_OTHER_CLASS_KEY);
    expect(after).toEqual(before);
    expect(after?.excused).toBe(false);
    expect(after?.reason).toBeUndefined();
  });

  it("denies BEFORE the existence check — forged class + unknown date is forbidden, never not-found", async () => {
    await expect(
      repo(TEACHER).editAbsence({
        classId: SA_FORBIDDEN_CLASS_ID,
        studentMemberId: "stu-2",
        date: "2019-01-01",
        excused: true,
      }),
    ).rejects.toEqual({ type: "forbidden" });
  });

  for (const role of NON_TEACHER_ROLES) {
    it(`rejects editAbsence for forged caller role="${role}", record untouched`, async () => {
      const before = await rowOf(MOCK_RECORDED_EXCUSED_KEY);

      await expect(
        repo({
          role,
          memberId: SA_TEACHER_MEMBER_ID,
          classId: OWN_CLASS,
        }).editAbsence({
          ...MOCK_RECORDED_EXCUSED_KEY,
          excused: false,
          reason: "Ghi đè giả mạo.",
        }),
      ).rejects.toEqual({ type: "forbidden" });

      expect(await rowOf(MOCK_RECORDED_EXCUSED_KEY)).toEqual(before);
    });
  }
});

// ---------------------------------------------------------------------------
// 1b. List-side role re-check (AC-001.6/AC-002.5 backstop — resolveReadScope)
// ---------------------------------------------------------------------------

/**
 * QA gap closed: `resolveReadScope`'s `else throw forbidden` branch (any role
 * that is neither `teacher` nor `principal`) had ZERO test coverage in either
 * this file or `student-absence.mock.repository.test.ts` before this pass —
 * every existing `listAbsences` test only ever constructed a teacher or
 * principal repo. A `student`/`parent`/`admin` actor reaching INT-002 directly
 * (e.g. a forged/replayed request, or the real-mode auth context resolving the
 * caller's own non-teacher/non-principal claim role when they navigate to
 * either absences route) must be denied — never silently scoped to "all rows"
 * nor to an empty list that could be confused with AC-001.3/AC-002.4's
 * legitimate empty state.
 */
describe("NFR-008 — listAbsences denies any non-teacher/non-principal role (AC-001.6/AC-002.5)", () => {
  const NON_LIST_ROLES: readonly UserRole[] = ["student", "parent", "admin"];

  for (const role of NON_LIST_ROLES) {
    it(`rejects listAbsences for role="${role}" with forbidden — never an empty/partial list`, async () => {
      await expect(
        repo({
          role,
          memberId: "forged-1",
          classId: OWN_CLASS,
        }).listAbsences({}),
      ).rejects.toEqual({ type: "forbidden" });
    });

    it(`rejects listAbsences for role="${role}" even when a specific classId is requested`, async () => {
      await expect(
        repo({
          role,
          memberId: "forged-1",
          classId: "",
        }).listAbsences({ classId: OWN_CLASS }),
      ).rejects.toEqual({ type: "forbidden" });
    });
  }
});

// ---------------------------------------------------------------------------
// 2. Principal-only flag re-check (FR-009 / NFR-008 pt.2 / AC-006.1/.4)
// ---------------------------------------------------------------------------

describe("NFR-008 pt.2 — flagAbsence is principal-only (AC-006.1/.4)", () => {
  for (const role of NON_PRINCIPAL_ROLES) {
    it(`rejects flagAbsence for forged caller role="${role}" — no state transition`, async () => {
      const before = await rowOf(MOCK_RECORDED_UNEXCUSED_KEY);
      expect(before?.state).toBe("RECORDED");

      await expect(
        repo({
          role,
          // even with the real principal's member id…
          memberId: SA_PRINCIPAL_MEMBER_ID,
          classId: OWN_CLASS,
        }).flagAbsence(MOCK_RECORDED_UNEXCUSED_KEY),
      ).rejects.toEqual({ type: "forbidden" });

      const after = await rowOf(MOCK_RECORDED_UNEXCUSED_KEY);
      expect(after?.state).toBe("RECORDED");
      expect(after?.flaggedByMemberId).toBeUndefined();
      expect(after).toEqual(before);
    });
  }

  it("denies BEFORE any existence check — a forged role on an unknown row still gets forbidden, never not-found", async () => {
    await expect(
      repo({
        role: "teacher",
        memberId: SA_TEACHER_MEMBER_ID,
        classId: OWN_CLASS,
      }).flagAbsence({
        classId: OWN_CLASS,
        studentMemberId: "stu-does-not-exist",
        date: "2019-01-01",
      }),
    ).rejects.toEqual({ type: "forbidden" });
  });

  it("still denies a teacher flagging a row in their OWN class (record/edit ≠ flag capability)", async () => {
    await expect(
      repo(TEACHER).flagAbsence(MOCK_RECORDED_EXCUSED_KEY),
    ).rejects.toEqual({ type: "forbidden" });
    expect((await rowOf(MOCK_RECORDED_EXCUSED_KEY))?.state).toBe("RECORDED");
  });

  it("allows a legitimate principal (the guard denies the forgery, not the feature)", async () => {
    const flagged = await repo(PRINCIPAL).flagAbsence(
      MOCK_RECORDED_UNEXCUSED_KEY,
    );
    expect(flagged.state).toBe("FLAGGED_UNEXCUSED");
    expect(flagged.flaggedByMemberId).toBe(SA_PRINCIPAL_MEMBER_ID);
  });
});

// ---------------------------------------------------------------------------
// 3. Terminal-state backstop (FR-005/FR-006 / AC-005.8)
// ---------------------------------------------------------------------------

describe("FR-005/FR-006 — re-flag backstop on an already-FLAGGED row (AC-005.8)", () => {
  it("throws invalid-state and leaves the record byte-identical", async () => {
    const before = await rowOf(MOCK_FLAGGED_KEY);
    expect(before?.state).toBe("FLAGGED_UNEXCUSED");

    await expect(repo(PRINCIPAL).flagAbsence(MOCK_FLAGGED_KEY)).rejects.toEqual(
      { type: "invalid-state" },
    );

    expect(await rowOf(MOCK_FLAGGED_KEY)).toEqual(before);
  });

  it("throws invalid-state on the excused-AND-flagged row too (orthogonal signals, still terminal)", async () => {
    await expect(
      repo(PRINCIPAL).flagAbsence(MOCK_EXCUSED_AND_FLAGGED_KEY),
    ).rejects.toEqual({ type: "invalid-state" });
    expect((await rowOf(MOCK_EXCUSED_AND_FLAGGED_KEY))?.excused).toBe(true);
  });

  it("offers NO reverse transition anywhere on the repository (FR-006/FR-013)", () => {
    const instance = repo(PRINCIPAL) as unknown as Record<string, unknown>;
    const names = [
      ...Object.getOwnPropertyNames(MockStudentAbsenceRepository.prototype),
      ...Object.keys(instance),
    ].map((n) => n.toLowerCase());

    expect(names.some((n) => n.includes("unflag"))).toBe(false);
    expect(names.some((n) => n.includes("reopen"))).toBe(false);
    expect(names.some((n) => n.includes("clearflag"))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 4. Same denials through the USE-CASE layer (the Server Action's real path)
// ---------------------------------------------------------------------------

describe("NFR-008 — the denials hold through the use-case layer, not just the repo", () => {
  it("RecordStudentAbsenceUseCase surfaces forbidden for a forged classId", async () => {
    const before = (await readAll()).length;

    await expect(
      new RecordStudentAbsenceUseCase(repo(TEACHER), SA_TODAY).execute({
        classId: SA_FORBIDDEN_CLASS_ID,
        studentMemberId: "stu-2",
        date: MOCK_FREE_DATE,
        excused: false,
      }),
    ).rejects.toEqual({ type: "forbidden" });

    expect((await readAll()).length).toBe(before);
  });

  it("EditStudentAbsenceUseCase surfaces forbidden for a forged classId", async () => {
    const before = await rowOf(MOCK_OTHER_CLASS_KEY);

    await expect(
      new EditStudentAbsenceUseCase(repo(TEACHER)).execute({
        ...MOCK_OTHER_CLASS_KEY,
        excused: true,
      }),
    ).rejects.toEqual({ type: "forbidden" });

    expect(await rowOf(MOCK_OTHER_CLASS_KEY)).toEqual(before);
  });

  it("FlagStudentAbsenceUseCase surfaces forbidden for a non-principal actor", async () => {
    await expect(
      new FlagStudentAbsenceUseCase(repo(TEACHER)).execute(
        MOCK_RECORDED_UNEXCUSED_KEY,
      ),
    ).rejects.toEqual({ type: "forbidden" });
    expect((await rowOf(MOCK_RECORDED_UNEXCUSED_KEY))?.state).toBe("RECORDED");
  });

  it("FlagStudentAbsenceUseCase surfaces invalid-state on a re-flag", async () => {
    await expect(
      new FlagStudentAbsenceUseCase(repo(PRINCIPAL)).execute(MOCK_FLAGGED_KEY),
    ).rejects.toEqual({ type: "invalid-state" });
  });
});
