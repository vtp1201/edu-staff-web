import { describe, expect, it } from "vitest";
import type { StaffDisciplineAuthContext } from "../../../domain/entities/staff-discipline-auth-context.entity";
import {
  MOCK_DRAFT_CONDUCT_NOTE_KEY,
  MOCK_DRAFT_VIOLATION_ID,
  MOCK_LOCKED_CONDUCT_NOTE_KEY,
  MOCK_REJECTED_VIOLATION_ID,
  MOCK_SELF_APPROVED_CONDUCT_NOTE_KEY,
  MOCK_SELF_APPROVED_VIOLATION_ID,
  MOCK_SUBMITTED_CONDUCT_NOTE_KEY,
  MOCK_SUBMITTED_VIOLATION_ID,
  SD_CURRENT_ADMIN_ID,
  SD_SELF_STAFF_ID,
} from "./fixtures";
import { MockStaffDisciplineRepository } from "./staff-discipline.mock.repository";

const PRINCIPAL: StaffDisciplineAuthContext = {
  role: "principal",
  memberId: SD_CURRENT_ADMIN_ID,
  staffMemberId: SD_SELF_STAFF_ID,
};

const LONG_REASON = "Lý do từ chối đủ dài cho ràng buộc phía máy chủ.";

describe("MockStaffDisciplineRepository — fixtures (spec §6)", () => {
  const repo = new MockStaffDisciplineRepository();

  it("covers all 4 violation states and ≥2 severities", async () => {
    const rows = await repo.listStaffViolations({}, PRINCIPAL);
    expect(new Set(rows.map((r) => r.state))).toEqual(
      new Set(["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"]),
    );
    expect(new Set(rows.map((r) => r.severity)).size).toBeGreaterThanOrEqual(2);
  });

  it("has ≥1 selfApproved violation and ≥1 REJECTED with a populated reason", async () => {
    const rows = await repo.listStaffViolations({}, PRINCIPAL);
    expect(
      rows.find((r) => r.recordId === MOCK_SELF_APPROVED_VIOLATION_ID)
        ?.selfApproved,
    ).toBe(true);
    const rejected = rows.find(
      (r) => r.recordId === MOCK_REJECTED_VIOLATION_ID,
    );
    expect(rejected?.state).toBe("REJECTED");
    expect(rejected?.rejectionReason?.length).toBeGreaterThan(0);
  });

  it("resolves roster display fields on every row (never on the wire)", async () => {
    const rows = await repo.listStaffViolations({}, PRINCIPAL);
    for (const row of rows) {
      expect(row.staffName.length).toBeGreaterThan(0);
    }
  });

  it("covers all 3 conduct-note rating tiers, ≥2 terms and ≥1 selfApproved", async () => {
    const rows = await repo.listStaffConductNotes({}, PRINCIPAL);
    expect(new Set(rows.map((r) => r.rating))).toEqual(
      new Set(["SATISFACTORY", "NEEDS_IMPROVEMENT", "UNSATISFACTORY"]),
    );
    expect(new Set(rows.map((r) => r.termId)).size).toBeGreaterThanOrEqual(2);
    expect(
      rows.find(
        (r) =>
          r.termId === MOCK_SELF_APPROVED_CONDUCT_NOTE_KEY.termId &&
          r.staffMemberId === MOCK_SELF_APPROVED_CONDUCT_NOTE_KEY.staffMemberId,
      )?.selfApproved,
    ).toBe(true);
  });

  it("has a dedicated APPROVED conduct-note fixture for the lock (NFR-009)", async () => {
    const rows = await repo.listStaffConductNotes({}, PRINCIPAL);
    const locked = rows.find(
      (r) =>
        r.termId === MOCK_LOCKED_CONDUCT_NOTE_KEY.termId &&
        r.staffMemberId === MOCK_LOCKED_CONDUCT_NOTE_KEY.staffMemberId,
    );
    expect(locked?.state).toBe("APPROVED");
  });
});

describe("MockStaffDisciplineRepository — violations state machine", () => {
  it("creates a DRAFT authored by the caller (INT-001/AC-002.3)", async () => {
    const repo = new MockStaffDisciplineRepository();
    const created = await repo.createStaffViolation(
      {
        staffMemberId: "staff-2",
        category: "late",
        description: "Đi làm muộn 30 phút.",
        severity: "MINOR",
        occurredAt: "2026-05-10",
      },
      PRINCIPAL,
    );

    expect(created.state).toBe("DRAFT");
    expect(created.authorMemberId).toBe(PRINCIPAL.memberId);
    expect(created.selfApproved).toBe(false);
    const rows = await repo.listStaffViolations({}, PRINCIPAL);
    expect(rows.some((r) => r.recordId === created.recordId)).toBe(true);
  });

  it("rejects a create for a staff member outside the roster (INVALID_ID)", async () => {
    const repo = new MockStaffDisciplineRepository();
    await expect(
      repo.createStaffViolation(
        {
          staffMemberId: "staff-999",
          category: "late",
          description: "x",
          severity: "MINOR",
          occurredAt: "2026-05-10",
        },
        PRINCIPAL,
      ),
    ).rejects.toEqual({ type: "not-found" });
  });

  it("submits an own DRAFT → SUBMITTED, then refuses a second submit", async () => {
    const repo = new MockStaffDisciplineRepository();
    const submitted = await repo.submitStaffViolation(
      MOCK_DRAFT_VIOLATION_ID,
      PRINCIPAL,
    );
    expect(submitted.state).toBe("SUBMITTED");

    await expect(
      repo.submitStaffViolation(MOCK_DRAFT_VIOLATION_ID, PRINCIPAL),
    ).rejects.toEqual({ type: "invalid-transition" });
  });

  it("refuses to submit a DRAFT authored by someone else (ownership, AC-003.2 backstop)", async () => {
    const repo = new MockStaffDisciplineRepository();
    await expect(
      repo.submitStaffViolation("sv-006", PRINCIPAL),
    ).rejects.toEqual({ type: "forbidden" });
  });

  it("throws not-found for an unknown recordId (AC-003.4)", async () => {
    const repo = new MockStaffDisciplineRepository();
    await expect(
      repo.submitStaffViolation("sv-nope", PRINCIPAL),
    ).rejects.toEqual({ type: "not-found" });
  });

  it("approves SUBMITTED → APPROVED and derives selfApproved when approver === author (AC-004.2)", async () => {
    const repo = new MockStaffDisciplineRepository();
    const approved = await repo.approveStaffViolation(
      MOCK_SUBMITTED_VIOLATION_ID,
      PRINCIPAL,
    );
    expect(approved.state).toBe("APPROVED");
    expect(approved.approverMemberId).toBe(PRINCIPAL.memberId);
    expect(approved.selfApproved).toBe(true);
  });

  it("derives selfApproved=false when a different principal approves", async () => {
    const repo = new MockStaffDisciplineRepository();
    const approved = await repo.approveStaffViolation(
      MOCK_SUBMITTED_VIOLATION_ID,
      { ...PRINCIPAL, memberId: "admin-2" },
    );
    expect(approved.selfApproved).toBe(false);
  });

  it("refuses approve/reject on a non-SUBMITTED record (already-processed)", async () => {
    const repo = new MockStaffDisciplineRepository();
    await expect(
      repo.approveStaffViolation(MOCK_DRAFT_VIOLATION_ID, PRINCIPAL),
    ).rejects.toEqual({ type: "already-processed" });
    await expect(
      repo.rejectStaffViolation(
        { recordId: MOCK_DRAFT_VIOLATION_ID, rejectionReason: LONG_REASON },
        PRINCIPAL,
      ),
    ).rejects.toEqual({ type: "already-processed" });
  });

  it("rejects SUBMITTED → REJECTED storing the reason", async () => {
    const repo = new MockStaffDisciplineRepository();
    const rejected = await repo.rejectStaffViolation(
      { recordId: MOCK_SUBMITTED_VIOLATION_ID, rejectionReason: LONG_REASON },
      PRINCIPAL,
    );
    expect(rejected.state).toBe("REJECTED");
    expect(rejected.rejectionReason).toBe(LONG_REASON);
  });

  it("enforces the server's own non-empty reason guard, layer 2 (AC-005.3)", async () => {
    const repo = new MockStaffDisciplineRepository();
    await expect(
      repo.rejectStaffViolation(
        { recordId: MOCK_SUBMITTED_VIOLATION_ID, rejectionReason: "   " },
        PRINCIPAL,
      ),
    ).rejects.toEqual({ type: "missing-reject-reason" });
    // Server guard is non-empty only — a 3-char reason passes it (distinct from
    // the client's ≥10-char UX guard).
    await expect(
      repo.rejectStaffViolation(
        { recordId: MOCK_SUBMITTED_VIOLATION_ID, rejectionReason: "xyz" },
        PRINCIPAL,
      ),
    ).resolves.toMatchObject({ state: "REJECTED" });
  });

  it("filters the violations list by staffMemberId for a principal", async () => {
    const repo = new MockStaffDisciplineRepository();
    const rows = await repo.listStaffViolations(
      { staffMemberId: "staff-4" },
      PRINCIPAL,
    );
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.staffMemberId === "staff-4")).toBe(true);
  });
});

describe("MockStaffDisciplineRepository — conduct-note state machine", () => {
  it("creates a new note as DRAFT for an absent natural key (AC-007.3)", async () => {
    const repo = new MockStaffDisciplineRepository();
    const note = await repo.setStaffConductNote(
      {
        staffMemberId: "staff-3",
        termId: "HK1-2025-2026",
        rating: "SATISFACTORY",
        note: "Đánh giá mới.",
      },
      PRINCIPAL,
    );
    expect(note.state).toBe("DRAFT");
    expect(note.authorMemberId).toBe(PRINCIPAL.memberId);
  });

  it("overwrites a DRAFT in place, preserving the original author/createdAt", async () => {
    const repo = new MockStaffDisciplineRepository();
    const before = (await repo.listStaffConductNotes({}, PRINCIPAL)).find(
      (n) =>
        n.termId === MOCK_DRAFT_CONDUCT_NOTE_KEY.termId &&
        n.staffMemberId === MOCK_DRAFT_CONDUCT_NOTE_KEY.staffMemberId,
    );
    const after = await repo.setStaffConductNote(
      {
        ...MOCK_DRAFT_CONDUCT_NOTE_KEY,
        rating: "UNSATISFACTORY",
        note: "Đánh giá đã ghi đè.",
      },
      PRINCIPAL,
    );

    expect(after.rating).toBe("UNSATISFACTORY");
    expect(after.note).toBe("Đánh giá đã ghi đè.");
    expect(after.state).toBe("DRAFT");
    expect(after.authorMemberId).toBe(before?.authorMemberId);
    expect(after.createdAt).toBe(before?.createdAt);
  });

  it("rejects an unknown termId (TERM_NOT_FOUND, AC-007.6)", async () => {
    const repo = new MockStaffDisciplineRepository();
    await expect(
      repo.setStaffConductNote(
        {
          staffMemberId: "staff-3",
          termId: "HK9-1999",
          rating: "SATISFACTORY",
          note: "x",
        },
        PRINCIPAL,
      ),
    ).rejects.toEqual({ type: "term-not-found" });
  });

  it("rejects an out-of-enum rating server-side (INVALID_RATING, AC-007.7)", async () => {
    const repo = new MockStaffDisciplineRepository();
    await expect(
      repo.setStaffConductNote(
        {
          staffMemberId: "staff-3",
          termId: "HK1-2025-2026",
          rating: "GOOD" as never,
          note: "x",
        },
        PRINCIPAL,
      ),
    ).rejects.toEqual({ type: "invalid-rating" });
  });

  it("submits DRAFT → SUBMITTED then approves → APPROVED, locking it (AC-008.9)", async () => {
    const repo = new MockStaffDisciplineRepository();
    const key = MOCK_DRAFT_CONDUCT_NOTE_KEY;

    const submitted = await repo.submitStaffConductNote(
      key.staffMemberId,
      key.termId,
      PRINCIPAL,
    );
    expect(submitted.state).toBe("SUBMITTED");

    const approved = await repo.approveStaffConductNote(
      key.staffMemberId,
      key.termId,
      PRINCIPAL,
    );
    expect(approved.state).toBe("APPROVED");
    expect(approved.selfApproved).toBe(true);

    // Post-approval immutability takes effect immediately, no extra wiring.
    await expect(
      repo.setStaffConductNote(
        { ...key, rating: "SATISFACTORY", note: "Ghi đè sau khi duyệt." },
        PRINCIPAL,
      ),
    ).rejects.toEqual({ type: "locked" });
  });

  it("rejects a SUBMITTED note with a reason and enforces the non-empty guard", async () => {
    const repo = new MockStaffDisciplineRepository();
    const key = MOCK_SUBMITTED_CONDUCT_NOTE_KEY;

    await expect(
      repo.rejectStaffConductNote(
        key.staffMemberId,
        key.termId,
        " ",
        PRINCIPAL,
      ),
    ).rejects.toEqual({ type: "missing-reject-reason" });

    const rejected = await repo.rejectStaffConductNote(
      key.staffMemberId,
      key.termId,
      LONG_REASON,
      PRINCIPAL,
    );
    expect(rejected.state).toBe("REJECTED");
    expect(rejected.rejectionReason).toBe(LONG_REASON);
  });

  it("throws not-found for a natural key with no record", async () => {
    const repo = new MockStaffDisciplineRepository();
    await expect(
      repo.submitStaffConductNote("staff-3", "HK1-2025-2026", PRINCIPAL),
    ).rejects.toEqual({ type: "not-found" });
  });

  it("filters conduct notes by termId", async () => {
    const repo = new MockStaffDisciplineRepository();
    const rows = await repo.listStaffConductNotes(
      { termId: "HK2-2024-2025" },
      PRINCIPAL,
    );
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.termId === "HK2-2024-2025")).toBe(true);
  });

  it("is isolated per instance (no shared module state between repos)", async () => {
    const a = new MockStaffDisciplineRepository();
    const b = new MockStaffDisciplineRepository();
    await a.submitStaffViolation(MOCK_DRAFT_VIOLATION_ID, PRINCIPAL);

    const fromB = (await b.listStaffViolations({}, PRINCIPAL)).find(
      (r) => r.recordId === MOCK_DRAFT_VIOLATION_ID,
    );
    expect(fromB?.state).toBe("DRAFT");
  });
});
