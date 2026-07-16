import { describe, expect, it } from "vitest";
import type {
  SealBatchKey,
  SealBatchResult,
} from "../entities/seal-batch.entity";
import type {
  IAcademicRecordsSealRepository,
  SealResult,
} from "../repositories/i-academic-records-seal.repository";
import { SealAcademicRecordUseCase } from "./seal-academic-record.use-case";

const KEY: SealBatchKey = { classId: "12C1", term: "HK1", year: "2025-2026" };

function result(over: Partial<SealBatchResult> = {}): SealBatchResult {
  return { sealedCount: 5, failedCount: 0, errors: [], ...over };
}

/**
 * Full-interface fake. `getSealStatus` throws so any test proves the use-case
 * never pre-checks it (US-E18.13 — the gate moved server-side / reactive).
 */
function makeRepo(
  overrides: Partial<IAcademicRecordsSealRepository>,
): IAcademicRecordsSealRepository {
  return {
    listAvailableClasses: async () => ({ ok: true, data: [] }),
    getSealStatus: async () => {
      throw new Error("use-case must not call getSealStatus");
    },
    sealBatch: async () => ({ ok: true, data: result() }),
    getSealAuditTrail: async () => ({ ok: true, data: [] }),
    listSealedStudents: async () => ({ ok: true, data: [] }),
    getPendingUnsealRequests: async () => ({ ok: true, data: [] }),
    initiateUnseal: async () => ({ ok: false, error: { type: "unknown" } }),
    confirmUnseal: async () => ({ ok: false, error: { type: "unknown" } }),
    listTenantAdmins: async () => ({ ok: true, data: [] }),
    ...overrides,
  };
}

describe("SealAcademicRecordUseCase", () => {
  it("seals without calling getSealStatus first", async () => {
    let sealed: { key: SealBatchKey; actorId: string } | null = null;
    const repo = makeRepo({
      sealBatch: async (key, actorId): Promise<SealResult<SealBatchResult>> => {
        sealed = { key, actorId };
        return { ok: true, data: result({ sealedCount: 6 }) };
      },
    });
    const res = await new SealAcademicRecordUseCase(repo).execute(
      KEY,
      "admin-1",
    );
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.sealedCount).toBe(6);
    expect(sealed).toEqual({ key: KEY, actorId: "admin-1" });
  });

  it("does not block when the batch is already sealed (idempotent reseal)", async () => {
    // Even fed a pre-sealed key, the use-case just forwards to the repo.
    const repo = makeRepo({
      sealBatch: async (): Promise<SealResult<SealBatchResult>> => ({
        ok: true,
        data: result({ sealedCount: 5, failedCount: 0 }),
      }),
    });
    const res = await new SealAcademicRecordUseCase(repo).execute(
      KEY,
      "admin-1",
    );
    expect(res.ok).toBe(true);
  });

  it("bubbles unlocked-grades-exist from the repo", async () => {
    const repo = makeRepo({
      sealBatch: async () => ({
        ok: false,
        error: { type: "unlocked-grades-exist" },
      }),
    });
    const res = await new SealAcademicRecordUseCase(repo).execute(
      KEY,
      "admin-1",
    );
    expect(res).toEqual({
      ok: false,
      error: { type: "unlocked-grades-exist" },
    });
  });

  it("bubbles too-many-reseals from the repo", async () => {
    const repo = makeRepo({
      sealBatch: async () => ({
        ok: false,
        error: { type: "too-many-reseals" },
      }),
    });
    const res = await new SealAcademicRecordUseCase(repo).execute(
      KEY,
      "admin-1",
    );
    expect(res).toEqual({ ok: false, error: { type: "too-many-reseals" } });
  });

  it("bubbles a forbidden failure from the repo", async () => {
    const repo = makeRepo({
      sealBatch: async () => ({ ok: false, error: { type: "forbidden" } }),
    });
    const res = await new SealAcademicRecordUseCase(repo).execute(
      KEY,
      "admin-1",
    );
    expect(res).toEqual({ ok: false, error: { type: "forbidden" } });
  });
});
