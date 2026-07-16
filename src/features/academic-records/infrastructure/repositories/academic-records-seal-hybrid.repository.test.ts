/**
 * Unit test — HybridAcademicRecordsSealRepository (US-E18.13, ADR 0055).
 * The facade routes `sealBatch` to the REAL repo and every other method to the
 * MOCK repo, keeping the real HTTP adapter a single-purpose seal client and the
 * mock the source of truth for every permanently-dormant method.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type {
  SealBatchKey,
  SealBatchResult,
} from "../../domain/entities/seal-batch.entity";
import type {
  IAcademicRecordsSealRepository,
  SealResult,
} from "../../domain/repositories/i-academic-records-seal.repository";
import { HybridAcademicRecordsSealRepository } from "./academic-records-seal-hybrid.repository";

const KEY: SealBatchKey = { classId: "12C1", term: "HK1", year: "2025-2026" };

function ok<T>(data: T): SealResult<T> {
  return { ok: true, data };
}

function spyRepo(label: "real" | "mock"): IAcademicRecordsSealRepository & {
  __calls: string[];
} {
  const calls: string[] = [];
  const rec =
    <T>(name: string, data: T) =>
    async (): Promise<SealResult<T>> => {
      calls.push(`${label}.${name}`);
      return ok(data);
    };
  return {
    __calls: calls,
    listAvailableClasses: rec("listAvailableClasses", []),
    getSealStatus: rec("getSealStatus", null as never),
    sealBatch: rec("sealBatch", {
      sealedCount: 1,
      failedCount: 0,
      errors: [],
    } as SealBatchResult),
    getSealAuditTrail: rec("getSealAuditTrail", []),
    listSealedStudents: rec("listSealedStudents", []),
    getPendingUnsealRequests: rec("getPendingUnsealRequests", []),
    initiateUnseal: rec("initiateUnseal", null as never),
    confirmUnseal: rec("confirmUnseal", null as never),
    listTenantAdmins: rec("listTenantAdmins", []),
  };
}

describe("HybridAcademicRecordsSealRepository", () => {
  it("routes sealBatch to the REAL repo only", async () => {
    const real = spyRepo("real");
    const mock = spyRepo("mock");
    const hybrid = new HybridAcademicRecordsSealRepository(real, mock);

    await hybrid.sealBatch(KEY, "admin-1");

    expect(real.__calls).toEqual(["real.sealBatch"]);
    expect(mock.__calls).toEqual([]);
  });

  it("routes every other method to the MOCK repo only", async () => {
    const real = spyRepo("real");
    const mock = spyRepo("mock");
    const hybrid = new HybridAcademicRecordsSealRepository(real, mock);

    await hybrid.listAvailableClasses({ term: "HK1", year: "2025-2026" });
    await hybrid.getSealStatus(KEY);
    await hybrid.getSealAuditTrail();
    await hybrid.listSealedStudents();
    await hybrid.getPendingUnsealRequests();
    await hybrid.initiateUnseal({
      studentId: "s1",
      classId: "12C1",
      term: "HK1",
      year: "2025-2026",
      reason: "x".repeat(25),
      initiatorId: "admin-1",
    });
    await hybrid.confirmUnseal("ur-1", "admin-2");
    await hybrid.listTenantAdmins();

    expect(real.__calls).toEqual([]);
    expect(mock.__calls).toEqual([
      "mock.listAvailableClasses",
      "mock.getSealStatus",
      "mock.getSealAuditTrail",
      "mock.listSealedStudents",
      "mock.getPendingUnsealRequests",
      "mock.initiateUnseal",
      "mock.confirmUnseal",
      "mock.listTenantAdmins",
    ]);
  });
});
