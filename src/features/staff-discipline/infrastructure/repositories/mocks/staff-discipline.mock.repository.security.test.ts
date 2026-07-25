import { describe, expect, it } from "vitest";
import type { UserRole } from "@/features/auth/domain/entities/auth-user.entity";
import type { StaffDisciplineAuthContext } from "../../../domain/entities/staff-discipline-auth-context.entity";
import {
  MOCK_DRAFT_CONDUCT_NOTE_KEY,
  MOCK_DRAFT_VIOLATION_ID,
  MOCK_LOCKED_CONDUCT_NOTE_KEY,
  MOCK_SUBMITTED_CONDUCT_NOTE_KEY,
  MOCK_SUBMITTED_VIOLATION_ID,
  SD_CURRENT_ADMIN_ID,
  SD_SELF_STAFF_ID,
} from "./fixtures";
import { MockStaffDisciplineRepository } from "./staff-discipline.mock.repository";

/**
 * ============================================================================
 * SECURITY-GRADE PROOF SWEEP — US-E09.5 NFR-008 / NFR-009 (release-blocking)
 * spec.md §"High-Risk-Grade Security Enforcement" · plan.md Phase 8 · UC-009
 * ============================================================================
 *
 * These are the load-bearing proofs, deliberately in their OWN file so a
 * reviewer can find them by name. Each test invokes the repository (the
 * authorization boundary while this feature is mock-first, spec pt. 6) DIRECTLY
 * with a FORGED auth context — no UI involved. A test that only proves a button
 * is hidden does NOT satisfy NFR-008 (AC-009.5).
 *
 * Covered here:
 *   1. NFR-008 forbidden-role denial for EACH of the 8 mutating operations.
 *   2. NFR-008 pt.3 teacher list-scope forced server-side (forged staffMemberId).
 *   3. NFR-009 409 lock on the dedicated APPROVED fixture, bypassing the client.
 * The 4th Phase-8 item (`selfApproved` never suppressed) lives at
 * `presentation/staff-discipline-screen/sd-self-approved-note.test.tsx`
 * + the `SelfApprovedAlwaysVisible` Storybook story.
 */

const FORGED_ROLES: readonly UserRole[] = [
  "teacher",
  "student",
  "parent",
  "admin",
];

function forge(role: UserRole): StaffDisciplineAuthContext {
  return {
    role,
    memberId: SD_CURRENT_ADMIN_ID, // even with the AUTHOR's member id…
    staffMemberId: SD_SELF_STAFF_ID,
  };
}

const PRINCIPAL: StaffDisciplineAuthContext = {
  role: "principal",
  memberId: SD_CURRENT_ADMIN_ID,
  staffMemberId: SD_SELF_STAFF_ID,
};

const REASON = "Lý do từ chối hợp lệ, dài hơn mười ký tự.";

describe("NFR-008 — forbidden-role denial on EVERY mutating operation (AC-009.2/.3/.5)", () => {
  for (const role of FORGED_ROLES) {
    describe(`forged caller role="${role}"`, () => {
      it("createStaffViolation → forbidden, nothing created (INT-001)", async () => {
        const repo = new MockStaffDisciplineRepository();
        const before = (await repo.listStaffViolations({}, PRINCIPAL)).length;

        await expect(
          repo.createStaffViolation(
            {
              staffMemberId: "staff-2",
              category: "late",
              description: "Bản ghi giả mạo.",
              severity: "MINOR",
              occurredAt: "2026-05-10",
            },
            forge(role),
          ),
        ).rejects.toEqual({ type: "forbidden" });

        expect((await repo.listStaffViolations({}, PRINCIPAL)).length).toBe(
          before,
        );
      });

      it("submitStaffViolation → forbidden, state untouched (INT-003)", async () => {
        const repo = new MockStaffDisciplineRepository();

        await expect(
          repo.submitStaffViolation(MOCK_DRAFT_VIOLATION_ID, forge(role)),
        ).rejects.toEqual({ type: "forbidden" });

        const row = (await repo.listStaffViolations({}, PRINCIPAL)).find(
          (r) => r.recordId === MOCK_DRAFT_VIOLATION_ID,
        );
        expect(row?.state).toBe("DRAFT");
      });

      it("approveStaffViolation → forbidden, state untouched (INT-004)", async () => {
        const repo = new MockStaffDisciplineRepository();

        await expect(
          repo.approveStaffViolation(MOCK_SUBMITTED_VIOLATION_ID, forge(role)),
        ).rejects.toEqual({ type: "forbidden" });

        const row = (await repo.listStaffViolations({}, PRINCIPAL)).find(
          (r) => r.recordId === MOCK_SUBMITTED_VIOLATION_ID,
        );
        expect(row?.state).toBe("SUBMITTED");
        expect(row?.approverMemberId).toBeUndefined();
      });

      it("rejectStaffViolation → forbidden, state untouched (INT-004)", async () => {
        const repo = new MockStaffDisciplineRepository();

        await expect(
          repo.rejectStaffViolation(
            {
              recordId: MOCK_SUBMITTED_VIOLATION_ID,
              rejectionReason: REASON,
            },
            forge(role),
          ),
        ).rejects.toEqual({ type: "forbidden" });

        const row = (await repo.listStaffViolations({}, PRINCIPAL)).find(
          (r) => r.recordId === MOCK_SUBMITTED_VIOLATION_ID,
        );
        expect(row?.state).toBe("SUBMITTED");
        expect(row?.rejectionReason).toBeUndefined();
      });

      it("setStaffConductNote → forbidden, record untouched (INT-005)", async () => {
        const repo = new MockStaffDisciplineRepository();

        await expect(
          repo.setStaffConductNote(
            {
              ...MOCK_DRAFT_CONDUCT_NOTE_KEY,
              rating: "UNSATISFACTORY",
              note: "Ghi đè giả mạo.",
            },
            forge(role),
          ),
        ).rejects.toEqual({ type: "forbidden" });

        const row = (await repo.listStaffConductNotes({}, PRINCIPAL)).find(
          (n) =>
            n.termId === MOCK_DRAFT_CONDUCT_NOTE_KEY.termId &&
            n.staffMemberId === MOCK_DRAFT_CONDUCT_NOTE_KEY.staffMemberId,
        );
        expect(row?.rating).not.toBe("UNSATISFACTORY");
        expect(row?.state).toBe("DRAFT");
      });

      it("submitStaffConductNote → forbidden, state untouched (INT-007)", async () => {
        const repo = new MockStaffDisciplineRepository();
        const key = MOCK_DRAFT_CONDUCT_NOTE_KEY;

        await expect(
          repo.submitStaffConductNote(
            key.staffMemberId,
            key.termId,
            forge(role),
          ),
        ).rejects.toEqual({ type: "forbidden" });

        const row = (await repo.listStaffConductNotes({}, PRINCIPAL)).find(
          (n) =>
            n.termId === key.termId && n.staffMemberId === key.staffMemberId,
        );
        expect(row?.state).toBe("DRAFT");
      });

      it("approveStaffConductNote → forbidden, state untouched (INT-008)", async () => {
        const repo = new MockStaffDisciplineRepository();
        const key = MOCK_SUBMITTED_CONDUCT_NOTE_KEY;

        await expect(
          repo.approveStaffConductNote(
            key.staffMemberId,
            key.termId,
            forge(role),
          ),
        ).rejects.toEqual({ type: "forbidden" });

        const row = (await repo.listStaffConductNotes({}, PRINCIPAL)).find(
          (n) =>
            n.termId === key.termId && n.staffMemberId === key.staffMemberId,
        );
        expect(row?.state).toBe("SUBMITTED");
      });

      it("rejectStaffConductNote → forbidden, state untouched (INT-008)", async () => {
        const repo = new MockStaffDisciplineRepository();
        const key = MOCK_SUBMITTED_CONDUCT_NOTE_KEY;

        await expect(
          repo.rejectStaffConductNote(
            key.staffMemberId,
            key.termId,
            REASON,
            forge(role),
          ),
        ).rejects.toEqual({ type: "forbidden" });

        const row = (await repo.listStaffConductNotes({}, PRINCIPAL)).find(
          (n) =>
            n.termId === key.termId && n.staffMemberId === key.staffMemberId,
        );
        expect(row?.state).toBe("SUBMITTED");
        expect(row?.rejectionReason).toBeUndefined();
      });
    });
  }

  it("denies BEFORE any existence check — a forged role on an unknown id still gets forbidden, never not-found (no existence leak)", async () => {
    const repo = new MockStaffDisciplineRepository();
    await expect(
      repo.submitStaffViolation("sv-does-not-exist", forge("teacher")),
    ).rejects.toEqual({ type: "forbidden" });
    await expect(
      repo.approveStaffConductNote("staff-999", "HK9-1999", forge("student")),
    ).rejects.toEqual({ type: "forbidden" });
  });
});

describe("NFR-008 pt.3 — teacher list scope is forced SERVER-side (AC-009.4)", () => {
  const TEACHER: StaffDisciplineAuthContext = {
    role: "teacher",
    memberId: "m-teacher",
    staffMemberId: SD_SELF_STAFF_ID,
  };

  it("ignores a forged staffMemberId on the violations list and returns only own records", async () => {
    const repo = new MockStaffDisciplineRepository();

    const rows = await repo.listStaffViolations(
      { staffMemberId: "staff-4" }, // forged — someone else's record
      TEACHER,
    );

    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.staffMemberId === SD_SELF_STAFF_ID)).toBe(true);
    expect(rows.some((r) => r.staffMemberId === "staff-4")).toBe(false);
  });

  it("ignores a forged staffMemberId on the conduct-notes list and returns only own records", async () => {
    const repo = new MockStaffDisciplineRepository();

    const rows = await repo.listStaffConductNotes(
      { staffMemberId: "staff-5" }, // forged
      TEACHER,
    );

    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.staffMemberId === SD_SELF_STAFF_ID)).toBe(true);
  });

  it("returns a strict subset of what the principal sees (scope is narrowing, not filtering client-side)", async () => {
    const repo = new MockStaffDisciplineRepository();
    const all = await repo.listStaffViolations({}, PRINCIPAL);
    const own = await repo.listStaffViolations({}, TEACHER);

    expect(own.length).toBeLessThan(all.length);
    expect(own.every((r) => r.staffMemberId === SD_SELF_STAFF_ID)).toBe(true);
  });

  it("denies list access entirely to a role that owns neither view", async () => {
    const repo = new MockStaffDisciplineRepository();
    await expect(
      repo.listStaffViolations({}, { ...TEACHER, role: "student" }),
    ).rejects.toEqual({ type: "forbidden" });
    await expect(
      repo.listStaffConductNotes({}, { ...TEACHER, role: "parent" }),
    ).rejects.toEqual({ type: "forbidden" });
  });
});

describe("NFR-009 — APPROVED conduct note stays locked server-side (AC-007.5/AC-009.6)", () => {
  it("throws { type: 'locked' } (409) on the dedicated APPROVED fixture, bypassing the client pre-check", async () => {
    const repo = new MockStaffDisciplineRepository();

    await expect(
      repo.setStaffConductNote(
        {
          ...MOCK_LOCKED_CONDUCT_NOTE_KEY,
          rating: "UNSATISFACTORY",
          note: "Cố ghi đè bản ghi đã duyệt (bỏ qua kiểm tra phía client).",
        },
        PRINCIPAL, // a legitimately authorized principal — the LOCK is the guard
      ),
    ).rejects.toEqual({ type: "locked" });
  });

  it("leaves the locked record completely untouched after the rejected write", async () => {
    const repo = new MockStaffDisciplineRepository();
    const read = async () =>
      (await repo.listStaffConductNotes({}, PRINCIPAL)).find(
        (n) =>
          n.termId === MOCK_LOCKED_CONDUCT_NOTE_KEY.termId &&
          n.staffMemberId === MOCK_LOCKED_CONDUCT_NOTE_KEY.staffMemberId,
      );

    const before = await read();
    await repo
      .setStaffConductNote(
        {
          ...MOCK_LOCKED_CONDUCT_NOTE_KEY,
          rating: "UNSATISFACTORY",
          note: "Ghi đè bị chặn.",
        },
        PRINCIPAL,
      )
      .catch(() => undefined);
    const after = await read();

    expect(after).toEqual(before);
    expect(after?.state).toBe("APPROVED");
  });

  it("keeps the lock even against a forged role (forbidden wins first, still no write)", async () => {
    const repo = new MockStaffDisciplineRepository();

    await expect(
      repo.setStaffConductNote(
        {
          ...MOCK_LOCKED_CONDUCT_NOTE_KEY,
          rating: "SATISFACTORY",
          note: "Giả mạo trên bản ghi đã duyệt.",
        },
        forge("teacher"),
      ),
    ).rejects.toEqual({ type: "forbidden" });

    const row = (await repo.listStaffConductNotes({}, PRINCIPAL)).find(
      (n) =>
        n.termId === MOCK_LOCKED_CONDUCT_NOTE_KEY.termId &&
        n.staffMemberId === MOCK_LOCKED_CONDUCT_NOTE_KEY.staffMemberId,
    );
    expect(row?.note).not.toContain("Giả mạo");
  });
});
