import { beforeEach, describe, expect, it, vi } from "vitest";

// `server-only` is a no-op guard in the node test runtime.
vi.mock("server-only", () => ({}));

import type { SealBatchKey } from "../../../domain/entities/seal-batch.entity";
import { MockAcademicRecordsSealRepository } from "./academic-records-seal.mock.repository";

const SEALABLE: SealBatchKey = {
  classId: "11B2",
  term: "HK1",
  year: "2025-2026",
};
const SEALED: SealBatchKey = {
  classId: "12C1",
  term: "HK1",
  year: "2025-2026",
};
const NOT_LOCKED: SealBatchKey = {
  classId: "10A1",
  term: "HK1",
  year: "2025-2026",
};
/** Seeded with `totalStudents: 0` to exercise the rollup's empty-roster row. */
const EMPTY_ROSTER: SealBatchKey = {
  classId: "10A3",
  term: "HK1",
  year: "2025-2026",
};

describe("MockAcademicRecordsSealRepository", () => {
  let repo: MockAcademicRecordsSealRepository;

  beforeEach(() => {
    repo = new MockAcademicRecordsSealRepository();
  });

  it("lists classes for the selected term/year", async () => {
    const result = await repo.listAvailableClasses({
      term: "HK1",
      year: "2025-2026",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.length).toBe(4);
  });

  it("returns not-found seal status for an unknown batch", async () => {
    const result = await repo.getSealStatus({
      classId: "ZZ9",
      term: "HK2",
      year: "2030-2031",
    });
    expect(result).toEqual({ ok: false, error: { type: "not-found" } });
  });

  it("seals a pending, all-locked batch (SealBatchResult) and appends a SEAL audit entry", async () => {
    const before = await repo.getSealAuditTrail();
    const beforeCount = before.ok ? before.data.length : 0;

    const sealed = await repo.sealBatch(SEALABLE, "admin-1");
    expect(sealed.ok).toBe(true);
    if (sealed.ok) {
      // Real contract returns a plain success-report, not the batch status.
      expect(sealed.data).toEqual({
        sealedCount: 6,
        failedCount: 0,
        errors: [],
      });
    }

    const after = await repo.getSealAuditTrail();
    if (after.ok) {
      expect(after.data.length).toBe(beforeCount + 1);
      expect(after.data[0].action).toBe("SEAL");
    }

    // The boundary rollup stays coherent — status flips to SEALED.
    const status = await repo.getSealStatus(SEALABLE);
    if (status.ok) {
      expect(status.data.status).toBe("SEALED");
      expect(status.data.sealedCount).toBe(status.data.totalStudents);
      expect(status.data.lastSealedAt).not.toBeNull();
    }
  });

  it("allows an idempotent reseal of an already-sealed batch (no already-sealed block)", async () => {
    const result = await repo.sealBatch(SEALED, "admin-1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.failedCount).toBe(0);
      expect(result.data.sealedCount).toBeGreaterThan(0);
    }
  });

  it("reactively rejects a not-all-locked batch with unlocked-grades-exist", async () => {
    const result = await repo.sealBatch(NOT_LOCKED, "admin-1");
    expect(result).toEqual({
      ok: false,
      error: { type: "unlocked-grades-exist" },
    });
  });

  it("returns too-many-reseals after 5 successful seals on the same key", async () => {
    for (let i = 0; i < 5; i++) {
      const ok = await repo.sealBatch(SEALABLE, "admin-1");
      expect(ok.ok).toBe(true);
    }
    const capped = await repo.sealBatch(SEALABLE, "admin-1");
    expect(capped).toEqual({ ok: false, error: { type: "too-many-reseals" } });
  });

  it("initiates an unseal against a sealed batch (narrow boundary result)", async () => {
    const result = await repo.initiateUnseal({
      studentId: "s-12C1-1",
      classId: SEALED.classId,
      term: SEALED.term,
      year: SEALED.year,
      reason: "x".repeat(25),
      initiatorId: "admin-1",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.status).toBe("PENDING");
      // Boundary-narrow: only the three real `RequestUnsealResponse` fields.
      expect(Object.keys(result.data).sort()).toEqual([
        "createdAt",
        "requestId",
        "status",
      ]);
    }

    const pending = await repo.getPendingUnsealRequests(
      SEALED.classId,
      SEALED.term,
    );
    if (pending.ok) {
      expect(
        pending.data.items.some((r) => r.studentMemberId === "s-12C1-1"),
      ).toBe(true);
    }
  });

  it("rejects unseal-initiate on a not-sealed batch", async () => {
    const result = await repo.initiateUnseal({
      studentId: "s-11B2-1",
      classId: NOT_LOCKED.classId,
      term: NOT_LOCKED.term,
      year: NOT_LOCKED.year,
      reason: "x".repeat(25),
      initiatorId: "admin-1",
    });
    expect(result).toEqual({ ok: false, error: { type: "not-sealed" } });
  });

  it("confirms an unseal with a different co-signer and appends UNSEAL audit", async () => {
    const before = await repo.getSealAuditTrail();
    const beforeCount = before.ok ? before.data.length : 0;

    const result = await repo.confirmUnseal("ur-1", "admin-2", "12C1", "HK1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.selfApproved).toBe(false);
      expect(result.data.status).toBe("UNSEALED");
      expect(result.data.studentMemberId).toBe("s-12C1-3");
    }

    const after = await repo.getSealAuditTrail();
    if (after.ok) {
      expect(after.data.length).toBe(beforeCount + 1);
      expect(after.data[0].action).toBe("UNSEAL");
    }

    // Request no longer PENDING.
    const pending = await repo.getPendingUnsealRequests("12C1", "HK1");
    if (pending.ok) {
      expect(pending.data.items.some((r) => r.requestId === "ur-1")).toBe(
        false,
      );
    }
  });

  it("self-approve fallback sets selfApproved on the boundary result", async () => {
    const result = await repo.confirmUnseal("ur-1", null, "12C1", "HK1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.selfApproved).toBe(true);
      expect(result.data.status).toBe("UNSEALED");
    }
  });

  it("returns no-pending-request for an unknown request id", async () => {
    const result = await repo.confirmUnseal(
      "ur-unknown",
      "admin-2",
      "12C1",
      "HK1",
    );
    expect(result).toEqual({
      ok: false,
      error: { type: "no-pending-request" },
    });
  });

  it("getPendingUnsealRequests defaults to PENDING and scopes by class+term", async () => {
    const result = await repo.getPendingUnsealRequests("11B2", "HK1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.items.every((r) => r.status === "PENDING")).toBe(true);
      expect(result.data.items.every((r) => r.classId === "11B2")).toBe(true);
      // ur-3 is APPROVED in the seed (and in 11B2) → excluded by the default.
      expect(result.data.items.some((r) => r.requestId === "ur-3")).toBe(false);
      // ur-1 lives in 12C1 → out of scope for this class.
      expect(result.data.items.some((r) => r.requestId === "ur-1")).toBe(false);
    }
  });

  it("getPendingUnsealRequests honours an explicit status filter", async () => {
    const result = await repo.getPendingUnsealRequests("11B2", "HK1", {
      status: "APPROVED",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.items.map((r) => r.requestId)).toEqual(["ur-3"]);
    }
  });

  it("getPendingUnsealRequests carries the mock's inline display names", async () => {
    const result = await repo.getPendingUnsealRequests("12C1", "HK1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.items[0]).toMatchObject({
        requestId: "ur-1",
        studentName: "Phạm Hữu Phúc",
        requestedByName: "Trần Minh Quân",
      });
    }
  });

  it("getPendingUnsealRequests paginates: cursor advances, hasMore flips on the last page", async () => {
    // 11B2 seeds ONE pending request (ur-2). Seal it, then file a second one so
    // the page actually has to split.
    await repo.sealBatch(SEALABLE, "admin-1");
    await repo.initiateUnseal({
      studentId: "s-11B2-9",
      classId: "11B2",
      term: "HK1",
      year: "2025-2026",
      reason: "y".repeat(25),
      initiatorId: "admin-2",
    });

    const p1 = await repo.getPendingUnsealRequests("11B2", "HK1", {
      limit: 1,
    });
    expect(p1.ok).toBe(true);
    if (!p1.ok) return;
    expect(p1.data.items).toHaveLength(1);
    expect(p1.data.hasMore).toBe(true);
    expect(p1.data.nextCursor).not.toBeNull();

    const p2 = await repo.getPendingUnsealRequests("11B2", "HK1", {
      limit: 1,
      cursor: p1.data.nextCursor,
    });
    expect(p2.ok).toBe(true);
    if (!p2.ok) return;
    expect(p2.data.items).toHaveLength(1);
    expect(p2.data.items[0].requestId).not.toBe(p1.data.items[0].requestId);
    expect(p2.data.hasMore).toBe(false);
    expect(p2.data.nextCursor).toBeNull();
  });

  /**
   * Rollup truth-table parity with the real repo's matrix — the mock must map
   * its internal `SealBatchStatus` onto the SAME boundary enum, never copy the
   * per-record `TermStatus`.
   */
  it("maps a never-sealed batch → PENDING with a null lastSealedAt", async () => {
    const result = await repo.getSealStatus(SEALABLE);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toMatchObject({
        status: "PENDING",
        sealedCount: 0,
        totalStudents: 6,
        unsealedCount: 6,
        lastSealedAt: null,
        resealCount: 0,
      });
    }
  });

  it("maps an already-sealed batch → SEALED with sealedCount === totalStudents", async () => {
    const result = await repo.getSealStatus(SEALED);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toMatchObject({
        status: "SEALED",
        sealedCount: 5,
        totalStudents: 5,
        unsealedCount: 0,
        resealCount: 1,
      });
      expect(result.data.lastSealedAt).not.toBeNull();
    }
  });

  it("maps a sealed-then-unsealed batch → PENDING but keeps lastSealedAt (history is not cleared)", async () => {
    await repo.confirmUnseal("ur-1", "admin-2", "12C1", "HK1");
    const result = await repo.getSealStatus(SEALED);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.status).toBe("PENDING");
      expect(result.data.sealedCount).toBe(0);
      expect(result.data.unsealedCount).toBe(5);
      // The only way to tell "never sealed" apart from "sealed then unsealed".
      expect(result.data.lastSealedAt).not.toBeNull();
    }
  });

  it("maps an empty roster → PENDING (totalStudents 0, no divide-by-zero)", async () => {
    const empty = new MockAcademicRecordsSealRepository();
    const result = await empty.getSealStatus(EMPTY_ROSTER);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toMatchObject({
        status: "PENDING",
        totalStudents: 0,
        sealedCount: 0,
        unsealedCount: 0,
      });
    }
  });

  it("never leaks the mock-internal SealBatchStatus fields across the boundary", async () => {
    const result = await repo.getSealStatus(SEALED);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.keys(result.data).sort()).toEqual([
        "classId",
        "lastSealedAt",
        "resealCount",
        "sealedCount",
        "status",
        "term",
        "totalStudents",
        "unsealedCount",
        "year",
      ]);
    }
  });

  it("single-admin option exposes exactly one tenant admin (AC-8 fallback)", async () => {
    const single = new MockAcademicRecordsSealRepository({ adminCount: 1 });
    const result = await single.listTenantAdmins();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.length).toBe(1);
  });
});
