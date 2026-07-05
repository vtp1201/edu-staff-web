import { describe, expect, it } from "vitest";
import type {
  SealBatchKey,
  SealBatchStatus,
} from "../entities/seal-batch.entity";
import type {
  IAcademicRecordsSealRepository,
  SealResult,
} from "../repositories/i-academic-records-seal.repository";
import { SealAcademicRecordUseCase } from "./seal-academic-record.use-case";

const KEY: SealBatchKey = { classId: "12C1", term: "HK1", year: "2025-2026" };

function status(over: Partial<SealBatchStatus>): SealBatchStatus {
  return {
    ...KEY,
    subjectLabel: "Toán",
    allLocked: true,
    totalStudents: 5,
    unlockedStudents: 0,
    unlockedSubjectNames: [],
    status: "PENDING",
    sealedAt: null,
    sealedBy: null,
    ...over,
  };
}

/** Minimal fake — only the two methods the use-case touches. */
function makeRepo(
  overrides: Partial<IAcademicRecordsSealRepository>,
): IAcademicRecordsSealRepository {
  return {
    listAvailableClasses: async () => ({ ok: true, data: [] }),
    getSealStatus: async () => ({ ok: true, data: status({}) }),
    sealBatch: async () => ({ ok: true, data: status({ status: "SEALED" }) }),
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
  it("seals when the batch is all-locked and not yet sealed", async () => {
    let sealed: SealBatchKey | null = null;
    const repo = makeRepo({
      getSealStatus: async () => ({ ok: true, data: status({}) }),
      sealBatch: async (key): Promise<SealResult<SealBatchStatus>> => {
        sealed = key;
        return {
          ok: true,
          data: status({ status: "SEALED", sealedBy: "Admin 1" }),
        };
      },
    });
    const result = await new SealAcademicRecordUseCase(repo).execute(
      KEY,
      "admin-1",
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.status).toBe("SEALED");
    expect(sealed).toEqual(KEY);
  });

  it("blocks with not-all-locked when grades are not all locked", async () => {
    const repo = makeRepo({
      getSealStatus: async () => ({
        ok: true,
        data: status({ allLocked: false, unlockedStudents: 3 }),
      }),
      sealBatch: async () => {
        throw new Error("must not seal when not all locked");
      },
    });
    const result = await new SealAcademicRecordUseCase(repo).execute(
      KEY,
      "admin-1",
    );
    expect(result).toEqual({ ok: false, error: { type: "not-all-locked" } });
  });

  it("blocks with already-sealed when the batch is already sealed", async () => {
    const repo = makeRepo({
      getSealStatus: async () => ({
        ok: true,
        data: status({ status: "SEALED" }),
      }),
      sealBatch: async () => {
        throw new Error("must not re-seal");
      },
    });
    const result = await new SealAcademicRecordUseCase(repo).execute(
      KEY,
      "admin-1",
    );
    expect(result).toEqual({ ok: false, error: { type: "already-sealed" } });
  });

  it("bubbles the status-fetch failure", async () => {
    const repo = makeRepo({
      getSealStatus: async () => ({ ok: false, error: { type: "not-found" } }),
    });
    const result = await new SealAcademicRecordUseCase(repo).execute(
      KEY,
      "admin-1",
    );
    expect(result).toEqual({ ok: false, error: { type: "not-found" } });
  });
});
