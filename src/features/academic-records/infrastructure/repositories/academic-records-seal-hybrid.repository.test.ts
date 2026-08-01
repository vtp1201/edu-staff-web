/**
 * Unit test — HybridAcademicRecordsSealRepository (US-E18.13 + US-E18.24).
 * The facade routes the FIVE genuinely-real operations (`sealBatch`,
 * `getSealStatus`, `getPendingUnsealRequests`, `initiateUnseal`,
 * `confirmUnseal`) to the REAL repo and the FOUR no-BE-endpoint operations to
 * the MOCK repo, which stays the source of truth for their state.
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
    getPendingUnsealRequests: rec("getPendingUnsealRequests", {
      items: [],
      nextCursor: null,
      hasMore: false,
    }),
    initiateUnseal: rec("initiateUnseal", null as never),
    confirmUnseal: rec("confirmUnseal", null as never),
    listTenantAdmins: rec("listTenantAdmins", []),
  };
}

describe("HybridAcademicRecordsSealRepository", () => {
  it("routes the FIVE real operations to the REAL repo only (US-E18.24)", async () => {
    const real = spyRepo("real");
    const mock = spyRepo("mock");
    const hybrid = new HybridAcademicRecordsSealRepository(real, mock);

    await hybrid.sealBatch(KEY, "admin-1");
    await hybrid.getSealStatus(KEY);
    await hybrid.getPendingUnsealRequests("12C1", "HK1");
    await hybrid.initiateUnseal({
      studentId: "s1",
      classId: "12C1",
      term: "HK1",
      year: "2025-2026",
      reason: "x".repeat(25),
      initiatorId: "admin-1",
    });
    await hybrid.confirmUnseal("ur-1", "admin-2", "12C1", "HK1");

    expect(real.__calls).toEqual([
      "real.sealBatch",
      "real.getSealStatus",
      "real.getPendingUnsealRequests",
      "real.initiateUnseal",
      "real.confirmUnseal",
    ]);
    expect(mock.__calls).toEqual([]);
  });

  it("routes the FOUR no-BE-endpoint operations to the MOCK repo only", async () => {
    const real = spyRepo("real");
    const mock = spyRepo("mock");
    const hybrid = new HybridAcademicRecordsSealRepository(real, mock);

    await hybrid.listAvailableClasses({ term: "HK1", year: "2025-2026" });
    await hybrid.getSealAuditTrail();
    await hybrid.listSealedStudents();
    await hybrid.listTenantAdmins();

    expect(real.__calls).toEqual([]);
    expect(mock.__calls).toEqual([
      "mock.listAvailableClasses",
      "mock.getSealAuditTrail",
      "mock.listSealedStudents",
      "mock.listTenantAdmins",
    ]);
  });

  it("forwards the class/term scoping args verbatim on the real path", async () => {
    const received: unknown[] = [];
    const real = spyRepo("real");
    real.getPendingUnsealRequests = async (classId, termId, opts) => {
      received.push(classId, termId, opts);
      return ok({ items: [], nextCursor: null, hasMore: false });
    };
    const hybrid = new HybridAcademicRecordsSealRepository(
      real,
      spyRepo("mock"),
    );

    await hybrid.getPendingUnsealRequests("12C1", "HK1", { limit: 5 });
    expect(received).toEqual(["12C1", "HK1", { limit: 5 }]);
  });
});
