import { describe, expect, it } from "vitest";
import type { SealStatusRollup } from "../entities/seal-batch.entity";
import type { IAcademicRecordsSealRepository } from "../repositories/i-academic-records-seal.repository";
import { GetSealStatusUseCase } from "./get-seal-status.use-case";

const ROLLUP: SealStatusRollup = {
  classId: "12C1",
  term: "HK1",
  year: "2025-2026",
  totalStudents: 6,
  sealedCount: 6,
  unsealedCount: 0,
  status: "SEALED",
  lastSealedAt: "2026-01-15T14:32:00.000Z",
  resealCount: 1,
};

function makeRepo(
  overrides: Partial<IAcademicRecordsSealRepository>,
): IAcademicRecordsSealRepository {
  return {
    listAvailableClasses: async () => ({ ok: true, data: [] }),
    getSealStatus: async () => ({ ok: true, data: ROLLUP }),
    sealBatch: async () => ({ ok: false, error: { type: "unknown" } }),
    getSealAuditTrail: async () => ({ ok: true, data: [] }),
    listSealedStudents: async () => ({ ok: true, data: [] }),
    getPendingUnsealRequests: async () => ({
      ok: true,
      data: { items: [], nextCursor: null, hasMore: false },
    }),
    initiateUnseal: async () => ({ ok: false, error: { type: "unknown" } }),
    confirmUnseal: async () => ({ ok: false, error: { type: "unknown" } }),
    listTenantAdmins: async () => ({ ok: true, data: [] }),
    ...overrides,
  };
}

describe("GetSealStatusUseCase", () => {
  it("passes the batch key through and returns the rollup verbatim", async () => {
    let received: unknown;
    const repo = makeRepo({
      getSealStatus: async (key) => {
        received = key;
        return { ok: true, data: ROLLUP };
      },
    });

    const result = await new GetSealStatusUseCase(repo).execute({
      classId: "12C1",
      term: "HK1",
      year: "2025-2026",
    });

    expect(received).toEqual({
      classId: "12C1",
      term: "HK1",
      year: "2025-2026",
    });
    expect(result).toEqual({ ok: true, data: ROLLUP });
  });

  it("bubbles a repository failure unchanged", async () => {
    const repo = makeRepo({
      getSealStatus: async () => ({ ok: false, error: { type: "forbidden" } }),
    });

    const result = await new GetSealStatusUseCase(repo).execute({
      classId: "12C1",
      term: "HK1",
      year: "2025-2026",
    });

    expect(result).toEqual({ ok: false, error: { type: "forbidden" } });
  });
});
