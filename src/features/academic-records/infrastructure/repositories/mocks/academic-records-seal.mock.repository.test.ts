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

    // Decorative getSealStatus stays coherent — status flips to SEALED.
    const status = await repo.getSealStatus(SEALABLE);
    if (status.ok) {
      expect(status.data.status).toBe("SEALED");
      expect(status.data.sealedBy).toBe("Trần Minh Quân");
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

  it("initiates an unseal against a sealed batch", async () => {
    const result = await repo.initiateUnseal({
      studentId: "s-12C1-1",
      classId: SEALED.classId,
      term: SEALED.term,
      year: SEALED.year,
      reason: "x".repeat(25),
      initiatorId: "admin-1",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.status).toBe("PENDING");

    const pending = await repo.getPendingUnsealRequests();
    if (pending.ok) {
      expect(pending.data.some((r) => r.studentId === "s-12C1-1")).toBe(true);
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

    const result = await repo.confirmUnseal("ur-1", "admin-2");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.fallback).toBe(false);
      expect(result.data.request.status).toBe("APPROVED");
      expect(result.data.request.coSignerName).toBe("Lê Thị Mai");
    }

    const after = await repo.getSealAuditTrail();
    if (after.ok) {
      expect(after.data.length).toBe(beforeCount + 1);
      expect(after.data[0].action).toBe("UNSEAL");
    }

    // Request no longer PENDING.
    const pending = await repo.getPendingUnsealRequests();
    if (pending.ok) {
      expect(pending.data.some((r) => r.id === "ur-1")).toBe(false);
    }
  });

  it("self-approve fallback flips fallback true and sets selfApproved", async () => {
    const result = await repo.confirmUnseal("ur-1", null);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.fallback).toBe(true);
      expect(result.data.request.selfApproved).toBe(true);
      expect(result.data.request.coSignerId).toBeNull();
    }
  });

  it("returns no-pending-request for an unknown request id", async () => {
    const result = await repo.confirmUnseal("ur-unknown", "admin-2");
    expect(result).toEqual({
      ok: false,
      error: { type: "no-pending-request" },
    });
  });

  it("getPendingUnsealRequests returns only PENDING", async () => {
    const result = await repo.getPendingUnsealRequests();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.every((r) => r.status === "PENDING")).toBe(true);
      // ur-3 is APPROVED in the seed → excluded.
      expect(result.data.some((r) => r.id === "ur-3")).toBe(false);
    }
  });

  it("single-admin option exposes exactly one tenant admin (AC-8 fallback)", async () => {
    const single = new MockAcademicRecordsSealRepository({ adminCount: 1 });
    const result = await single.listTenantAdmins();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.length).toBe(1);
  });
});
