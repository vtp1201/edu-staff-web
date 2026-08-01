import { describe, expect, it } from "vitest";
import type {
  InitiateUnsealInput,
  UnsealInitiateResult,
} from "../entities/seal-batch.entity";
import type { IAcademicRecordsSealRepository } from "../repositories/i-academic-records-seal.repository";
import {
  InitiateUnsealUseCase,
  MIN_UNSEAL_REASON_LENGTH,
} from "./initiate-unseal.use-case";

function input(over: Partial<InitiateUnsealInput>): InitiateUnsealInput {
  return {
    studentId: "s-1",
    classId: "12C1",
    term: "HK1",
    year: "2025-2026",
    reason: "x".repeat(25),
    initiatorId: "admin-1",
    ...over,
  };
}

function makeRepo(
  overrides: Partial<IAcademicRecordsSealRepository>,
): IAcademicRecordsSealRepository {
  return {
    listAvailableClasses: async () => ({ ok: true, data: [] }),
    getSealStatus: async () => ({ ok: false, error: { type: "unknown" } }),
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

/** US-E18.24 — 1:1 with the real `RequestUnsealResponse` (narrow by design). */
const RESULT: UnsealInitiateResult = {
  requestId: "ur-1",
  status: "PENDING",
  createdAt: "2026-02-19T10:22:00.000Z",
};

describe("InitiateUnsealUseCase", () => {
  it("binds the AC-7 minimum reason length to 20", () => {
    expect(MIN_UNSEAL_REASON_LENGTH).toBe(20);
  });

  it("delegates to the repo when the reason is long enough", async () => {
    let received: InitiateUnsealInput | null = null;
    const repo = makeRepo({
      initiateUnseal: async (i) => {
        received = i;
        return { ok: true, data: RESULT };
      },
    });
    const result = await new InitiateUnsealUseCase(repo).execute(input({}));
    expect(result).toEqual({ ok: true, data: RESULT });
    expect(received).not.toBeNull();
  });

  it("accepts exactly 20 chars (boundary)", async () => {
    const repo = makeRepo({
      initiateUnseal: async () => ({ ok: true, data: RESULT }),
    });
    const result = await new InitiateUnsealUseCase(repo).execute(
      input({ reason: "a".repeat(20) }),
    );
    expect(result.ok).toBe(true);
  });

  it("rejects 19 chars with reason-too-short (boundary)", async () => {
    const repo = makeRepo({
      initiateUnseal: async () => {
        throw new Error("must not call repo on short reason");
      },
    });
    const result = await new InitiateUnsealUseCase(repo).execute(
      input({ reason: "a".repeat(19) }),
    );
    expect(result).toEqual({ ok: false, error: { type: "reason-too-short" } });
  });

  it("trims whitespace before measuring length", async () => {
    const repo = makeRepo({
      initiateUnseal: async () => {
        throw new Error("must not call repo on short trimmed reason");
      },
    });
    const result = await new InitiateUnsealUseCase(repo).execute(
      input({ reason: `   ${"a".repeat(10)}   ` }),
    );
    expect(result).toEqual({ ok: false, error: { type: "reason-too-short" } });
  });

  it("bubbles not-sealed from the repo (target not sealed)", async () => {
    const repo = makeRepo({
      initiateUnseal: async () => ({
        ok: false,
        error: { type: "not-sealed" },
      }),
    });
    const result = await new InitiateUnsealUseCase(repo).execute(input({}));
    expect(result).toEqual({ ok: false, error: { type: "not-sealed" } });
  });
});
